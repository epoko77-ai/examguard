import test from "node:test";
import assert from "node:assert/strict";
import { assessDeviceName } from "../src/lib/device-hints.ts";
import { guides } from "../src/data/guides.ts";

test("specific glasses names yield an explained candidate, never a confirmed identity", () => {
  for (const name of [
    "Ray-Ban Meta",
    "rayban",
    "Even_G1",
    "XREAL Air 2",
    "HUAWEI Eyewear 2",
    "Mijia Smart Audio Glasses",
    "AI Glasses",
    "HeyCyan",
  ]) {
    const hint = assessDeviceName(name);
    assert.equal(hint.kind, "glasses-candidate", name);
    assert.equal(hint.basis, "advertised-name-only");
    assert.equal(hint.requiresPhysicalCheck, true);
    for (const id of hint.guideIds)
      assert.ok(
        guides.some((g) => g.id === id),
        id,
      );
  }
});
test("same-company VR devices and common electronics get different hints, not a safe verdict", () => {
  for (const name of [
    "Meta Quest 3",
    "AirPods Pro",
    "Galaxy Buds2",
    "iPhone 16",
    "Galaxy S25",
    "MacBook Pro",
    "Apple Watch",
  ]) {
    const hint = assessDeviceName(name);
    assert.equal(hint.kind, "other-device-hint", name);
    assert.equal(hint.requiresPhysicalCheck, true);
  }
});
test("brand-only, anonymous and conflicting names stay unidentified", () => {
  for (const name of [
    "Meta",
    "Xiaomi",
    "Samsung",
    "G1",
    "XREAL",
    "Unknown",
    "",
    "Ray-Ban Meta Quest 3",
    "<img src=x onerror=alert(1)>",
  ])
    assert.equal(assessDeviceName(name).kind, "unknown", name);
});
