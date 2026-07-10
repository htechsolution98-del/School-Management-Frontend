"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, AlertCircle, Loader2, ShieldAlert, ArrowLeft, Video } from "lucide-react";
import { toast } from "sonner";
import { enrollFace, verifyFace } from "@/lib/auth";

interface FaceScanProps {
  username: string;
  roles: string[];
  onSuccess: () => void;
  onCancel: () => void;
}

type ScanMode = "verify" | "enroll";
type ScanStatus = "idle" | "initializing" | "ready" | "processing" | "success" | "error";

export function FaceScan({ username, roles, onSuccess, onCancel }: FaceScanProps) {
  const [mode, setMode] = useState<ScanMode>(() => {
    if (typeof window !== "undefined") {
      const enrolled = localStorage.getItem(`face_enrolled_${username}`);
      return enrolled === "true" ? "verify" : "enroll";
    }
    return "verify";
  });
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Initialize camera and scan devices
  useEffect(() => {
    async function initCamera() {
      try {
        setStatus("initializing");
        
        // Request permissions first
        const initStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });

        // Enumerate video devices
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter((device) => device.kind === "videoinput");
        setDevices(videoDevices);

        if (videoDevices.length > 0) {
          // Default to front camera or first device
          const frontCamera = videoDevices.find(
            (device) =>
              device.label.toLowerCase().includes("front") ||
              device.label.toLowerCase().includes("user")
          );
          const defaultDevice = frontCamera || videoDevices[0];
          setSelectedDeviceId(defaultDevice.deviceId);
          
          // Stop initial permission stream
          initStream.getTracks().forEach((track) => track.stop());
          
          // Start the selected camera
          await startStream(defaultDevice.deviceId);
        } else {
          // Fallback to initial stream if list is empty
          if (videoRef.current) {
            videoRef.current.srcObject = initStream;
          }
          setStream(initStream);
          setStatus("ready");
        }
      } catch (err: any) {
        console.error("Camera setup failed:", err);
        setStatus("error");
        setErrorMessage(
          err.message ||
            "Unable to access the camera. Please verify camera permissions in your browser settings."
        );
        toast.error("Camera access denied.");
      }
    }

    initCamera();

    return () => {
      stopStream();
    };
  }, []);

  const startStream = async (deviceId: string) => {
    try {
      stopStream();
      setStatus("initializing");
      
      const constraints = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: deviceId ? undefined : "user",
        },
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
      setStatus("ready");
      setErrorMessage("");
    } catch (err: any) {
      console.error("Failed to start stream:", err);
      setStatus("error");
      setErrorMessage("Could not start camera stream with selected camera.");
    }
  };

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const switchCamera = () => {
    if (devices.length <= 1) return;
    const currentIndex = devices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    const nextDevice = devices[nextIndex];
    setSelectedDeviceId(nextDevice.deviceId);
    startStream(nextDevice.deviceId);
  };

  const handleCapture = async () => {
    if (!videoRef.current || status !== "ready") return;

    setStatus("processing");
    setErrorMessage("");

    try {
      const canvas = document.createElement("canvas");
      // Use exact dimensions from the video track for max accuracy
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Could not initialize 2D context for image capture.");
      }

      // Draw the video frame to the canvas
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      // Convert canvas to Blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setStatus("ready");
          setErrorMessage("Failed to grab image frame from video feed.");
          return;
        }

        try {
          if (mode === "verify") {
            try {
              const res = await verifyFace(blob);
              console.log("Verify Face response:", res);
              
              const isVerified =
                res.Verified === true ||
                res.verified === true ||
                res.Verified === "true" ||
                res.verified === "true";
                
              const conf = res.Confidence || res.confidence;

              if (isVerified) {
                setConfidence(conf);
                setStatus("success");
                localStorage.setItem(`face_verified_date_${username}`, new Date().toISOString().split("T")[0]);
                toast.success("Face verification successful!");
                setTimeout(() => {
                  onSuccess();
                }, 1500);
              } else {
                setStatus("ready");
                setErrorMessage(`Verification failed. Confidence: ${conf ? conf + "%" : "low"}. Please center your face and try again.`);
              }
            } catch (verifyErr: any) {
              console.error("Verification call failed:", verifyErr);
              const errMsg = verifyErr.message || "";
              const isNotEnrolled =
                verifyErr.status === 404 ||
                errMsg.toLowerCase().includes("not enrolled") ||
                errMsg.toLowerCase().includes("no face") ||
                errMsg.toLowerCase().includes("not registered") ||
                errMsg.toLowerCase().includes("not found") ||
                errMsg.toLowerCase().includes("exist");

              if (isNotEnrolled) {
                toast.info("No face profile registered yet. Enrolling your face now...");
                setMode("enroll");
                
                // Automatically enroll the same image!
                try {
                  const enrollRes = await enrollFace(blob);
                  console.log("Auto Enroll response:", enrollRes);
                  setStatus("success");
                  localStorage.setItem(`face_enrolled_${username}`, "true");
                  localStorage.setItem(`face_verified_date_${username}`, new Date().toISOString().split("T")[0]);
                  toast.success("Face enrolled and verified successfully!");
                  setTimeout(() => {
                    onSuccess();
                  }, 1500);
                } catch (enrollErr: any) {
                  console.error("Auto Enroll call failed:", enrollErr);
                  setStatus("ready");
                  setErrorMessage(enrollErr.message || "Failed to auto-enroll face. Please try again.");
                }
              } else {
                setStatus("ready");
                setErrorMessage(errMsg || "Verification request failed. Please try again.");
              }
            }
          } else {
            // Enroll mode
            const res = await enrollFace(blob);
            console.log("Enroll Face response:", res);
            
            setStatus("success");
            localStorage.setItem(`face_enrolled_${username}`, "true");
            localStorage.setItem(`face_verified_date_${username}`, new Date().toISOString().split("T")[0]);
            toast.success("Face enrollment successful!");
            setTimeout(() => {
              onSuccess();
            }, 1500);
          }
        } catch (err: any) {
          console.warn("API call failed:", err);
          setStatus("ready");
          setErrorMessage(err.message || `Request failed during ${mode === "verify" ? "verification" : "enrollment"}.`);
        }
      }, "image/png");
    } catch (err: any) {
      setStatus("ready");
      setErrorMessage(err.message || "Failed to capture image.");
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center p-6 bg-white/5 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl max-w-md w-full mx-auto overflow-hidden text-white">
      {/* Decorative colored glow spots */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-[#FFA600]/10 blur-[40px]"></div>
        <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-[#1D496C]/20 blur-[40px]"></div>
      </div>

      <div className="relative z-10 w-full flex flex-col items-center">
        {/* Header */}
        <div className="flex items-center w-full justify-between mb-6">
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to login
          </button>
          <span className="text-[10px] uppercase font-bold tracking-widest bg-white/10 px-2 py-0.5 rounded-full text-white/80">
            {mode === "verify" ? "Daily Verification" : "First Time Setup"}
          </span>
        </div>

        {/* Title */}
        <h2 className="text-xl font-extrabold text-white text-center mb-1">
          {mode === "verify" ? "Scan Face to Continue" : "Register Your Face"}
        </h2>
        <p className="text-xs text-white/60 text-center mb-6 max-w-[280px]">
          {mode === "verify"
            ? "Position your face in the camera frame to complete your daily sign-in."
            : "Enroll your face template to secure your account and enable face login."}
        </p>

        {/* Camera Feed Container */}
        <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-slate-700/50 shadow-xl bg-slate-950 flex items-center justify-center mb-6">
          {status === "initializing" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-[#FFA600]" />
              <span className="text-xs text-white/50">Activating camera...</span>
            </div>
          )}

          {status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-950 text-center gap-2">
              <ShieldAlert className="h-10 w-10 text-red-500 animate-pulse" />
              <span className="text-xs font-bold text-red-400">Camera Error</span>
              <p className="text-[10px] text-white/40 leading-normal">{errorMessage}</p>
              <Button
                size="sm"
                onClick={() => selectedDeviceId ? startStream(selectedDeviceId) : window.location.reload()}
                className="mt-2 text-xs bg-white/10 hover:bg-white/20 h-8 rounded-lg"
              >
                Retry Camera
              </Button>
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover rounded-full transform scale-x-[-1] ${
              status === "ready" || status === "processing" ? "block" : "hidden"
            }`}
          />

          {/* Holographic scanning laser line */}
          {status === "ready" && (
            <motion.div
              className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#FFA600] to-transparent shadow-[0_0_8px_#FFA600] z-20 pointer-events-none"
              animate={{ top: ["0%", "100%", "0%"] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
            />
          )}

          {/* Scanning overlays */}
          <AnimatePresence>
            {status === "processing" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#1D496C]/40 backdrop-blur-xs flex flex-col items-center justify-center z-30"
              >
                <Loader2 className="h-10 w-10 animate-spin text-[#FFA600] mb-2" />
                <span className="text-xs font-semibold uppercase tracking-wider text-white">
                  {mode === "verify" ? "Verifying..." : "Enrolling..."}
                </span>
              </motion.div>
            )}

            {status === "success" && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="absolute inset-0 bg-green-500/20 backdrop-blur-xs flex flex-col items-center justify-center z-30"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                  className="h-14 w-14 rounded-full bg-green-500 flex items-center justify-center shadow-lg mb-2"
                >
                  <svg
                    className="h-8 w-8 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
                <span className="text-xs font-bold uppercase tracking-wider text-green-400">
                  {mode === "verify" ? "Verified" : "Enrolled"}
                </span>
                {confidence && (
                  <span className="text-[10px] text-white/60 mt-0.5">
                    Confidence: {confidence}%
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Scan Button */}
        <div className="w-full space-y-4">
          <Button
            onClick={handleCapture}
            disabled={status !== "ready"}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-[#FFA600] via-[#ED6708] to-[#FFA600] text-white font-bold text-sm shadow-lg shadow-[#FFA600]/15 hover:shadow-xl hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <Camera className="h-4 w-4 mr-2" />
            {mode === "verify" ? "Verify My Face" : "Register My Face"}
          </Button>

          {/* Sub-actions / Switch Modes & Camera */}
          <div className="flex items-center justify-between px-1">
            {devices.length > 1 && status === "ready" ? (
              <button
                type="button"
                onClick={switchCamera}
                className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors"
              >
                <Video className="h-3.5 w-3.5" />
                Switch Camera
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={() => {
                if (status === "processing") return;
                setMode(mode === "verify" ? "enroll" : "verify");
                setStatus("ready");
                setErrorMessage("");
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-[#FFA600] hover:text-[#ED6708] transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {mode === "verify" ? "Switch to Setup" : "Switch to Verify"}
            </button>
          </div>
        </div>

        {/* Dynamic Warning/Error box */}
        {errorMessage && status === "error" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2.5 w-full text-left"
          >
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-red-400 leading-none mb-1">Scan Attempt Failed</p>
              <p className="text-[10px] text-red-200/70 leading-normal">{errorMessage}</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
