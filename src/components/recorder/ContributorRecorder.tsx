"use client";

/**
 * ContributorRecorder — the full in-browser recording + upload flow.
 *
 * States:
 *   intro → permission → recording → review → uploading → done
 *
 * Browser support:
 *   Safari → MP4/AAC (audio) or MP4/H.264 (video)
 *   Chrome/Firefox → WebM/Opus (audio) or WebM/VP9 (video)
 *   Feature-detected with MediaRecorder.isTypeSupported()
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Video, Square, RotateCcw, Send, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import type { Person, RecordingRequest } from "@/types";

type RecordingState = "intro" | "permission" | "recording" | "review" | "uploading" | "done" | "error";

interface Props {
  person: Person;
  request: RecordingRequest | null;
  vaultId: string;
}

// Preferred MIME types, in priority order
const AUDIO_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg;codecs=opus",
];
const VIDEO_TYPES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4;codecs=h264,aac",
  "video/mp4",
];

function getSupportedMime(types: string[]): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? null;
}

function mimeToExtension(mime: string): string {
  if (mime.startsWith("video/mp4")) return "mp4";
  if (mime.startsWith("video/webm")) return "webm";
  if (mime.startsWith("audio/mp4") || mime.startsWith("audio/mpeg")) return "m4a";
  if (mime.startsWith("audio/webm")) return "webm";
  if (mime.startsWith("audio/ogg")) return "ogg";
  return "bin";
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Max duration: 90 minutes
const MAX_DURATION_SECONDS = 90 * 60;

export default function ContributorRecorder({ person, request, vaultId }: Props) {
  const medium: "audio" | "video" = request?.medium ?? "audio";
  const isVideo = medium === "video";

  const [state, setState] = useState<RecordingState>("intro");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function requestPermission() {
    setState("permission");
    setErrorMsg(null);
    try {
      const constraints: MediaStreamConstraints = isVideo
        ? { audio: true, video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } }
        : { audio: true, video: false };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (isVideo && liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.muted = true;
        liveVideoRef.current.play().catch(() => {});
      }

      startRecording(stream);
    } catch (err) {
      const msg = err instanceof DOMException && err.name === "NotAllowedError"
        ? "Microphone access was denied. Please allow access in your browser settings and try again."
        : `Could not access your ${isVideo ? "camera and " : ""}microphone. Please check your device settings.`;
      setErrorMsg(msg);
      setState("error");
    }
  }

  function startRecording(stream: MediaStream) {
    chunksRef.current = [];
    const mimeType = getSupportedMime(isVideo ? VIDEO_TYPES : AUDIO_TYPES);
    if (!mimeType) {
      setErrorMsg("Your browser does not support in-browser recording. Please try Chrome, Firefox, or Safari.");
      setState("error");
      return;
    }

    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setRecordedUrl(url);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.src = url;
        videoPreviewRef.current.load();
      }
    };

    // Collect chunks every 1s for robustness
    recorder.start(1000);
    setState("recording");
    setElapsed(0);

    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        if (prev + 1 >= MAX_DURATION_SECONDS) {
          stopRecording();
          return MAX_DURATION_SECONDS;
        }
        return prev + 1;
      });
    }, 1000);
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
    stopStream();
    setState("review");
  }

  function retake() {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setElapsed(0);
    setState("intro");
  }

  async function submit() {
    if (!recordedBlob) return;
    setState("uploading");
    setUploadProgress(0);

    try {
      const mimeType = recordedBlob.type;
      const extension = mimeToExtension(mimeType);

      // 1. Get signed upload URL
      const sigRes = await fetch("/api/upload/signed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mime_type: mimeType, extension }),
      });
      if (!sigRes.ok) throw new Error("Could not get upload URL");
      const { signed_url, asset_id } = await sigRes.json();

      // 2. Upload directly to Supabase storage via XHR for progress
      await uploadWithProgress(recordedBlob, signed_url, setUploadProgress);

      // 3. Complete
      const subject = request?.subject ?? person.given_name + "'s memory";
      const completeRes = await fetch("/api/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_id,
          title: subject,
          duration_seconds: elapsed,
          size_bytes: recordedBlob.size,
          recorded_at: new Date().toISOString(),
        }),
      });
      if (!completeRes.ok) throw new Error("Could not complete upload");

      setState("done");
    } catch (err) {
      console.error(err);
      setErrorMsg("Upload failed. Please check your connection and try again.");
      setState("error");
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────

  const personName = `${person.given_name} ${person.family_name ?? ""}`.trim();

  if (state === "done") {
    return (
      <div className="card text-center space-y-4 py-10">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="font-serif text-2xl text-bark-700">Thank you!</h2>
        <p className="text-bark-500 text-sm max-w-xs mx-auto">
          Your memory has been saved to the vault. The family will be able to hear it soon.
        </p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="card text-center space-y-4 py-8">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <p className="text-bark-600 text-sm">{errorMsg}</p>
        <button onClick={() => setState("intro")} className="btn-secondary">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Context card */}
      <div className="card">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isVideo ? "bg-bark-100 text-bark-600" : "bg-amber-50 text-amber-600"
          }`}>
            {isVideo ? <Video className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </div>
          <div>
            <p className="text-sm text-bark-500">
              {request
                ? "You've been asked to share a memory"
                : `Hi ${person.given_name}, record a memory for the family vault`}
            </p>
            {request && (
              <p className="mt-1 font-serif text-lg text-bark-700">&ldquo;{request.subject}&rdquo;</p>
            )}
            <p className="mt-0.5 text-xs text-bark-400">
              {isVideo ? "Video" : "Audio"} recording · {formatTime(MAX_DURATION_SECONDS)} max
            </p>
          </div>
        </div>
      </div>

      {/* Recording UI */}
      <div className="card">
        {/* Live video preview */}
        {isVideo && state === "recording" && (
          <div className="rounded-lg overflow-hidden bg-black mb-4 aspect-video">
            <video
              ref={liveVideoRef}
              className="w-full h-full object-cover mirror"
              autoPlay
              muted
              playsInline
            />
          </div>
        )}

        {/* Review video */}
        {isVideo && state === "review" && recordedUrl && (
          <div className="rounded-lg overflow-hidden bg-black mb-4 aspect-video">
            <video
              ref={videoPreviewRef}
              src={recordedUrl}
              className="w-full h-full object-cover"
              controls
              playsInline
            />
          </div>
        )}

        {/* Review audio */}
        {!isVideo && state === "review" && recordedUrl && (
          <div className="mb-4">
            <audio src={recordedUrl} controls className="w-full" />
          </div>
        )}

        {/* Waveform / timer during recording */}
        {state === "recording" && (
          <div className="flex flex-col items-center gap-4 py-4">
            {!isVideo && (
              <div className="flex items-end gap-0.5 h-10">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="waveform-bar"
                    style={{
                      animationDelay: `${i * 0.04}s`,
                      animationDuration: `${0.6 + Math.random() * 0.4}s`,
                    }}
                  />
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="animate-record w-3 h-3 rounded-full bg-red-500 inline-block" />
              <span className="font-mono text-2xl text-bark-700">{formatTime(elapsed)}</span>
            </div>
          </div>
        )}

        {/* Idle / intro */}
        {state === "intro" && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-20 h-20 rounded-full bg-parchment-200 flex items-center justify-center">
              {isVideo ? (
                <Video className="w-9 h-9 text-bark-500" />
              ) : (
                <Mic className="w-9 h-9 text-bark-500" />
              )}
            </div>
            <p className="text-sm text-bark-500 text-center">
              When you&apos;re ready, press the button below to start recording.
            </p>
          </div>
        )}

        {/* Upload progress */}
        {state === "uploading" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="w-8 h-8 text-bark-500 animate-spin" />
            <p className="text-sm text-bark-500">Uploading your recording…</p>
            <div className="w-full bg-parchment-200 rounded-full h-2">
              <div
                className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-bark-400">{Math.round(uploadProgress)}%</p>
          </div>
        )}

        {/* Waiting for permission */}
        {state === "permission" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="w-8 h-8 text-bark-500 animate-spin" />
            <p className="text-sm text-bark-500">
              Requesting {isVideo ? "camera and " : ""}microphone access…
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-3 mt-4">
          {state === "intro" && (
            <button onClick={requestPermission} className="btn-primary px-8">
              {isVideo ? <Video className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              Start recording
            </button>
          )}

          {state === "recording" && (
            <button
              onClick={stopRecording}
              className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors shadow-lg"
            >
              <Square className="w-5 h-5 text-white fill-white" />
            </button>
          )}

          {state === "review" && (
            <>
              <button onClick={retake} className="btn-secondary">
                <RotateCcw className="w-4 h-4" />
                Retake
              </button>
              <button onClick={submit} className="btn-primary">
                <Send className="w-4 h-4" />
                Submit memory
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Upload with progress via XMLHttpRequest
// ─────────────────────────────────────────────
function uploadWithProgress(
  blob: Blob,
  signedUrl: string,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("Content-Type", blob.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed: ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(blob);
  });
}
