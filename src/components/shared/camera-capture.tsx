"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, RotateCcw, Check, AlertCircle, Loader2 } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  onCancel?: () => void;
  label?: string;
}

export function CameraCapture({ onCapture, onCancel, label = "Take Photo" }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [mode, setMode] = useState<"idle" | "starting" | "preview" | "captured" | "error">("idle");
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const attachStreamToVideo = useCallback(async (stream: MediaStream) => {
    const video = videoRef.current;
    if (!video) return false;

    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;

    await new Promise<void>((resolve) => {
      if (video.readyState >= 1) {
        resolve();
        return;
      }
      const onReady = () => {
        video.removeEventListener("loadedmetadata", onReady);
        resolve();
      };
      video.addEventListener("loadedmetadata", onReady);
    });

    try {
      await video.play();
    } catch {
      // Some browsers need a second tick after metadata
      await new Promise((r) => setTimeout(r, 100));
      await video.play();
    }
    return true;
  }, []);

  const startCamera = useCallback(async (nextFacing?: "user" | "environment") => {
    const facing = nextFacing ?? facingMode;
    if (nextFacing) setFacingMode(nextFacing);

    setError(null);
    stopStream();
    setMode("starting");

    if (typeof window !== "undefined" && !window.isSecureContext) {
      setError("Camera requires HTTPS. Open this page over https:// or use localhost.");
      setMode("error");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera is not supported in this browser. Try Safari on iPhone, or Chrome on Android.");
      setMode("error");
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true,
        });
      }

      streamRef.current = stream;
      setMode("preview");
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      const msg =
        name === "NotAllowedError"
          ? "Camera permission denied. Allow camera access in your browser settings, then try again."
          : name === "NotFoundError"
            ? "No camera was found on this device."
            : name === "NotReadableError"
              ? "Camera is already in use by another app. Close it and try again."
              : "Unable to access camera. Use HTTPS and allow camera permission.";
      setError(msg);
      setMode("error");
    }
  }, [facingMode, stopStream]);

  // Attach stream AFTER the <video> is in the DOM (preview mode)
  useEffect(() => {
    if (mode !== "preview" || !streamRef.current) return;

    let cancelled = false;
    (async () => {
      // Wait one frame so the video element is mounted
      await new Promise((r) => requestAnimationFrame(() => r(undefined)));
      if (cancelled || !streamRef.current) return;
      try {
        await attachStreamToVideo(streamRef.current);
      } catch {
        if (!cancelled) {
          setError("Camera opened but preview failed. Try again or switch camera.");
          setMode("error");
          stopStream();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, attachStreamToVideo, stopStream]);

  useEffect(() => {
    return () => stopStream();
  }, [stopStream]);

  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    if (!width || !height) {
      setError("Camera is still starting. Wait a moment, then try again.");
      return;
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Mirror selfie for front camera so it matches what users expect
    if (facingMode === "user") {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, width, height);
    stopStream();

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        setCapturedUrl(url);
        setMode("captured");
      },
      "image/jpeg",
      0.85
    );
  }, [facingMode, stopStream]);

  const confirmPhoto = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(blob);
      },
      "image/jpeg",
      0.85
    );
  }, [onCapture]);

  const retake = useCallback(() => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl(null);
    startCamera();
  }, [capturedUrl, startCamera]);

  if (mode === "idle") {
    return (
      <div className="flex flex-col items-center gap-4 p-6">
        <div className="rounded-full bg-white/8 p-6 ring-1 ring-white/10">
          <Camera className="h-10 w-10 text-accent" />
        </div>
        <p className="text-center text-sm text-muted">
          A live photo is required for verification. Your camera will be used — no file uploads.
        </p>
        <Button size="lg" onClick={() => startCamera()} className="w-full max-w-xs">
          <Camera className="h-5 w-5" />
          Open Camera
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    );
  }

  if (mode === "error") {
    return (
      <div className="flex flex-col items-center gap-4 p-6">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-center text-sm text-red-300">{error}</p>
        <Button onClick={() => startCamera()}>Try Again</Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    );
  }

  if (mode === "captured" && capturedUrl) {
    return (
      <div className="flex flex-col items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={capturedUrl}
          alt="Captured photo"
          className="w-full max-w-sm rounded-xl border-2 border-accent object-cover"
        />
        <p className="text-sm text-muted">Confirm this photo or retake</p>
        <div className="flex gap-3 w-full max-w-sm">
          <Button variant="outline" onClick={retake} className="flex-1">
            <RotateCcw className="h-4 w-4" />
            Retake
          </Button>
          <Button onClick={confirmPhoto} className="flex-1">
            <Check className="h-4 w-4" />
            Confirm
          </Button>
        </div>
      </div>
    );
  }

  // starting + preview: always keep <video> mounted so the stream can attach
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full max-w-sm overflow-hidden rounded-xl bg-black">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`w-full aspect-[4/3] object-cover bg-black ${
            facingMode === "user" ? "scale-x-[-1]" : ""
          }`}
        />
        {mode === "starting" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-sm text-white">Starting camera…</p>
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
      <Button
        size="lg"
        onClick={takePhoto}
        disabled={mode !== "preview"}
        className="w-full max-w-xs"
      >
        <Camera className="h-5 w-5" />
        {label}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={mode === "starting"}
        onClick={() => startCamera(facingMode === "user" ? "environment" : "user")}
      >
        Switch Camera
      </Button>
    </div>
  );
}
