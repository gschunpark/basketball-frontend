import { brightenBallPicture } from "./cameraQuality.ts";

export function photoSharpness(data: Uint8ClampedArray, width: number, height: number) {
  const gray = (x: number, y: number) => {
    const offset = (y * width + x) * 4;
    return data[offset] * 0.299 + data[offset + 1] * 0.587 + data[offset + 2] * 0.114;
  };
  let sum = 0, squared = 0, count = 0;
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const edge = gray(x - 1, y) + gray(x + 1, y) + gray(x, y - 1) + gray(x, y + 1) - 4 * gray(x, y);
    sum += edge; squared += edge * edge; count++;
  }
  return count ? squared / count - (sum / count) ** 2 : 0;
}

async function nextFrame(video: HTMLVideoElement) {
  await new Promise<void>((resolve) => {
    let finished = false;
    let callback: number | undefined;
    const done = () => {
      if (finished) return;
      finished = true; clearTimeout(timeout);
      if (callback !== undefined) video.cancelVideoFrameCallback?.(callback);
      resolve();
    };
    const timeout = setTimeout(done, 120);
    if (video.requestVideoFrameCallback) callback = video.requestVideoFrameCallback(done);
    else setTimeout(done, 35);
  });
}

export async function captureSharpPhoto(video: HTMLVideoElement, region?: { x: number; y: number; width: number; height: number } | null) {
  if (video.readyState < 2 || !video.videoWidth) throw new Error("Camera is not ready");
  const frame = document.createElement("canvas"), best = document.createElement("canvas"), analysis = document.createElement("canvas");
  frame.width = best.width = video.videoWidth; frame.height = best.height = video.videoHeight;
  analysis.width = 192; analysis.height = 192;
  const draw = frame.getContext("2d"), save = best.getContext("2d"), inspect = analysis.getContext("2d", { willReadFrequently: true });
  if (!draw || !save || !inspect) throw new Error("Photo capture is unavailable");
  let bestScore = -Infinity;
  for (let index = 0; index < 5; index++) {
    await nextFrame(video);
    draw.setTransform(-1, 0, 0, 1, frame.width, 0);
    draw.drawImage(video, 0, 0, frame.width, frame.height);
    const area = region ?? { x: 0.15, y: 0.15, width: 0.7, height: 0.7 };
    inspect.drawImage(frame, area.x * frame.width, area.y * frame.height, area.width * frame.width, area.height * frame.height, 0, 0, 192, 192);
    const score = photoSharpness(inspect.getImageData(0, 0, 192, 192).data, 192, 192);
    if (score > bestScore) { bestScore = score; save.drawImage(frame, 0, 0); }
  }
  // Keep the winning frame at full resolution; only the sharpness analysis is downscaled.
  save.putImageData(brightenBallPicture(save.getImageData(0, 0, best.width, best.height)), 0, 0);
  return best;
}
