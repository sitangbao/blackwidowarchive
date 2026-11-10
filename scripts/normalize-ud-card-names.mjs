import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = "content/items";
const cardTypes = [
  "三人衣料卡", "双人衣料卡", "普卡", "衣料卡", "镭射卡",
  "银折", "红折", "蓝折", "签字卡", "概念卡", "透明卡",
  "贴纸卡", "拼图卡", "金属卡", "角色卡", "场景卡"
].sort((a, b) => b.length - a.length);

const files = (await fs.readdir(root)).filter((name) => name.endsWith(".json"));
const changed = [];
const skipped = [];
for (const file of files) {
  const fullPath = path.join(root, file);
  const raw = await fs.readFile(fullPath, "utf8");
  let item;
  try { item = JSON.parse(raw); } catch { skipped.push(file); continue; }
  if (item.category !== "卡片类" || !/^UD\\s*/i.test(String(item.name ?? ""))) continue;

  const original = String(item.name);
  let name = original.replace(/^UD\\s*/i, "UD");
  const type = cardTypes.find((candidate) => name.includes(candidate));
  if (!type) continue;

  const index = name.indexOf(type);
  const prefix = name.slice(0, index).trimEnd();
  let suffix = name.slice(index + type.length);
  suffix = suffix.replace(/^\\s+/, "");
  suffix = suffix.replace(/\\s*#\\s*/, " #");
  name = prefix + " " + type + suffix;
  name = name.replace(/\\s*#\\s*/, " #");

  if (name !== original) {
    item.name = name;
    await fs.writeFile(fullPath, JSON.stringify(item, null, 2) + "\\n", "utf8");
    changed.push({ file, from: original, to: name });
  }
}
console.log(JSON.stringify({ scanned: files.length, changed: changed.length, examples: changed.slice(0, 12), skippedInvalidJson: skipped.length }, null, 2));
if (changed.length) {
  execFileSync("git", ["config", "user.name", "github-actions[bot]"]);
  execFileSync("git", ["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"]);
  execFileSync("git", ["add", root]);
  execFileSync("git", ["commit", "-m", "Normalize existing UD card item names"]);
  execFileSync("git", ["push"]);
}
