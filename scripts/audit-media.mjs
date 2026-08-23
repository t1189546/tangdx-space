import { spawnSync } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const IMAGE_EXTENSIONS = new Set([".avif", ".heic", ".jpeg", ".jpg", ".png", ".webp"]);
const VIDEO_EXTENSIONS = new Set([".m4v", ".mov", ".mp4", ".webm"]);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

function parseArguments(argumentsList) {
  const options = { dir: "public", limit: 30 };

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--help") return { help: true };
    if (argument !== "--dir" && argument !== "--limit") {
      throw new Error(`Unknown argument: ${argument}`);
    }

    const value = argumentsList[index + 1];
    if (!value) throw new Error(`Missing value for ${argument}`);
    options[argument.slice(2)] = value;
    index += 1;
  }

  options.limit = Number(options.limit);
  if (!Number.isInteger(options.limit) || options.limit < 1) {
    throw new Error("--limit must be a positive integer.");
  }
  return options;
}

async function collectMedia(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const media = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      media.push(...(await collectMedia(entryPath)));
    } else if (
      entry.isFile() &&
      (IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()) ||
        VIDEO_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    ) {
      media.push(entryPath);
    }
  }

  return media;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 ** 2).toFixed(2)} MiB`;
}

function inspectVideo(filePath) {
  const result = spawnSync(
    "ffprobe",
    [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height,codec_name:format=duration,format_name",
      "-of", "json",
      filePath,
    ],
    { encoding: "utf8", windowsHide: true, timeout: 30_000 },
  );
  if (result.error || result.status !== 0) return {};
  try {
    const parsed = JSON.parse(result.stdout);
    return {
      width: parsed.streams?.[0]?.width ?? 0,
      height: parsed.streams?.[0]?.height ?? 0,
      format: parsed.streams?.[0]?.codec_name ?? parsed.format?.format_name ?? "video",
      duration: Number(parsed.format?.duration) || 0,
    };
  } catch {
    return {};
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log("Usage: npm run media:audit -- [--dir <folder>] [--limit <count>]");
    return;
  }

  const root = path.resolve(projectRoot, options.dir);
  if (!(await stat(root)).isDirectory()) throw new Error(`Not a folder: ${root}`);
  const files = await collectMedia(root);
  const records = [];

  for (const filePath of files) {
    try {
      const file = await stat(filePath);
      const extension = path.extname(filePath).toLowerCase();
      if (VIDEO_EXTENSIONS.has(extension)) {
        records.push({
          path: path.relative(projectRoot, filePath).split(path.sep).join("/"),
          bytes: file.size,
          kind: "video",
          ...inspectVideo(filePath),
        });
      } else {
        const metadata = await sharp(filePath).metadata();
        records.push({
          path: path.relative(projectRoot, filePath).split(path.sep).join("/"),
          bytes: file.size,
          kind: "image",
          width: metadata.autoOrient?.width ?? metadata.width ?? 0,
          height: metadata.autoOrient?.height ?? metadata.height ?? 0,
          format: metadata.format ?? "unknown",
          duration: 0,
        });
      }
    } catch (error) {
      console.warn(`Could not inspect ${filePath}: ${error.message}`);
    }
  }

  records.sort((left, right) => right.bytes - left.bytes);
  const totalBytes = records.reduce((sum, record) => sum + record.bytes, 0);
  const oversized = records.filter((record) =>
    record.kind === "video"
      ? record.bytes > 25 * 1024 ** 2
      : record.bytes > 3 * 1024 ** 2 || Math.max(record.width, record.height) > 3200,
  );
  const imageCount = records.filter((record) => record.kind === "image").length;
  const videoCount = records.length - imageCount;

  console.log(`Media audit: ${path.relative(projectRoot, root) || "."}`);
  console.log(`${imageCount} images, ${videoCount} videos, ${formatBytes(totalBytes)} total`);
  console.log(`${oversized.length} files exceed the image (3 MiB/3200 px) or video (25 MiB) threshold`);
  console.log("");
  console.log("Largest media:");
  console.log("Size       Type   Dimensions    Format  Path");

  for (const record of records.slice(0, options.limit)) {
    const size = formatBytes(record.bytes).padEnd(10);
    const dimensions = `${record.width}x${record.height}`.padEnd(13);
    const format = record.format.toUpperCase().padEnd(7);
    console.log(`${size} ${record.kind.padEnd(6)} ${dimensions} ${format} ${record.path}`);
  }
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
