import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const SUPPORTED_EXTENSIONS = new Set([".avif", ".jpeg", ".jpg", ".png", ".webp"]);
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

async function collectImages(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
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

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 ** 2).toFixed(2)} MiB`;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log("Usage: npm run media:audit -- [--dir <folder>] [--limit <count>]");
    return;
  }

  const root = path.resolve(projectRoot, options.dir);
  if (!(await stat(root)).isDirectory()) throw new Error(`Not a folder: ${root}`);
  const files = await collectImages(root);
  const records = [];

  for (const filePath of files) {
    try {
      const [file, metadata] = await Promise.all([stat(filePath), sharp(filePath).metadata()]);
      records.push({
        path: path.relative(projectRoot, filePath).split(path.sep).join("/"),
        bytes: file.size,
        width: metadata.autoOrient?.width ?? metadata.width ?? 0,
        height: metadata.autoOrient?.height ?? metadata.height ?? 0,
        format: metadata.format ?? "unknown",
      });
    } catch (error) {
      console.warn(`Could not inspect ${filePath}: ${error.message}`);
    }
  }

  records.sort((left, right) => right.bytes - left.bytes);
  const totalBytes = records.reduce((sum, record) => sum + record.bytes, 0);
  const oversized = records.filter(
    (record) => record.bytes > 3 * 1024 ** 2 || Math.max(record.width, record.height) > 3200,
  );

  console.log(`Media audit: ${path.relative(projectRoot, root) || "."}`);
  console.log(`${records.length} images, ${formatBytes(totalBytes)} total`);
  console.log(`${oversized.length} images exceed 3 MiB or 3200 px on the long edge`);
  console.log("");
  console.log("Largest images:");
  console.log("Size       Dimensions    Format  Path");

  for (const record of records.slice(0, options.limit)) {
    const size = formatBytes(record.bytes).padEnd(10);
    const dimensions = `${record.width}x${record.height}`.padEnd(13);
    const format = record.format.toUpperCase().padEnd(7);
    console.log(`${size} ${dimensions} ${format} ${record.path}`);
  }
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
