import { mkdir, writeFile } from "node:fs/promises";
const source = process.argv[2] ?? "https://storage.googleapis.com/tfjs-models/savedmodel/ssdlite_mobilenet_v2/";
const directory = new URL(`../public/tensorflow/${process.argv[3] ?? "ball"}/`, import.meta.url);
await mkdir(directory, { recursive: true });
const response = await fetch(`${source}model.json`);
if (!response.ok) throw new Error(`Model download failed: ${response.status}`);
const model = await response.json();
await writeFile(new URL("model.json", directory), JSON.stringify(model));
for (const path of new Set(model.weightsManifest.flatMap((group) => group.paths))) {
  const shard = await fetch(new URL(path, source));
  if (!shard.ok) throw new Error(`Weight download failed: ${shard.status}`);
  await writeFile(new URL(path, directory), new Uint8Array(await shard.arrayBuffer()));
}
console.log("TensorFlow.js model and weights downloaded into public/tensorflow/ball.");
