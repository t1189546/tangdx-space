import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, mkdir, open, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { DEFAULT_PUBLIC_MEDIA_BASE } from "./media-config.mjs";
import { colorPlan, frameFilter, probeVideo, runMediaTool, verifyColorTools } from "./video-color.mjs";

export const POSTER_PIPELINE_VERSION = "srgb-playback-v2";
export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readyRoot = path.join(projectRoot, "media-output/video-ready");
const legacyRoot = path.join(projectRoot, "public/videos");
const FRAME_TIMES = [0, 0.1, 0.25, 0.5, 0.75, 1, 1.5, 2];
export const relativePath = (file) => path.relative(projectRoot, file).split(path.sep).join("/");
export const hashBuffer = (buffer) => createHash("sha256").update(buffer).digest("hex");
export async function exists(file) { try { await access(file); return true; } catch { return false; } }
export async function hashFile(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}
export function inside(root, file) {
  const relative = path.relative(root, file);
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}
export function cleanLocation(value) {
  const result = value?.replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");
  if (!result || !/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(result)) throw new Error("Location must be a safe relative canonical media path");
  return result;
}
export async function atomicWrite(file, bytes) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  try { await writeFile(temporary, bytes); await rename(temporary, file); }
  finally { await unlink(temporary).catch(() => {}); }
}
export const atomicJson = (file, value) => atomicWrite(file, `${JSON.stringify(value, null, 2)}\n`);

export function posterFingerprint({ sourceHash, posterTime, maxSize, quality, color, version = POSTER_PIPELINE_VERSION }) {
  return hashBuffer(JSON.stringify({ sourceHash, posterTime: posterTime ?? "auto-first-valid", maxSize, quality, color, version }));
}

async function configuredSettings(location, id) {
  const configPath = path.join(projectRoot, "content/media/video-posters.config.json");
  if (!(await exists(configPath))) return {};
  const config = JSON.parse(await readFile(configPath, "utf8"));
  return config.collections.find((entry) => entry.location === location)?.overrides?.[id] ?? {};
}

async function renderFrame(input, time, dimensions, plan, quality) {
  const png = await runMediaTool("ffmpeg", [
    "-v", "error", "-threads", "2", "-i", input, "-ss", time.toFixed(6), "-map", "0:v:0", "-frames:v", "1",
    "-vf", frameFilter(plan, dimensions), "-an", "-map_metadata", "-1", "-c:v", "png", "-f", "image2pipe", "pipe:1",
  ]);
  if (!png.length) throw new Error(`No frame at ${time}s`);
  // Attach sRGB only AFTER pixel conversion. No EXIF or GPS is carried forward.
  return sharp(png).withIccProfile("srgb").webp({ quality, effort: 6 }).toBuffer();
}

async function analyzeFrame(buffer) {
  const pixels = await sharp(buffer).resize(64, 64, { fit: "fill" }).greyscale().raw().toBuffer();
  const sorted = [...pixels].sort((a, b) => a - b);
  const mean = pixels.reduce((a, b) => a + b, 0) / pixels.length;
  const p90 = sorted[Math.floor(pixels.length * 0.9)];
  return { mean: Number(mean.toFixed(2)), p90, usable: mean >= 16 && p90 >= 32 };
}

export async function stageVideoPoster(options) {
  const input = path.resolve(projectRoot, options.inputPath);
  const location = cleanLocation(options.location);
  const sidecar = await exists(`${input}.poster.json`) ? JSON.parse(await readFile(`${input}.poster.json`, "utf8")) : {};
  const videoId = options.videoId ?? sidecar.id ?? path.parse(input).name.toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*-v\d+$/.test(videoId)) throw new Error(`Use a canonical videoId for ${path.basename(input)} (e.g. trip-v001)`);
  const slug = options.slug ?? location.split("/").at(-1);
  const manifestPath = path.resolve(projectRoot, options.manifestPath ?? `media-output/manifests/${location}/posters.json`);
  if (!inside(path.join(projectRoot, "media-output"), manifestPath)) throw new Error("Staging manifests must stay in media-output/");
  const published = inside(legacyRoot, input);
  if (!inside(readyRoot, input) && !(options.allowPublishedPlayback && published)) throw new Error("Input must be final playback in media-output/video-ready/ (or explicitly selected existing playback in public/videos/). Originals/inbox are not allowed.");
  if (path.extname(input).toLowerCase() !== ".mp4") throw new Error("Use the final playback MP4");
  const sourceStat = await stat(input);
  const settings = { ...await configuredSettings(location, videoId), ...sidecar, ...options.settings };
  const maxSize = options.maxSize ?? settings.maxSize ?? 1920;
  const quality = options.quality ?? settings.quality ?? 84;
  if (!Number.isInteger(maxSize) || maxSize < 64 || maxSize > 3840 || !Number.isInteger(quality) || quality < 1 || quality > 100) throw new Error("Invalid maxSize/quality");
  const posterName = options.name ?? `${videoId}-poster.webp`;
  if (!/^[a-z0-9-]+-poster\.webp$/.test(posterName)) throw new Error("Invalid poster filename");
  const publicBase = (options.publicBase ?? DEFAULT_PUBLIC_MEDIA_BASE).replace(/\/+$/, "");
  if (new URL(publicBase).protocol !== "https:") throw new Error("Public media base must be HTTPS");
  let lock;
  if (options.execute) {
    await mkdir(path.dirname(manifestPath), { recursive: true });
    lock = await open(`${manifestPath}.lock`, "wx").catch(() => { throw new Error(`Manifest busy: ${relativePath(manifestPath)}. Another media process may be running.`); });
  }
  try {
    const manifest = await exists(manifestPath) ? JSON.parse(await readFile(manifestPath, "utf8")) : { version: 5, slug, location, images: {}, videos: {} };
    if (manifest.location && manifest.location !== location) throw new Error("Manifest location mismatch");
    const previous = manifest.images?.[posterName];
    // Preserve legacy selected timestamps; new videos default to frame zero.
    const requestedTime = options.posterTime ?? settings.posterTime ?? previous?.processing?.requestedPosterTime ?? (!previous?.processing?.pipelineVersion ? previous?.processing?.frameTimestamp : undefined);
    const posterTime = requestedTime === "auto" ? undefined : requestedTime;
    if (posterTime !== undefined && (!Number.isFinite(posterTime) || posterTime < 0)) throw new Error("posterTime must be a non-negative number");
    const sourceHash = await hashFile(input);
    const fingerprint = posterFingerprint({ sourceHash, posterTime, maxSize, quality, color: settings.color ?? {} });
    if (!options.force && previous?.processing?.fingerprint === fingerprint && await exists(path.resolve(projectRoot, previous.localPath)) && await hashFile(path.resolve(projectRoot, previous.localPath)) === previous.posterHash) {
      console.log(`skip      ${location}/${videoId}`);
      return { status: "skipped", record: previous, posterName, src: previous.src };
    }
    const probe = await probeVideo(input);
    if (!probe.formatNames.includes("mp4") || !["h264", "hevc"].includes(probe.video.codec_name) || !["yuv420p", "yuv420p10le"].includes(probe.video.pix_fmt) || probe.audio.some((stream) => stream.codec_name !== "aac")) throw new Error("Unsupported playback codec. Supply a reviewed H.264/yuv420p + AAC MP4 (or supported HEVC/HDR playback).");
    if (!Number.isFinite(probe.duration) || probe.duration <= 0 || (posterTime !== undefined && posterTime >= probe.duration)) throw new Error("posterTime is outside the video duration");
    const plan = colorPlan(probe, settings.color);
    plan.warnings.forEach((warning) => console.warn(`${videoId}: ${warning}`));
    const scale = Math.min(1, maxSize / Math.max(probe.width, probe.height));
    const dimensions = { width: Math.max(1, Math.round(probe.width * scale)), height: Math.max(1, Math.round(probe.height * scale)) };
    console.log(`${options.execute ? "generate" : "dry-run "} ${location}/${videoId}: ${plan.mode}, ${posterTime ?? "first valid frame"}, ${dimensions.width}x${dimensions.height}`);
    if (!options.execute) return { status: "planned", dimensions, plan };
    await verifyColorTools(input, plan);
    const times = posterTime === undefined ? FRAME_TIMES.filter((time) => time < probe.duration) : [posterTime];
    let buffer, time, analysis;
    for (const candidate of times) {
      buffer = await renderFrame(input, candidate, dimensions, plan, quality);
      analysis = await analyzeFrame(buffer); time = candidate;
      if (posterTime !== undefined || analysis.usable) break;
    }
    if (posterTime === undefined && !analysis?.usable) throw new Error("Opening two seconds are black/invalid. Set a reviewed posterTime; previous poster preserved.");
    const after = await stat(input);
    if (after.size !== sourceStat.size || after.mtimeMs !== sourceStat.mtimeMs || await hashFile(input) !== sourceHash) throw new Error("Source changed during processing; wait for copying to finish");
    const metadata = await sharp(buffer).metadata();
    if (metadata.width !== dimensions.width || metadata.height !== dimensions.height || !metadata.icc || metadata.space !== "srgb") throw new Error("Poster dimensions/sRGB validation failed");
    const posterHash = hashBuffer(buffer);
    const objectPath = `images/video-posters/${location}/${videoId}-poster.${posterHash.slice(0, 16)}.webp`;
    const staged = path.join(projectRoot, "media-output/r2", objectPath);
    const generated = path.join(projectRoot, "media-output/video-posters", location, path.basename(objectPath));
    for (const output of [staged, generated]) {
      if (await exists(output)) {
        if (await hashFile(output) !== posterHash) throw new Error(`Hash-path collision: ${relativePath(output)}`);
      } else await atomicWrite(output, buffer);
    }
    const blur = await sharp(buffer).resize({ width: 12, height: 12, fit: "inside" }).webp({ quality: 40 }).toBuffer();
    const videoName = `${videoId}.mp4`;
    const relatedVideo = {
      sourceKey: videoName, src: `${publicBase}/videos/${location}/${videoName}`, objectPath: `videos/${location}/${videoName}`,
      bytes: sourceStat.size, sourceHash, width: probe.width, height: probe.height, aspectRatio: probe.width / probe.height,
      processing: { format: published ? "existing-published-playback" : "prebuilt-browser-video", codec: probe.video.codec_name, pixelFormat: probe.video.pix_fmt, colorTransfer: probe.video.color_transfer },
    };
    const record = {
      src: `${publicBase}/${objectPath}`, objectPath, localPath: relativePath(staged), width: dimensions.width, height: dimensions.height,
      aspectRatio: dimensions.width / dimensions.height, blurDataURL: `data:image/webp;base64,${blur.toString("base64")}`,
      bytes: buffer.length, sourceBytes: sourceStat.size, sourceHash, posterHash, relatedVideo,
      processing: { format: "webp-video-poster", status: "ready-local", pipelineVersion: POSTER_PIPELINE_VERSION, fingerprint, sourcePath: relativePath(input), source: "final-playback", inputColor: probe, colorPolicy: settings.color ?? {}, colorHandling: plan.mode, toneMapping: plan.hdr ? plan.toneMapping : null, warnings: plan.warnings, outputColor: "sRGB ICC, full range, no EXIF/GPS", requestedPosterTime: posterTime ?? null, frameTimestamp: time, frameAnalysis: analysis, maxSize, quality },
    };
    manifest.version = 5; manifest.slug = slug; manifest.location = location; manifest.kind = "web-derivatives"; manifest.publicBase = publicBase;
    manifest.images ??= {}; manifest.videos ??= {}; manifest.images[posterName] = record;
    if (manifest.videos[videoName]) manifest.videos[videoName] = { ...manifest.videos[videoName], width: probe.width, height: probe.height, aspectRatio: probe.width / probe.height, poster: record.src, posterKey: posterName };
    // Immutable files are complete before the atomic reference switch.
    await atomicJson(manifestPath, manifest);
    return { status: "generated", record, posterName, src: record.src, generatedPath: generated, dimensions };
  } finally {
    if (lock) { await lock.close(); await unlink(`${manifestPath}.lock`); }
  }
}

async function main() {
  const options = {};
  const flags = new Set(["execute", "force", "dry-run", "allow-published-playback", "help"]);
  const valued = new Set(["input", "location", "slug", "manifest", "name", "video-id", "poster-time", "max-size", "quality", "public-base"]);
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const key = args[i].replace(/^--/, "");
    if (flags.has(key)) options[key] = true;
    else if (valued.has(key) && args[i + 1] && !args[i + 1].startsWith("--")) options[key] = args[++i];
    else throw new Error(`Unknown/missing argument ${args[i]}`);
  }
  if (options.help) { console.log("npm run media:poster -- --input <final playback MP4> --location <real/country/place> [--video-id trip-v001] [--poster-time 0.5] [--execute] [--force]\nDefaults to dry run. Batch: npm run media:batch -- --posters --execute"); return; }
  if (!options.input || !options.location) throw new Error("--input and --location required; use --help");
  await stageVideoPoster({ inputPath: options.input, location: options.location, slug: options.slug, manifestPath: options.manifest, name: options.name, videoId: options["video-id"], posterTime: options["poster-time"] === undefined ? undefined : Number(options["poster-time"]), maxSize: options["max-size"] === undefined ? undefined : Number(options["max-size"]), quality: options.quality === undefined ? undefined : Number(options.quality), publicBase: options["public-base"], allowPublishedPlayback: options["allow-published-playback"], force: options.force, execute: options.execute && !options["dry-run"] });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
