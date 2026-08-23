import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import {
  DEFAULT_PUBLIC_MEDIA_BASE,
  DEFAULT_R2_BUCKET,
  DEFAULT_R2_REMOTE,
  IMMUTABLE_MEDIA_CACHE_CONTROL,
} from "./media-config.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

function usage() {
  return `Usage:
  npm run media:cache:backfill -- --location <path> [options]

Options:
  --remote <name>       Configured rclone remote (default: ${DEFAULT_R2_REMOTE})
  --bucket <name>       Existing R2 bucket (default: ${DEFAULT_R2_BUCKET})
  --public-base <url>   Public media base (default: ${DEFAULT_PUBLIC_MEDIA_BASE})
  --kind <value>        images, videos, or all (default: all)
  --execute             Re-upload verified identical bytes with immutable cache metadata
  --help                Show this help

The default is a dry run. Every remote object must have a byte-identical local
web derivative before execute mode is allowed. No object is deleted.`;
}

function parseArguments(argumentsList) {
  const options = {};
  const valued = new Set([
    "--location",
    "--remote",
    "--bucket",
    "--public-base",
    "--kind",
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

function cleanRelativePath(value, label) {
  const cleaned = value.replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");
  if (!cleaned || cleaned.split("/").includes("..") || path.isAbsolute(cleaned)) {
    throw new Error(`${label} must be a safe relative path.`);
  }
  return cleaned;
}

function cleanRemote(value) {
  const cleaned = value.replace(/:+$/, "");
  if (!/^[a-zA-Z0-9_-]+$/.test(cleaned)) throw new Error("Invalid rclone remote name.");
  return cleaned;
}

function cleanBucket(value) {
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(value)) {
    throw new Error("Invalid R2 bucket name.");
  }
  return value;
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function md5(filePath) {
  const hash = createHash("md5");
  await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return hash.digest("hex");
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

function publicUrl(publicBase, objectPath) {
  return `${publicBase}/${objectPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

async function listRemotePrefix(remoteRoot, prefix) {
  const result = await runRclone(
    [
      "lsjson",
      `${remoteRoot}/${prefix}`,
      "--recursive",
      "--files-only",
      "--hash",
      "--metadata",
      "--s3-no-check-bucket",
    ],
    { capture: true },
  );
  return JSON.parse(result.stdout).map((item) => ({
    ...item,
    objectPath: `${prefix}/${item.Path.replaceAll("\\", "/")}`,
  }));
}

async function findLocalCopy(objectPath) {
  const candidates = [
    path.join(projectRoot, "media-output", "r2", ...objectPath.split("/")),
    path.join(projectRoot, "public", ...objectPath.split("/")),
  ];
  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate;
  }
  return null;
}

function hasImmutableCache(metadata) {
  const value = metadata?.["cache-control"] ?? "";
  return value.includes("max-age=31536000") && value.includes("immutable");
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  if (!options.location) throw new Error(`--location is required.\n\n${usage()}`);

  const location = cleanRelativePath(options.location, "--location");
  const remote = cleanRemote(options.remote ?? DEFAULT_R2_REMOTE);
  const bucket = cleanBucket(options.bucket ?? DEFAULT_R2_BUCKET);
  const publicBase = (options["public-base"] ?? DEFAULT_PUBLIC_MEDIA_BASE).replace(/\/+$/, "");
  if (new URL(publicBase).protocol !== "https:") throw new Error("--public-base must be HTTPS.");
  const kind = options.kind ?? "all";
  if (!new Set(["images", "videos", "all"]).has(kind)) {
    throw new Error("--kind must be images, videos, or all.");
  }
  const remoteRoot = `${remote}:${bucket}`;
  const prefixes = [
    ...(kind === "videos" ? [] : [`images/web/${location}`]),
    ...(kind === "images" ? [] : [`videos/${location}`]),
  ];
  const remoteRecords = (await Promise.all(prefixes.map((prefix) => listRemotePrefix(remoteRoot, prefix)))).flat();
  if (remoteRecords.length === 0) throw new Error(`No public derivatives found for ${location}.`);

  const records = [];
  for (const remoteRecord of remoteRecords) {
    const localPath = await findLocalCopy(remoteRecord.objectPath);
    if (!localPath) throw new Error(`No local web derivative for ${remoteRecord.objectPath}.`);
    const localSize = (await stat(localPath)).size;
    const localHash = await md5(localPath);
    const remoteHash = remoteRecord.Hashes?.md5;
    if (localSize !== remoteRecord.Size || !remoteHash || localHash !== remoteHash) {
      throw new Error(`Local/remote identity mismatch for ${remoteRecord.objectPath}.`);
    }
    records.push({
      objectPath: remoteRecord.objectPath,
      localPath,
      bytes: localSize,
      md5: localHash,
      needsUpdate: !hasImmutableCache(remoteRecord.Metadata),
    });
  }

  const pending = records.filter((record) => record.needsUpdate);
  console.log(`Mode: ${options.execute ? "CACHE BACKFILL" : "DRY RUN"}`);
  console.log(`Verified ${records.length} byte-identical local/R2 derivative(s).`);
  console.log(`Cache metadata updates required: ${pending.length}.`);
  pending.forEach((record) => console.log(record.objectPath));
  if (!options.execute) {
    console.log("Dry run complete. No R2 object was changed.");
    return;
  }

  for (const record of pending) {
    await runRclone([
      "copyto",
      record.localPath,
      `${remoteRoot}/${record.objectPath}`,
      "--ignore-times",
      "--metadata",
      "--metadata-set",
      `cache-control=${IMMUTABLE_MEDIA_CACHE_CONTROL}`,
      "--s3-no-check-bucket",
      "--retries",
      "1",
      "--stats-one-line",
      "-v",
    ]);
  }

  const verifiedRemoteRecords = (
    await Promise.all(prefixes.map((prefix) => listRemotePrefix(remoteRoot, prefix)))
  ).flat();
  const verifiedByPath = new Map(verifiedRemoteRecords.map((item) => [item.objectPath, item]));
  for (const record of records) {
    const remoteRecord = verifiedByPath.get(record.objectPath);
    if (
      !remoteRecord ||
      remoteRecord.Size !== record.bytes ||
      remoteRecord.Hashes?.md5 !== record.md5 ||
      !hasImmutableCache(remoteRecord.Metadata)
    ) {
      throw new Error(`Post-update verification failed for ${record.objectPath}.`);
    }
    const response = await fetch(publicUrl(publicBase, record.objectPath), {
      method: "HEAD",
      signal: AbortSignal.timeout(30_000),
    });
    const cacheControl = response.headers.get("cache-control") ?? "";
    if (
      !response.ok ||
      Number(response.headers.get("content-length")) !== record.bytes ||
      !cacheControl.includes("max-age=31536000") ||
      !cacheControl.includes("immutable")
    ) {
      throw new Error(`Public cache verification failed for ${record.objectPath}.`);
    }
  }
  console.log(`Verified immutable cache metadata for ${records.length} public derivative(s).`);
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
