import assert from "node:assert/strict";
import { advanceScore, isBallMoving, isInTarget } from "../src/ballTracking.ts";

assert.equal(isInTarget(0.8, 0.5, "right"), true);
assert.equal(isInTarget(0.2, 0.5, "right"), false);
assert.equal(isInTarget(0.2, 0.5, "left"), true);
assert.equal(isInTarget(0.8, 0.5, "left"), false);
assert.equal(isInTarget(0.8, 0.9, "right"), true);
assert.equal(isInTarget(0.8, 1, "right"), true);
assert.equal(isInTarget(0.2, 1, "left"), true);
assert.equal(isInTarget(0.8, 0.2, "right"), false);
assert.equal(isBallMoving([{ x: 0.8, y: 0.5, at: 0 }, { x: 0.801, y: 0.502, at: 100 }]), false);
assert.equal(isBallMoving([{ x: 0.8, y: 0.5, at: 0 }, { x: 0.8, y: 0.55, at: 100 }]), true);
assert.equal(isBallMoving([{ x: 0.8, y: 0.5, at: 0 }, { x: 0.8, y: 0.55, at: 600 }]), false);
let milliseconds = 0;
let points = 0;
for (let frame = 0; frame < 150; frame++) {
  const score = advanceScore(milliseconds, 100, true);
  milliseconds = score.milliseconds;
  points += score.points;
}
assert.equal(points, 15);
assert.deepEqual(advanceScore(900, 100, false), { milliseconds: 900, points: 0 });
assert.deepEqual(advanceScore(900, 600, true), { milliseconds: 900, points: 0 });
assert.deepEqual(advanceScore(900, 100, true), { milliseconds: 0, points: 1 });
console.log("Ball tracking: hand positions, motion, timing, loss of tracking, and 15-rep goal passed.");
