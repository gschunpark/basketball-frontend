import { expect } from "@playwright/test";

export async function testDrillFlow(browser, origin, viewport) {
  const app = await browser.newPage(viewport ? { viewport } : {});
  const errors = [];
  app.on("pageerror", (error) => errors.push(error.message));
  await app.addInitScript(() => {
    let mode = "calibrate";
    let ballBrightness = 1, ballRadius = null;
    window.setTestBallMode = (value) => { mode = value; };
    window.setTestBallAppearance = (brightness, radius) => { ballBrightness = brightness; ballRadius = radius; };
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      window.testCameraConstraints = constraints;
      const canvas = document.createElement("canvas");
      canvas.width = 1280; canvas.height = 720;
      const context = canvas.getContext("2d");
      const render = () => {
        context.fillStyle = "#232d41"; context.fillRect(0, 0, 1280, 720);
        if (mode !== "missing") {
          const moving = mode === "moving";
          window.testBallPosition = { x: moving || mode === "stationary" ? (innerWidth < 700 ? 478 : 300) : 640,
            y: moving ? 360 + Math.sin(performance.now() / 180) * 150 : 360 };
          context.fillStyle = `rgb(${Math.round(220 * ballBrightness)}, ${Math.round(105 * ballBrightness)}, ${Math.round(25 * ballBrightness)})`; context.beginPath();
          context.arc(window.testBallPosition.x, window.testBallPosition.y,
            ballRadius ?? (mode === "calibrate" ? 125 : 45), 0, Math.PI * 2); context.fill();
        }
        requestAnimationFrame(render);
      };
      render();
      const stream = canvas.captureStream(30);
      const track = stream.getVideoTracks()[0];
      if (innerWidth < 700) {
        const settings = track.getSettings.bind(track);
        const capabilities = track.getCapabilities.bind(track);
        window.testTorchOn = false;
        track.getCapabilities = () => ({ ...capabilities(), torch: true });
        track.getSettings = () => ({ ...settings(), torch: window.testTorchOn });
        track.applyConstraints = async (constraints) => {
          const torch = constraints.advanced?.find((item) => "torch" in item);
          if (torch) window.testTorchOn = torch.torch;
        };
      }
      return stream;
    };
  });
  await app.goto(`${origin}/`);
  await app.getByRole("textbox", { name: "Username" }).fill("Tracker test");
  await app.locator('input[name="password"]').fill("test-password");
  await app.getByRole("button", { name: "Sign in", exact: true }).click();
  await app.getByRole("button", { name: "Keep training" }).first().click();
  await app.getByRole("button", { name: "Yes, allow camera" }).click();
  await expect(app.getByRole("heading", { name: "Stationary Pound Dribbles" }).last()).toBeVisible();
  await expect(app.locator(".dribble-counter strong")).toHaveText("0");
  await expect(app.getByText("Keep the ball on screen the entire time.", { exact: true })).toBeVisible();
  const camera = await app.evaluate(() => window.testCameraConstraints);
  expect(camera.video.width.ideal).toBe(3840);
  expect(camera.video.height.ideal).toBe(2160);
  await app.getByRole("button", { name: "Set up my ball" }).scrollIntoViewIfNeeded();
  const introFits = await app.locator(".drill-setup-card").evaluate((card) => {
    const parent = card.closest(".camera-stage").getBoundingClientRect();
    const box = card.getBoundingClientRect();
    return box.top >= parent.top && box.bottom <= parent.bottom;
  });
  expect(introFits).toBe(true);
  await app.getByRole("button", { name: "Set up my ball" }).click();
  await expect(app.getByRole("heading", { name: "Get your basketball ready" })).toBeVisible();
  const flashlight = app.getByRole("button", { name: "Flashlight", exact: true });
  if (viewport) {
    await expect(flashlight).toBeEnabled();
    await flashlight.click();
    await expect(app.getByRole("button", { name: "Flashlight on", exact: true })).toHaveAttribute("aria-pressed", "true");
    expect(await app.evaluate(() => window.testTorchOn)).toBe(true);
  } else await expect(flashlight).toBeDisabled();
  await app.getByRole("button", { name: "Screen light", exact: true }).click();
  await expect(app.locator(".camera-card")).toHaveClass(/screen-light/);
  await app.getByRole("button", { name: "Screen light on", exact: true }).click();
  await expect(app.locator(".camera-card")).not.toHaveClass(/screen-light/);
  const takePhoto = app.getByRole("button", { name: "Take full photo", exact: true });
  await expect(takePhoto).toBeEnabled({ timeout: 60000 });
  await takePhoto.click();
  await expect(app.getByRole("heading", { name: "Select your basketball", exact: true })).toBeVisible();
  const fullPhoto = app.getByRole("img", { name: "Full-resolution camera photo for item selection" });
  expect(await fullPhoto.evaluate((image) => image.naturalWidth)).toBe(1280);
  expect(await fullPhoto.evaluate((image) => image.naturalHeight)).toBe(720);
  const choose = async () => {
    await app.locator(".item-photo").scrollIntoViewIfNeeded();
    const box = await app.locator(".item-photo").boundingBox();
    await app.mouse.move(box.x + box.width * 0.42, box.y + box.height * 0.36);
    await app.mouse.down();
    await app.mouse.move(box.x + box.width * 0.58, box.y + box.height * 0.64, { steps: 6 });
    await app.mouse.up();
    await app.getByRole("button", { name: "Select ball", exact: true }).click();
    await expect(app.getByRole("heading", { name: "Set your ball up again" })).toBeVisible({ timeout: 15000 });
    await expect(app.getByRole("heading", { name: "Check the item I found" })).toHaveCount(0);
    await expect(app.locator(".countdown-overlay")).toHaveCount(0);
    await app.getByRole("button", { name: "Take another photo", exact: true }).click();
    await expect(app.getByRole("heading", { name: "Check the item I found" })).toBeVisible({ timeout: 30000 });
    await expect(app.getByRole("img", { name: "Second full-resolution photo with the matched item" })).toBeVisible();
  };
  await choose();
  await expect(app.locator(".dribble-counter strong")).toHaveText("0");
  await expect(app.locator(".countdown-overlay")).toHaveCount(0);
  await app.getByRole("button", { name: "Select item again" }).click();
  await expect(app.getByRole("heading", { name: "Select your basketball", exact: true })).toBeVisible();
  await choose();
  await app.getByRole("button", { name: "Yes, that is my basketball" }).click();
  await expect(app.locator(".countdown-overlay strong")).toHaveText("3");
  await expect(app.locator(".countdown-overlay strong")).toHaveText("2");
  await expect(app.locator(".countdown-overlay strong")).toHaveText("1");
  await expect(app.getByText("Live practice", { exact: true })).toBeVisible({ timeout: 10000 });
  const bottomAligned = await app.locator(".target-zone").evaluate((zone) => Math.abs(zone.getBoundingClientRect().bottom - zone.closest(".camera-stage").getBoundingClientRect().bottom) < 2);
  expect(bottomAligned).toBe(true);
  if (viewport) expect(await app.evaluate(() => window.testTorchOn)).toBe(false);
  await app.evaluate(() => window.setTestBallMode("stationary"));
  await app.waitForTimeout(1500);
  await expect(app.locator(".dribble-counter strong")).toHaveText("0");
  await app.evaluate(() => window.setTestBallMode("moving"));
  await expect.poll(async () => Number(await app.locator(".dribble-counter strong").textContent()), { timeout: 15000 }).toBeGreaterThan(0);
  let currentMatches = 0;
  for (let sample = 0; sample < 10; sample++) {
    const error = await app.evaluate(() => {
      const marker = document.querySelector(".tracked-ball"), video = document.querySelector(".camera-stage video");
      if (!marker) return null;
      const ratio = video.clientWidth / video.clientHeight, sourceRatio = video.videoWidth / video.videoHeight;
      const width = sourceRatio > ratio ? video.videoHeight * ratio : video.videoWidth;
      const height = sourceRatio > ratio ? video.videoHeight : video.videoWidth / ratio;
      const x = 1 - (window.testBallPosition.x - (video.videoWidth - width) / 2) / width;
      const y = (window.testBallPosition.y - (video.videoHeight - height) / 2) / height;
      return Math.hypot(parseFloat(marker.style.left) / 100 - x, parseFloat(marker.style.top) / 100 - y);
    });
    if (error !== null && error < 0.12) currentMatches++;
    await app.waitForTimeout(100);
  }
  expect(currentMatches).toBeGreaterThanOrEqual(4);
  for (const [brightness, radius] of [[1, 8], [0.18, 12], [0.35, 90], [1, 22]]) {
    await app.evaluate(([brightness, radius]) => window.setTestBallAppearance(brightness, radius), [brightness, radius]);
    await app.waitForTimeout(350);
    await expect(app.locator(".tracked-ball")).toHaveCount(1, { timeout: 5000 });
  }
  await app.evaluate(() => window.setTestBallMode("missing"));
  await expect(app.locator(".tracked-ball")).toHaveCount(0);
  const stoppedScore = await app.locator(".dribble-counter strong").textContent();
  await app.waitForTimeout(1200);
  await expect(app.locator(".dribble-counter strong")).toHaveText(stoppedScore);
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(`Browser flow passed (${viewport ? "mobile" : "desktop"}): intro, calibration, countdown, moving-ball scoring, loss, and adaptive high-resolution camera request.`);
  await app.close();
}
