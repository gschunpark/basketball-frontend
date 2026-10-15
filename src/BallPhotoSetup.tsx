import { useEffect, useRef, useState } from "react";
import { captureSharpPhoto } from "./photoCapture";
type Region = { x: number; y: number; width: number; height: number };

export default function BallPhotoSetup({ video, worker, ready, onConfirmed, onBusyChanged }: {
  video: HTMLVideoElement | null; worker: Worker | null; ready: boolean; onConfirmed: () => void; onBusyChanged: (busy: boolean) => void;
}) {
  const [stage, setStage] = useState<"capture" | "select" | "reposition" | "verify">("capture");
  const [photo, setPhoto] = useState("");
  const [region, setRegion] = useState<Region | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [matched, setMatched] = useState(false);
  const pictureRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const photoViewRef = useRef<HTMLDivElement>(null);
  const [photoSize, setPhotoSize] = useState({ width: 0, height: 0 });
  useEffect(() => { onBusyChanged(busy); }, [busy, onBusyChanged]);
  useEffect(() => {
    const view = photoViewRef.current;
    if (!view) return;
    const measure = () => setPhotoSize({ width: view.clientWidth, height: view.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(view);
    return () => observer.disconnect();
  }, [photo, stage]);

  // Enlarge only the confirmation overlay; keep the actual matched region unchanged.
  let displayRegion = region;
  if (stage === "verify" && region && photoSize.width && photoSize.height) {
    const width = Math.min(1, Math.max(region.width, 96 / photoSize.width));
    const height = Math.min(1, Math.max(region.height, 96 / photoSize.height));
    displayRegion = {
      x: Math.max(0, Math.min(1 - width, region.x + region.width / 2 - width / 2)),
      y: Math.max(0, Math.min(1 - height, region.y + region.height / 2 - height / 2)),
      width, height,
    };
  }

  useEffect(() => {
    if (!worker) return;
    const receive = (event: MessageEvent) => {
      const data = event.data;
      if (data.type === "item-calibrated") {
        if (!data.calibration.ok) { setMessage(data.calibration.message); setBusy(false); return; }
        setBusy(false); setStage("reposition");
        setMessage("Ball selected. Set your ball up again in the camera view, then take the second photo when you are ready.");
      } else if (data.type === "item-verified") {
        setBusy(false); setStage("verify"); setMatched(Boolean(data.region));
        setRegion(data.region ?? null);
        setMessage(data.region
          ? data.recognized ? "I found a sports ball. Is the highlighted item your basketball?" : "I matched the highlighted item to your selection. Is this your basketball?"
          : "I could not find your selected basketball in this photo. Select it again.");
      } else if (data.type === "error") { setBusy(false); setMessage("Photo recognition failed. Retake the photo and try again."); }
    };
    worker.addEventListener("message", receive);
    return () => worker.removeEventListener("message", receive);
  }, [worker, video]);

  async function capture() {
    if (!video) throw new Error("Camera is not ready");
    const canvas = await captureSharpPhoto(video, region);
    pictureRef.current = canvas; setPhoto(canvas.toDataURL("image/png"));
    return canvas;
  }

  async function verifyPhoto() {
    try {
      setBusy(true);
      const canvas = await capture(); setRegion(null); setMessage("Checking a fresh photo for the selected item...");
      const frame = await createImageBitmap(canvas);
      worker?.postMessage({ type: "verify-item", frame }, [frame]);
    } catch { setBusy(false); setMessage("Could not capture another photo. Try again."); }
  }

  function selectItem() {
    if (!region || !pictureRef.current || !worker) return;
    const source = pictureRef.current;
    const sample = document.createElement("canvas");
    sample.width = Math.max(1, Math.round(region.width * source.width));
    sample.height = Math.max(1, Math.round(region.height * source.height));
    const context = sample.getContext("2d"); if (!context) return;
    context.drawImage(source, region.x * source.width, region.y * source.height,
      region.width * source.width, region.height * source.height, 0, 0, sample.width, sample.height);
    setBusy(true); setMessage("Learning the selected item...");
    worker.postMessage({ type: "calibrate-item", samplePixels: context.getImageData(0, 0, sample.width, sample.height) });
  }

  return <section className={`item-photo-setup ${stage === "verify" ? "item-confirmation" : ""}`}>
    <p className="item-setup-eyebrow">SportStar · {stage === "verify" ? "Ready to train" : "Ball setup"}</p>
    <h2>{stage === "capture" ? "Get your basketball ready" : stage === "select" ? "Select your basketball" : stage === "reposition" ? "Set your ball up again" : "Check the item I found"}</h2>
    <p>{stage === "capture" ? "Keep your basketball visible. Take a full camera photo, then select the ball you will use for this drill."
      : stage === "select" ? "Drag a box tightly around your basketball, or tap its center. Keep your face and hands outside the box." : message}</p>
    {photo && stage !== "reposition" && <div ref={photoViewRef} className={`item-photo ${stage === "select" ? "selectable" : ""}`}
      onPointerDown={(event) => {
        if (stage !== "select" || busy) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width, y = (event.clientY - rect.top) / rect.height;
        dragRef.current = { x, y }; event.currentTarget.setPointerCapture(event.pointerId);
        setRegion({ x: Math.max(0, x - 0.05), y: Math.max(0, y - 0.05), width: Math.min(0.1, 1 - Math.max(0, x - 0.05)), height: Math.min(0.1, 1 - Math.max(0, y - 0.05)) });
      }}
      onPointerMove={(event) => {
        if (!dragRef.current || stage !== "select") return;
        const rect = event.currentTarget.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
        if (Math.hypot(x - dragRef.current.x, y - dragRef.current.y) > 0.015) setRegion({ x: Math.min(x, dragRef.current.x), y: Math.min(y, dragRef.current.y), width: Math.abs(x - dragRef.current.x), height: Math.abs(y - dragRef.current.y) });
      }} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }}>
      <img src={photo} alt={stage === "verify" ? "Second full-resolution photo with the matched item" : "Full-resolution camera photo for item selection"} draggable={false} />
      {displayRegion && <div className={`item-selection-box ${stage === "verify" ? "verification-box" : ""}`} style={{ left: `${displayRegion.x * 100}%`, top: `${displayRegion.y * 100}%`, width: `${displayRegion.width * 100}%`, height: `${displayRegion.height * 100}%` }}><span>Basketball {stage === "verify" ? "candidate" : "selection"}</span></div>}
    </div>}
    {message && stage !== "verify" && <p role="status">{message}</p>}
    {stage === "capture" && <button type="button" className="complete-drill" disabled={!ready || busy} onClick={async () => {
      setBusy(true); setMessage("Capturing the sharpest frame...");
      try { await capture(); setRegion(null); setMessage(""); setStage("select"); } catch { setMessage("Wait for the camera, then try again."); } finally { setBusy(false); }
    }}>{ready ? "Take full photo" : "Loading recognition..."}</button>}
    {stage === "select" && <>
      <button type="button" className="complete-drill" disabled={!ready || !region || region.width < 0.01 || region.height < 0.01 || busy} onClick={selectItem}>{busy ? "Saving your selection..." : "Select ball"}</button>
      <button type="button" className="reset-counter" disabled={busy} onClick={async () => { setBusy(true); try { await capture(); setRegion(null); setMessage(""); } catch { setMessage("Could not retake the photo."); } finally { setBusy(false); } }}>Retake photo</button>
    </>}
    {stage === "reposition" && <>
      <button type="button" className="complete-drill" disabled={!ready || busy} onClick={() => void verifyPhoto()}>{busy ? "Checking photo..." : "Take another photo"}</button>
      <button type="button" className="reset-counter" disabled={busy} onClick={() => { setMessage(""); setStage("select"); }}>Change selection</button>
    </>}
    {stage === "verify" && <>
      {matched && <button type="button" className="complete-drill" onClick={onConfirmed}>Yes, that is my basketball · start countdown</button>}
      <button type="button" className="reset-counter" onClick={() => { setRegion(null); setMatched(false); setMessage(""); setStage("select"); }}>Select item again</button>
    </>}
  </section>;
}
