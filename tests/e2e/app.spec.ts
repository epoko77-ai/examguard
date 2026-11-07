import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
const go = async (page: Page, tab: string) => {
  await page.locator(`.nav-item[data-page="${tab}"]`).click();
};
async function takeShot(
  page: Page,
  options: { path: string; fullPage: boolean },
) {
  await expect(page.locator("#toast")).toBeHidden();
  if (options.fullPage) {
    await page.evaluate(() => {
      (document.activeElement as HTMLElement)?.blur();
      window.scrollTo(0, 0);
    });
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
  }
  await page.screenshot(options);
}
async function report(page: Page) {
  await go(page, "records");
  const download = page.waitForEvent("download");
  await page.locator("#export-report").click();
  return JSON.parse(await readFile((await (await download).path())!, "utf8"));
}
test("core UI, preflight, training records, catalog, mobile layout and offline reload", async ({
  page,
  context,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const requested: string[] = [];
  page.on("request", (r) => requested.push(r.url()));
  await page.goto("./");
  await expect(page.locator("#page-title")).toHaveText("교실 전파 탐색");
  await expect(page.locator(".primary-nav .nav-item")).toHaveCount(3);
  await page.locator("#ble-help").click();
  await expect(page.locator("dialog")).toContainText(
    "페어링 상대나 외부 인터넷 사용 여부",
  );
  await page.locator(".dialog-close").click();
  await expect(page.locator("#scan-button")).toBeDisabled();
  await expect(page.locator("#connection-status")).toContainText(
    "기본 도감 오프라인 준비 완료",
  );
  expect(
    requested.some((url) => url.includes("/models/") || url.endsWith(".wasm")),
  ).toBe(false);
  await takeShot(page, {
    path: testInfo.outputPath("wireless.png"),
    fullPage: true,
  });
  await page.locator("#demo-mode").click();
  await page.locator("#scan-button").click();
  await expect(page.locator("#device-count")).toHaveText("03");
  await go(page, "optical");
  // The full diagram must fit the inspection canvas; viewBox-only SVGs can
  // otherwise be cropped using the browser's fallback intrinsic dimensions.
  await expect
    .poll(async () =>
      page.evaluate(async () => {
        const reference = new Image();
        reference.src = new URL("sample-camera.svg", location.href).href;
        await reference.decode();
        const expected = document.createElement("canvas");
        expected.width = 768;
        expected.height = 480;
        const context = expected.getContext("2d")!;
        context.drawImage(reference, 0, 0, 768, 480);
        const target = (
          document.querySelector("#optical-canvas") as HTMLCanvasElement
        ).getContext("2d")!;
        const actual = target.getImageData(0, 0, 768, 480).data;
        const wanted = context.getImageData(0, 0, 768, 480).data;
        return actual.every((value, i) => Math.abs(value - wanted[i]!) <= 2);
      }),
    )
    .toBe(true);
  await page.locator('[data-filter="negative"]').click();
  await expect(page.locator("#filter-badge")).toHaveText("색상 반전");
  await expect(page.locator("#torch-button")).toBeDisabled();
  await expect(page.locator("#camera-find-guide")).toBeDisabled();
  await page.locator('[name="observation"]').first().check();
  await page.locator("#save-observation").click();
  await takeShot(page, {
    path: testInfo.outputPath("optical.png"),
    fullPage: true,
  });
  const exported = await report(page);
  expect(exported.devices).toEqual([]);
  expect(exported.inspections).toEqual([]);
  expect(exported.radioCapture).toBeNull();
  await go(page, "guide");
  await expect(page.locator(".guide-card")).toHaveCount(6);
  await page.locator("#guide-search").fill("G1");
  await expect(page.locator(".guide-card")).toHaveCount(1);
  await page.locator(".guide-card").click();
  await expect(page.locator(".atlas-features article")).toHaveCount(3);
  await expect(page.locator("dialog")).toContainText("TouchBar");
  await takeShot(page, {
    path: testInfo.outputPath("guide-detail.png"),
    fullPage: false,
  });
  await page.locator(".dialog-close").click();
  await page.locator("#guide-search").fill("");
  await takeShot(page, {
    path: testInfo.outputPath("guide.png"),
    fullPage: true,
  });
  for (const tab of ["wireless", "optical", "guide", "zones", "records"]) {
    await go(page, tab);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      tab,
    ).toBe(true);
  }
  await context.setOffline(true);
  await page.reload();
  await go(page, "guide");
  await expect(page.locator(".guide-card")).toHaveCount(6);
  expect(errors).toEqual([]);
});
test("browser selection escaping, explicit classification and reset ignore delayed choices", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "bluetooth", {
      value: {
        requestDevice: () =>
          new Promise((resolve) => {
            (window as any).resolveDevice = resolve;
          }),
      },
      configurable: true,
    }),
  );
  await page.goto("./#wireless");
  for (const button of await page.locator("[data-preflight]").all())
    await button.click();
  await expect(page.locator("#scan-button")).toBeEnabled();
  await page.locator("#scan-button").click();
  await page.evaluate(() =>
    (window as any).resolveDevice({
      id: "private-device-id",
      name: '<img src=x onerror="window.injected=1">',
    }),
  );
  await expect(page.locator("#device-count")).toHaveText("01");
  expect(await page.evaluate(() => (window as any).injected)).toBeUndefined();
  await page.locator("[data-disposition]").selectOption("allowed");
  const exported = await report(page);
  expect(exported.devices[0].disposition).toBe("allowed");
  expect(exported.devices[0].owner).toBeNull();
  expect(JSON.stringify(exported)).not.toContain("private-device-id");
  await go(page, "wireless");
  await page.locator("#scan-button").click();
  await page.locator("#reset-button").click();
  await page.locator("#confirm-reset").click();
  await page.evaluate(() =>
    (window as any).resolveDevice({ id: "late-device", name: "Late" }),
  );
  await expect(page.locator("#device-count")).toHaveText("00");
});
test("selected devices show explainable name hints and candidate filtering never changes permission decisions", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    let index = 0;
    const names = [
      "Ray-Ban Meta",
      "Meta Quest 3",
      "AirPods Pro",
      "Unknown",
      "Meta",
      "Meta Quest 3",
    ];
    Object.defineProperty(navigator, "bluetooth", {
      configurable: true,
      value: {
        requestDevice: async () => {
          const i = index++;
          return { id: `mock-${i === 5 ? 0 : i}`, name: names[i] };
        },
      },
    });
  });
  await page.goto("./#wireless");
  for (const button of await page.locator("[data-preflight]").all())
    await button.click();
  for (let i = 1; i <= 5; i++) {
    await page.locator("#scan-button").click();
    await expect(page.locator("#device-count")).toHaveText(`0${i}`);
  }
  await expect(
    page.locator('[data-device-hint="glasses-candidate"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('[data-device-hint="other-device-hint"]'),
  ).toHaveCount(2);
  await expect(page.locator('[data-device-hint="unknown"]')).toHaveCount(2);
  await expect(page.locator("#device-hint-summary")).toContainText(
    "의심 후보 1",
  );
  for (const field of await page.locator("[data-disposition]").all())
    await expect(field).toHaveValue("unreviewed");
  await takeShot(page, {
    path: testInfo.outputPath("name-hints.png"),
    fullPage: true,
  });
  await page.locator("#device-hint-filter").selectOption("glasses-candidate");
  await expect(page.locator("#device-list tbody tr")).toHaveCount(1);
  const exported = await report(page);
  expect(exported.devices).toHaveLength(5);
  expect(exported.devices[0].nameAssessment.kind).toBe("glasses-candidate");
  expect(
    exported.devices.every(
      (d: { disposition: string }) => d.disposition === "unreviewed",
    ),
  ).toBe(true);
  await go(page, "wireless");
  await page.locator("#scan-button").click();
  await expect(page.locator("#device-hint-summary")).toContainText(
    "의심 후보 0",
  );
  await expect(page.locator("#device-count")).toHaveText("05");
  await expect(page.locator("#device-list")).toContainText(
    "이 분류에 해당하는 기기가 없습니다",
  );
  await page.locator("#reset-button").click();
  await page.locator("#confirm-reset").click();
  await expect(page.locator("#device-hint-filter")).toHaveValue("all");
});
test("camera denial falls back to image, filters can be used and photo search opens with the frame", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => {
        throw new DOMException("Denied", "NotAllowedError");
      },
    }),
  );
  await page.goto("./#optical");
  await page.locator("#camera-button").click();
  await expect(page.locator("#camera-message")).toContainText(
    "권한이 허용되지",
  );
  await page
    .locator("#image-input")
    .setInputFiles("tests/fixtures/meta-crop.jpg");
  await expect(page.locator("#camera-source")).toHaveText("직접 연 사진");
  await page.locator('[name="observation"]').nth(1).check();
  await page.locator("#save-observation").click();
  await page.locator("#camera-find-guide").click();
  await expect(page.locator("#photo-crop")).toBeVisible();
  await page.locator("#photo-clear").click();
  await expect(page.locator("#photo-crop")).toBeHidden();
  const exported = await report(page);
  expect(exported.inspections).toHaveLength(1);
  expect(exported.inspections[0].source).toBe("image");
  expect(JSON.stringify(exported)).not.toContain("data:image");
});
test("radio imports reject invalid data, show repeated-zone evidence and stay separate from training", async ({
  page,
}) => {
  await page.goto("./#zones");
  await page.locator("#radio-demo").click();
  await expect(page.locator(".signal-card")).toHaveCount(2);
  expect((await report(page)).radioCapture).toBeNull();
  await go(page, "zones");
  await page.locator("#radio-input").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from("{}"),
  });
  await expect(page.locator("#radio-message")).toContainText("형식");
  const samples = [
    ...[-60, -61, -62].map((rssi) => ({ zone: "A", rssi })),
    ...[-70, -71, -72].map((rssi) => ({ zone: "B", rssi })),
    { zone: "single-outlier", rssi: -10 },
  ].map((v) => ({
    ...v,
    deviceKey: "anonymous",
    name: "<script>unsafe</script>",
    timestamp: "2026-11-07T01:00:00Z",
  }));
  await page.locator("#radio-input").setInputFiles({
    name: "real.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        schema: "examguard.radio.v1",
        source: "test receiver",
        isDemo: false,
        samples,
      }),
    ),
  });
  await expect(page.locator(".signal-conclusion strong")).toHaveText("A");
  expect((await report(page)).radioCapture.samples).toHaveLength(7);
});
test("compound filters explain matches, separate same-company products and exclude demonstration rules from live reports", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./#zones");
  await page.locator("#signature-demo").click();
  await expect(page.locator(".signature-card.matched")).toHaveCount(1);
  await expect(page.locator(".signature-card.company-only")).toHaveCount(1);
  await expect(page.locator(".signature-card.unmatched")).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await takeShot(page, {
    path: testInfo.outputPath("signature-results.png"),
    fullPage: true,
  });
  const demoReport = await report(page);
  expect(demoReport.radioCapture).toBeNull();
  expect(demoReport.signatureAnalysis).toBeNull();
  await go(page, "zones");
  // Exercise the non-demo code path with synthetic fixtures, never real identifiers.
  const capture = JSON.parse(
    await readFile("public/radio-advertisement-example.json", "utf8"),
  );
  capture.isDemo = false;
  const upload = (selector: string, data: unknown) =>
    page.locator(selector).setInputFiles({
      name: "synthetic-test.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(data)),
    });
  await upload("#radio-input", capture);
  await expect(page.locator(".signature-card.demo-blocked")).toHaveCount(3);
  expect((await report(page)).signatureAnalysis).toBeNull();
  await go(page, "zones");
  const rules = JSON.parse(
    await readFile("public/signature-example.json", "utf8"),
  );
  rules.isDemo = false;
  rules.rules[0].label = '<img src=x onerror="window.injected=1">';
  await upload("#signature-input", rules);
  await expect(page.locator(".signature-card.matched")).toContainText(
    rules.rules[0].label,
  );
  await expect(page.locator("#signature-results img")).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).injected)).toBeUndefined();
  const exported = await report(page);
  expect(
    exported.signatureAnalysis.results.map((r: { status: string }) => r.status),
  ).toEqual(["matched", "company-only", "unmatched"]);
  expect(exported.signatureAnalysis.rules.rules[0].payload).toEqual(
    rules.rules[0].payload,
  );
  await go(page, "zones");
  await page.locator("#signature-clear").click();
  rules.rules[0].payload.mask.fill(0);
  await upload("#signature-input", rules);
  await expect(page.locator("#signature-message")).toContainText("마스크");
  await expect(page.locator(".signature-card.no-rules")).toHaveCount(3);
  await page.locator("#signature-demo").click();
  await expect(page.locator(".signature-card.matched")).toHaveCount(1);
  await page.locator("#reset-button").click();
  await page.locator("#confirm-reset").click();
  await go(page, "zones");
  await expect(page.locator(".signature-card")).toHaveCount(0);
  await expect(page.locator("#signature-clear")).toBeDisabled();
  expect(errors).toEqual([]);
});
test("photo search runs real local WASM, returns catalog candidates and works offline after caching", async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  page.on("console", (m) => {
    if (m.type() === "error") console.log("BROWSER:", m.text());
  });
  await page.goto("./#guide");
  await expect(page.locator("#connection-status")).toContainText(
    "기본 도감 오프라인 준비 완료",
  );
  await page
    .locator("#photo-file-input")
    .setInputFiles("tests/fixtures/meta-crop.jpg");
  await expect(page.locator("#photo-crop")).toBeVisible();
  await page.locator("#photo-run").click();
  await expect(page.locator("#photo-progress")).toContainText("대조 완료", {
    timeout: 120_000,
  });
  await expect(page.locator(".photo-candidate")).toHaveCount(3);
  await expect(page.locator(".photo-candidate").first()).toHaveAttribute(
    "data-guide",
    "meta",
  );
  await takeShot(page, {
    path: testInfo.outputPath("photo-results.png"),
    fullPage: true,
  });
  await page.locator(".photo-candidate").first().click();
  await expect(page.locator("#dialog-title")).toContainText("Ray-Ban");
  await page.locator(".dialog-close").click();
  await page.locator("#photo-clear").click();
  await context.setOffline(true);
  await page.reload();
  await page
    .locator("#photo-file-input")
    .setInputFiles("tests/fixtures/meta-crop.jpg");
  await page.locator("#photo-run").click();
  await expect(page.locator("#photo-progress")).toContainText("대조 완료", {
    timeout: 90_000,
  });
  expect(
    requests.filter((url) => !url.startsWith("http://127.0.0.1:4173/")),
  ).toEqual([]);
  expect(errors).toEqual([]);
});
