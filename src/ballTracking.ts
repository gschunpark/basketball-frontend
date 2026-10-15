export type BallSample = { x: number; y: number; at: number };

export function isInTarget(x: number, y: number, hand: "right" | "left") {
  const left = hand === "right" ? 0.72 : 0.08;
  return x >= left && x <= left + 0.2 && y >= 0.28 && y <= 1;
}

// Require real displacement over a short window to reject detector jitter.
export function isBallMoving(samples: BallSample[]) {
  if (samples.length < 2) return false;
  const newest = samples[samples.length - 1];
  return samples.some((sample) => newest.at - sample.at <= 350 &&
    Math.hypot(newest.x - sample.x, newest.y - sample.y) >= 0.025);
}

export function advanceScore(milliseconds: number, elapsed: number, active: boolean) {
  if (!active || elapsed <= 0 || elapsed > 500) return { milliseconds, points: 0 };
  const total = milliseconds + elapsed;
  return { milliseconds: total % 1000, points: Math.floor(total / 1000) };
}
