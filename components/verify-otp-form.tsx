"use client";

import { useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, KeyRound, ArrowRight, Loader2, Mail, Phone } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { verifyOtp } from "@/lib/auth";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { 
      duration: 0.4, 
      delay: i * 0.08, 
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number]
    },
  }),
};

function VerifyOtpInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const identifier = searchParams.get("identifier") || "";
  const type = searchParams.get("type") || "email";

  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    try {
      const payload: any = {
        otp: otp.trim(),
        password: password,
      };

      if (type === "email") {
        payload.email = identifier;
      } else {
        payload.mobile = identifier;
      }

      if (typeof window !== "undefined") {
        const schoolId = localStorage.getItem("school_id");
        const schoolSlug = localStorage.getItem("school_slug");
        if (schoolId) payload.school_id = schoolId;
        if (schoolSlug) payload.school_slug = schoolSlug;
      }

      await verifyOtp(payload);
      
      router.push(`/login?identifier=${encodeURIComponent(identifier)}`);
    } catch (err: any) {
      setError(err.message || "Verification failed. Please check your OTP and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }}
      className="w-full"
    >
      {/* Header */}
      <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible" className="mb-8">
        <h1 className="text-3xl font-extrabold text-[#1D496C] mb-2">Verify OTP</h1>
        <p className="text-[#64748B] text-sm flex items-center gap-2">
          {type === "email" ? <Mail className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
          OTP sent to <span className="font-bold text-[#1D496C]">{identifier}</span>
        </p>
      </motion.div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* OTP */}
        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible" className="space-y-1.5">
          <Label htmlFor="otp" className="text-sm font-bold text-[#1D496C]">
            One-Time Password
          </Label>
          <div className="relative">
            <KeyRound
              className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200 ${
                focused === "otp" ? "text-[#FFA600]" : "text-[#94A3B8]"
              }`}
            />
            <Input
              id="otp"
              type="text"
              placeholder="Enter 6-digit OTP"
              required
              maxLength={10}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              onFocus={() => setFocused("otp")}
              onBlur={() => setFocused(null)}
              className="pl-10 h-12 rounded-xl border-[#E2E8F0] bg-white text-[#0F172A] placeholder:text-[#CBD5E1] shadow-sm focus:border-[#FFA600] focus:ring-2 focus:ring-[#FFA600]/20 transition-all duration-200"
            />
          </div>
        </motion.div>

        {/* Password */}
        <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible" className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-bold text-[#1D496C]">
            Set Password
          </Label>
          <div className="relative">
            <Lock
              className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200 ${
                focused === "password" ? "text-[#FFA600]" : "text-[#94A3B8]"
              }`}
            />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocused("password")}
              onBlur={() => setFocused(null)}
              className="pl-10 pr-11 h-12 rounded-xl border-[#E2E8F0] bg-white text-[#0F172A] placeholder:text-[#CBD5E1] shadow-sm focus:border-[#FFA600] focus:ring-2 focus:ring-[#FFA600]/20 transition-all duration-200"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569] transition-colors"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={showPassword ? "hide" : "show"}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.15 }}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </motion.div>

        {/* Confirm Password */}
        <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible" className="space-y-1.5">
          <Label htmlFor="confirm-password" className="text-sm font-bold text-[#1D496C]">
            Confirm Password
          </Label>
          <div className="relative">
            <Lock
              className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200 ${
                focused === "confirm-password" ? "text-[#FFA600]" : "text-[#94A3B8]"
              }`}
            />
            <Input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onFocus={() => setFocused("confirm-password")}
              onBlur={() => setFocused(null)}
              className="pl-10 pr-11 h-12 rounded-xl border-[#E2E8F0] bg-white text-[#0F172A] placeholder:text-[#CBD5E1] shadow-sm focus:border-[#FFA600] focus:ring-2 focus:ring-[#FFA600]/20 transition-all duration-200"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569] transition-colors"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={showConfirmPassword ? "hide" : "show"}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.15 }}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <p className="text-sm font-semibold text-red-500">{error}</p>
          </motion.div>
        )}

        {/* Submit */}
        <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible" className="pt-2">
          <Button
            type="submit"
            disabled={isLoading}
            className="group relative w-full h-12 rounded-xl bg-gradient-to-r from-[#1D496C] via-[#285E89] to-[#429CE4] text-white font-bold text-sm shadow-lg shadow-[#1D496C]/10 hover:shadow-xl hover:from-[#153957] hover:to-[#2e7ca8] active:scale-[0.98] transition-all duration-200 disabled:opacity-70"
          >
            <AnimatePresence mode="wait" initial={false}>
              {isLoading ? (
                <motion.span
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying…
                </motion.span>
              ) : (
                <motion.span
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  Complete Registration
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </motion.div>
      </form>

      {/* Trust badges */}
      <motion.div
        custom={5}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="mt-8 pt-6 border-t border-[#F1F5F9] flex items-center justify-center gap-6"
      >
        {["256-bit Encryption", "Secure Session", "Double Verified"].map((badge) => (
          <span key={badge} className="flex items-center gap-1.5 text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-[#6A7626] inline-block" />
            {badge}
          </span>
        ))}
      </motion.div>
    </motion.div>
  );
}

export function VerifyOtpForm() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-[#FFA600]" /></div>}>
      <VerifyOtpInner />
    </Suspense>
  );
}
