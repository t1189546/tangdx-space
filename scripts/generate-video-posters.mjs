// Compatibility entry point: never revive the old untagged HDR -> JPEG extractor.
import { preparePosters } from "./prepare-video-posters.mjs";

const args = process.argv.slice(2);
if (args.some((arg) => !["--force", "--execute"].includes(arg))) throw new Error("Use npm run media:batch -- --posters --help");
console.warn("Legacy public-folder extraction retired. Using configured final playback sources and the shared color-managed pipeline. Default is dry-run; no uploads.");
const result = await preparePosters({ force: args.includes("--force"), execute: args.includes("--execute") });
if (result.counts.failed) process.exitCode = 1;
