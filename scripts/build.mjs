#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildHtml } from "./lib/render.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const data = JSON.parse(
  fs.readFileSync(path.join(root, "data", "matches.json"), "utf8"),
);
let meta = {};
const metaPath = path.join(root, "data", "meta.json");
if (fs.existsSync(metaPath)) {
  meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
}

const html = buildHtml(data.matches, meta);
fs.writeFileSync(path.join(root, "index.html"), html);
console.log("Built index.html (" + html.length + " bytes)");
