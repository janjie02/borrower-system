"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, RotateCcw, Check, AlertCircle } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  onCancel?: () => void;
  label?: string;
}

export function CameraCapture({ onCapture, onCancel, label = "Take Photo" }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [mode, setMode] = useState<"idle" | "preview" | "captured" | "error">("idle");
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    stopStream();

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera is not supported in this browser. Please use HTTPS and a modern browser.");
      setMode("error");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setMode("preview");
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access and try again."
          : "Unable to access camera. Ensure you are using HTTPS.";
      setError(msg);
      setMode("error");
    }
  }, [facingMode, stopStream]);

  useEffect(() => {
    return () => stopStream();
  }, [stopStream]);

  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
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
  }, [stopStream]);

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
        <Button size="lg" onClick={startCamera} className="w-full max-w-xs">
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
        <Button onClick={startCamera}>Try Again</Button>
        {onCancel && <Button variant="ghost" onClick={onCancel}>Cancel</Button>}
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

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full max-w-sm overflow-hidden rounded-xl bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full aspect-[4/3] object-cover"
        />
      </div>
      <canvas ref={canvasRef} className="hidden" />
      <Button size="lg" onClick={takePhoto} className="w-full max-w-xs">
        <Camera className="h-5 w-5" />
        {label}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          stopStream();
          setFacingMode((f) => (f === "user" ? "environment" : "user"));
          setMode("idle");
        }}
      >
        Switch Camera
      </Button>
    </div>
  );
}
