import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { preparePosters, watchPosters } from "./prepare-video-posters.mjs";
import {
  DEFAULT_PUBLIC_MEDIA_BASE,
  DEFAULT_R2_BUCKET,
  DEFAULT_R2_REMOTE,
} from "./media-config.mjs";

const DEFAULT_REMOTE = DEFAULT_R2_REMOTE;
const DEFAULT_BUCKET = DEFAULT_R2_BUCKET;
const DEFAULT_PUBLIC_BASE = DEFAULT_PUBLIC_MEDIA_BASE;
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const videoReadyRoot = path.join(projectRoot, "media-output", "video-ready");

function usage() {
  return `Usage:
  npm run media:batch -- --input <media-inbox folder> --location <path> --prefix <prefix> [options]

Options:
  --slug <slug>          Manifest/page slug (default: final location segment)
  --video-ready <folder> Browser-ready video folder (default: media-output/video-ready/<slug>)
  --remote <name>        Configured rclone remote (default: ${DEFAULT_REMOTE})
  --bucket <name>        Existing R2 bucket (default: ${DEFAULT_BUCKET})
  --public-base <url>    Public R2 URL (default: ${DEFAULT_PUBLIC_BASE})
  --execute              Archive, optimize, stage, upload, verify, and update metadata
  --prepare-only         With --execute: archive/prepare locally, never contact R2
  --posters              Prepare posters from configured playback collections (local-only)
  --only <id,id>         In --posters mode, select video IDs (or location/ID)
  --poster-time <sec>    In --posters mode, explicitly override the frame time
  --config <file>        Poster collection config (default: content/media/video-posters.config.json)
  --force               Rebuild posters even if fingerprint is unchanged
  --watch               In --posters --execute mode, watch stable local files
  --dry-run             Explicit no-write mode
  --no-preview          Do not add prepared posters to the local preview index
  --help                 Show this help

The default is a fail-closed dry run. Originals are copied, never moved or
overwritten. Video originals require a matching browser-ready .mp4 derivative
before execute mode is allowed.`;
}

function parseArguments(argumentsList) {
  const options = {};
  const valued = new Set([
    "--input",
    "--location",
    "--prefix",
    "--slug",
    "--video-ready",
    "--remote",
    "--bucket",
    "--public-base",
    "--only", "--config", "--poster-time",
  ]);

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (["--execute", "--help", "--posters", "--prepare-only", "--force", "--watch", "--dry-run", "--no-preview"].includes(argument)) {
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

function cleanName(value, label) {
  const cleaned = value.toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleaned)) {
    throw new Error(`${label} may contain lowercase letters, numbers, and hyphens only.`);
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

function displayPath(filePath) {
  return path.relative(projectRoot, filePath).split(path.sep).join("/");
}

function assertInside(parent, candidate, label) {
  const relative = path.relative(parent, candidate);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} must be inside ${displayPath(parent)}.`);
  }
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
  return new Promise((resolve, reject) => {
    const hash = createHash("md5");
    const stream = createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

async function verifyBrowserVideo(filePath) {
  const result = await run(
    "ffprobe",
    [
      "-v", "error",
      "-show_entries", "stream=codec_type,codec_name,pix_fmt:format=format_name,duration",
      "-of", "json",
      filePath,
    ],
    { capture: true },
  );
  const probe = JSON.parse(result.stdout);
  const videoStream = probe.streams?.find((stream) => stream.codec_type === "video");
  const audioStreams = probe.streams?.filter((stream) => stream.codec_type === "audio") ?? [];
  const isMp4 = probe.format?.format_name?.split(",").includes("mp4");
  const isBrowserVideo =
    isMp4 &&
    videoStream?.codec_name === "h264" &&
    videoStream?.pix_fmt === "yuv420p" &&
    audioStreams.every((stream) => stream.codec_name === "aac");

  if (!isBrowserVideo) {
    throw new Error(
      `Video derivative is not the required MP4 H.264/yuv420p + AAC playback format: ${displayPath(filePath)}`,
    );
  }
}

async function run(command, argumentsList, { capture = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, argumentsList, {
      cwd: projectRoot,
      env: process.env,
      shell: false,
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    let stdout = "";
    let stderr = "";
    if (capture) {
      child.stdout.on("data", (chunk) => { stdout += chunk; });
      child.stderr.on("data", (chunk) => { stderr += chunk; });
    }
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr.trim() || stdout.trim() || `${command} exited with code ${code}`));
    });
  });
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  if (options["dry-run"]) options.execute = false;
  if (options.posters) {
    if (options.watch) return watchPosters(options);
    const result = await preparePosters(options);
    if (result.counts.failed) process.exitCode = 1;
    return;
  }
  if (options.watch || options.only || options.force || options["poster-time"]) throw new Error("Poster selection/watch options require --posters");
  if (!options.input || !options.location || !options.prefix) {
    throw new Error(`--input, --location, and --prefix are required.\n\n${usage()}`);
  }

  const input = cleanRelativePath(options.input, "--input");
  const location = cleanRelativePath(options.location, "--location");
  const prefix = cleanName(options.prefix, "--prefix");
  const slug = cleanName(options.slug ?? location.split("/").at(-1), "--slug");
  const remote = cleanRemote(options.remote ?? DEFAULT_REMOTE);
  const bucket = cleanBucket(options.bucket ?? DEFAULT_BUCKET);
  const publicBase = (options["public-base"] ?? DEFAULT_PUBLIC_BASE).replace(/\/+$/, "");
  if (new URL(publicBase).protocol !== "https:") throw new Error("--public-base must be HTTPS.");

  const readyDirectory = path.resolve(
    projectRoot,
    options["video-ready"] ?? path.join("media-output", "video-ready", slug),
  );
  assertInside(videoReadyRoot, readyDirectory, "--video-ready");

  const archiveArguments = [
    path.join(scriptDirectory, "archive-media.mjs"),
    "--input", input,
    "--location", location,
    "--prefix", prefix,
    "--json",
  ];
  const archiveResult = await run(process.execPath, archiveArguments, { capture: true });
  const plan = JSON.parse(archiveResult.stdout);
  const plannedCopies = plan.items.filter((item) => item.action === "copy");
  const plannedPhotos = plannedCopies.filter((item) => item.kind === "photo");
  const plannedVideos = plannedCopies.filter((item) => item.kind === "video");

  const remoteRoot = `${remote}:${bucket}`;
  const remoteListing = options["prepare-only"] ? { stdout: "[]" } : await run(
    "rclone",
    ["lsjson", remoteRoot, "--recursive", "--files-only", "--hash", "--s3-no-check-bucket"],
    { capture: true },
  );
  const remoteFiles = new Map(
    JSON.parse(remoteListing.stdout).map((item) => [item.Path.replaceAll("\\", "/"), item]),
  );
  const metadataPath = path.join(projectRoot, "content", "media", `${slug}.generated.json`);
  const metadata = (await exists(metadataPath))
    ? JSON.parse(await readFile(metadataPath, "utf8"))
    : { images: {}, videos: {} };

  const photoUploads = [];
  for (const item of plannedPhotos) {
    const outputName = `${path.parse(item.targetName).name.toLowerCase()}.webp`;
    const objectPath = `images/web/${location}/${outputName}`;
    const remoteFile = remoteFiles.get(objectPath);
    if (!remoteFile) {
      photoUploads.push(item);
      continue;
    }

    const current = metadata.images?.[item.targetName];
    if (current?.sourceHash !== item.sourceHash || current?.objectPath !== objectPath) {
      throw new Error(`R2 photo collision without matching technical metadata: ${objectPath}`);
    }
  }

  const videoUploads = [];
  for (const item of plannedVideos) {
    const canonicalId = path.parse(item.targetName).name;
    const outputName = `${canonicalId}.mp4`;
    const objectPath = `videos/${location}/${outputName}`;
    const remoteFile = remoteFiles.get(objectPath);
    const sourcePath = path.resolve(projectRoot, item.source);

    if (remoteFile) {
      const current = metadata.videos?.[outputName];
      const matchesTrackedDerivative =
        current?.objectPath === objectPath && Number(current.bytes) === Number(remoteFile.Size);
      const matchesPublishedSource =
        Number((await stat(sourcePath)).size) === Number(remoteFile.Size) &&
        remoteFile.Hashes?.md5 === (await md5(sourcePath));
      if (!matchesTrackedDerivative && !matchesPublishedSource) {
        throw new Error(`R2 video collision with different content: ${objectPath}`);
      }
      continue;
    }

    const readyPath = path.join(readyDirectory, outputName);
    if (!(await exists(readyPath)) || !(await stat(readyPath)).isFile()) {
      throw new Error(
        `Missing browser-ready derivative for ${item.targetName}: ${displayPath(readyPath)}. ` +
        "Create the reviewed playback copy without changing the archived original, then rerun.",
      );
    }
    await verifyBrowserVideo(readyPath);
    videoUploads.push({ ...item, readyPath, outputName });
  }

  const fingerprint = createHash("sha256")
    .update(JSON.stringify({ photoUploads, videoUploads: videoUploads.map(({ sourceHash, outputName }) => ({ sourceHash, outputName })) }))
    .digest("hex")
    .slice(0, 12);
  const batchManifest = path.join("media-output", "manifests", `${slug}-batch-${fingerprint}.json`);

  console.log(`Mode: ${options.execute ? "EXECUTE" : "DRY RUN"}`);
  console.log(`Inbox: ${plan.input}`);
  console.log(`Archive: ${plan.destination}`);
  console.log(`R2: ${bucket}/${location}`);
  for (const item of plan.items) {
    console.log(`${item.action.padEnd(9)} ${item.source} -> ${item.targetName}`);
  }
  for (const item of photoUploads) console.log(`optimize  ${item.targetName}`);
  for (const item of videoUploads) console.log(`stage     ${displayPath(item.readyPath)} -> ${item.outputName}`);

  const posterOptions = { location, slug, "video-ready": displayPath(readyDirectory), "no-preview": options["no-preview"] };
  // Also detect changed playback/configuration even when the inbox was archived
  // on a previous run. This is part of import, not an optional remembered step.
  const posterPlan = await preparePosters(posterOptions);
  if (posterPlan.counts.failed) throw new Error("Poster preflight failed; inspect the per-file report before publishing");

  if (!options.execute) {
    console.log("Dry run complete. No files, manifests, or R2 objects were changed.");
    return;
  }

  await run(process.execPath, [
    path.join(scriptDirectory, "archive-media.mjs"),
    "--input", input,
    "--location", location,
    "--prefix", prefix,
    "--execute",
  ]);

  if (photoUploads.length > 0) {
    await run(process.execPath, [
      path.join(scriptDirectory, "optimize-images.mjs"),
      "--input", plan.destination,
      "--location", location,
      "--slug", slug,
      "--manifest", batchManifest,
      "--public-base", publicBase,
      "--files", photoUploads.map((item) => item.targetName).join(","),
    ]);
  }

  for (const item of videoUploads) {
    await run(process.execPath, [
      path.join(scriptDirectory, "stage-web-video.mjs"),
      "--input", displayPath(item.readyPath),
      "--location", location,
      "--name", item.outputName,
      "--slug", slug,
      "--manifest", batchManifest,
      "--execute",
    ]);
  }

  const preparedPosters = await preparePosters({ ...posterOptions, execute: true });
  if (preparedPosters.counts.failed) throw new Error("Some posters failed; successful local outputs were retained. Nothing from this batch was uploaded.");

  if (!options["prepare-only"] && (photoUploads.length > 0 || videoUploads.length > 0)) {
    const uploadArguments = [
      path.join(scriptDirectory, "upload-web-media.mjs"),
      "--location", location,
      "--slug", slug,
      "--manifest", batchManifest,
      "--metadata", displayPath(metadataPath),
      "--remote", remote,
      "--bucket", bucket,
      "--public-base", publicBase,
    ];
    await run(process.execPath, uploadArguments);
    await run(process.execPath, [...uploadArguments, "--execute"]);
  }

  if (!options["prepare-only"] && preparedPosters.jobs.length > 0) {
    const posterUploadArguments = [path.join(scriptDirectory, "upload-web-media.mjs"),
      "--location", location, "--slug", slug, "--manifest", preparedPosters.jobs[0].manifestPath,
      "--metadata", displayPath(metadataPath), "--remote", remote, "--bucket", bucket, "--public-base", publicBase];
    await run(process.execPath, posterUploadArguments);
    await run(process.execPath, [...posterUploadArguments, "--execute"]);
  }

  console.log("Batch complete. Inbox files and archival originals remain unchanged.");
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
