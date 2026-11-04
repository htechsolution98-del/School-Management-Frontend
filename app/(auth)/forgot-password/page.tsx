"use client";
import { validateStrongPassword } from "@/lib/password-validation";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  KeyRound,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/config";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      delay: i * 0.08,
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
    },
  }),
};

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Step 1: 'email', Step 2: 'otp_password', Step 3: 'success'
  const [step, setStep] = useState<"email" | "otp_password" | "success">("email");

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  // Resend cooldown timer
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Handle Step 1: Send OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toast.error("Please enter your registered email address.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/forgot-password/send-otp/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data.error || data.message || "Failed to send verification code.";
        const helpMsg = data.help || data.detail;
        throw new Error(helpMsg ? `${errorMsg} — ${helpMsg}` : errorMsg);
      }

      toast.success(data.message || "Verification code sent to your email!");
      setStep("otp_password");
      setCountdown(60);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Step 2: Verify OTP and Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      toast.error("Please enter the complete 6-digit verification code.");
      return;
    }

    const pwdErr = validateStrongPassword(newPassword);
    if (pwdErr) {
      toast.error(pwdErr);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match. Please verify.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/forgot-password/reset/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp: cleanOtp,
          new_password: newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to reset password.");
      }

      toast.success(data.message || "Password reset successfully!");
      setStep("success");
      setTimeout(() => {
        router.push("/login");
      }, 2500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Step 3: Success Screen */}
      {step === "success" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-8"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-sm">
            <CheckCircle2 size={36} />
          </div>
          <h2 className="text-2xl font-black text-[#142044] tracking-tight">
            Password Reset Complete!
          </h2>
          <p className="text-sm text-[#7183A6] mt-2 mb-6">
            Your password has been changed successfully. You will be redirected to the sign-in screen in a moment...
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#2563EB] text-white font-bold text-sm shadow-md hover:bg-[#1D4ED8] transition-all"
          >
            <span>Proceed to Login</span>
            <ArrowRight size={16} />
          </Link>
        </motion.div>
      )}

      {/* Step 1: Enter Email */}
      {step === "email" && (
        <form onSubmit={handleSendOtp} className="space-y-6">
          <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center mb-4 border border-blue-100 shadow-xs">
              <KeyRound size={24} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#142044] tracking-tight">
              Forgot password?
            </h1>
            <p className="text-sm text-[#7183A6] mt-2 font-normal">
              Enter your registered email address and we'll send a 6-digit OTP to reset your account password.
            </p>
          </motion.div>

          <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible" className="space-y-2">
            <Label htmlFor="email" className="text-sm font-bold text-[#142044]">
              Registered Email
            </Label>
            <div className="relative">
              <Mail
                className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200 ${
                  focused === "email" ? "text-[#2563EB]" : "text-[#7183A6]"
                }`}
              />
              <Input
                id="email"
                type="email"
                placeholder="name@school.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocused("email")}
                onBlur={() => setFocused(null)}
                className="pl-10 h-12 rounded-xl border-[#E5EAF4] bg-white text-[#142044] placeholder:text-[#7183A6]/60 shadow-xs focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all duration-200"
              />
            </div>
          </motion.div>

          <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible" className="space-y-3">
            <Button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full h-12 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Sending Code...</span>
                </>
              ) : (
                <>
                  <span>Send Verification Code</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7183A6] hover:text-[#142044] transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Return to sign in</span>
              </Link>
            </div>
          </motion.div>
        </form>
      )}

      {/* Step 2: Enter OTP & New Password */}
      {step === "otp_password" && (
        <form onSubmit={handleResetPassword} className="space-y-5">
          <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center mb-4 border border-blue-100 shadow-xs">
              <ShieldCheck size={24} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#142044] tracking-tight">
              Reset Your Password
            </h1>
            <p className="text-sm text-[#7183A6] mt-2 font-normal">
              We've sent a 6-digit OTP code to <strong className="text-slate-800">{email}</strong>. Enter it below with your new password.
            </p>
          </motion.div>

          {/* OTP Code Input */}
          <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible" className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="otp" className="text-sm font-bold text-[#142044]">
                6-Digit Verification OTP
              </Label>
              <button
                type="button"
                onClick={() => setStep("email")}
                className="text-xs font-bold text-[#2563EB] hover:underline cursor-pointer"
              >
                Change email
              </button>
            </div>
            <div className="relative">
              <KeyRound
                className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200 ${
                  focused === "otp" ? "text-[#2563EB]" : "text-[#7183A6]"
                }`}
              />
              <Input
                id="otp"
                type="text"
                maxLength={6}
                placeholder="123456"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
                onFocus={() => setFocused("otp")}
                onBlur={() => setFocused(null)}
                className="pl-10 h-12 rounded-xl border-[#E5EAF4] bg-white text-[#142044] font-mono tracking-widest text-base placeholder:tracking-normal placeholder:font-sans placeholder:text-[#7183A6]/60 shadow-xs focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all duration-200"
              />
            </div>
          </motion.div>

          {/* New Password */}
          <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible" className="space-y-2">
            <Label htmlFor="newPassword" className="text-sm font-bold text-[#142044]">
              New Password
            </Label>
            <div className="relative">
              <Lock
                className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200 ${
                  focused === "newPassword" ? "text-[#2563EB]" : "text-[#7183A6]"
                }`}
              />
              <Input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Min 8 characters (A-Z, a-z, 0-9, special char)"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onFocus={() => setFocused("newPassword")}
                onBlur={() => setFocused(null)}
                className="pl-10 pr-11 h-12 rounded-xl border-[#E5EAF4] bg-white text-[#142044] placeholder:text-[#7183A6]/60 shadow-xs focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7183A6] hover:text-[#142044] transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </motion.div>

          {/* Confirm Password */}
          <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible" className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-bold text-[#142044]">
              Confirm New Password
            </Label>
            <div className="relative">
              <Lock
                className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200 ${
                  focused === "confirmPassword" ? "text-[#2563EB]" : "text-[#7183A6]"
                }`}
              />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Re-enter your password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onFocus={() => setFocused("confirmPassword")}
                onBlur={() => setFocused(null)}
                className="pl-10 pr-11 h-12 rounded-xl border-[#E5EAF4] bg-white text-[#142044] placeholder:text-[#7183A6]/60 shadow-xs focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7183A6] hover:text-[#142044] transition-colors cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible" className="space-y-3 pt-1">
            <Button
              type="submit"
              disabled={isLoading || otp.length < 6 || !newPassword || !confirmPassword}
              className="w-full h-12 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Verifying & Resetting...</span>
                </>
              ) : (
                <>
                  <span>Reset Password</span>
                  <CheckCircle2 className="h-4 w-4" />
                </>
              )}
            </Button>

            <div className="flex items-center justify-between text-xs pt-2">
              <button
                type="button"
                onClick={() => handleSendOtp()}
                disabled={countdown > 0 || isLoading}
                className="font-bold text-[#2563EB] hover:text-[#1D4ED8] disabled:opacity-50 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
                <span>{countdown > 0 ? `Resend OTP in ${countdown}s` : "Resend OTP code"}</span>
              </button>

              <Link
                href="/login"
                className="font-bold text-[#7183A6] hover:text-[#142044] transition-colors"
              >
                Back to sign in
              </Link>
            </div>
          </motion.div>
        </form>
      )}
    </div>
  );
}

