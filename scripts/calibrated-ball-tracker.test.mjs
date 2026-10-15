import assert from "node:assert/strict";
import { CalibratedBallTracker, highlightSampleColor, sampledColorId } from "../src/calibratedBallTracker.ts";

function image(x = 160, y = 120, radius = 44, color = [220, 105, 25], shade = 1) {
  const width = 320, height = 240;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let py = 0; py < height; py++) for (let px = 0; px < width; px++) {
    const offset = (py * width + px) * 4;
    const inside = x !== null && Math.hypot(px - x, py - y) <= radius;
    const seam = inside && (Math.abs(px - x) < 2 || Math.abs(py - y) < 2);
    const rgb = inside ? seam ? [25, 20, 15] : color.map((channel) => channel * shade) : [35, 45, 65];
    data.set([...rgb, 255], offset);
  }
  return { width, height, data };
}
const tracker = new CalibratedBallTracker();
assert.equal(tracker.calibrate(image(null), { x: 0.5, y: 0.5, radiusX: 0, radiusY: 0 }).ok, false, "Invalid circle must not calibrate");
assert.equal(tracker.update(image(), [], 0), null, "Require calibration first");
assert.equal(tracker.calibrate(image()).ok, true);
const first = tracker.update(image(), [], 0);
assert.ok(first);
for (let index = 1; index <= 60; index++) {
  const x = 160 + Math.sin(index / 4) * 75;
  const y = 120 + Math.cos(index / 4) * 60;
  const frame = image(x, y, 12 + index % 18, [220, 105, 25], 0.65);
  const track = tracker.update(frame, [], index * 33);
  assert.ok(track, "Follow motion without a model detection");
  assert.equal(track.id, first.id);
  assert.ok(Math.abs(track.bbox[0] + track.bbox[2] / 2 - x) < 5);
  assert.ok(Math.abs(track.bbox[1] + track.bbox[3] / 2 - y) < 5);
}
assert.equal(tracker.update(image(null), [], 2200), null, "No ghost tracking after disappearance");
assert.equal(tracker.update(image(160, 120, 30, [25, 220, 100]), [], 2250), null, "Reject a different ball color");
const recovered = tracker.update(image(160, 120, 30), [], 2300);
assert.equal(recovered.id, first.id, "Recover after a brief occlusion");
assert.equal(tracker.update(image(null), [], 2400), null);
const newTrack = tracker.update(image(), [], 3300);
assert.notEqual(newTrack.id, first.id, "Expired track receives a new identity");
const blue = new CalibratedBallTracker();
assert.equal(blue.calibrate(image(160, 120, 44, [30, 100, 220])).ok, true);
assert.ok(blue.update(image(90, 80, 22, [30, 100, 220]), [], 0));
console.log("Calibrated tracking passed: orange/blue balls, size changes, shade, sustained motion without detections, occlusion, loss, and wrong-color rejection.");

const sampleCircle = { x: 0.35, y: 0.4, radiusX: 0.08, radiusY: 0.1 };
const interior = image(112, 96, 40);
const changedExterior = { ...interior, data: new Uint8ClampedArray(interior.data) };
for (let y = 0; y < interior.height; y++) for (let x = 0; x < interior.width; x++) {
  if (((x - sampleCircle.x * interior.width) / (sampleCircle.radiusX * interior.width)) ** 2 +
      ((y - sampleCircle.y * interior.height) / (sampleCircle.radiusY * interior.height)) ** 2 <= 1) continue;
  changedExterior.data.set([30, 100, 220, 255], (y * interior.width + x) * 4);
}
const firstSample = new CalibratedBallTracker().calibrate(interior, sampleCircle);
const secondSample = new CalibratedBallTracker().calibrate(changedExterior, sampleCircle);
assert.deepEqual(firstSample, secondSample, "Exterior pixels must never affect the sample");
const circleTracker = new CalibratedBallTracker();
assert.equal(circleTracker.calibrate(changedExterior, sampleCircle).ok, true);
assert.equal(circleTracker.update(image(160, 120, 30, [30, 100, 220]), [], 0), null, "Do not learn colors outside the circle");
console.log("Circle sampling passed: exact offset circle, square-corner exclusion, and outside-color isolation.");

const mixed = image();
for (let y = 0; y < mixed.height; y++) for (let x = 160; x < mixed.width; x++) {
  if (Math.hypot(x - 160, y - 120) < 44) mixed.data.set([30, 100, 220, 255], (y * mixed.width + x) * 4);
}
const chosen = new CalibratedBallTracker();
const sampled = chosen.calibrate(mixed);
assert.ok(sampled.ok && sampled.colors.length >= 2);
const blueChoice = sampled.colors.find((color) => color.hex === "#1e64dc");
assert.ok(blueChoice, "Show the actual blue pixels from the captured circle");
chosen.setAllowedColors([blueChoice.id]);
assert.equal(chosen.update(image(), [], 0), null, "Ignored orange pixels must not track");
assert.ok(chosen.update(image(160, 120, 30, [30, 100, 220]), [], 100), "Chosen blue pixels must track");
chosen.setAllowedColors([]);
assert.equal(chosen.calibrated, false);
assert.equal(chosen.update(image(160, 120, 30, [30, 100, 220]), [], 200), null);
console.log("Color choices passed: sampled swatches, ignored-color rejection, chosen-color tracking, and all-colors-disabled handling.");

const skinGuard = new CalibratedBallTracker();
skinGuard.calibrate(image());
assert.equal(skinGuard.update(image(160, 120, 30, [210, 155, 100]), [], 0), null, "Reject less-saturated skin-like colors with similar hue");
assert.ok(skinGuard.update(image(160, 120, 30, [220, 105, 25], 0.6), [], 100), "Keep tracking shaded ball colors");
const masked = image();
for (let y = 0; y < masked.height; y++) for (let x = 0; x < masked.width; x++) {
  if (Math.hypot(x - 160, y - 120) > 28) masked.data.set([210, 155, 100, 0], (y * masked.width + x) * 4);
}
const maskedSample = new CalibratedBallTracker().calibrate(masked, { x: 0.5, y: 0.5, radiusX: 0.5, radiusY: 0.5 });
assert.ok(maskedSample.ok);
assert.ok(!maskedSample.colors.some((color) => color.hex === "#d29b64"), "Transparent photo corners must never teach skin colors");
console.log("Skin-color and masked-photo regression checks passed.");

const similarHues = image();
for (let y = 0; y < similarHues.height; y++) for (let x = 160; x < similarHues.width; x++) {
  if (Math.hypot(x - 160, y - 120) < 44) similarHues.data.set([210, 130, 55, 255], (y * similarHues.width + x) * 4);
}
const hueGuard = new CalibratedBallTracker();
const hueSample = hueGuard.calibrate(similarHues);
const ballSwatch = hueSample.colors.find((color) => color.hex === "#dc6919");
const handSwatch = hueSample.colors.find((color) => color.hex === "#d28237");
assert.ok(ballSwatch && handSwatch && ballSwatch.id !== handSwatch.id, "Separate saturated ball and skin-like colors sharing one hue");
hueGuard.setAllowedColors([ballSwatch.id]);
assert.equal(hueGuard.update(image(160, 120, 30, [210, 130, 55]), [], 0), null, "Ignored skin swatch takes priority over nearby accepted hue");
assert.ok(hueGuard.update(image(), [], 100));

const faceGuard = new CalibratedBallTracker();
faceGuard.calibrate(image());
assert.equal(faceGuard.update(image(), [], 0, [[110, 70, 100, 100]]), null, "Exclude a recognized face even when its pixels perfectly match the ball");
assert.ok(faceGuard.update(image(80, 180, 22), [], 100, [[110, 70, 100, 100]]), "Keep tracking a ball outside the face");
console.log("Face exclusion tests passed for an identical-color face and a separate ball.");
const highlighted = highlightSampleColor({ width: 3, height: 1, data: new Uint8ClampedArray([
  220, 105, 25, 255, 30, 100, 220, 255, 210, 155, 100, 0,
]) }, sampledColorId(220, 105, 25));
assert.deepEqual([...highlighted.data.slice(0, 4)], [220, 105, 25, 255]);
assert.ok(highlighted.data[6] < 40, "Nonmatching colors should be dimmed");
assert.equal(highlighted.data[11], 0, "Circle transparency is preserved");

const movingTracker = new CalibratedBallTracker();
movingTracker.calibrate(image());
movingTracker.update(image(60, 120, 12), [], 0);
const movingId = movingTracker.update(image(100, 120, 12), [], 33).id;
const movingAndOld = image(140, 120, 12);
const oldBall = image(100, 120, 12);
for (let y = 108; y <= 132; y++) for (let x = 88; x <= 112; x++) {
  if (Math.hypot(x - 100, y - 120) <= 12) movingAndOld.data.set(oldBall.data.slice((y * 320 + x) * 4, (y * 320 + x) * 4 + 4), (y * 320 + x) * 4);
}
const followed = movingTracker.update(movingAndOld, [], 66);
assert.equal(followed.id, movingId);
assert.ok(followed.bbox[0] > 120, "Follow current measured motion instead of a matching object at the old location");
assert.equal(movingTracker.update(image(null), [], 99), null, "Never display the predicted position without current image evidence");
movingTracker.resetPosition();
assert.ok(movingTracker.calibrated, "Verification reset must preserve selected appearance");
assert.ok(movingTracker.update(image(280, 120, 12), [], 100), "Acquire across the image after resetting mirrored verification coordinates");
const scaledSource = image(280, 120, 12);
const scaledFrame = { width: 640, height: 480, data: new Uint8ClampedArray(640 * 480 * 4) };
for (let y = 0; y < 480; y++) for (let x = 0; x < 640; x++) {
  const offset = (Math.floor(y / 2) * 320 + Math.floor(x / 2)) * 4;
  scaledFrame.data.set(scaledSource.data.slice(offset, offset + 4), (y * 640 + x) * 4);
}
const scaledTrack = movingTracker.update(scaledFrame, [], 133);
assert.ok(scaledTrack && scaledTrack.bbox[0] > 530, "Rescale coordinates when analysis resolution changes");
console.log("Current-frame tracking tests passed: moving target vs old-position distractor, no phantom predictions, mirrored-photo reset, and resolution changes.");

const distanceLight = new CalibratedBallTracker();
distanceLight.calibrate(image());
for (const radius of [3, 5, 12, 35, 70, 105]) {
  distanceLight.resetPosition();
  const result = distanceLight.update(image(160, 120, radius), [], 100);
  assert.ok(result, `Track ball radius ${radius} at near/far distances`);
  assert.ok(Math.abs(result.bbox[0] + result.bbox[2] / 2 - 160) < 4);
}
for (const brightness of [0.12, 0.2, 0.45, 0.8, 1.1, 0.15, 1, 0.25]) {
  const result = distanceLight.update(image(160, 120, 25, [220, 105, 25], brightness), [], 200);
  assert.ok(result, `Track during exposure change ${brightness}`);
}
assert.equal(distanceLight.update(image(160, 120, 25, [210, 155, 100]), [], 250), null, "Lighting tolerance must still reject a different skin-like color");
const warmFrame = image(160, 120, 25, [242, 105, 21], 0.4);
assert.ok(distanceLight.update(warmFrame, [], 300), "Allow modest warm lighting shifts");
console.log("Distance and lighting tests passed: small/large balls, dim exposure, abrupt exposure changes, warm lighting, and skin-color rejection.");

const closeSample = new CalibratedBallTracker();
assert.ok(closeSample.calibrate(image(160, 120, 100), { x: 0.5, y: 0.5, radiusX: 0.28, radiusY: 0.38 }).ok);
let closeId;
for (const [index, radius] of [90, 60, 35, 18, 8, 4, 3, 8, 30, 75].entries()) {
  const x = 130 + index * 5;
  const result = closeSample.update(image(x, 120, radius), [], index * 33);
  assert.ok(result, `Close-up calibration follows a moving ball shrinking to radius ${radius}`);
  closeId ??= result.id;
  assert.equal(result.id, closeId, "Changing distance preserves ball identity");
  assert.ok(Math.abs(result.bbox[0] + result.bbox[2] / 2 - x) < 4);
}
assert.equal(closeSample.update(image(null), [], 350), null);
assert.ok(closeSample.update(image(200, 120, 3), [], 1200), "Reacquire a distant ball after losing a close-up-calibrated target");
