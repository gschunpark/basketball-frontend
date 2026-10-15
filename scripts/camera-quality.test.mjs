import assert from "node:assert/strict";
import { brightenBallPicture, FrameBudget, CameraBudget } from "../src/cameraQuality.ts";
import { photoSharpness } from "../src/photoCapture.ts";
const photo = { width: 2, height: 1, data: new Uint8ClampedArray([100, 50, 10, 255, 210, 130, 55, 0]) };
brightenBallPicture(photo);
assert.equal(photo.data[0], 170);
assert.equal(photo.data[1], 85);
assert.equal(photo.data[2], 17);
assert.equal(photo.data[4], 210, "Transparent corners stay unchanged");
const frameBudget = new FrameBudget();
for (let index = 0; index < 30; index++) frameBudget.observe(50, 4000);
assert.equal(frameBudget.width, 320);
for (let index = 0; index < 30; index++) frameBudget.observe(5, 8000);
assert.equal(frameBudget.width, 400);
frameBudget.requestDetail(true);
for (let time = 12000; time <= 28000; time += 4000) {
  for (let index = 0; index < 30; index++) frameBudget.observe(18, time);
}
assert.equal(frameBudget.width, 960, "Small or lost balls request more pixels when processing has capacity");
for (let index = 0; index < 30; index++) frameBudget.observe(50, 32000);
assert.equal(frameBudget.width, 800, "High-detail tracking still falls back when processing becomes slow");
const camera = new CameraBudget();
let target;
for (let index = 0; index < 60; index++) target = camera.observe(70, 7000);
assert.equal(target, 2560);
for (let index = 0; index < 60; index++) target = camera.observe(8, 14000);
assert.equal(target, 3840);
console.log("Quality tests passed: brighter photos preserve hue and transparency; processing/camera quality responds to measured lag.");
const sharp = new Uint8ClampedArray(32 * 32 * 4), blurred = new Uint8ClampedArray(sharp.length);
for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
  const value = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? 220 : 30;
  sharp.set([value, value, value, 255], (y * 32 + x) * 4);
}
for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
  let total = 0, count = 0;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const px = Math.max(0, Math.min(31, x + dx)), py = Math.max(0, Math.min(31, y + dy));
    total += sharp[(py * 32 + px) * 4]; count++;
  }
  blurred.set([total / count, total / count, total / count, 255], (y * 32 + x) * 4);
}
assert.ok(photoSharpness(sharp, 32, 32) > photoSharpness(blurred, 32, 32), "Prefer a sharp frame over a motion-blurred frame");
