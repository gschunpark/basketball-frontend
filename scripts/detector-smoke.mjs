import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { testDrillFlow } from "./drill-flow.mjs";
import { stubbedImageVals } from "./fixtures/face-pixels.ts";

const root = resolve("dist");
const assets = await readdir(resolve(root, "assets"));
const workerFile = assets.find((file) => file.startsWith("ballDetector.worker-") && file.endsWith(".js"));
if (!workerFile) throw new Error("Build the app before running this test.");
const types = { ".js": "text/javascript", ".json": "application/json", ".html": "text/html", ".css": "text/css" };
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  if (pathname === "/smoke") {
    response.setHeader("Content-Type", "text/html");
    response.end("<!doctype html><title>TensorFlow tracker test</title>");
    return;
  }
  if (pathname === "/test-face") {
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(stubbedImageVals));
    return;
  }
  const file = resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
  if (!file.startsWith(`${root}\\`) && !file.startsWith(`${root}/`)) { response.writeHead(403).end(); return; }
  try {
    const data = await readFile(file);
    response.setHeader("Content-Type", types[extname(file)] ?? "application/octet-stream");
    response.end(data);
  } catch { response.writeHead(404).end(); }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/smoke`);
  const result = await page.evaluate(async (workerFile) => {
    const worker = new Worker(`/assets/${workerFile}`, { type: "module" });
    try {
      return await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("TensorFlow timed out")), 60000);
        let frames = 0;
        worker.onerror = (event) => { clearTimeout(timeout); reject(new Error(event.message)); };
        worker.onmessage = async ({ data }) => {
          if (data.type === "error") { clearTimeout(timeout); reject(new Error(data.message)); return; }
          if (data.type === "result") {
            if (!Array.isArray(data.balls)) { clearTimeout(timeout); reject(new Error("Invalid detection output")); return; }
            frames += 1;
            if (frames === 1 && !data.calibration?.ok) { clearTimeout(timeout); reject(new Error("Calibration failed")); return; }
            if (frames <= 3 && !data.balls.length) { clearTimeout(timeout); reject(new Error("Moving ball was lost")); return; }
            if (frames === 4) { clearTimeout(timeout); resolve({ frames, trackedFrames: 3 }); return; }
          }
          if (data.type === "ready" || data.type === "result") {
            const canvas = document.createElement("canvas");
            canvas.width = canvas.height = 320;
            const context = canvas.getContext("2d");
            context.fillStyle = "#232d41"; context.fillRect(0, 0, 320, 320);
            if (frames < 3) {
              context.fillStyle = "#dc6919"; context.beginPath();
              context.arc(frames === 0 ? 160 : 90 + frames * 30, 160 - frames * 20, frames === 0 ? 60 : 25, 0, Math.PI * 2);
              context.fill();
            }
            const frame = await createImageBitmap(canvas);
            const sample = document.createElement("canvas");
            sample.width = sample.height = 128;
            const picture = sample.getContext("2d");
            picture.beginPath(); picture.arc(64, 64, 64, 0, Math.PI * 2); picture.clip();
            picture.drawImage(canvas, 110, 110, 100, 100, 0, 0, 128, 128);
            worker.postMessage({ type: "frame", frame, timestamp: performance.now(), calibrate: frames === 0,
              samplePixels: frames === 0 ? picture.getImageData(0, 0, 128, 128) : undefined }, [frame]);
          }
        };
        worker.postMessage({
          type: "initialize",
          modelUrl: `${location.origin}/tensorflow/ball/model.json`,
        });
      });
    } finally { worker.terminate(); }
  }, workerFile);
  if (errors.length) throw new Error(errors.join("\n"));
  console.log("TensorFlow browser worker initialized, calibrated, and tracked moving frames:", result);
  const faceResult = await page.evaluate(async (workerFile) => {
    const values = await fetch("/test-face").then((response) => response.json());
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 128;
    const context = canvas.getContext("2d");
    const image = context.createImageData(128, 128);
    for (let index = 0; index < values.length / 3; index++) image.data.set([...values.slice(index * 3, index * 3 + 3), 255], index * 4);
    context.putImageData(image, 0, 0);
    const worker = new Worker(`/assets/${workerFile}`, { type: "module" });
    try {
      return await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Face exclusion inference timed out")), 60000);
        worker.onerror = (event) => { clearTimeout(timeout); reject(new Error(event.message)); };
        worker.onmessage = async ({ data }) => {
          if (data.type === "error") { clearTimeout(timeout); reject(new Error(data.message)); return; }
          if (data.type === "result" && data.facesExcluded > 0) {
            clearTimeout(timeout); resolve(data.facesExcluded); return;
          }
          if (data.type === "ready" || data.type === "result") {
            await new Promise((resolve) => setTimeout(resolve, 40));
            const frame = await createImageBitmap(canvas);
            worker.postMessage({ type: "frame", frame, timestamp: performance.now() }, [frame]);
          }
        };
        worker.postMessage({ type: "initialize", modelUrl: `${location.origin}/tensorflow/ball/model.json` });
      });
    } finally { worker.terminate(); }
  }, workerFile);
  console.log("Actual face model located and excluded the TensorFlow face test image:", faceResult);
  await testDrillFlow(browser, `http://127.0.0.1:${server.address().port}`);
  await testDrillFlow(browser, `http://127.0.0.1:${server.address().port}`, { width: 390, height: 844 });
} finally {
  await browser?.close();
  server.close();
}
