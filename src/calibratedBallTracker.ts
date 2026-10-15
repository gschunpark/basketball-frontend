export type Box = [number, number, number, number];
export type Candidate = { bbox: Box; score: number };
export type PixelFrame = { width: number; height: number; data: Uint8ClampedArray };
export type BallTrack = Candidate & { id: number; source: "detected" | "tracked" };
export type SampleCircle = { x: number; y: number; radiusX: number; radiusY: number };
export type SampleColor = { id: number; hex: string; percent: number; enabled: boolean };

function colorKey(red: number, green: number, blue: number) {
  const max = Math.max(red, green, blue), min = Math.min(red, green, blue);
  const difference = max - min;
  if (max < 8) return 0;
  if (difference / max < 0.18) return 1 + Math.floor(max / 32);
  let hue = max === red ? (green - blue) / difference : max === green
    ? 2 + (blue - red) / difference : 4 + (red - green) / difference;
  hue = (hue * 60 + 360) % 360;
  return 10 + Math.floor(hue / 15);
}

export function sampledColorId(red: number, green: number, blue: number) {
  const key = colorKey(red, green, blue);
  const maximum = Math.max(red, green, blue);
  const saturation = maximum ? (maximum - Math.min(red, green, blue)) / maximum : 0;
  return key * 10 + (key >= 10 ? Math.min(3, Math.floor(saturation * 4)) : 0);
}

export function highlightSampleColor(frame: PixelFrame, id: number) {
  const data = new Uint8ClampedArray(frame.data);
  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset + 3] < 250) continue;
    if (sampledColorId(data[offset], data[offset + 1], data[offset + 2]) === id) continue;
    for (let channel = 0; channel < 3; channel++) data[offset + channel] *= 0.16;
  }
  return { width: frame.width, height: frame.height, data };
}

// A calibrated appearance model supplements TensorFlow detection on every video frame.
// Connected image regions provide position and scale, rather than guessing a trajectory.
export class CalibratedBallTracker {
  private palette = new Set<number>();
  private track: BallTrack | null = null;
  private lastSeenAt = 0;
  private nextId = 1;
  private frameSize = { width: 0, height: 0 };
  private velocity = { x: 0, y: 0 };
  private color = "";
  private minimumSaturation = 0.18;
  private sampleColors: SampleColor[] = [];
  private colorProfiles: { key: number; saturation: number; red: number; green: number; brightness: number; enabled: boolean }[] = [];

  get calibrated() { return this.palette.size > 0; }
  get needsDetection() { return !this.track; }

  resetPosition() {
    this.track = null;
    this.velocity = { x: 0, y: 0 };
    this.lastSeenAt = 0;
    this.frameSize = { width: 0, height: 0 };
  }

  calibrate(frame: PixelFrame, circle?: SampleCircle) {
    const cx = (circle?.x ?? 0.5) * frame.width, cy = (circle?.y ?? 0.5) * frame.height;
    const radiusX = circle ? circle.radiusX * frame.width : Math.min(frame.width, frame.height) * 0.12;
    const radiusY = circle ? circle.radiusY * frame.height : Math.min(frame.width, frame.height) * 0.12;
    if (radiusX <= 0 || radiusY <= 0) return { ok: false, message: "The sample circle is not ready. Try again." };
    const histogram = new Map<number, number>();
    const colorGroups = new Map<number, { count: number; red: number; green: number; blue: number }>();
    let total = 0, red = 0, green = 0, blue = 0;
    let saturationTotal = 0, coloredTotal = 0;
    for (let y = Math.max(0, Math.ceil(cy - radiusY)); y <= Math.min(frame.height - 1, cy + radiusY); y++) {
      for (let x = Math.max(0, Math.ceil(cx - radiusX)); x <= Math.min(frame.width - 1, cx + radiusX); x++) {
      // Never read the square corners or any pixels outside the visible circle.
      if (((x - cx) / radiusX) ** 2 + ((y - cy) / radiusY) ** 2 > 1) continue;
      const offset = (y * frame.width + x) * 4;
      if (frame.data[offset + 3] < 250) continue;
      const r = frame.data[offset], g = frame.data[offset + 1], b = frame.data[offset + 2];
      const key = colorKey(r, g, b);
      const maximum = Math.max(r, g, b);
      const saturation = maximum ? (maximum - Math.min(r, g, b)) / maximum : 0;
      const sampleKey = sampledColorId(r, g, b);
      const group = colorGroups.get(sampleKey) ?? { count: 0, red: 0, green: 0, blue: 0 };
      group.count++; group.red += r; group.green += g; group.blue += b;
      colorGroups.set(sampleKey, group);
        histogram.set(sampleKey, (histogram.get(sampleKey) ?? 0) + 1);
        red += r; green += g; blue += b; total++;
        if (key >= 10) {
          const maximum = Math.max(r, g, b);
          saturationTotal += (maximum - Math.min(r, g, b)) / maximum;
          coloredTotal++;
        }
      }
    }
    const selected = [...histogram].filter(([, count]) => count / total >= 0.08);
    if (!total || !selected.length) return { ok: false, message: "Fill the circle with your ball against a contrasting background, then try again." };
    const palette = new Set<number>();
    for (const [sampleKey] of selected) {
      const key = Math.floor(sampleKey / 10);
      palette.add(key);
      if (key >= 10) {
        palette.add(10 + (key - 10 + 23) % 24);
        palette.add(10 + (key - 10 + 1) % 24);
      }
    }
    this.palette = palette;
    this.minimumSaturation = Math.max(0.18, saturationTotal / Math.max(1, coloredTotal) - 0.3);
    this.color = `#${[red, green, blue].map((sum) => Math.round(sum / total).toString(16).padStart(2, "0")).join("")}`;
    this.track = null;
    this.velocity = { x: 0, y: 0 };
    const selectedKeys = new Set(selected.map(([key]) => key));
    this.sampleColors = [...colorGroups].filter(([, group]) => group.count / total >= 0.01)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([id, group]) => ({
        id,
        hex: `#${[group.red, group.green, group.blue].map((sum) => Math.round(sum / group.count).toString(16).padStart(2, "0")).join("")}`,
        percent: Math.round(group.count / total * 100),
        enabled: selectedKeys.has(id),
      }));
    this.setAllowedColors(this.sampleColors.filter((color) => color.enabled).map((color) => color.id));
    return { ok: true, color: this.color, colors: this.sampleColors, message: "Choose which colors belong to your ball." };
  }

  setAllowedColors(ids: number[]) {
    const allowed = new Set(ids);
    const palette = new Set<number>();
    this.colorProfiles = [];
    for (const color of this.sampleColors) {
      if (allowed.has(color.id)) palette.add(color.id);
      const rgb = [1, 3, 5].map((offset) => parseInt(color.hex.slice(offset, offset + 2), 16));
      const maximum = Math.max(...rgb), sum = rgb[0] + rgb[1] + rgb[2];
      this.colorProfiles.push({ key: Math.floor(color.id / 10), saturation: maximum ? (maximum - Math.min(...rgb)) / maximum : 0,
        red: rgb[0] / Math.max(1, sum), green: rgb[1] / Math.max(1, sum), brightness: maximum, enabled: allowed.has(color.id) });
    }
    // Explicitly ignored sampled colors override neighboring-hue tolerance.
    for (const color of this.sampleColors) if (!allowed.has(color.id)) palette.delete(color.id);
    this.palette = palette;
    this.track = null;
  }

  update(frame: PixelFrame, detections: Candidate[] | undefined, at: number, faces: Box[] = []): BallTrack | null {
    if (!this.calibrated) return null;
    const { width, height, data } = frame;
    if (this.track && this.frameSize.width && this.frameSize.height &&
      (width !== this.frameSize.width || height !== this.frameSize.height)) {
      const scaleX = width / this.frameSize.width, scaleY = height / this.frameSize.height;
      const [x, y, w, h] = this.track.bbox;
      this.track = { ...this.track, bbox: [x * scaleX, y * scaleY, w * scaleX, h * scaleY] };
      this.velocity = { x: this.velocity.x * scaleX, y: this.velocity.y * scaleY };
    }
    this.frameSize = { width, height };
    const mask = new Uint8Array(width * height);
    for (let index = 0; index < mask.length; index++) {
      const offset = index * 4;
      const x = index % width, y = Math.floor(index / width);
      if (faces.some(([left, top, w, h]) => x >= left && x <= left + w && y >= top && y <= top + h)) continue;
      const r = data[offset], g = data[offset + 1], b = data[offset + 2];
      const key = colorKey(r, g, b);
      const maximum = Math.max(r, g, b);
      const saturation = maximum ? (maximum - Math.min(r, g, b)) / maximum : 0;
      const sum = Math.max(1, r + g + b);
      let closest = Infinity, accepted = false;
      for (const profile of this.colorProfiles) {
        if (key < 10 || profile.key < 10) {
          const distance = Math.abs(maximum - profile.brightness);
          if (key === profile.key && distance <= 24 && distance < closest) { closest = distance; accepted = profile.enabled; }
          continue;
        }
        const hueDistance = Math.min(Math.abs(key - profile.key), 24 - Math.abs(key - profile.key));
        // Channel proportions distinguish colors while allowing substantial exposure changes.
        const matches = maximum >= Math.max(8, profile.brightness * 0.08) && maximum <= profile.brightness * 2.4 &&
          hueDistance <= 1 && Math.abs(saturation - profile.saturation) <= 0.16 &&
          Math.abs(r / sum - profile.red) <= 0.07 && Math.abs(g / sum - profile.green) <= 0.07;
        const distance = Math.abs(saturation - profile.saturation) + Math.abs(r / sum - profile.red) + Math.abs(g / sum - profile.green);
        if (matches && distance < closest) { closest = distance; accepted = profile.enabled; }
      }
      mask[index] = accepted ? 1 : 0;
    }
    // Bridge narrow dark seams so the ball remains one connected region as it rotates.
    const bridge = (offset: number, step: number, length: number) => {
      let previous = -1;
      for (let index = 0; index < length; index++) {
        if (!mask[offset + index * step]) continue;
        if (previous >= 0 && index - previous <= 6) {
          for (let gap = previous + 1; gap < index; gap++) mask[offset + gap * step] = 1;
        }
        previous = index;
      }
    };
    for (let row = 0; row < height; row++) bridge(row * width, 1, width);
    for (let column = 0; column < width; column++) bridge(column, width, height);
    // Seam bridging must not fill pixels back into an excluded face.
    for (const [left, top, w, h] of faces) {
      for (let y = Math.max(0, Math.floor(top)); y <= Math.min(height - 1, top + h); y++) {
        for (let x = Math.max(0, Math.floor(left)); x <= Math.min(width - 1, left + w); x++) mask[y * width + x] = 0;
      }
    }
    const queue = new Int32Array(mask.length);
    const candidates: Candidate[] = [];
    for (let index = 0; index < mask.length; index++) {
      if (!mask[index]) continue;
      let start = 0, end = 1, minX = width, maxX = 0, minY = height, maxY = 0;
      queue[0] = index; mask[index] = 0;
      while (start < end) {
        const pixel = queue[start++], x = pixel % width, y = Math.floor(pixel / width);
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        for (const neighbor of [x > 0 ? pixel - 1 : -1, x < width - 1 ? pixel + 1 : -1,
          y > 0 ? pixel - width : -1, y < height - 1 ? pixel + width : -1]) {
          if (neighbor >= 0 && mask[neighbor]) { mask[neighbor] = 0; queue[end++] = neighbor; }
        }
      }
      const w = maxX - minX + 1, h = maxY - minY + 1;
      const density = end / (w * h), aspect = w / h;
      if (end < 9 || end > width * height * 0.7 || aspect < 0.4 || aspect > 2.4 || density < 0.35) continue;
      // Small distant balls need a compact region so individual noise pixels do not count.
      if (end < 18 && (w < 3 || h < 3 || density < 0.5 || aspect < 0.6 || aspect > 1.7)) continue;
      const bbox: Box = [minX, minY, w, h];
      const supported = detections?.some((detection) => {
        const dx = detection.bbox[0] + detection.bbox[2] / 2 - (minX + w / 2);
        const dy = detection.bbox[1] + detection.bbox[3] / 2 - (minY + h / 2);
        return Math.hypot(dx, dy) < Math.max(w, h);
      });
      candidates.push({ bbox, score: density + (supported ? 1 : 0) });
    }
    if (at - this.lastSeenAt > 800) this.track = null;
    const prior = this.track;
    const elapsed = Math.max(0, at - this.lastSeenAt);
    const predictionTime = Math.min(120, elapsed);
    const distance = (candidate: Candidate) => {
      const anchor = prior?.bbox ?? [width / 2, height / 2, 0, 0];
      return Math.hypot(candidate.bbox[0] + candidate.bbox[2] / 2 - anchor[0] - anchor[2] / 2 - (prior ? this.velocity.x * predictionTime : 0),
        candidate.bbox[1] + candidate.bbox[3] / 2 - anchor[1] - anchor[3] / 2 - (prior ? this.velocity.y * predictionTime : 0));
    };
    candidates.sort((a, b) => prior ? distance(a) - distance(b) :
      (b.score >= 1.28 ? 1 : 0) - (a.score >= 1.28 ? 1 : 0) || distance(a) - distance(b));
    const best = candidates[0];
    if (!best || (prior && distance(best) > Math.max(width * 0.4, prior.bbox[2] * 4))) return null;
    if (prior && elapsed > 0 && elapsed <= 250) {
      this.velocity = {
        x: (best.bbox[0] + best.bbox[2] / 2 - prior.bbox[0] - prior.bbox[2] / 2) / elapsed,
        y: (best.bbox[1] + best.bbox[3] / 2 - prior.bbox[1] - prior.bbox[3] / 2) / elapsed,
      };
    } else this.velocity = { x: 0, y: 0 };
    this.lastSeenAt = at;
    this.track = { ...best, id: prior?.id ?? this.nextId++, source: "tracked" };
    return this.track;
  }
}
