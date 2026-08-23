import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import {
  access,
  mkdir,
  readFile,
  rename,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { DEFAULT_PUBLIC_MEDIA_BASE } from "./media-config.mjs";

const DEFAULT_MAX_SIZE = 1920;
const DEFAULT_QUALITY = 84;
const DEFAULT_FRAME_TIMES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const videoReadyRoot = path.join(projectRoot, "media-output", "video-ready");
const publishedVideoRoot = path.join(projectRoot, "public", "videos");
const posterOutputRoot = path.join(projectRoot, "media-output", "video-posters");
const r2StagingRoot = path.join(projectRoot, "media-output", "r2");

function usage() {
  return `Usage:
  npm run media:poster -- --input <final playback MP4> --location <path> [options]

Options:
  --name <filename>             Poster filename (default: <video-id>-poster.webp)
  --slug <slug>                 Output/manifest slug (default: final location segment)
  --manifest <file>             Staging manifest (default: media-output/manifests/<slug>.json)
  --public-base <url>           Public R2 URL (default: ${DEFAULT_PUBLIC_MEDIA_BASE})
  --max-size <pixels>           Maximum poster long edge (default: ${DEFAULT_MAX_SIZE})
  --quality <1-100>             WebP quality (default: ${DEFAULT_QUALITY})
  --allow-published-playback    Allow an existing final playback under public/videos/
  --force                       Replace local generated/staged poster bytes only
  --execute                     Generate, stage, and update the staging manifest
  --help                        Show this help

The input must normally be a reviewed browser-ready MP4 under
media-output/video-ready/. Private originals and inbox videos are always rejected.
The published-playback escape hatch exists only for migrating an exact current
website playback file; it never permits media-originals/ or media-inbox/.`;
}

function parseArguments(argumentsList) {
  const options = {};
  const flags = new Set([
    "--allow-published-playback",
    "--execute",
    "--force",
    "--help",
  ]);
  const valued = new Set([
    "--input",
    "--location",
    "--manifest",
    "--max-size",
    "--name",
    "--public-base",
    "--quality",
    "--slug",
  ]);

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (flags.has(argument)) {
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

function displayPath(filePath) {
  return path.relative(projectRoot, filePath).split(path.sep).join("/");
}

function isInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function runBinary(command, argumentsList) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, argumentsList, {
      cwd: projectRoot,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      const stdoutBuffer = Buffer.concat(stdout);
      const stderrText = Buffer.concat(stderr).toString("utf8").trim();
      if (code === 0) resolve({ stdout: stdoutBuffer, stderr: stderrText });
      else reject(new Error(stderrText || `${command} exited with code ${code}`));
    });
  });
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

function sha256Buffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function probeVideo(inputPath) {
  const result = await runBinary("ffprobe", [
    "-v", "error",
    "-show_entries",
    "stream=codec_type,codec_name,width,height,pix_fmt,color_space,color_transfer,color_primaries:format=format_name,duration",
    "-of", "json",
    inputPath,
  ]);
  const probe = JSON.parse(result.stdout.toString("utf8"));
  const video = probe.streams?.find((stream) => stream.codec_type === "video");
  const audio = probe.streams?.filter((stream) => stream.codec_type === "audio") ?? [];
  if (!video?.width || !video?.height) throw new Error(`No usable video stream: ${displayPath(inputPath)}`);

  return {
    video,
    audio,
    duration: Number(probe.format?.duration),
    formatNames: probe.format?.format_name?.split(",") ?? [],
  };
}

function assertBrowserReady(probe, inputPath) {
  const isBrowserReady =
    probe.formatNames.includes("mp4") &&
    probe.video.codec_name === "h264" &&
    probe.video.pix_fmt === "yuv420p" &&
    probe.audio.every((stream) => stream.codec_name === "aac");
  if (!isBrowserReady) {
    throw new Error(
      `Playback is not the required MP4 H.264/yuv420p + AAC derivative: ${displayPath(inputPath)}`,
    );
  }
}

function dimensionsFor(width, height, maxSize) {
  if (Math.max(width, height) <= maxSize) return { width, height };
  const scale = maxSize / Math.max(width, height);
  const scaledWidth = Math.max(2, Math.round((width * scale) / 2) * 2);
  const scaledHeight = Math.max(2, Math.round((height * scale) / 2) * 2);
  return { width: scaledWidth, height: scaledHeight };
}

async function analyzeFrame(inputPath, timestamp) {
  const result = await runBinary("ffmpeg", [
    "-v", "error",
    "-i", inputPath,
    "-ss", timestamp.toFixed(3),
    "-frames:v", "1",
    "-vf", "scale=64:64:flags=area,format=gray",
    "-an",
    "-f", "rawvideo",
    "pipe:1",
  ]);
  const pixels = result.stdout;
  if (pixels.length !== 64 * 64) {
    throw new Error(`Could not decode the frame at ${timestamp.toFixed(3)}s.`);
  }

  const sorted = [...pixels].sort((left, right) => left - right);
  const mean = pixels.reduce((total, value) => total + value, 0) / pixels.length;
  const p90 = sorted[Math.floor(sorted.length * 0.9)];
  const brightRatio = pixels.reduce((count, value) => count + (value >= 40 ? 1 : 0), 0) / pixels.length;

  return {
    timestamp,
    mean: Number(mean.toFixed(2)),
    p90,
    brightRatio: Number(brightRatio.toFixed(4)),
    usable: mean >= 16 && p90 >= 32 && brightRatio >= 0.01,
  };
}

async function selectFrame(inputPath, duration) {
  const candidates = DEFAULT_FRAME_TIMES.filter((timestamp) => timestamp < duration - 0.02);
  if (candidates.length === 0) candidates.push(Math.max(0, duration / 2));

  const analyses = [];
  for (const timestamp of candidates) {
    const analysis = await analyzeFrame(inputPath, timestamp);
    analyses.push(analysis);
    if (analysis.usable) return { selected: analysis, analyses };
  }

  const selected = [...analyses].sort((left, right) => right.mean - left.mean)[0];
  return { selected, analyses };
}

function posterFilter(dimensions) {
  const scale = `scale=${dimensions.width}:${dimensions.height}:flags=lanczos`;
  return `${scale},format=rgb24`;
}

async function encodePoster(inputPath, timestamp, dimensions, quality) {
  const result = await runBinary("ffmpeg", [
    "-v", "error",
    "-i", inputPath,
    "-ss", timestamp.toFixed(3),
    "-frames:v", "1",
    "-vf", posterFilter(dimensions),
    "-an",
    "-map_metadata", "-1",
    "-c:v", "libwebp",
    "-quality", String(quality),
    "-compression_level", "6",
    "-preset", "picture",
    "-f", "image2pipe",
    "pipe:1",
  ]);
  if (result.stdout.length === 0) throw new Error("FFmpeg produced an empty poster.");
  return result.stdout;
}

async function createBlurDataUrl(posterBuffer) {
  const buffer = await sharp(posterBuffer)
    .resize({ width: 12, height: 12, fit: "inside", withoutEnlargement: true })
    .toColourspace("srgb")
    .webp({ quality: 40, effort: 4 })
    .toBuffer();
  return `data:image/webp;base64,${buffer.toString("base64")}`;
}

async function writeJsonSafely(filePath, value) {
  const temporaryPath = `${filePath}.poster-staging`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporaryPath, filePath);
}

export async function stageVideoPoster({
  allowPublishedPlayback = false,
  execute = false,
  force = false,
  inputPath,
  location,
  manifestPath,
  maxSize = DEFAULT_MAX_SIZE,
  name,
  publicBase = DEFAULT_PUBLIC_MEDIA_BASE,
  quality = DEFAULT_QUALITY,
  slug,
}) {
  const resolvedInput = path.resolve(projectRoot, inputPath);
  const resolvedManifest = path.resolve(projectRoot, manifestPath);
  const cleanLocation = cleanRelativePath(location, "--location");
  const cleanSlug = slugify(slug ?? cleanLocation.split("/").at(-1));
  const isReadyInput = isInside(videoReadyRoot, resolvedInput);
  const isPublishedInput = isInside(publishedVideoRoot, resolvedInput);

  if (!isReadyInput && !(allowPublishedPlayback && isPublishedInput)) {
    throw new Error(
      "Poster input must be under media-output/video-ready/. " +
      "Use --allow-published-playback only for an exact current playback under public/videos/.",
    );
  }
  if (!(await exists(resolvedInput)) || !(await stat(resolvedInput)).isFile()) {
    throw new Error(`Playback derivative not found: ${displayPath(resolvedInput)}`);
  }
  if (path.extname(resolvedInput).toLowerCase() !== ".mp4") {
    throw new Error("Poster generation currently requires the final MP4 playback derivative.");
  }
  if (!Number.isInteger(maxSize) || maxSize < 1) throw new Error("--max-size must be a positive integer.");
  if (!Number.isInteger(quality) || quality < 1 || quality > 100) {
    throw new Error("--quality must be an integer from 1 to 100.");
  }
  const publicBaseUrl = publicBase.replace(/\/+$/, "");
  if (new URL(publicBaseUrl).protocol !== "https:") throw new Error("--public-base must be HTTPS.");

  const videoId = path.parse(resolvedInput).name.toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*-v\d+$/.test(videoId)) {
    throw new Error(`Playback filename does not use a canonical <prefix>-v### ID: ${videoId}`);
  }
  const posterName = name ?? `${videoId}-poster.webp`;
  if (posterName !== path.basename(posterName) || !/^[a-z0-9-]+-poster\.webp$/.test(posterName)) {
    throw new Error("--name must be a canonical *-poster.webp filename.");
  }

  const probe = await probeVideo(resolvedInput);
  if (!allowPublishedPlayback || isReadyInput) assertBrowserReady(probe, resolvedInput);
  if (!Number.isFinite(probe.duration) || probe.duration <= 0) throw new Error("Video duration is invalid.");
  const dimensions = dimensionsFor(probe.video.width, probe.video.height, maxSize);
  const frameSelection = await selectFrame(resolvedInput, probe.duration);
  const objectPath = `images/video-posters/${cleanLocation}/${posterName}`;
  const src = `${publicBaseUrl}/${objectPath}`;
  const generatedPath = path.join(posterOutputRoot, cleanSlug, posterName);
  const stagedPath = path.join(r2StagingRoot, ...objectPath.split("/"));
  const sourceStat = await stat(resolvedInput);
  const sourceHash = await sha256(resolvedInput);
  const videoName = `${videoId}.mp4`;

  console.log(`Mode: ${execute ? "GENERATE" : "DRY RUN"}`);
  console.log(`Playback: ${displayPath(resolvedInput)}`);
  console.log(`Frame: ${frameSelection.selected.timestamp.toFixed(3)}s`);
  console.log(`Poster: ${displayPath(generatedPath)}`);
  console.log(`R2: ${objectPath}`);
  if (!execute) return { frameSelection, dimensions, generatedPath, objectPath, posterName, src };

  const posterBuffer = await encodePoster(
    resolvedInput,
    frameSelection.selected.timestamp,
    dimensions,
    quality,
  );
  const posterHash = sha256Buffer(posterBuffer);
  const posterMetadata = await sharp(posterBuffer).metadata();
  if (posterMetadata.width !== dimensions.width || posterMetadata.height !== dimensions.height) {
    throw new Error("Generated poster dimensions do not match the planned dimensions.");
  }

  const manifest = (await exists(resolvedManifest))
    ? JSON.parse(await readFile(resolvedManifest, "utf8"))
    : { version: 4, slug: cleanSlug, location: cleanLocation, images: {}, videos: {} };
  if (manifest.location && manifest.location !== cleanLocation) throw new Error("Manifest location mismatch.");
  const previous = manifest.images?.[posterName];
  const settingsMatch =
    previous?.sourceHash === sourceHash &&
    previous?.processing?.frameTimestamp === frameSelection.selected.timestamp &&
    previous?.processing?.maxSize === maxSize &&
    previous?.processing?.quality === quality;
  if (previous && !settingsMatch && !force) {
    throw new Error(`Poster metadata collision: ${posterName}. Use --force only for local generated derivatives.`);
  }

  for (const destination of [generatedPath, stagedPath]) {
    if (await exists(destination)) {
      const currentHash = await sha256(destination);
      if (currentHash !== posterHash && !force) {
        throw new Error(`Poster file collision: ${displayPath(destination)}`);
      }
    }
  }

  await mkdir(path.dirname(generatedPath), { recursive: true });
  await mkdir(path.dirname(stagedPath), { recursive: true });
  await writeFile(generatedPath, posterBuffer);
  await writeFile(stagedPath, posterBuffer);
  if ((await sha256(generatedPath)) !== posterHash || (await sha256(stagedPath)) !== posterHash) {
    throw new Error("Poster hash verification failed after staging.");
  }

  const record = {
    src,
    objectPath,
    localPath: displayPath(stagedPath),
    width: dimensions.width,
    height: dimensions.height,
    aspectRatio: Number((dimensions.width / dimensions.height).toFixed(6)),
    blurDataURL: await createBlurDataUrl(posterBuffer),
    bytes: posterBuffer.length,
    sourceBytes: sourceStat.size,
    sourceHash,
    posterHash,
    relatedVideo: {
      sourceKey: videoName,
      src: `${publicBaseUrl}/videos/${cleanLocation}/${videoName}`,
      objectPath: `videos/${cleanLocation}/${videoName}`,
      bytes: sourceStat.size,
      sourceHash,
      processing: {
        format: isReadyInput ? "prebuilt-browser-video" : "existing-published-playback",
        codec: probe.video.codec_name,
        pixelFormat: probe.video.pix_fmt,
        colorSpace: probe.video.color_space ?? null,
        colorTransfer: probe.video.color_transfer ?? null,
        colorPrimaries: probe.video.color_primaries ?? null,
      },
    },
    processing: {
      format: "webp-video-poster",
      source: isReadyInput ? "final-browser-ready-playback" : "exact-existing-published-playback",
      frameTimestamp: frameSelection.selected.timestamp,
      frameAnalysis: frameSelection.selected,
      maxSize,
      quality,
      colorHandling: "direct-final-playback-decode-no-added-tone-map",
    },
  };

  manifest.version = Math.max(Number(manifest.version) || 1, 4);
  manifest.slug = cleanSlug;
  manifest.location = cleanLocation;
  manifest.kind = "web-derivatives";
  manifest.publicBase = publicBaseUrl;
  manifest.images = manifest.images ?? {};
  manifest.videos = manifest.videos ?? {};
  manifest.images[posterName] = record;
  if (manifest.videos[videoName]) {
    manifest.videos[videoName] = {
      ...manifest.videos[videoName],
      poster: src,
      posterKey: posterName,
    };
  }
  await mkdir(path.dirname(resolvedManifest), { recursive: true });
  await writeJsonSafely(resolvedManifest, manifest);
  console.log(`Generated ${posterBuffer.length} byte poster and updated ${displayPath(resolvedManifest)}.`);

  return { frameSelection, dimensions, generatedPath, objectPath, posterName, record, src };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  if (!options.input || !options.location) throw new Error(`--input and --location are required.\n\n${usage()}`);

  const location = cleanRelativePath(options.location, "--location");
  const slug = slugify(options.slug ?? location.split("/").at(-1));
  const manifestPath = path.resolve(
    projectRoot,
    options.manifest ?? path.join("media-output", "manifests", `${slug}.json`),
  );
  await stageVideoPoster({
    allowPublishedPlayback: Boolean(options["allow-published-playback"]),
    execute: Boolean(options.execute),
    force: Boolean(options.force),
    inputPath: options.input,
    location,
    manifestPath,
    maxSize: Number(options["max-size"] ?? DEFAULT_MAX_SIZE),
    name: options.name,
    publicBase: options["public-base"] ?? DEFAULT_PUBLIC_MEDIA_BASE,
    quality: Number(options.quality ?? DEFAULT_QUALITY),
    slug,
  });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  await main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
