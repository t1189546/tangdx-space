import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = name => readFile(new URL('../../components/real/place/' + name, import.meta.url), 'utf8');
const css = await source('FieldVideo.module.css');
const hook = await source('useVideoCaptionHeight.ts');

test('media uses shared zoom-aware width with parent-width fallback and bounded gutters', () => {
  assert.match(css, /\.content\s*\{\s*width: var\(--media-layout-width, 100%\);\s*padding-inline: var\(--media-gutter\)/);
  assert.match(css, /--media-gutter: 1\.5rem/);
  assert.match(css, /max\(3rem, calc\(\(100% - 80rem\) \/ 2\)\)/);
  assert.doesNotMatch(css, /max-width|--media-content-width|100[sd]?vh/);
});

test('section heading and media share the same width and zoom rule', async () => {
  const section = await source('VisualSection.tsx');
  assert.match(section, /className=\{styles.content\} data-media-heading/);
  assert.match(section, /className=\{styles.content\} data-media-content/);
  assert.doesNotMatch(section, /max-w-7xl|px-6 md:px-12/);
});
test('caption measurement cannot shrink visible media or depend on viewport height', () => {
  assert.doesNotMatch(hook, /innerHeight|availableHeight|viewport|fitMediaContent|media-content-width/);
  assert.match(hook, /captions\.style\.width =/);
  assert.doesNotMatch(hook, /(?:group|rail)\.style\.width/);
  assert.match(hook, /--video-caption-height/);
});
test('video remains full width, fixed ratio and contains original playback', async () => {
  const video = await source('FieldVideo.tsx');
  assert.match(css, /\.card\s*\{\s*width: 100%/);
  assert.match(css, /\.frame\s*\{ aspect-ratio: 16 \/ 9/);
  assert.doesNotMatch(css, /max-height/);
  assert.match(video, /object-contain/);
  assert.match(video, /preload="none"/);
  assert.match(video, /const DEFAULT_VIDEO_VOLUME = 0\.3/);
});
test('poster measurement stays text-only and includes collapsed video captions', async () => {
  const layout = await source('MediaContentLayout.tsx');
  assert.match(layout, /videos\.map/);
  assert.match(layout, /<VideoCaption/);
  assert.doesNotMatch(layout, /<FieldVideo|<video|<img|OptimizedPhoto/);
});
test('large photos fill stretched cards without removing crop controls or mosaic spans', async () => {
  const photo = await source('ImageCard.tsx');
  assert.match(photo, /relative flex flex-col/);
  assert.match(photo, /relative w-full flex-1/);
  assert.match(photo, /object-cover/);
  assert.match(photo, /objectPosition/);
  assert.match(photo, /image\.imageZoom/);
  assert.match(photo, /md:col-span-2/);
  assert.match(photo, /md:col-span-4/);
});

test('ordinary mosaic repeats LSS / SSL without promoting an incomplete row', async () => {
  const section = await source('VisualSection.tsx');
  const photo = await source('ImageCard.tsx');
  assert.match(section, /rowIndex % 2 === 0\s*\? \["large", "small", "small"\]\s*: \["small", "small", "large"\]/);
  assert.match(section, /i \+= 3/);
  assert.match(section, /if \(preserveImageShapes\)/);
  assert.doesNotMatch(section + photo, /fullRow/);
  assert.match(photo, /isWide \? "md:col-span-4" : isLarge \? "md:col-span-2"/);
  const media = await readFile(new URL('../../content/real/chile/torres-del-paine/media.generated.ts', import.meta.url), 'utf8');
  assert.match(media, /title: "Night Sky",[\s\S]*?shape: "large"/);
});

test('lightbox leaves browser zoom modifiers alone', async () => {
  const lightbox = await source('Lightbox.tsx');
  assert.match(lightbox, /if \(event.ctrlKey \|\| event.metaKey \|\| event.altKey\) return/);
  assert.match(lightbox, /onWheel=\{\(event\) => \{[\s\S]*?if \(event.ctrlKey \|\| event.metaKey\) return/);
});
