console.error(
  "Original uploads are disabled for this project. " +
    "Keep archival masters under media-originals/ and publish only web derivatives " +
    "with npm run media:optimize followed by npm run media:upload.",
);
process.exitCode = 1;
