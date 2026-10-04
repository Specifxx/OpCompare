// File I/O for the history (lib/history.ts): the import reads and writes a local
// checkout of the `data` branch (HISTORY_DIR, default .data/history), and the
// import workflow commits it. Server-only.
import fs from "node:fs";
import path from "node:path";
import type { BucketFile, DayFile, IndexFile } from "./history";

export const historyDir = () => path.resolve(process.env.HISTORY_DIR || ".data/history");

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}
function writeJson(file: string, data: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data));
}

export const readBucket = (b: string) => readJson<BucketFile>(path.join(historyDir(), "products", `${b}.json`), { v: 2, p: {} });
export const writeBucket = (b: string, f: BucketFile) => writeJson(path.join(historyDir(), "products", `${b}.json`), f);
export const writeDay = (f: DayFile) => writeJson(path.join(historyDir(), "days", `${f.day}.json`), f);
export const readIndex = () => readJson<IndexFile>(path.join(historyDir(), "index.json"), { v: 1, days: [] });
export const writeIndex = (f: IndexFile) => writeJson(path.join(historyDir(), "index.json"), f);
