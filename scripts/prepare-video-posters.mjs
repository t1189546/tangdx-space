import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { atomicJson, cleanLocation, exists, hashBuffer, inside, projectRoot, stageVideoPoster } from "./generate-video-poster.mjs";

const defaultConfig = "content/media/video-posters.config.json";
const previewPath = path.join(projectRoot, "media-output/poster-preview.json");

async function collect(directory) {
  if (!await exists(directory)) return [];
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collect(file));
    else if (entry.isFile() && path.extname(entry.name).toLowerCase() === ".mp4") files.push(file);
  }
  return files.sort();
}

export async function discoverPosters(options = {}) {
  const config = JSON.parse(await readFile(path.resolve(projectRoot, options.config ?? defaultConfig), "utf8"));
  let collections = config.collections;
  if (options.location) {
    collections = collections.filter((entry) => entry.location === options.location);
    if (!collections.length) collections = [{ location: options.location, slug: options.slug ?? options.location.split("/").at(-1), readyDirectory: options["video-ready"] ?? `media-output/video-ready/${options.location}` }];
  }
  const selected = options.only?.split(",");
  const jobs = [], keys = new Set();
  for (const collection of collections) {
    const location = cleanLocation(collection.location);
    const readyDirectory = path.resolve(projectRoot, options["video-ready"] ?? collection.readyDirectory ?? `media-output/video-ready/${location}`);
    if (!inside(path.join(projectRoot, "media-output/video-ready"), readyDirectory)) throw new Error("readyDirectory must be inside media-output/video-ready/");
    const inputs = (await collect(readyDirectory)).map((input) => ({ input }));
    inputs.push(...(collection.legacyPlayback ?? []).map((entry) => ({ ...entry, legacy: true })));
    for (const entry of inputs) {
      // Optional sidecar supports arbitrary Unicode / camera filenames without renaming them.
      const sidecar = `${path.resolve(projectRoot, entry.input)}.poster.json`;
      const settings = await exists(sidecar) ? JSON.parse(await readFile(sidecar, "utf8")) : {};
      const id = entry.id ?? settings.id ?? path.parse(entry.input).name.toLowerCase();
      const key = `${location}/${id}`;
      if (selected && !selected.includes(id) && !selected.includes(key)) continue;
      if (keys.has(key)) throw new Error(`Duplicate video ID in collection: ${key}`);
      keys.add(key);
      jobs.push({ inputPath: entry.input, videoId: id, location, slug: collection.slug, allowPublishedPlayback: Boolean(entry.legacy), settings: { ...collection.overrides?.[id], ...settings }, manifestPath: `media-output/manifests/${location}/posters.json` });
    }
  }
  if (selected) for (const id of selected) if (!jobs.some((job) => job.videoId === id || `${job.location}/${job.videoId}` === id)) throw new Error(`Selected video not found: ${id}`);
  return jobs;
}

export async function preparePosters(options = {}) {
  const jobs = await discoverPosters(options);
  const execute = Boolean(options.execute && !options["dry-run"]);
  const preview = await exists(previewPath) ? JSON.parse(await readFile(previewPath, "utf8")) : {};
  const results = [];
  // One encode at a time, including manifest updates. Failed files do not stop the batch.
  for (const job of jobs) {
    try {
      const result = await stageVideoPoster({ ...job, execute, force: Boolean(options.force), posterTime: options["poster-time"] === undefined ? undefined : Number(options["poster-time"]) });
      results.push({ id: `${job.location}/${job.videoId}`, status: result.status });
      if (execute && result.record && !options["no-preview"]) {
        const r = result.record;
        preview[r.relatedVideo.src] = { poster: `/local-media-preview/${r.posterHash}.webp`, width: r.relatedVideo.width, height: r.relatedVideo.height,
          posterMetadata: { src: `/local-media-preview/${r.posterHash}.webp`, width: r.width, height: r.height, aspectRatio: r.aspectRatio, blurDataURL: r.blurDataURL }, localPath: r.localPath };
        await atomicJson(previewPath, preview);
      }
    } catch (error) {
      results.push({ id: `${job.location}/${job.videoId}`, status: "failed", error: error.message });
      console.error(`failed    ${job.location}/${job.videoId}: ${error.message}`);
    }
  }
  const counts = results.reduce((all, item) => ({ ...all, [item.status]: (all[item.status] ?? 0) + 1 }), {});
  console.log(`Poster summary: ${JSON.stringify(counts)}. Local preparation only; no upload or deployment.`);
  if (execute) await atomicJson(path.join(projectRoot, "media-output/poster-last-run.json"), { at: new Date().toISOString(), results, counts });
  return { jobs, results, counts };
}

export async function watchPosters(options) {
  if (!options.execute || options["dry-run"]) throw new Error("--watch requires --execute (local generation only)");
  console.log("Watching reviewed playback folders. Keep this process running; wait for two stable 3-second intervals before processing. No uploads.");
  let candidate, stable = 0, completed;
  while (true) {
    try {
      const jobs = await discoverPosters(options);
      const snapshot = [];
      for (const job of jobs) {
        const file = await stat(path.resolve(projectRoot, job.inputPath));
        snapshot.push({ ...job, size: file.size, mtime: file.mtimeMs });
      }
      const signature = hashBuffer(JSON.stringify(snapshot));
      stable = signature === candidate ? stable + 1 : 0; candidate = signature;
      if (stable >= 2 && signature !== completed) {
        await preparePosters(options); completed = signature;
      }
    } catch (error) { console.error(`Watch: ${error.message}`); }
    await delay(3000);
  }
}
