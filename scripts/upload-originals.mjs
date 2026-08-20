import { spawn } from "node:child_process";
import { access, mkdtemp, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_REMOTE = "r2";
const DEFAULT_BUCKET = "tangdx-media";
const DEFAULT_PUBLIC_BASE =
  "https://pub-bc309b6cc7544045880a4388016510ba.r2.dev";
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

function usage() {
  return `Usage:
  npm run media:upload-originals -- --slug <slug> [options]

Options:
  --input <folder>       Original folder (default: manifest inputDirectory)
  --manifest <file>      Manifest (default: content/media/<slug>.generated.json)
  --remote <name>        rclone remote (default: ${DEFAULT_REMOTE})
  --bucket <name>        R2 bucket (default: ${DEFAULT_BUCKET})
  --prefix <path>        Object prefix (default: inferred from media-originals/)
  --public-base <url>    Public R2 base URL (default: existing r2.dev hostname)
  --include-posters      Include files ending in -poster
  --execute              Upload and update originalSrc (default: dry run)
  --help                 Show this help

The command uses rclone copy with --immutable. It never syncs, mirrors, deletes,
resizes, recompresses, or changes the original files.`;
}

function parseArguments(argumentsList) {
  const options = {};

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];

    if (["--execute", "--help", "--include-posters"].includes(argument)) {
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

function cleanSlug(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "photos";
}

function cleanRemoteName(value) {
  const remote = value.replace(/:+$/, "");
  if (!/^[a-zA-Z0-9_-]+$/.test(remote)) {
    throw new Error("--remote must be a simple configured rclone remote name.");
  }
  return remote;
}

function cleanBucket(value) {
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(value)) {
    throw new Error("--bucket is not a valid R2 bucket name.");
  }
  return value;
}

function cleanPrefix(value) {
  const prefix = value.replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");
  if (!prefix || prefix.split("/").includes("..")) {
    throw new Error("--prefix must be a safe relative object path.");
  }
  return prefix;
}

function inferPrefix(inputDirectory) {
  const originalsRoot = path.join(projectRoot, "media-originals");
  const relative = path.relative(originalsRoot, inputDirectory);

  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(
      "Cannot infer the R2 prefix. Keep originals under media-originals/ or pass --prefix.",
    );
  }

  return cleanPrefix(`images/originals/${relative.split(path.sep).join("/")}`);
}

function publicUrl(publicBase, objectPath) {
  const encodedPath = objectPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${publicBase}/${encodedPath}`;
}

function formatMiB(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function runRclone(argumentsList, { capture = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn("rclone", argumentsList, {
      cwd: projectRoot,
      shell: false,
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    let stdout = "";
    let stderr = "";

    if (capture) {
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
      });
    }

    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(stderr.trim() || `rclone exited with code ${code}`));
      }
    });
  });
}

async function writeManifestSafely(manifestPath, manifest) {
  const temporaryPath = `${manifestPath}.uploading`;
  await writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await rename(temporaryPath, manifestPath);
}

async function main() {
  const options = parseArguments(process.argv.slice(2));

  if (options.help) {
    console.log(usage());
    return;
  }

  if (!options.slug) {
    throw new Error(`--slug is required.\n\n${usage()}`);
  }

  const slug = cleanSlug(options.slug);
  const manifestPath = path.resolve(
    projectRoot,
    options.manifest ?? path.join("content", "media", `${slug}.generated.json`),
  );

  if (!(await exists(manifestPath))) {
    throw new Error(`Manifest not found: ${manifestPath}`);
  }

  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const inputDirectory = path.resolve(
    projectRoot,
    options.input ?? manifest.inputDirectory ?? "",
  );

  if (!(await exists(inputDirectory)) || !(await stat(inputDirectory)).isDirectory()) {
    throw new Error(`Original input folder not found: ${inputDirectory}`);
  }

  const remote = cleanRemoteName(options.remote ?? DEFAULT_REMOTE);
  const bucket = cleanBucket(options.bucket ?? DEFAULT_BUCKET);
  const prefix = options.prefix
    ? cleanPrefix(options.prefix)
    : inferPrefix(inputDirectory);
  const publicBase = (options["public-base"] ?? DEFAULT_PUBLIC_BASE).replace(/\/+$/, "");
  const parsedPublicBase = new URL(publicBase);
  if (parsedPublicBase.protocol !== "https:") {
    throw new Error("--public-base must be an HTTPS URL.");
  }

  const remotes = await runRclone(["listremotes"], { capture: true });
  if (!remotes.stdout.split(/\r?\n/).includes(`${remote}:`)) {
    throw new Error(`Configured rclone remote not found: ${remote}:`);
  }

  const photos = [];
  for (const [sourceKey, metadata] of Object.entries(manifest.images ?? {})) {
    if (!options["include-posters"] && /-poster(?:\.[^./]+)?$/i.test(sourceKey)) {
      continue;
    }
    if (!/\.jpe?g$/i.test(sourceKey)) {
      continue;
    }

    const sourcePath = path.resolve(inputDirectory, sourceKey);
    const relative = path.relative(inputDirectory, sourcePath);
    if (relative.startsWith("..") || path.isAbsolute(relative) || !(await exists(sourcePath))) {
      throw new Error(`Missing or unsafe original path: ${sourceKey}`);
    }

    const fileStat = await stat(sourcePath);
    photos.push({ sourceKey: sourceKey.replaceAll("\\", "/"), metadata, bytes: fileStat.size });
  }

  const totalBytes = photos.reduce((sum, photo) => sum + photo.bytes, 0);
  const remotePath = `${remote}:${bucket}/${prefix}`;

  console.log(`Bucket: ${bucket}`);
  console.log(`Prefix: ${prefix}/`);
  console.log(`Original folder: ${path.relative(projectRoot, inputDirectory)}`);
  console.log(`Plan: ${photos.length} JPEG file(s), ${totalBytes} bytes (${formatMiB(totalBytes)}).`);
  console.log(`Mode: ${options.execute ? "UPLOAD" : "DRY RUN"}`);

  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "tangdx-r2-"));
  const filesFromPath = path.join(temporaryDirectory, "originals.txt");

  try {
    await writeFile(filesFromPath, `${photos.map((photo) => photo.sourceKey).join("\n")}\n`);
    const copyArguments = [
      "copy",
      inputDirectory,
      remotePath,
      "--files-from-raw",
      filesFromPath,
      "--immutable",
      "--size-only",
      "--no-traverse",
      "--s3-no-check-bucket",
      "--retries",
      "1",
      "--transfers",
      "4",
      "--checkers",
      "8",
      "--stats-one-line",
      "--stats",
      "5s",
      "-v",
    ];
    if (!options.execute) copyArguments.push("--dry-run");

    await runRclone(copyArguments);

    if (!options.execute) {
      console.log("Dry run complete. No R2 objects or manifests were changed.");
      console.log("Run again with --execute after reviewing the bucket, prefix, count, and bytes.");
      return;
    }

    const listing = await runRclone(
      ["lsjson", remotePath, "--files-only", "--recursive", "--s3-no-check-bucket"],
      { capture: true },
    );
    const remoteFiles = new Map(
      JSON.parse(listing.stdout).map((item) => [item.Path.replaceAll("\\", "/"), item.Size]),
    );
    const mismatches = photos.filter(
      (photo) => remoteFiles.get(photo.sourceKey) !== photo.bytes,
    );

    if (mismatches.length > 0) {
      throw new Error(
        `R2 verification failed for: ${mismatches.map((photo) => photo.sourceKey).join(", ")}`,
      );
    }

    for (const photo of photos) {
      const objectPath = `${prefix}/${photo.sourceKey}`;
      manifest.images[photo.sourceKey] = {
        ...photo.metadata,
        originalSrc: publicUrl(publicBase, objectPath),
        originalPathname: objectPath,
        originalBytes: photo.bytes,
        originalUploadedHash: photo.metadata.sourceHash,
      };
    }
    manifest.version = Math.max(Number(manifest.version) || 1, 2);
    await writeManifestSafely(manifestPath, manifest);

    console.log(`Verified: ${photos.length} remote object(s), all sizes match local originals.`);
    console.log(`Updated manifest: ${path.relative(projectRoot, manifestPath)}`);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
