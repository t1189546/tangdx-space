import { createHash } from "node:crypto";
import { access, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const SUPPORTED_EXTENSIONS = new Set([".jpeg", ".jpg", ".png", ".webp"]);
const MANIFEST_VERSION = 2;
const DEFAULT_MAX_SIZE = 3200;
const DEFAULT_QUALITY = 84;
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

function usage() {
  return `Usage:
  npm run media:optimize -- --input <folder> --slug <slug> [options]

Options:
  --output <folder>     Output folder (default: public/media/<slug>)
  --manifest <file>    Manifest path (default: content/media/<slug>.generated.json)
  --max-size <pixels>  Maximum width or height (default: ${DEFAULT_MAX_SIZE})
  --quality <1-100>    WebP quality (default: ${DEFAULT_QUALITY})
  --force              Reprocess every image
  --help               Show this help`;
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

function toPublicPath(filePath) {
  const publicRoot = path.join(projectRoot, "public");
  const relativePath = path.relative(publicRoot, filePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error("The output folder must be inside public/ so Next.js can serve it.");
  }

  return `/${relativePath.split(path.sep).join("/")}`;
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

  if (!options.input || !options.slug) {
    console.error("Both --input and --slug are required.");
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  const slug = slugify(options.slug);
  const inputDirectory = path.resolve(projectRoot, options.input);
  const outputDirectory = path.resolve(
    projectRoot,
    options.output ?? path.join("public", "media", slug),
  );
  const manifestPath = path.resolve(
    projectRoot,
    options.manifest ?? path.join("content", "media", `${slug}.generated.json`),
  );
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

  const inputFiles = await collectImages(inputDirectory);
  const namedInputs = buildOutputNames(inputFiles, inputDirectory);
  const previousManifest = await readManifest(manifestPath);
  const previousImages = previousManifest?.images ?? {};
  const images = {};
  const counts = { processed: 0, skipped: 0 };
  const publicBase = toPublicPath(outputDirectory);

  for (const item of namedInputs) {
    const sourceKey = item.relativePath.split(path.sep).join("/");
    const outputPath = path.join(outputDirectory, item.outputName);
    const sourceHash = await sha256(item.inputPath);
    const previous = previousImages[sourceKey];
    const canSkip =
      !options.force &&
      previous?.sourceHash === sourceHash &&
      previous?.processing?.maxSize === settings.maxSize &&
      previous?.processing?.quality === settings.quality &&
      previous?.processing?.format === settings.format &&
      previous?.src === `${publicBase}/${item.outputName}` &&
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
      src: `${publicBase}/${item.outputName}`,
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
    generatedAt:
      counts.processed === 0 && previousManifest?.generatedAt
        ? previousManifest.generatedAt
        : new Date().toISOString(),
    inputDirectory: path.relative(projectRoot, inputDirectory).split(path.sep).join("/"),
    outputDirectory: publicBase,
    settings,
    images,
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
