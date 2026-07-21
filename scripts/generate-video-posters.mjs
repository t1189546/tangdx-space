import { spawnSync } from "node:child_process";
import { access, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const supportedExtensions = new Set([".mp4", ".mov", ".m4v", ".webm"]);
const force = process.argv.slice(2).includes("--force");
const unknownArguments = process.argv
  .slice(2)
  .filter((argument) => argument !== "--force");

if (unknownArguments.length > 0) {
  console.error(`Unknown argument: ${unknownArguments.join(", ")}`);
  console.error("Usage: node scripts/generate-video-posters.mjs [--force]");
  process.exit(1);
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const videoRoot = path.join(projectRoot, "public", "videos", "real");
const imageRoot = path.join(projectRoot, "public", "images", "real");

function displayPath(filePath) {
  return path.relative(projectRoot, filePath).split(path.sep).join("/");
}

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectVideos(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));

  const videos = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      videos.push(...(await collectVideos(entryPath)));
      continue;
    }

    if (
      entry.isFile() &&
      supportedExtensions.has(path.extname(entry.name).toLowerCase())
    ) {
      videos.push(entryPath);
    }
  }

  return videos;
}

function posterPathFor(videoPath) {
  const relativeVideoPath = path.relative(videoRoot, videoPath);
  const parsedPath = path.parse(relativeVideoPath);

  return path.join(
    imageRoot,
    parsedPath.dir,
    `${parsedPath.name}-poster.jpg`,
  );
}

function checkFfmpeg() {
  const result = spawnSync("ffmpeg", ["-version"], {
    encoding: "utf8",
    stdio: "ignore",
    timeout: 15_000,
    windowsHide: true,
  });

  if (!result.error && result.status === 0) {
    return true;
  }

  if (result.error?.code === "ENOENT") {
    console.error(
      "FFmpeg was not found. Install FFmpeg and make sure the `ffmpeg` command is available on PATH.",
    );
  } else if (result.error?.code === "ETIMEDOUT") {
    console.error(
      "FFmpeg was found but did not respond within 15 seconds. Check the installation and try again.",
    );
  } else {
    console.error(
      "FFmpeg could not be started. Install FFmpeg and make sure the `ffmpeg` command works in this terminal.",
    );
  }

  return false;
}

async function generatePoster(videoPath, posterPath) {
  await mkdir(path.dirname(posterPath), { recursive: true });

  const overwriteArgument = force ? "-y" : "-n";
  const result = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      overwriteArgument,
      "-ss",
      "0.2",
      "-i",
      videoPath,
      "-map",
      "0:v:0",
      "-frames:v",
      "1",
      "-vf",
      "scale='min(1920,iw)':-2",
      "-q:v",
      "3",
      posterPath,
    ],
    {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120_000,
      windowsHide: true,
    },
  );

  if (!result.error && result.status === 0 && (await pathExists(posterPath))) {
    return { ok: true };
  }

  await rm(posterPath, { force: true });

  const errorMessage =
    result.error?.message ?? result.stderr?.trim() ?? "Unknown FFmpeg error";

  return { ok: false, error: errorMessage };
}

async function main() {
  if (!(await pathExists(videoRoot))) {
    console.log(`No video directory found: ${displayPath(videoRoot)}`);
    return;
  }

  if (!checkFfmpeg()) {
    process.exitCode = 1;
    return;
  }

  const videos = await collectVideos(videoRoot);
  const counts = { generated: 0, skipped: 0, failed: 0 };

  if (videos.length === 0) {
    console.log(`No supported video files found under ${displayPath(videoRoot)}.`);
    return;
  }

  for (const videoPath of videos) {
    const posterPath = posterPathFor(videoPath);
    const source = displayPath(videoPath);
    const destination = displayPath(posterPath);

    if (!force && (await pathExists(posterPath))) {
      counts.skipped += 1;
      console.log(`skipped   ${source} -> ${destination}`);
      continue;
    }

    const result = await generatePoster(videoPath, posterPath);

    if (result.ok) {
      counts.generated += 1;
      console.log(`generated ${source} -> ${destination}`);
    } else {
      counts.failed += 1;
      console.error(`failed    ${source} -> ${destination}`);
      console.error(`          ${result.error}`);
    }
  }

  console.log(
    `Summary: ${counts.generated} generated, ${counts.skipped} skipped, ${counts.failed} failed.`,
  );

  if (counts.failed > 0) {
    process.exitCode = 1;
  }
}

await main();
