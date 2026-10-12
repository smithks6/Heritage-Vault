// Sprint 1 transcription spike: one real 720p phone video, two providers.
//
//   DEEPGRAM_API_KEY=… OPENAI_API_KEY=… node spikes/transcription/run.mjs \
//     --file ~/phone-video.mp4 \
//     [--url https://…signed-url…]      # Deepgram fetches this; proves the remote-URL path
//     [--reference reference.txt]       # hand transcript of the clip, for word error rate
//     [--deepgram-model nova-3]
//     [--deepgram-price 0.0043 --openai-price 0.006]   # USD per minute, from the pricing pages today
//
// Writes a summary (no transcript text) to spikes/transcription/results/ and
// prints it. Paste the numbers into docs/spikes/transcription-verdict.md.

import { readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { basename, extname } from "node:path";
import { parseArgs } from "node:util";

const { values: args } = parseArgs({
  options: {
    file: { type: "string" },
    url: { type: "string" },
    reference: { type: "string" },
    "deepgram-model": { type: "string", default: "nova-3" },
    "deepgram-price": { type: "string" },
    "openai-price": { type: "string" },
  },
});
if (!args.file) {
  console.error("usage: node spikes/transcription/run.mjs --file video.mp4 [--url …] [--reference ref.txt]");
  process.exit(2);
}

const MIME = { ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm", ".m4a": "audio/mp4" };
const file = readFileSync(args.file);
const mime = MIME[extname(args.file).toLowerCase()] ?? "application/octet-stream";
const sizeMB = statSync(args.file).size / 1024 / 1024;
const reference = args.reference ? readFileSync(args.reference, "utf8") : null;

// ── Measurements shared by both providers ──
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

function normalise(text) {
  return text.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter(Boolean);
}

// Word error rate by Levenshtein distance over words.
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

function summarise(provider, startedAt, text, words, durationSeconds, pricePerMin, extra = {}) {
  const latencySeconds = +((performance.now() - startedAt) / 1000).toFixed(1);
  return {
    provider,
    ok: true,
    latencySeconds,
    realtimeFactor: durationSeconds ? +(latencySeconds / durationSeconds).toFixed(3) : null,
    durationSeconds,
    costUSD: pricePerMin && durationSeconds ? +((durationSeconds / 60) * Number(pricePerMin)).toFixed(4) : null,
    wer: reference ? wer(reference, text) : null,
    timing: timingQuality(words),
    ...extra,
  };
}

// ── Deepgram: remote URL if given, otherwise upload the bytes ──
async function deepgram() {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) return { provider: "deepgram", ok: false, error: "DEEPGRAM_API_KEY not set" };
  const params = new URLSearchParams({
    model: args["deepgram-model"], punctuate: "true", smart_format: "true", diarize: "true", utterances: "true",
  });
  const viaUrl = Boolean(args.url);
  const t0 = performance.now();
  const res = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
    method: "POST",
    headers: viaUrl
      ? { Authorization: `Token ${key}`, "Content-Type": "application/json" }
      : { Authorization: `Token ${key}`, "Content-Type": mime },
    body: viaUrl ? JSON.stringify({ url: args.url }) : file,
  });
  if (!res.ok) return { provider: "deepgram", ok: false, status: res.status, error: await res.text() };
  const data = await res.json();
  const alt = data.results?.channels?.[0]?.alternatives?.[0] ?? {};
  const words = alt.words ?? [];
  const speakers = new Set(words.map((w) => w.speaker).filter((s) => s !== undefined)).size;
  return summarise("deepgram", t0, alt.transcript ?? "", words, data.metadata?.duration ?? null,
    args["deepgram-price"], { model: args["deepgram-model"], input: viaUrl ? "remote-url" : "upload", speakers });
}

// ── OpenAI whisper-1: the only OpenAI model with word timestamps ──
async function openai() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { provider: "openai", ok: false, error: "OPENAI_API_KEY not set" };
  if (sizeMB > 25) {
    return { provider: "openai", ok: false, error: `file is ${sizeMB.toFixed(1)} MB; whisper-1 caps uploads at 25 MB` };
  }
  const form = new FormData();
  form.append("file", new Blob([file], { type: mime }), basename(args.file));
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "word");
  const t0 = performance.now();
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form,
  });
  if (!res.ok) return { provider: "openai", ok: false, status: res.status, error: await res.text() };
  const data = await res.json();
  return summarise("openai", t0, data.text ?? "", data.words ?? [], data.duration ?? null,
    args["openai-price"], { model: "whisper-1", input: "upload", speakers: null });
}

const results = {
  ranAt: new Date().toISOString(),
  file: { name: basename(args.file), mime, sizeMB: +sizeMB.toFixed(1) },
  providers: await Promise.all([deepgram(), openai()]),
};
mkdirSync(new URL("./results/", import.meta.url), { recursive: true });
const out = new URL(`./results/${results.ranAt.replace(/[:.]/g, "-")}.json`, import.meta.url);
writeFileSync(out, JSON.stringify(results, null, 2) + "\n");
console.log(JSON.stringify(results, null, 2));
console.log(`\nwrote ${out.pathname}`);
