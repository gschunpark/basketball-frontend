import { CalibratedBallTracker, type Candidate, type Box } from "./calibratedBallTracker";
import { brightenBallPicture, FrameBudget } from "./cameraQuality";

let recognizer: Worker | undefined;
let nextRequest = 1;
type Recognition = { objects: { class: string; bbox: Box; score: number }[]; faces: Box[] };
const requests = new Map<number, { resolve: (result: Recognition) => void; reject: (error: Error) => void }>();
function recognize(pixels: ImageData): Promise<Recognition> {
  return new Promise((resolve, reject) => {
    const id = nextRequest++;
    requests.set(id, { resolve, reject });
    recognizer!.postMessage({ type: "recognize", id, pixels });
  });
}
let faceRegions: Box[] = [];
let facesAt = -Infinity;
const frameBudget = new FrameBudget();
const tracker = new CalibratedBallTracker();
let trackingCanvas: OffscreenCanvas | undefined;
let lastDetectionAt = -Infinity;
let inferenceActive = false;
let detections: Candidate[] = [];
let detectionResultAt = -Infinity;

self.onmessage = async (event: MessageEvent) => {
  const message = event.data;
  try {
    if (message.type === "initialize") {
      recognizer = new Worker(new URL("./ballRecognition.worker.ts", import.meta.url), { type: "module" });
      await new Promise<void>((resolve, reject) => {
        recognizer!.onmessage = ({ data }) => {
          if (data.type === "ready") resolve();
          else if (data.type === "recognized") { requests.get(data.id)?.resolve(data); requests.delete(data.id); }
          else if (data.type === "error") {
            const error = new Error(data.message);
            if (data.id) { requests.get(data.id)?.reject(error); requests.delete(data.id); } else reject(error);
          }
        };
        recognizer!.onerror = () => {
          const error = new Error("Recognition worker failed");
          reject(error);
          for (const request of requests.values()) request.reject(error);
          requests.clear();
        };
        recognizer!.postMessage({ type: "initialize", modelUrl: message.modelUrl });
      });
      self.postMessage({ type: "ready" });
    } else if (message.type === "calibrate-item") {
      const calibration = tracker.calibrate(message.samplePixels, { x: 0.5, y: 0.5, radiusX: 0.5, radiusY: 0.5 });
      self.postMessage({ type: "item-calibrated", calibration });
    } else if (message.type === "verify-item") {
      try {
        if (!recognizer) throw new Error("Recognition is not ready");
        const frame = message.frame as ImageBitmap;
        const width = Math.min(640, frame.width), height = Math.round(width * frame.height / frame.width);
        const canvas = new OffscreenCanvas(width, height);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Photo recognition is unavailable");
        context.drawImage(frame, 0, 0, width, height);
        const pixels = context.getImageData(0, 0, width, height);
        const { objects, faces: blocked } = await recognize(pixels);
        const balls = objects.filter((object) => object.class === "sports ball");
        const item = tracker.update(pixels, balls, performance.now(), blocked);
        const recognized = item && balls.some((ball) => Math.hypot(ball.bbox[0] - item.bbox[0], ball.bbox[1] - item.bbox[1]) < Math.max(item.bbox[2], item.bbox[3]));
        self.postMessage({ type: "item-verified", recognized: Boolean(recognized), region: item ? { x: item.bbox[0] / width, y: item.bbox[1] / height, width: item.bbox[2] / width, height: item.bbox[3] / height } : null });
        // Verification photos are mirrored; live analysis frames are not.
        tracker.resetPosition();
      } finally { message.frame.close(); }
    } else if (message.type === "colors") {
      tracker.setAllowedColors(message.ids);
      self.postMessage({ type: "colors-applied" });
    } else if (message.type === "frame") {
      try {
        if (!recognizer) throw new Error("Detector is not ready");
        const frame = message.frame as ImageBitmap;
        const processingStarted = performance.now();
        // Budget the longest edge so portrait cameras do not process oversized frames.
        const width = Math.min(Math.round(frameBudget.width * Math.min(1, frame.width / frame.height)), frame.width);
        const height = Math.round(frame.height * width / frame.width);
        if (!trackingCanvas || trackingCanvas.width !== width || trackingCanvas.height !== height) {
          trackingCanvas = new OffscreenCanvas(width, height);
        }
        const context = trackingCanvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("Visual tracking is unavailable");
        context.drawImage(frame, 0, 0, width, height);
        const rawPixels = context.getImageData(0, 0, width, height);
        const pixels = brightenBallPicture(new ImageData(new Uint8ClampedArray(rawPixels.data), width, height));
        let calibration;
        if (message.calibrate) {
          if (!message.samplePixels) throw new Error("Capture the circle interior before calibration");
          calibration = tracker.calibrate(message.samplePixels, { x: 0.5, y: 0.5, radiusX: 0.5, radiusY: 0.5 });
        }
        const blockedFaces: Box[] = message.timestamp - facesAt <= 1500
          ? faceRegions.map(([x, y, w, h]) => [x * width, y * height, w * width, h * height]) : [];
        const track = tracker.update(pixels, message.timestamp - detectionResultAt <= 150 ? detections.map((item) => ({ ...item, bbox: [item.bbox[0] * width, item.bbox[1] * height, item.bbox[2] * width, item.bbox[3] * height] as Box })) : undefined, message.timestamp, blockedFaces);
        frameBudget.requestDetail(!track || Math.min(track.bbox[2], track.bbox[3]) < 32);
        const balls = track ? [{
          ...track,
          bbox: [track.bbox[0] * frame.width / width, track.bbox[1] * frame.height / height,
            track.bbox[2] * frame.width / width, track.bbox[3] * frame.height / height],
        }] : [];
        frameBudget.observe(performance.now() - processingStarted, message.timestamp);
        self.postMessage({ type: "result", balls, calibration, facesExcluded: blockedFaces.length, analysisEdge: frameBudget.width });
        // TensorFlow refreshes object anchors asynchronously; appearance tracking stays responsive.
        if (!inferenceActive && message.timestamp - lastDetectionAt >= 350) {
          inferenceActive = true;
          lastDetectionAt = message.timestamp;
          const refresh = async () => {
            const { objects, faces } = await recognize(pixels);
            faceRegions = faces.map(([x, y, w, h]) => [x / width, y / height, w / width, h / height] as Box);
            facesAt = message.timestamp;
            return objects;
          };
          setTimeout(() => void refresh().then((result) => {
            detections = result.filter((item) => item.class === "sports ball").map((item) => ({ bbox: [item.bbox[0] / width, item.bbox[1] / height, item.bbox[2] / width, item.bbox[3] / height] as Box, score: item.score }));
            detectionResultAt = message.timestamp;
          }).catch(() => { detections = []; }).finally(() => { inferenceActive = false; }), 0);
        }
      } finally { message.frame.close(); }
    }
  } catch (error) {
    self.postMessage({ type: "error", message: error instanceof Error ? error.message : String(error) });
  }
};
