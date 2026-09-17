import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import sharp from "sharp";
import { colorPlan, frameFilter, probeVideo, runMediaTool } from "../video-color.mjs";
import { atomicJson, exists, hashFile, inside, posterFingerprint, projectRoot, stageVideoPoster } from "../generate-video-poster.mjs";

const sdr = { video: { color_transfer: "bt709", color_primaries: "bt709", color_space: "bt709", color_range: "tv" } };
test("SDR never receives HDR tone mapping; output range is explicit", () => {
  const plan = colorPlan(sdr);
  assert.equal(plan.hdr, false);
  const filter = frameFilter(plan, { width: 320, height: 180 });
  assert.match(filter, /out_range=pc/);
  assert.doesNotMatch(filter, /tonemapping/);
});
test("HLG, PQ and supported Dolby Vision are distinct paths", () => {
  assert.equal(colorPlan({ video: { ...sdr.video, color_transfer: "arib-std-b67", color_primaries: "bt2020", color_space: "bt2020nc" } }).mode, "hlg");
  assert.equal(colorPlan({ video: { ...sdr.video, color_transfer: "smpte2084", color_primaries: "bt2020", color_space: "bt2020nc" } }).mode, "pq");
  const dv = { video: { ...sdr.video, color_transfer: "arib-std-b67", color_primaries: "bt2020", color_space: "bt2020nc" }, dolbyVision: { dv_profile: 8, dv_bl_signal_compatibility_id: 4, bl_present_flag: 1, rpu_present_flag: 1, el_present_flag: 0 } };
  assert.equal(colorPlan(dv).applyDolbyVision, true);
  assert.throws(() => colorPlan({ ...dv, dolbyVision: { ...dv.dolbyVision, dv_profile: 7, el_present_flag: 1 } }), /Unsupported Dolby/);
  assert.throws(() => colorPlan(dv, { dolbyVision: "hlg-base" }), /verified/);
});
test("Missing color tags fail closed; documented overrides are recorded", () => {
  assert.throws(() => colorPlan({ video: { ...sdr.video, color_transfer: undefined } }), /Missing\/unsupported/);
  assert.throws(() => colorPlan(sdr, { inputOverride: { color_range: "pc" } }), /reason/);
  assert.equal(colorPlan(sdr, { inputOverride: { color_range: "pc" }, reason: "Verified full range test fixture" }).warnings.length, 1);
});
test("Pipeline version, source, time and color policy all invalidate the fingerprint", () => {
  const settings = { sourceHash: "abc", posterTime: 0, maxSize: 1920, quality: 84, color: {} };
  for (const change of [{ sourceHash: "def" }, { posterTime: 1 }, { version: "future" }, { color: { toneMapping: "spline" } }]) assert.notEqual(posterFingerprint(settings), posterFingerprint({ ...settings, ...change }));
});

test("Real batch entry: Unicode discovery, dry-run, incremental, black-frame search, rebuild, failure preservation", { timeout: 180000 }, async () => {
  const id = `test-${randomUUID()}`;
  const location = `tests/${id}`;
  const ready = path.join(projectRoot, "media-output/video-ready", id);
  const nested = path.join(ready, "嵌套 空格");
  const input = path.join(nested, "相机 原文件.mp4");
  const work = path.join(projectRoot, "media-output/tests", id);
  const config = path.join(work, "config.json");
  const manifestPath = path.join(projectRoot, "media-output/manifests", location, "posters.json");
  const base = { inputPath: input, videoId: "test-v001", location, manifestPath, execute: true };
  const owned = [ready, work, path.dirname(manifestPath), path.join(projectRoot, "media-output/video-posters", location), path.join(projectRoot, "media-output/r2/images/video-posters", location)];
  try {
    await mkdir(nested, { recursive: true }); await mkdir(work, { recursive: true });
    await runMediaTool("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "color=black:s=320x180:r=30:d=0.2", "-f", "lavfi", "-i", "testsrc2=s=320x180:r=30:d=1", "-filter_complex", "[0:v][1:v]concat=n=2:v=1:a=0,setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=limited", "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-x264-params", "colorprim=bt709:transfer=bt709:colormatrix=bt709", "-n", input]);
    await atomicJson(`${input}.poster.json`, { id: "test-v001" });
    await atomicJson(config, { collections: [{ location, readyDirectory: ready }] });
    const sourceHash = await hashFile(input);
    const cli = ["scripts/media-batch.mjs", "--posters", "--config", config, "--no-preview"];
    const plan = (await runMediaTool(process.execPath, [...cli, "--dry-run"])).toString();
    assert.match(plan, /planned/); assert.equal(await exists(manifestPath), false);
    const first = (await runMediaTool(process.execPath, [...cli, "--execute"])).toString();
    assert.match(first, /"generated":1/);
    let manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const record = manifest.images["test-v001-poster.webp"];
    assert.equal(record.width, 320); assert.equal(record.height, 180); // no upscale
    assert.ok(record.processing.frameTimestamp > 0);
    assert.match(record.objectPath, /poster\.[a-f0-9]{16}\.webp$/);
    const output = path.resolve(projectRoot, record.localPath);
    const meta = await sharp(output).metadata(); assert.ok(meta.icc); assert.equal(meta.exif, undefined);
    assert.match((await runMediaTool(process.execPath, [...cli, "--execute"])).toString(), /"skipped":1/);
    const second = await stageVideoPoster({ ...base, posterTime: 0.6 });
    assert.equal(second.status, "generated");
    assert.equal((await stageVideoPoster(base)).status, "skipped"); // manual selection persists
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.images["test-v001-poster.webp"].processing.fingerprint = "old-pipeline";
    await atomicJson(manifestPath, manifest);
    assert.equal((await stageVideoPoster(base)).status, "generated");
    const before = await readFile(manifestPath, "utf8");
    await assert.rejects(stageVideoPoster({ ...base, posterTime: 999, force: true }), /outside/);
    assert.equal(await readFile(manifestPath, "utf8"), before);
    assert.equal(await hashFile(input), sourceHash);
    assert.equal((await probeVideo(input)).width, 320);
    // Exercise the real watch CLI: no run before the file-stability window.
    const watchStarted = Date.now();
    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [...cli, "--execute", "--watch"], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
      let output = "", done = false;
      const timer = setTimeout(() => { child.kill(); reject(new Error("Watch did not process stable inputs")); }, 30000);
      child.stdout.on("data", (chunk) => {
        output += chunk;
        if (!done && output.includes('Poster summary: {"skipped":1}')) { done = true; clearTimeout(timer); child.kill(); }
      });
      child.on("error", reject);
      child.on("exit", () => { clearTimeout(timer); if (done) resolve(); else reject(new Error(output)); });
    });
    assert.ok(Date.now() - watchStarted >= 6000);
    // One broken new source must not invalidate the already successful poster.
    await writeFile(path.join(nested, "test-v002.mp4"), "invalid test input");
    await assert.rejects(runMediaTool(process.execPath, [...cli, "--execute"]), /failed/);
    assert.equal(await readFile(manifestPath, "utf8"), before);
  } finally {
    for (const directory of owned) {
      // Only unique test directories created above; never a workspace/media root.
      assert.ok(inside(path.join(projectRoot, "media-output"), directory) && directory.includes(id));
      sharp.cache(false);
      await rm(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    }
  }
});
