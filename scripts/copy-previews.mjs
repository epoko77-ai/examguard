import {
  readdir,
  readFile,
  mkdir,
  copyFile,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

// Only synthetic / licensed test screenshots are published. Never copy reports or uploads.
async function walk(dir) {
  const paths = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) paths.push(...(await walk(file)));
    else paths.push(file);
  }
  return paths;
}
await mkdir("dist/previews", { recursive: true });
const files = await walk("test-results");
for (const [project, label] of [
  ["chromium", "desktop"],
  ["webkit-mobile", "mobile"],
]) {
  for (const view of [
    "wireless",
    "guide",
    "guide-detail",
    "optical",
    "photo-results",
  ]) {
    const file = files.find(
      (file) => file.includes(project) && path.basename(file) === `${view}.png`,
    );
    if (!file) throw new Error(`Missing screenshot: ${project}/${view}`);
    await copyFile(file, `dist/previews/${label}-${view}.png`);
  }
}
const report = JSON.parse(await readFile("test-results/summary.json", "utf8"));
await writeFile(
  "dist/previews/verification.json",
  JSON.stringify(
    {
      commit: process.env.GITHUB_SHA,
      stats: report.stats,
      note: "Browser emulation and mocked hardware. Same-reference retrieval is not field accuracy.",
    },
    null,
    2,
  ),
);
console.log(
  "Published ten test screenshots and verification counts. Photo credit: CCadio / CC BY 4.0, cropped. See docs/THIRD_PARTY.md.",
);
