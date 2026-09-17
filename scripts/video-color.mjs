import { spawn } from "node:child_process";

export function runMediaTool(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: false, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    const stdout = [], stderr = [];
    const timer = setTimeout(() => { child.kill(); reject(new Error(`${command} timed out after 120 seconds`)); }, 120_000);
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(Buffer.concat(stdout));
      else reject(new Error(Buffer.concat(stderr).toString().trim() || `${command} exited ${code}`));
    });
  });
}

export async function probeVideo(input) {
  // Do not record container tags (GPS, device IDs, etc.).
  const result = JSON.parse((await runMediaTool("ffprobe", [
    "-v", "error", "-show_entries",
    "stream=codec_type,codec_name,profile,width,height,pix_fmt,color_range,color_space,color_transfer,color_primaries,sample_aspect_ratio,display_aspect_ratio:stream_side_data:format=format_name,duration",
    "-of", "json", input,
  ])).toString());
  const video = result.streams?.find((stream) => stream.codec_type === "video");
  if (!video?.width || !video?.height) throw new Error("No decodable video stream");
  const dolbyVision = video.side_data_list?.find((entry) => entry.side_data_type === "DOVI configuration record");
  const rotation = video.side_data_list?.find((entry) => entry.side_data_type === "Display Matrix")?.rotation ?? 0;
  const [sarWidth, sarHeight] = (video.sample_aspect_ratio ?? "1:1").split(":").map(Number);
  const sar = sarWidth > 0 && sarHeight > 0 ? sarWidth / sarHeight : 1;
  const rotated = Math.abs(rotation) % 180 === 90;
  return { video, dolbyVision, rotation,
    width: Math.round(rotated ? video.height : video.width * sar),
    height: Math.round(rotated ? video.width * sar : video.height),
    audio: result.streams.filter((stream) => stream.codec_type === "audio"),
    duration: Number(result.format?.duration), formatNames: result.format?.format_name?.split(",") ?? [] };
}

const VALID = {
  color_transfer: ["bt709", "smpte170m", "iec61966-2-1", "arib-std-b67", "smpte2084"],
  color_primaries: ["bt709", "bt2020", "smpte170m", "bt470bg", "smpte432"],
  color_space: ["bt709", "bt2020nc", "smpte170m", "bt470bg", "gbr"],
  color_range: ["tv", "pc"],
};

/** Unknown color metadata fails closed; explicit per-file policy is fingerprinted. */
export function colorPlan(probe, settings = {}) {
  const input = { ...probe.video };
  const override = settings.inputOverride;
  if (override) {
    if (!settings.reason?.trim()) throw new Error("A color inputOverride requires a documented reason");
    for (const [key, value] of Object.entries(override)) {
      if (!VALID[key]?.includes(value)) throw new Error(`Unsupported color override ${key}=${value}`);
      input[key] = value;
    }
  }
  for (const [key, values] of Object.entries(VALID)) {
    if (!values.includes(input[key])) throw new Error(`Missing/unsupported ${key}: ${input[key] ?? "missing"}. Configure color.inputOverride + reason; no output was replaced.`);
  }
  const dv = probe.dolbyVision;
  const hdr = ["arib-std-b67", "smpte2084"].includes(input.color_transfer);
  let applyDolbyVision = Boolean(dv);
  let mode = hdr ? (input.color_transfer === "arib-std-b67" ? "hlg" : "pq") : "sdr";
  const warnings = [];
  if (override) warnings.push(`Explicit source color override: ${settings.reason}`);
  if (dv) {
    const compatibleTransfer = { 1: "smpte2084", 2: "bt709", 4: "arib-std-b67" }[dv.dv_bl_signal_compatibility_id];
    if (dv.dv_profile === 8 && (!compatibleTransfer || input.color_transfer !== compatibleTransfer)) throw new Error("Dolby Vision profile 8 compatibility layer conflicts with its transfer metadata; review this file explicitly");
    if (settings.dolbyVision === "hlg-base") {
      if (dv.dv_profile !== 8 || dv.dv_bl_signal_compatibility_id !== 4 || dv.el_present_flag || input.color_transfer !== "arib-std-b67" || !settings.reason?.trim()) throw new Error("hlg-base requires verified single-layer Dolby Vision 8.4 and a documented reason");
      applyDolbyVision = false; mode = "dolby-vision-8.4-hlg-base";
      warnings.push(`Using compatible HLG base without Dolby dynamic metadata: ${settings.reason}`);
    } else {
      if (settings.dolbyVision && settings.dolbyVision !== "apply") throw new Error("Unknown Dolby Vision policy");
      if (![5, 8].includes(dv.dv_profile) || dv.el_present_flag || !dv.bl_present_flag || !dv.rpu_present_flag) throw new Error(`Unsupported Dolby Vision profile/layers (${dv.dv_profile}); supply a reviewed SDR playback derivative instead`);
      mode = `dolby-vision-${dv.dv_profile}.${dv.dv_bl_signal_compatibility_id}-libplacebo`;
    }
  }
  const toneMapping = settings.toneMapping ?? "hable";
  if (hdr && !dv && !input.side_data_list?.some((entry) => /Mastering display|Content light/i.test(entry.side_data_type))) warnings.push("No mastering/peak metadata: libplacebo uses its standard source luminance assumptions. Review the SDR poster; color policy is configurable per file.");
  if (!["hable", "spline", "bt.2390", "bt.2446a"].includes(toneMapping)) throw new Error("Unsupported toneMapping policy");
  return { mode, input, applyDolbyVision, toneMapping, warnings, override: Boolean(override), hdr: hdr || Boolean(dv) };
}

export async function verifyColorTools(input, plan) {
  if (!plan.hdr && plan.input.color_primaries === "bt709") return;
  const filters = (await runMediaTool("ffmpeg", ["-hide_banner", "-filters"])).toString();
  if (!filters.includes("libplacebo")) throw new Error("This source requires FFmpeg libplacebo + a working Vulkan device. No fallback guessing is allowed.");
  if (plan.applyDolbyVision) {
    const frames = (await runMediaTool("ffprobe", ["-v", "error", "-select_streams", "v:0", "-read_intervals", "%+0.1", "-show_frames", "-show_entries", "frame=side_data_list", "-of", "json", input])).toString();
    if (!frames.includes('"Dolby Vision Metadata"')) throw new Error("Decoder did not expose Dolby Vision metadata; use a reviewed SDR derivative or explicitly review the 8.4 HLG-compatible base policy");
  }
}

export function frameFilter(plan, dimensions) {
  const override = plan.override ? `setparams=range=${plan.input.color_range === "tv" ? "limited" : "full"}:color_primaries=${plan.input.color_primaries}:color_trc=${plan.input.color_transfer}:colorspace=${plan.input.color_space},` : "";
  if (!plan.hdr && plan.input.color_primaries === "bt709") {
    // Match browser rendering of the reviewed SDR signal: explicit YUV matrix /
    // limited range -> full RGB. Never apply a second HDR tone map to SDR.
    return `${override}scale=${dimensions.width}:${dimensions.height}:flags=lanczos:in_color_matrix=${plan.input.color_space}:in_range=${plan.input.color_range}:out_range=pc,setsar=1,format=rgb24`;
  }
  // libplacebo linearizes, applies DV reshaping, maps luminance/gamut, then
  // encodes full-range sRGB pixels. No cosmetic brightness/saturation filters.
  return `${override}libplacebo=w=${dimensions.width}:h=${dimensions.height}:format=gbrp:colorspace=gbr:color_primaries=bt709:color_trc=iec61966-2-1:range=pc:apply_dolbyvision=${plan.applyDolbyVision}:tonemapping=${plan.hdr ? plan.toneMapping : "clip"}:peak_detect=false:gamut_mode=perceptual,setsar=1,format=rgb24`;
}
