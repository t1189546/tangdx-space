import { createHash } from "node:crypto";
import { access, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { DEFAULT_PUBLIC_MEDIA_BASE } from "./media-config.mjs";

const SUPPORTED_EXTENSIONS = new Set([".jpeg", ".jpg", ".png", ".webp"]);
const MANIFEST_VERSION = 3;
const DEFAULT_MAX_SIZE = 3200;
const DEFAULT_QUALITY = 84;
const DEFAULT_PUBLIC_BASE = DEFAULT_PUBLIC_MEDIA_BASE;
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const originalsRoot = path.join(projectRoot, "media-originals");
const mediaOutputRoot = path.join(projectRoot, "media-output");

function usage() {
  return `Usage:
  npm run media:optimize -- --input <folder> --location <path> [options]

Options:
  --slug <slug>         Manifest name (default: final location segment)
  --output <folder>     Staging folder (default: media-output/r2/images/web/<location>)
  --manifest <file>     Staging manifest (default: media-output/manifests/<slug>.json)
  --public-base <url>   Public R2 base URL (default: ${DEFAULT_PUBLIC_BASE})
  --files <names>       Optional comma-separated relative filenames to process
  --max-size <pixels>  Maximum width or height (default: ${DEFAULT_MAX_SIZE})
  --quality <1-100>    WebP quality (default: ${DEFAULT_QUALITY})
  --force              Reprocess every image
  --help               Show this help

The command never changes the input files and never uploads anything. It writes
privacy-stripped WebP derivatives to ignored media-output/ staging.`;
}

function parseArguments(argumentsList) {
  const options = {};

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];

    if (argument === "--force" || argument === "--help") {
      options[argument.slice(2)] = true;
      continue;
    }

    if (!argument.startsWith("--")) {
      throw new Error(`Unexpected argument: ${argument}`);
    }

    const value = argumentsList[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${argument}`);
    }

    options[argument.slice(2)] = value;
    index += 1;
  }

  return options;
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "photo";
}

function cleanRelativePath(value, label) {
  const cleaned = value.replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");
  if (!cleaned || cleaned.split("/").includes("..") || path.isAbsolute(cleaned)) {
    throw new Error(`${label} must be a safe relative path.`);
  }
  return cleaned;
}

function publicUrl(publicBase, objectPath) {
  const encodedPath = objectPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${publicBase}/${encodedPath}`;
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectImages(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));
  const images = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      images.push(...(await collectImages(entryPath)));
    } else if (
      entry.isFile() &&
      SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
    ) {
      images.push(entryPath);
    }
  }

  return images;
}

async function sha256(filePath) {
  const file = await readFile(filePath);
  return createHash("sha256").update(file).digest("hex");
}

function buildOutputNames(inputFiles, inputDirectory) {
  const candidates = inputFiles.map((inputPath) => {
    const relativePath = path.relative(inputDirectory, inputPath);
    const baseName = slugify(path.parse(inputPath).name);
    return { inputPath, relativePath, baseName };
  });
  const counts = new Map();

  for (const candidate of candidates) {
    counts.set(candidate.baseName, (counts.get(candidate.baseName) ?? 0) + 1);
  }

  return candidates.map((candidate) => {
    if (counts.get(candidate.baseName) === 1) {
      return { ...candidate, outputName: `${candidate.baseName}.webp` };
    }

    const pathHash = createHash("sha256")
      .update(candidate.relativePath.split(path.sep).join("/"))
      .digest("hex")
      .slice(0, 8);

    return {
      ...candidate,
      outputName: `${candidate.baseName}-${pathHash}.webp`,
    };
  });
}

async function createBlurDataUrl(inputPath) {
  const buffer = await sharp(inputPath)
    .rotate()
    .resize({ width: 12, height: 12, fit: "inside", withoutEnlargement: true })
    .toColourspace("srgb")
    .webp({ quality: 40, effort: 4 })
    .toBuffer();

  return `data:image/webp;base64,${buffer.toString("base64")}`;
}

async function optimizeImage(inputPath, outputPath, settings) {
  const source = await stat(inputPath);
  const sourceMetadata = await sharp(inputPath).metadata();
  const swapsDimensions = [5, 6, 7, 8].includes(sourceMetadata.orientation);
  const originalWidth = swapsDimensions
    ? sourceMetadata.height
    : sourceMetadata.width;
  const originalHeight = swapsDimensions
    ? sourceMetadata.width
    : sourceMetadata.height;
  const pipeline = sharp(inputPath)
    .rotate()
    .resize({
      width: settings.maxSize,
      height: settings.maxSize,
      fit: "inside",
      withoutEnlargement: true,
    })
    .toColourspace("srgb")
    .withIccProfile("srgb")
    .webp({
      quality: settings.quality,
      effort: 5,
      smartSubsample: true,
    });
  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  await writeFile(outputPath, data);

  return {
    width: info.width,
    height: info.height,
    aspectRatio: Number((info.width / info.height).toFixed(6)),
    blurDataURL: await createBlurDataUrl(inputPath),
    bytes: data.length,
    sourceBytes: source.size,
    originalWidth,
    originalHeight,
  };
}

async function readOriginalDimensions(inputPath) {
  const metadata = await sharp(inputPath).metadata();
  const swapsDimensions = [5, 6, 7, 8].includes(metadata.orientation);

  return {
    originalWidth: swapsDimensions ? metadata.height : metadata.width,
    originalHeight: swapsDimensions ? metadata.width : metadata.height,
  };
}

async function readManifest(manifestPath) {
  if (!(await exists(manifestPath))) return null;

  try {
    return JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    return null;
  }
}

async function main() {
  let options;

  try {
    options = parseArguments(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  if (options.help) {
    console.log(usage());
    return;
  }

  if (!options.input || !options.location) {
    console.error("Both --input and --location are required.");
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  const location = cleanRelativePath(options.location, "--location");
  const slug = slugify(options.slug ?? location.split("/").at(-1));
  const inputDirectory = path.resolve(projectRoot, options.input);
  const objectPrefix = `images/web/${location}`;
  const r2StagingRoot = path.join(projectRoot, "media-output", "r2");
  const outputDirectory = path.resolve(
    projectRoot,
    options.output ?? path.join("media-output", "r2", ...objectPrefix.split("/")),
  );
  const manifestPath = path.resolve(
    projectRoot,
    options.manifest ?? path.join("media-output", "manifests", `${slug}.json`),
  );
  const publicBase = (options["public-base"] ?? DEFAULT_PUBLIC_BASE).replace(/\/+$/, "");
  const publicBaseUrl = new URL(publicBase);
  if (publicBaseUrl.protocol !== "https:") {
    throw new Error("--public-base must be an HTTPS URL.");
  }
  const settings = {
    maxSize: Number(options["max-size"] ?? DEFAULT_MAX_SIZE),
    quality: Number(options.quality ?? DEFAULT_QUALITY),
    format: "webp",
  };

  const outputInsideInput =
    outputDirectory === inputDirectory ||
    outputDirectory.startsWith(`${inputDirectory}${path.sep}`);

  if (outputInsideInput) {
    throw new Error(
      "The output folder must be separate from the original input folder.",
    );
  }

  const inputRelativeToOriginals = path.relative(originalsRoot, inputDirectory);
  if (
    !inputRelativeToOriginals ||
    inputRelativeToOriginals.startsWith("..") ||
    path.isAbsolute(inputRelativeToOriginals)
  ) {
    throw new Error("The input folder must be inside media-originals/.");
  }

  const outputRelativeToStaging = path.relative(r2StagingRoot, outputDirectory);
  if (
    !outputRelativeToStaging ||
    outputRelativeToStaging.startsWith("..") ||
    path.isAbsolute(outputRelativeToStaging)
  ) {
    throw new Error("The output folder must be inside media-output/r2/.");
  }
  if (outputRelativeToStaging.split(path.sep).join("/") !== objectPrefix) {
    throw new Error(`The output folder must mirror the R2 object prefix: media-output/r2/${objectPrefix}`);
  }

  const manifestRelativeToOutput = path.relative(mediaOutputRoot, manifestPath);
  if (
    !manifestRelativeToOutput ||
    manifestRelativeToOutput.startsWith("..") ||
    path.isAbsolute(manifestRelativeToOutput)
  ) {
    throw new Error("The staging manifest must be inside media-output/.");
  }

  if (!Number.isInteger(settings.maxSize) || settings.maxSize < 1) {
    throw new Error("--max-size must be a positive integer.");
  }

  if (!Number.isInteger(settings.quality) || settings.quality < 1 || settings.quality > 100) {
    throw new Error("--quality must be an integer from 1 to 100.");
  }

  if (!(await exists(inputDirectory)) || !(await stat(inputDirectory)).isDirectory()) {
    throw new Error(`Input folder not found: ${inputDirectory}`);
  }

  await mkdir(outputDirectory, { recursive: true });
  await mkdir(path.dirname(manifestPath), { recursive: true });

  const collectedInputFiles = await collectImages(inputDirectory);
  const requestedFiles = options.files
    ? new Set(
        options.files
          .split(",")
          .map((value) => cleanRelativePath(value.trim(), "--files entry")),
      )
    : null;
  const inputFiles = requestedFiles
    ? collectedInputFiles.filter((inputPath) =>
        requestedFiles.has(path.relative(inputDirectory, inputPath).split(path.sep).join("/")),
      )
    : collectedInputFiles;

  if (requestedFiles) {
    const foundFiles = new Set(
      inputFiles.map((inputPath) =>
        path.relative(inputDirectory, inputPath).split(path.sep).join("/"),
      ),
    );
    const missingFiles = [...requestedFiles].filter((fileName) => !foundFiles.has(fileName));
    if (missingFiles.length > 0) {
      throw new Error(`Requested image files not found: ${missingFiles.join(", ")}`);
    }
  }

  const namedInputs = buildOutputNames(inputFiles, inputDirectory);
  const previousManifest = await readManifest(manifestPath);
  const previousImages = previousManifest?.images ?? {};
  const images = {};
  const counts = { processed: 0, skipped: 0 };

  for (const item of namedInputs) {
    const sourceKey = item.relativePath.split(path.sep).join("/");
    const outputPath = path.join(outputDirectory, item.outputName);
    const objectPath = `${objectPrefix}/${item.outputName}`;
    const src = publicUrl(publicBase, objectPath);
    const sourceHash = await sha256(item.inputPath);
    const previous = previousImages[sourceKey];
    const canSkip =
      !options.force &&
      previous?.sourceHash === sourceHash &&
      previous?.processing?.maxSize === settings.maxSize &&
      previous?.processing?.quality === settings.quality &&
      previous?.processing?.format === settings.format &&
      previous?.src === src &&
      previous?.objectPath === objectPath &&
      (await exists(outputPath));

    if (canSkip) {
      const originalDimensions =
        previous.originalWidth && previous.originalHeight
          ? {}
          : await readOriginalDimensions(item.inputPath);
      images[sourceKey] = { ...previous, ...originalDimensions };
      counts.skipped += 1;
      console.log(`skipped   ${sourceKey}`);
      continue;
    }

    const technical = await optimizeImage(item.inputPath, outputPath, settings);
    images[sourceKey] = {
      src,
      objectPath,
      localPath: path.relative(projectRoot, outputPath).split(path.sep).join("/"),
      ...technical,
      sourceHash,
      processing: settings,
    };
    counts.processed += 1;
    console.log(`optimized ${sourceKey} -> ${item.outputName}`);
  }

  const manifest = {
    version: MANIFEST_VERSION,
    slug,
    location,
    kind: "web-derivatives",
    generatedAt:
      counts.processed === 0 && previousManifest?.generatedAt
        ? previousManifest.generatedAt
        : new Date().toISOString(),
    inputDirectory: path.relative(projectRoot, inputDirectory).split(path.sep).join("/"),
    outputDirectory: path.relative(projectRoot, outputDirectory).split(path.sep).join("/"),
    objectPrefix,
    publicBase,
    settings,
    images,
    videos: previousManifest?.videos ?? {},
  };

  const nextJson = `${JSON.stringify(manifest, null, 2)}\n`;
  const previousJson = (await exists(manifestPath))
    ? await readFile(manifestPath, "utf8")
    : null;

  if (previousJson !== nextJson) {
    await writeFile(manifestPath, nextJson);
  }

  console.log(
    `Summary: ${counts.processed} optimized, ${counts.skipped} unchanged, ${inputFiles.length} total.`,
  );
  console.log(`Manifest: ${path.relative(projectRoot, manifestPath)}`);
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
