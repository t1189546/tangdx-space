import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Exercise the actual pure layout calculation without a DOM or media downloads.
const code = await readFile(new URL('../../components/real/place/mediaZoomLayout.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { mediaZoomLayout } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const baseline = { pixelRatio: 1.25, scrollbar: 15 }; // Windows display scaling is not page zoom.

test('lower headings and media align with the unchanged header and index at every desktop size', () => {
  for (const width of [1366, 1440, 1920, 2560]) {
    const result = mediaZoomLayout(width, 1.25, baseline);
    assert.equal(result.width, width - 15);
    assert.equal(result.gutter, Math.max(48, (width - 15 - 1280) / 2));
  }
});

test('mobile gutter aligns with unchanged header and index at 24px', () => {
  assert.equal(mediaZoomLayout(390, 1.25, baseline).gutter, 24);
});

test('100 -> 80 -> 67 -> 100% keeps CSS geometry, so physical media shrinks proportionally', () => {
  const original = mediaZoomLayout(1440, 1.25, baseline);
  for (const zoom of [.8, .67, 1]) {
    const current = mediaZoomLayout(1440 / zoom, 1.25 * zoom, baseline);
    assert.ok(Math.abs(current.width - original.width) < .001);
    assert.ok(Math.abs(current.gutter - original.gutter) < .001);
    const originalContent = original.width - 2 * original.gutter;
    const apparentContent = (current.width - 2 * current.gutter) * zoom;
    assert.ok(Math.abs(apparentContent / originalContent - zoom) < .001);
  }
});

test('real window resizing still adapts, including while zoomed out', () => {
  const at100 = mediaZoomLayout(1920, 1.25, baseline);
  const at80 = mediaZoomLayout(1920 / .8, 1.25 * .8, baseline);
  assert.deepEqual(at80, at100);
  assert.ok(at100.width > mediaZoomLayout(1440, 1.25, baseline).width);
});

test('zoom-in also preserves geometry instead of counter-scaling it', () => {
  assert.deepEqual(mediaZoomLayout(1440 / 1.5, 1.25 * 1.5, baseline), mediaZoomLayout(1440, 1.25, baseline));
});
