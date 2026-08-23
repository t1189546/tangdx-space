import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  access,
  constants,
  copyFile,
  mkdir,
  readdir,
  readFile,
  stat,
  utimes,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PHOTO_EXTENSIONS = new Set([".heic", ".jpeg", ".jpg", ".png", ".webp"]);
const VIDEO_EXTENSIONS = new Set([".m4v", ".mov", ".mp4", ".webm"]);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const inboxRoot = path.join(projectRoot, "media-inbox");
const originalsRoot = path.join(projectRoot, "media-originals");

function usage() {
  return `Usage:
  npm run media:archive -- --input <media-inbox folder> --location <path> --prefix <prefix> [--execute|--json]

Example:
  npm run media:archive -- --input "media-inbox/tdp" --location "real/chile/torres-del-paine" --prefix "tdp"

The default is a dry run. --execute copies files into media-originals without
removing or changing the inbox files. Existing destination files are never overwritten.
--json prints the complete dry-run plan for safe orchestration.`;
}

function parseArguments(argumentsList) {
  const options = {};

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--execute" || argument === "--json" || argument === "--help") {
      options[argument.slice(2)] = true;
      continue;
    }
    if (!["--input", "--location", "--prefix"].includes(argument)) {
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

function cleanPrefix(value) {
  const prefix = value.toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(prefix)) {
    throw new Error("--prefix may contain lowercase letters, numbers, and hyphens only.");
  }
  return prefix;
}

function assertInside(parent, candidate, label) {
  const relative = path.relative(parent, candidate);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} must be inside ${displayPath(parent)}.`);
  }
}

function displayPath(filePath) {
  return path.relative(projectRoot, filePath).split(path.sep).join("/");
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(entryPath)));
    else if (entry.isFile()) files.push(entryPath);
  }

  return files;
}

function classify(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (PHOTO_EXTENSIONS.has(extension)) return "photo";
  if (VIDEO_EXTENSIONS.has(extension)) return "video";
  return null;
}

function orderKey(filePath) {
  const name = path.basename(filePath);
  const cameraDate = name.match(/(20\d{2})(\d{2})(\d{2})[_-]?(\d{2})?(\d{2})?(\d{2})?/);
  if (cameraDate) return cameraDate.slice(1).map((part) => part ?? "00").join("");
  const exported = name.match(/mmexport(\d{13})/i);
  if (exported) return new Date(Number(exported[1])).toISOString();
  return `z-${name.toLowerCase()}`;
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

function numberPatterns(prefix) {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return {
    photo: new RegExp(`(?:^|[^a-z0-9])${escaped}-(\\d+)(?=\\D|$)`, "gi"),
    video: new RegExp(`(?:^|[^a-z0-9])${escaped}-v(\\d+)(?=\\D|$)`, "gi"),
    canonicalPhoto: new RegExp(`^${escaped}-(\\d+)(\\.[^.]+)$`, "i"),
    canonicalVideo: new RegExp(`^${escaped}-v(\\d+)(\\.[^.]+)$`, "i"),
  };
}

function addMatches(text, expression, destination) {
  expression.lastIndex = 0;
  for (const match of text.matchAll(expression)) destination.add(Number(match[1]));
}

async function scanReservations(prefix) {
  const patterns = numberPatterns(prefix);
  const photos = new Set();
  const videos = new Set();
  const fileRoots = [originalsRoot, path.join(projectRoot, "public"), path.join(projectRoot, "media-output")];

  for (const root of fileRoots) {
    if (!(await exists(root))) continue;
    for (const filePath of await collectFiles(root)) {
      addMatches(path.basename(filePath), patterns.photo, photos);
      addMatches(path.basename(filePath), patterns.video, videos);
    }
  }

  const contentRoot = path.join(projectRoot, "content");
  if (await exists(contentRoot)) {
    for (const filePath of await collectFiles(contentRoot)) {
      if (!/[.](?:json|js|mjs|ts|tsx)$/i.test(filePath)) continue;
      const text = await readFile(filePath, "utf8");
      addMatches(text, patterns.photo, photos);
      addMatches(text, patterns.video, videos);
    }
  }

  return { patterns, photos, videos };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  if (!options.input || !options.location || !options.prefix) {
    throw new Error(`--input, --location, and --prefix are required.\n\n${usage()}`);
  }
  if (options.execute && options.json) {
    throw new Error("--json is a read-only planning mode and cannot be combined with --execute.");
  }

  const inputDirectory = path.resolve(projectRoot, options.input);
  const location = cleanRelativePath(options.location, "--location");
  const prefix = cleanPrefix(options.prefix);
  const destinationDirectory = path.join(originalsRoot, ...location.split("/"));
  assertInside(inboxRoot, inputDirectory, "--input");
  assertInside(originalsRoot, destinationDirectory, "Destination");

  if (!(await exists(inputDirectory)) || !(await stat(inputDirectory)).isDirectory()) {
    throw new Error(`Inbox folder not found: ${displayPath(inputDirectory)}`);
  }

  const sourceFiles = (await collectFiles(inputDirectory))
    .filter((filePath) => classify(filePath))
    .sort((left, right) => orderKey(left).localeCompare(orderKey(right)) || left.localeCompare(right));
  if (sourceFiles.length === 0) throw new Error("No supported photos or videos were found.");

  const reservations = await scanReservations(prefix);
  for (const sourcePath of sourceFiles) {
    const kind = classify(sourcePath);
    const sourceName = path.basename(sourcePath);
    const canonical = kind === "photo"
      ? sourceName.match(reservations.patterns.canonicalPhoto)
      : sourceName.match(reservations.patterns.canonicalVideo);

    if (canonical) {
      reservations[kind === "photo" ? "photos" : "videos"].add(Number(canonical[1]));
    }
  }
  let nextPhoto = Math.max(-1, ...reservations.photos) + 1;
  let nextVideo = Math.max(0, ...reservations.videos) + 1;
  const destinationFiles = (await exists(destinationDirectory))
    ? await collectFiles(destinationDirectory)
    : [];
  const archiveHashes = new Map();

  for (const filePath of destinationFiles) archiveHashes.set(await sha256(filePath), path.basename(filePath));

  const mapping = [];
  const plannedHashes = new Map();
  const targetNames = new Set();
  const targetIds = new Set();

  for (const sourcePath of sourceFiles) {
    const sourceName = path.basename(sourcePath);
    const kind = classify(sourcePath);
    const sourceHash = await sha256(sourcePath);
    const archivedAs = archiveHashes.get(sourceHash) ?? plannedHashes.get(sourceHash);
    if (archivedAs) {
      mapping.push({ kind, sourcePath, sourceName, targetName: archivedAs, sourceHash, action: "duplicate" });
      continue;
    }

    const canonical = kind === "photo"
      ? sourceName.match(reservations.patterns.canonicalPhoto)
      : sourceName.match(reservations.patterns.canonicalVideo);
    const extension = path.extname(sourceName);
    const targetName = canonical
      ? sourceName
      : kind === "photo"
        ? `${prefix}-${String(nextPhoto++).padStart(3, "0")}${extension}`
        : `${prefix}-v${String(nextVideo++).padStart(3, "0")}${extension}`;
    const targetMatch = kind === "photo"
      ? targetName.match(reservations.patterns.canonicalPhoto)
      : targetName.match(reservations.patterns.canonicalVideo);
    const targetId = `${kind}:${Number(targetMatch?.[1])}`;
    const targetKey = targetName.toLowerCase();
    if (targetNames.has(targetKey)) throw new Error(`Duplicate planned destination: ${targetName}`);
    if (targetIds.has(targetId)) {
      throw new Error(`Duplicate planned canonical ID with different content: ${targetName}`);
    }
    targetNames.add(targetKey);
    targetIds.add(targetId);

    const targetPath = path.join(destinationDirectory, targetName);
    let action = "copy";
    if (await exists(targetPath)) {
      if ((await sha256(targetPath)) !== sourceHash) {
        throw new Error(`Destination collision with different content: ${displayPath(targetPath)}`);
      }
      action = "existing";
    }

    plannedHashes.set(sourceHash, targetName);
    mapping.push({ kind, sourcePath, sourceName, targetName, targetPath, sourceHash, action });
  }

  if (options.json) {
    console.log(JSON.stringify({
      version: 1,
      input: displayPath(inputDirectory),
      location,
      prefix,
      destination: displayPath(destinationDirectory),
      highestReservedPhoto: Math.max(-1, ...reservations.photos),
      highestReservedVideo: Math.max(0, ...reservations.videos),
      items: mapping.map((item) => ({
        kind: item.kind,
        source: displayPath(item.sourcePath),
        sourceName: item.sourceName,
        targetName: item.targetName,
        sourceHash: item.sourceHash,
        action: item.action,
      })),
    }, null, 2));
    return;
  }

  console.log(`Mode: ${options.execute ? "COPY" : "DRY RUN"}`);
  console.log(`Inbox: ${displayPath(inputDirectory)}`);
  console.log(`Archive: ${displayPath(destinationDirectory)}`);
  for (const item of mapping) {
    console.log(`${item.action.padEnd(9)} ${displayPath(item.sourcePath)} -> ${item.targetName}`);
  }

  if (!options.execute) {
    console.log("Dry run complete. No files were copied, renamed, moved, or deleted.");
    return;
  }

  await mkdir(destinationDirectory, { recursive: true });
  for (const item of mapping.filter((entry) => entry.action === "copy")) {
    const sourceStat = await stat(item.sourcePath);
    await copyFile(item.sourcePath, item.targetPath, constants.COPYFILE_EXCL);
    await utimes(item.targetPath, sourceStat.atime, sourceStat.mtime);
    if ((await sha256(item.targetPath)) !== item.sourceHash) {
      throw new Error(`Copy verification failed: ${displayPath(item.targetPath)}`);
    }
  }

  const copied = mapping.filter((item) => item.action === "copy").length;
  const skipped = mapping.length - copied;
  console.log(`Summary: ${copied} copied, ${skipped} already archived or duplicate.`);
  console.log("Inbox files were preserved unchanged.");
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
