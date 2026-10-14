"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2, X } from "lucide-react";
import { checkFaceStatus, enrollFace, verifyFace } from "@/lib/teacher/attendance";

interface StaffBiometricCaptureDialogProps {
  isOpen: boolean;
  actionLabel: string;
  onClose: () => void;
  onVerified: (verificationToken: string) => Promise<void>;
}

export function StaffBiometricCaptureDialog({
  isOpen,
  actionLabel,
  onClose,
  onVerified,
}: StaffBiometricCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [enrolled, setEnrolled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setEnrolled(null);
      setError(null);
      return;
    }

    let active = true;
    setError(null);
    checkFaceStatus()
      .then((status) => {
        if (active) setEnrolled(status.enrolled);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Could not check face enrollment status.");
      });

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera access is not available in this browser.");
    } else {
      navigator.mediaDevices
        .getUserMedia({ video: { width: 400, height: 400, facingMode: "user" } })
        .then((stream) => {
          if (!active) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            void videoRef.current.play().catch(() => undefined);
          }
        })
        .catch(() => {
          if (active) setError("Could not access the camera. Allow camera permission and try again.");
        });
    }

    return () => {
      active = false;
      stopCamera();
    };
  }, [isOpen, stopCamera]);

  const captureAndVerify = async () => {
    if (!videoRef.current || enrolled === null) return;
    setLoading(true);
    setError(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 400;
      const context = canvas.getContext("2d");
      if (!context || videoRef.current.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        throw new Error("Camera is not ready. Please wait and try again.");
      }
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const image = canvas.toDataURL("image/jpeg", 0.9);

      if (!enrolled) {
        await enrollFace(image);
        setEnrolled(true);
        return;
      }

      const result = await verifyFace(image);
      const verified = result?.Verified ?? result?.verified ?? false;
      if (!verified) {
        const confidence = Number(result?.Confidence ?? result?.confidence ?? 0);
        throw new Error(`Face verification failed${confidence ? ` (${confidence.toFixed(2)}%)` : ""}. Align your face and try again.`);
      }
      const token = result?.verification_token ?? result?.token;
      if (typeof token !== "string" || !token) {
        throw new Error("The server did not return an attendance verification token.");
      }
      await onVerified(token);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Face verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md space-y-5 rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Face verification</h2>
            <p className="mt-1 text-sm text-slate-500">
              {enrolled === false
                ? "Enroll your face first. Then capture again to verify this punch."
                : enrolled
                  ? `Capture your face to verify ${actionLabel.toLowerCase()}.`
                  : `Verify your face to ${actionLabel.toLowerCase()}.`}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={loading} aria-label="Close face verification" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mx-auto aspect-square w-64 overflow-hidden rounded-full bg-slate-950 ring-4 ring-indigo-100">
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full scale-x-[-1] object-cover" />
        </div>

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {enrolled === null && !error && <p className="text-center text-sm text-slate-500">Checking enrollment and opening camera…</p>}

        <button
          type="button"
          onClick={captureAndVerify}
          disabled={loading || enrolled === null || Boolean(error)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : enrolled ? <CheckCircle2 className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
          {loading ? (enrolled ? "Verifying…" : "Enrolling…") : enrolled ? `Verify & ${actionLabel}` : "Enroll Face"}
        </button>
      </div>
    </div>
  );
}
