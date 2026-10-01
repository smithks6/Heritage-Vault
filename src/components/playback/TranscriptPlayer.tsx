"use client";

/**
 * TranscriptPlayer — media player with synchronized transcript.
 *
 * Features:
 *  - Audio or video playback
 *  - Current word highlighted using word_timings
 *  - Click a word to seek to that timestamp
 *  - Speaker labels from diarization data
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, Mic } from "lucide-react";
import type { Transcript, WordTiming } from "@/types";

interface Props {
  playbackUrl: string;
  mimeType: string;
  transcript: Transcript | null;
  durationSeconds: number | null;
}

export default function TranscriptPlayer({ playbackUrl, mimeType, transcript, durationSeconds }: Props) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds ?? 0);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const [volume, setVolume] = useState(1);

  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const activeWordRef = useRef<HTMLSpanElement | null>(null);

  const isVideo = mimeType.startsWith("video");
  const wordTimings: WordTiming[] = transcript?.word_timings ?? [];

  // Keep current word in view
  useEffect(() => {
    if (activeWordRef.current && transcriptRef.current) {
      activeWordRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [activeWordIndex]);

  // Update active word on timeupdate
  const handleTimeUpdate = useCallback(() => {
    const el = mediaRef.current;
    if (!el) return;
    const t = el.currentTime;
    setCurrentTime(t);

    if (wordTimings.length === 0) return;
    let lo = 0, hi = wordTimings.length - 1, found = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const w = wordTimings[mid];
      if (t >= w.start && t <= w.end) { found = mid; break; }
      if (t < w.start) hi = mid - 1;
      else lo = mid + 1;
    }
    // If between words, use the last word whose start is before t
    if (found === -1) {
      for (let i = wordTimings.length - 1; i >= 0; i--) {
        if (wordTimings[i].start <= t) { found = i; break; }
      }
    }
    setActiveWordIndex(found);
  }, [wordTimings]);

  function togglePlay() {
    const el = mediaRef.current;
    if (!el) return;
    if (playing) el.pause(); else el.play();
    setPlaying(!playing);
  }

  function seekTo(seconds: number) {
    const el = mediaRef.current;
    if (!el) return;
    el.currentTime = seconds;
    setCurrentTime(seconds);
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  // Group word timings by speaker for rendering
  interface WordGroup {
    speaker: string | undefined;
    startIdx: number;
    words: WordTiming[];
  }

  function groupBySpeaker(words: WordTiming[]): WordGroup[] {
    const groups: WordGroup[] = [];
    let currentSpeaker: string | undefined = undefined;
    let current: WordGroup | null = null;
    words.forEach((w, i) => {
      if (w.speaker !== currentSpeaker || !current) {
        current = { speaker: w.speaker, startIdx: i, words: [w] };
        groups.push(current);
        currentSpeaker = w.speaker;
      } else {
        current.words.push(w);
      }
    });
    return groups;
  }

  const speakerLabels: Record<string, string> = {};
  for (const s of transcript?.speakers ?? []) {
    speakerLabels[s.id] = s.label;
  }

  const groups = groupBySpeaker(wordTimings);

  return (
    <div className="space-y-4">
      {/* Media element */}
      <div className="card space-y-3">
        {isVideo ? (
          <video
            ref={(el) => { mediaRef.current = el; }}
            src={playbackUrl}
            className="w-full rounded-lg bg-black aspect-video"
            onTimeUpdate={handleTimeUpdate}
            onDurationChange={(e) => setDuration(e.currentTarget.duration)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => { setPlaying(false); setActiveWordIndex(-1); }}
            playsInline
          />
        ) : (
          <audio
            ref={(el) => { mediaRef.current = el; }}
            src={playbackUrl}
            onTimeUpdate={handleTimeUpdate}
            onDurationChange={(e) => setDuration(e.currentTarget.duration)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => { setPlaying(false); setActiveWordIndex(-1); }}
          />
        )}

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-bark-600 text-parchment-50 flex items-center justify-center hover:bg-bark-700 transition-colors flex-shrink-0"
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 translate-x-0.5" />}
          </button>

          {/* Seek bar */}
          <div className="flex-1 flex items-center gap-2">
            <span className="text-xs text-bark-400 w-10 text-right">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={(e) => seekTo(parseFloat(e.target.value))}
              className="flex-1 h-1.5 accent-amber-500 cursor-pointer"
            />
            <span className="text-xs text-bark-400 w-10">{formatTime(duration)}</span>
          </div>

          {/* Volume */}
          <div className="hidden sm:flex items-center gap-1">
            <Volume2 className="w-3.5 h-3.5 text-bark-400" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setVolume(v);
                if (mediaRef.current) mediaRef.current.volume = v;
              }}
              className="w-16 h-1.5 accent-amber-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Transcript */}
      {transcript ? (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <Mic className="w-4 h-4 text-bark-400" />
            <h3 className="text-sm font-medium text-bark-600">Transcript</h3>
            <span className="badge badge-gray text-xs ml-auto">{transcript.provider}</span>
          </div>

          <div
            ref={transcriptRef}
            className="max-h-80 overflow-y-auto space-y-4 text-sm text-bark-700 leading-relaxed pr-1"
          >
            {groups.length > 0 ? (
              groups.map((group, gi) => {
                const globalStart = group.startIdx;
                return (
                  <div key={gi} className="space-y-1">
                    {group.speaker && (
                      <p className="text-xs font-medium text-bark-400 uppercase tracking-wide">
                        {speakerLabels[group.speaker] ?? group.speaker}
                      </p>
                    )}
                    <p className="leading-7">
                      {group.words.map((w, wi) => {
                        const globalIdx = globalStart + wi;
                        const isActive = globalIdx === activeWordIndex;
                        return (
                          <span key={wi}>
                            <span
                              ref={isActive ? activeWordRef : undefined}
                              className={`cursor-pointer rounded transition-colors ${
                                isActive ? "word-active" : "hover:bg-parchment-200"
                              }`}
                              onClick={() => seekTo(w.start)}
                            >
                              {w.word}
                            </span>
                            {" "}
                          </span>
                        );
                      })}
                    </p>
                  </div>
                );
              })
            ) : (
              <p>{transcript.full_text}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="card text-center py-6 text-bark-400">
          <Mic className="w-6 h-6 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Transcript not yet available.</p>
        </div>
      )}
    </div>
  );
}
