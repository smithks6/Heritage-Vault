// Sprint 1 transcription spike: local Whisper (whisper-asr-webservice).
//
// Prerequisites:
//   docker compose up -d          # starts Whisper on port 9000
//
// Usage:
//   node spikes/transcription/run-local.mjs \
//     --file ~/phone-video.mp4 \
//     [--model base]              # model name for display only (set in docker-compose.yml)
//     [--reference reference.txt] # hand transcript of the clip, for word error rate
//     [--url http://localhost:9000]
//
// Writes a summary to spikes/transcription/results/ and prints it.

import { readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { basename, extname } from "node:path";
import { parseArgs } from "node:util";

const { values: args } = parseArgs({
  options: {
    file:      { type: "string" },
    model:     { type: "string", default: "base" },
    reference: { type: "string" },
    url:       { type: "string", default: process.env.WHISPER_LOCAL_URL ?? "http://localhost:9000" },
  },
});

if (!args.file) {
  console.error("usage: node spikes/transcription/run-local.mjs --file video.mp4 [--reference ref.txt]");
  process.exit(2);
}

const MIME = { ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm", ".m4a": "audio/mp4" };
const file = readFileSync(args.file);
const mime = MIME[extname(args.file).toLowerCase()] ?? "application/octet-stream";
const sizeMB = statSync(args.file).size / 1024 / 1024;
const reference = args.reference ? readFileSync(args.reference, "utf8") : null;

function normalise(text) {
  return text.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter(Boolean);
}

function wer(ref, hyp) {
  const r = normalise(ref), h = normalise(hyp);
  let prev = Array.from({ length: h.length + 1 }, (_, j) => j);
  for (let i = 1; i <= r.length; i++) {
    const cur = [i];
    for (let j = 1; j <= h.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (r[i - 1] === h[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return +(prev[h.length] / Math.max(r.length, 1)).toFixed(3);
}

function timingQuality(words) {
  let backwards = 0, zeroLength = 0, maxGap = 0;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w.end <= w.start) zeroLength++;
    if (i > 0) {
      if (w.start < words[i - 1].start) backwards++;
      maxGap = Math.max(maxGap, w.start - words[i - 1].end);
    }
  }
  return { words: words.length, backwards, zeroLength, maxGapSeconds: +maxGap.toFixed(2) };
}

// ── Call the local Whisper service ──
const base = args.url.replace(/\/$/, "");
const url  = `${base}/asr?task=transcribe&word_timestamps=true&output=json`;
const form = new FormData();
form.append("audio_file", new Blob([file], { type: mime }), basename(args.file));

const t0 = performance.now();
const res = await fetch(url, { method: "POST", body: form });
if (!res.ok) {
  const body = await res.text().catch(() => "");
  console.error(`Whisper service error ${res.status}: ${body}`);
  process.exit(1);
}
const data = await res.json();
const latencySeconds = +((performance.now() - t0) / 1000).toFixed(1);

// Flatten word timings from all segments
const words = data.segments?.flatMap((s) => s.words ?? []) ?? [];
const fullText = data.text ?? "";
const duration = words.length ? words[words.length - 1].end : null;

const results = {
  ranAt: new Date().toISOString(),
  file: { name: basename(args.file), mime, sizeMB: +sizeMB.toFixed(1) },
  provider: "whisper-local",
  model: args.model,
  serviceUrl: base,
  latencySeconds,
  realtimeFactor: duration ? +(latencySeconds / duration).toFixed(3) : null,
  durationSeconds: duration ? +duration.toFixed(1) : null,
  costUSD: 0,
  wer: reference ? wer(reference, fullText) : null,
  timing: timingQuality(words),
};

mkdirSync(new URL("./results/", import.meta.url), { recursive: true });
const out = new URL(`./results/${results.ranAt.replace(/[:.]/g, "-")}-local.json`, import.meta.url);
writeFileSync(out, JSON.stringify(results, null, 2) + "\n");
console.log(JSON.stringify(results, null, 2));
console.log(`\nwrote ${out.pathname}`);
