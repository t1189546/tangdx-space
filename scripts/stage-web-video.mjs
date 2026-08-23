import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, constants, copyFile, mkdir, readFile, rename, stat, utimes, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_PUBLIC_MEDIA_BASE } from "./media-config.mjs";
import { stageVideoPoster } from "./generate-video-poster.mjs";

const VIDEO_EXTENSIONS = new Set([".m4v", ".mp4", ".webm"]);
const DEFAULT_PUBLIC_BASE = DEFAULT_PUBLIC_MEDIA_BASE;
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const videoReadyRoot = path.join(projectRoot, "media-output", "video-ready");

function usage() {
  return `Usage:
  npm run media:stage-video -- --input <web playback copy> --location <path> [options]

Options:
  --name <filename>    Destination filename (default: input filename)
  --slug <slug>        Manifest name (default: final location segment)
  --manifest <file>    Staging manifest (default: media-output/manifests/<slug>.json)
  --execute            Copy and update the staging manifest

The input must already be a browser-ready derivative under media-output/video-ready/.
This command does not encode video, refuses files from media-originals/, and
automatically generates a WebP poster from the final playback MP4.`;
}

function parseArguments(argumentsList) {
  const options = {};
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--execute" || argument === "--help") {
      options[argument.slice(2)] = true;
      continue;
    }
    if (!["--input", "--location", "--name", "--slug", "--manifest"].includes(argument)) {
      throw new Error(`Unknown argument: ${argument}`);
    }
    const value = argumentsList[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${argument}`);
    options[argument.slice(2)] = value;
    index += 1;
  }
  return options;
}

function cleanRelativePath(value, label) {
  const cleaned = value.replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");
  if (!cleaned || cleaned.split("/").includes("..") || path.isAbsolute(cleaned)) {
    throw new Error(`${label} must be a safe relative path.`);
  }
  return cleaned;
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "media";
}

function displayPath(filePath) {
  return path.relative(projectRoot, filePath).split(path.sep).join("/");
}

async function exists(filePath) {
  try { await access(filePath); return true; } catch { return false; }
}

async function sha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

async function writeJsonSafely(filePath, value) {
  const temporaryPath = `${filePath}.staging`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporaryPath, filePath);
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) { console.log(usage()); return; }
  if (!options.input || !options.location) throw new Error(`--input and --location are required.\n\n${usage()}`);

  const inputPath = path.resolve(projectRoot, options.input);
  const relativeInput = path.relative(videoReadyRoot, inputPath);
  if (!relativeInput || relativeInput.startsWith("..") || path.isAbsolute(relativeInput)) {
    throw new Error("--input must be an already processed file under media-output/video-ready/.");
  }
  if (!(await exists(inputPath)) || !(await stat(inputPath)).isFile()) {
    throw new Error(`Video derivative not found: ${displayPath(inputPath)}`);
  }

  const location = cleanRelativePath(options.location, "--location");
  const slug = slugify(options.slug ?? location.split("/").at(-1));
  const targetName = path.basename(options.name ?? inputPath);
  if (targetName !== (options.name ?? path.basename(inputPath))) throw new Error("--name must be a filename only.");
  if (!VIDEO_EXTENSIONS.has(path.extname(targetName).toLowerCase())) {
    throw new Error("The web video must use .mp4, .m4v, or .webm.");
  }

  const objectPath = `videos/${location}/${targetName}`;
  const targetPath = path.join(projectRoot, "media-output", "r2", ...objectPath.split("/"));
  const manifestPath = path.resolve(
    projectRoot,
    options.manifest ?? path.join("media-output", "manifests", `${slug}.json`),
  );
  const sourceHash = await sha256(inputPath);
  const sourceStat = await stat(inputPath);

  if (await exists(targetPath)) {
    if ((await sha256(targetPath)) !== sourceHash) {
      throw new Error(`Destination collision: ${displayPath(targetPath)}`);
    }
  }

  console.log(`Mode: ${options.execute ? "STAGE" : "DRY RUN"}`);
  console.log(`${displayPath(inputPath)} -> ${objectPath}`);
  await stageVideoPoster({
    execute: false,
    inputPath,
    location,
    manifestPath,
    publicBase: DEFAULT_PUBLIC_BASE,
    slug,
  });
  if (!options.execute) {
    console.log("Dry run complete. No file or manifest was changed.");
    return;
  }

  await mkdir(path.dirname(targetPath), { recursive: true });
  if (!(await exists(targetPath))) {
    await copyFile(inputPath, targetPath, constants.COPYFILE_EXCL);
    await utimes(targetPath, sourceStat.atime, sourceStat.mtime);
  }
  if ((await sha256(targetPath)) !== sourceHash) throw new Error("Staged video hash verification failed.");

  await mkdir(path.dirname(manifestPath), { recursive: true });
  const manifest = (await exists(manifestPath))
    ? JSON.parse(await readFile(manifestPath, "utf8"))
    : { version: 3, slug, location, kind: "web-derivatives", images: {}, videos: {} };
  if (manifest.location && manifest.location !== location) throw new Error("Manifest location mismatch.");
  manifest.version = Math.max(Number(manifest.version) || 1, 3);
  manifest.slug = slug;
  manifest.location = location;
  manifest.publicBase = manifest.publicBase ?? DEFAULT_PUBLIC_BASE;
  manifest.videos = manifest.videos ?? {};
  manifest.videos[targetName] = {
    src: `${manifest.publicBase.replace(/\/+$/, "")}/${objectPath}`,
    objectPath,
    localPath: displayPath(targetPath),
    bytes: sourceStat.size,
    sourceHash,
    processing: { format: "prebuilt-browser-video" },
  };
  await writeJsonSafely(manifestPath, manifest);
  await stageVideoPoster({
    execute: true,
    inputPath,
    location,
    manifestPath,
    publicBase: manifest.publicBase,
    slug,
  });
  console.log(`Staged video and updated ${displayPath(manifestPath)}.`);
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
