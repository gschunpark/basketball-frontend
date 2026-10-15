import type { PixelFrame } from "./calibratedBallTracker";

// Lift dim pixels without changing channel ratios or clipping orange into white.
export function brightenBallPicture<T extends PixelFrame>(frame: T): T {
  for (let offset = 0; offset < frame.data.length; offset += 4) {
    if (frame.data[offset + 3] === 0) continue;
    const maximum = Math.max(frame.data[offset], frame.data[offset + 1], frame.data[offset + 2]);
    if (!maximum) continue;
    const gain = Math.min(1.7, Math.max(1, 190 / maximum), 255 / maximum);
    for (let channel = 0; channel < 3; channel++) frame.data[offset + channel] *= gain;
  }
  return frame;
}

export class FrameBudget {
  private samples: number[] = [];
  private index = 1;
  private lastChange = 0;
  readonly widths = [320, 400, 480, 640, 800, 960];
  private detailNeeded = false;
  get width() { return this.widths[this.index]; }
  requestDetail(needed: boolean) { this.detailNeeded = needed; }
  observe(milliseconds: number, now: number) {
    this.samples.push(milliseconds);
    if (this.samples.length < 30) return;
    const average = this.samples.reduce((sum, value) => sum + value, 0) / this.samples.length;
    this.samples = [];
    if (now - this.lastChange < 3000) return;
    if (average > 35 && this.index > 0) { this.index--; this.lastChange = now; }
    else if (average < (this.detailNeeded ? 24 : 12) && this.index < this.widths.length - 1) { this.index++; this.lastChange = now; }
  }
}

export class CameraBudget {
  private samples: number[] = [];
  private lastChange = 0;
  private index = 0;
  readonly widths = [3840, 2560, 1920, 1280];
  observe(milliseconds: number, now: number): number | null {
    this.samples.push(milliseconds);
    if (this.samples.length < 60) return null;
    const average = this.samples.reduce((sum, value) => sum + value, 0) / this.samples.length;
    this.samples = [];
    if (now - this.lastChange < 6000) return null;
    if (average > 45 && this.index < this.widths.length - 1) this.index++;
    else if (average < 16 && this.index > 0) this.index--;
    else return null;
    this.lastChange = now;
    return this.widths[this.index];
  }
}
