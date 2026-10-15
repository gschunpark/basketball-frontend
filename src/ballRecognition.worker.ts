import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as blazeface from "@tensorflow-models/blazeface";
import type { Box } from "./calibratedBallTracker";
let detector: cocoSsd.ObjectDetection;
let faces: blazeface.BlazeFaceModel;

self.onmessage = async ({ data: message }: MessageEvent) => {
  try {
    if (message.type === "initialize") {
      try { await tf.setBackend("webgl"); } catch { await tf.setBackend("cpu"); }
      await tf.ready();
      detector = await cocoSsd.load({ base: "lite_mobilenet_v2", modelUrl: message.modelUrl });
      faces = await blazeface.load({ maxFaces: 3, scoreThreshold: 0.7, modelUrl: new URL("../face/model.json", message.modelUrl).href });
      const warmup = tf.zeros([128, 128, 3], "int32") as tf.Tensor3D;
      try { await faces.estimateFaces(warmup, false, false, false); } finally { warmup.dispose(); }
      self.postMessage({ type: "ready" });
    } else if (message.type === "recognize") {
      const pixels = new ImageData(new Uint8ClampedArray(message.pixels.data), message.pixels.width, message.pixels.height);
      const faceResults = await faces.estimateFaces(pixels, false, false, false);
      const blocked: Box[] = faceResults.map((face) => {
        const [x, y] = face.topLeft as [number, number], [right, bottom] = face.bottomRight as [number, number];
        const w = right - x, h = bottom - y;
        return [x - w * 0.15, y - h * 0.2, w * 1.3, h * 1.4];
      });
      const objects = await detector.detect(pixels, 20, 0.3);
      self.postMessage({ type: "recognized", id: message.id, objects, faces: blocked });
    }
  } catch (error) { self.postMessage({ type: "error", id: message.id, message: error instanceof Error ? error.message : String(error) }); }
};
