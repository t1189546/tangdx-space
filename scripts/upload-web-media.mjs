import { spawn } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_PUBLIC_MEDIA_BASE,
  DEFAULT_R2_BUCKET,
  DEFAULT_R2_REMOTE,
  IMMUTABLE_MEDIA_CACHE_CONTROL,
} from "./media-config.mjs";

const DEFAULT_REMOTE = DEFAULT_R2_REMOTE;
const DEFAULT_BUCKET = DEFAULT_R2_BUCKET;
const DEFAULT_PUBLIC_BASE = DEFAULT_PUBLIC_MEDIA_BASE;
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const stagingRoot = path.join(projectRoot, "media-output", "r2");

function usage() {
  return `Usage:
  npm run media:upload -- --location <path> [options]

Options:
  --slug <slug>         Manifest name (default: final location segment)
  --manifest <file>     Staging manifest (default: media-output/manifests/<slug>.json)
  --metadata <file>     Tracked technical metadata (default: content/media/<slug>.generated.json)
  --remote <name>       Configured rclone remote (default: ${DEFAULT_REMOTE})
  --bucket <name>       Existing R2 bucket (default: ${DEFAULT_BUCKET})
  --public-base <url>   Public R2 base URL (default: ${DEFAULT_PUBLIC_BASE})
  --execute             Upload, verify, and merge technical metadata
  --help                Show this help

The default is a dry run. The command uploads only files staged under
media-output/r2/ and uses rclone --immutable so existing objects are never replaced.
New public derivatives receive Cache-Control: ${IMMUTABLE_MEDIA_CACHE_CONTROL}.`;
}

function parseArguments(argumentsList) {
  const options = {};
  const valued = new Set([
    "--location",
    "--slug",
    "--manifest",
    "--metadata",
    "--remote",
    "--bucket",
    "--public-base",
  ]);

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--execute" || argument === "--help") {
      options[argument.slice(2)] = true;
      continue;
    }
    if (!valued.has(argument)) throw new Error(`Unknown argument: ${argument}`);
    const value = argumentsList[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${argument}`);
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
    .replace(/^-+|-+$/g, "") || "media";
}

function cleanRelativePath(value, label) {
  const cleaned = value.replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");
  if (!cleaned || cleaned.split("/").includes("..") || path.isAbsolute(cleaned)) {
    throw new Error(`${label} must be a safe relative path.`);
  }
  return cleaned;
}

function cleanRemote(value) {
  const remote = value.replace(/:+$/, "");
  if (!/^[a-zA-Z0-9_-]+$/.test(remote)) throw new Error("Invalid rclone remote name.");
  return remote;
}

function cleanBucket(value) {
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(value)) {
    throw new Error("Invalid R2 bucket name.");
  }
  return value;
}

function displayPath(filePath) {
  return path.relative(projectRoot, filePath).split(path.sep).join("/");
}

function publicUrl(publicBase, objectPath) {
  const encoded = objectPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${publicBase}/${encoded}`;
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
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    if (capture) {
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk) => { stdout += chunk; });
      child.stderr.on("data", (chunk) => { stderr += chunk; });
    }
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr.trim() || `rclone exited with code ${code}`));
    });
  });
}

async function writeJsonSafely(filePath, value) {
  const temporaryPath = `${filePath}.uploading`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporaryPath, filePath);
}

async function verifyPublicUrls(records) {
  const failures = [];
  for (let index = 0; index < records.length; index += 6) {
    const batch = records.slice(index, index + 6);
    const results = await Promise.all(batch.map(async (record) => {
      try {
        const response = await fetch(record.src, {
          method: "HEAD",
          signal: AbortSignal.timeout(30_000),
        });
        const contentLength = Number(response.headers.get("content-length"));
        const cacheControl = response.headers.get("cache-control") ?? "";
        return (
          response.ok &&
          (!contentLength || contentLength === record.bytes) &&
          cacheControl.includes("max-age=31536000") &&
          cacheControl.includes("immutable")
        );
      } catch {
        return false;
      }
    }));
    results.forEach((ok, offset) => {
      if (!ok) failures.push(batch[offset].objectPath);
    });
  }
  if (failures.length > 0) {
    throw new Error(`Public URL verification failed for: ${failures.join(", ")}`);
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  if (!options.location && !options.manifest) {
    throw new Error(`--location or --manifest is required.\n\n${usage()}`);
  }

  const requestedLocation = options.location
    ? cleanRelativePath(options.location, "--location")
    : null;
  const slug = slugify(options.slug ?? requestedLocation?.split("/").at(-1) ?? "media");
  const manifestPath = path.resolve(
    projectRoot,
    options.manifest ?? path.join("media-output", "manifests", `${slug}.json`),
  );
  if (!(await exists(manifestPath))) throw new Error(`Staging manifest not found: ${displayPath(manifestPath)}`);

  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const location = cleanRelativePath(requestedLocation ?? manifest.location, "Manifest location");
  if (manifest.location && cleanRelativePath(manifest.location, "Manifest location") !== location) {
    throw new Error("--location does not match the staging manifest.");
  }

  const remote = cleanRemote(options.remote ?? DEFAULT_REMOTE);
  const bucket = cleanBucket(options.bucket ?? DEFAULT_BUCKET);
  const publicBase = (options["public-base"] ?? manifest.publicBase ?? DEFAULT_PUBLIC_BASE).replace(/\/+$/, "");
  if (new URL(publicBase).protocol !== "https:") throw new Error("--public-base must be HTTPS.");

  const records = [];
  for (const [sourceKey, metadata] of Object.entries(manifest.images ?? {})) {
    records.push({ kind: "image", sourceKey, metadata });
  }
  for (const [sourceKey, metadata] of Object.entries(manifest.videos ?? {})) {
    records.push({ kind: "video", sourceKey, metadata });
  }
  if (records.length === 0) throw new Error("The staging manifest contains no media files.");

  for (const record of records) {
    record.objectPath = cleanRelativePath(record.metadata.objectPath, "objectPath");
    record.localPath = path.resolve(projectRoot, record.metadata.localPath ?? path.join("media-output", "r2", record.objectPath));
    const relative = path.relative(stagingRoot, record.localPath);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error(`Staged file is outside media-output/r2: ${displayPath(record.localPath)}`);
    }
    if (relative.split(path.sep).join("/") !== record.objectPath) {
      throw new Error(`Staged path does not match R2 object path: ${record.objectPath}`);
    }
    if (!(await exists(record.localPath))) throw new Error(`Missing staged file: ${displayPath(record.localPath)}`);
    record.bytes = (await stat(record.localPath)).size;
    record.src = publicUrl(publicBase, record.objectPath);
  }

  const remotes = await runRclone(["listremotes"], { capture: true });
  if (!remotes.stdout.split(/\r?\n/).includes(`${remote}:`)) {
    throw new Error(`Configured rclone remote not found: ${remote}:`);
  }

  console.log(`Mode: ${options.execute ? "UPLOAD" : "DRY RUN"}`);
  console.log(`Bucket: ${bucket}`);
  console.log(`Location: ${location}`);
  console.log(`Plan: ${records.length} web derivative(s).`);
  records.forEach((record) => console.log(`${record.kind.padEnd(6)} ${record.objectPath}`));

  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "tangdx-web-media-"));
  const filesFromPath = path.join(temporaryDirectory, "files.txt");
  const remoteRoot = `${remote}:${bucket}`;

  try {
    await writeFile(filesFromPath, `${records.map((record) => record.objectPath).join("\n")}\n`);
    const copyArguments = [
      "copy",
      stagingRoot,
      remoteRoot,
      "--files-from-raw",
      filesFromPath,
      "--immutable",
      "--metadata",
      "--metadata-set",
      `cache-control=${IMMUTABLE_MEDIA_CACHE_CONTROL}`,
      "--no-traverse",
      "--s3-no-check-bucket",
      "--retries",
      "1",
      "--transfers",
      "4",
      "--checkers",
      "8",
      "--stats-one-line",
      "-v",
    ];
    if (!options.execute) copyArguments.push("--dry-run");
    await runRclone(copyArguments);

    if (!options.execute) {
      console.log("Dry run complete. No R2 objects or tracked metadata were changed.");
      return;
    }

    const listing = await runRclone(
      ["lsjson", remoteRoot, "--files-only", "--recursive", "--s3-no-check-bucket"],
      { capture: true },
    );
    const remoteFiles = new Map(
      JSON.parse(listing.stdout).map((item) => [item.Path.replaceAll("\\", "/"), item.Size]),
    );
    const mismatches = records.filter((record) => remoteFiles.get(record.objectPath) !== record.bytes);
    if (mismatches.length > 0) {
      throw new Error(`R2 size verification failed for: ${mismatches.map((item) => item.objectPath).join(", ")}`);
    }
    await verifyPublicUrls(records);

    const metadataPath = path.resolve(
      projectRoot,
      options.metadata ?? path.join("content", "media", `${slug}.generated.json`),
    );
    const current = (await exists(metadataPath))
      ? JSON.parse(await readFile(metadataPath, "utf8"))
      : { version: 3, slug, images: {} };
    const next = {
      ...current,
      version: Math.max(Number(current.version) || 1, 3),
      slug,
      location,
      generatedAt: new Date().toISOString(),
      delivery: {
        provider: "cloudflare-r2",
        bucket,
        publicBase,
        cacheControl: IMMUTABLE_MEDIA_CACHE_CONTROL,
      },
      images: { ...(current.images ?? {}) },
      videos: { ...(current.videos ?? {}) },
    };

    for (const record of records) {
      const destination = record.kind === "image" ? next.images : next.videos;
      const technical = { ...record.metadata };
      delete technical.localPath;
      destination[record.sourceKey] = {
        ...(destination[record.sourceKey] ?? {}),
        ...technical,
        src: record.src,
        objectPath: record.objectPath,
        bytes: record.bytes,
      };
    }
    await mkdir(path.dirname(metadataPath), { recursive: true });
    await writeJsonSafely(metadataPath, next);
    console.log(`Verified ${records.length} R2 object(s) and public URL(s).`);
    console.log(`Updated technical metadata: ${displayPath(metadataPath)}`);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
