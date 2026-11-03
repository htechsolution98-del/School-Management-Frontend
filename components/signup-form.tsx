"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Phone, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sendOtp } from "@/lib/auth";

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

export function SignupForm() {
  const [identifier, setIdentifier] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const isEmail = identifier.includes("@");
      const digitsOnly = identifier.replace(/[\s()\-.]/g, "");
      const cleanMobile = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;
      const cleanIdentifier = isEmail ? identifier.trim() : cleanMobile;

      const payload = isEmail
        ? { email: cleanIdentifier }
        : { mobile: cleanMobile };

      await sendOtp(payload);

      const searchParams = new URLSearchParams();
      searchParams.set("identifier", cleanIdentifier);
      searchParams.set("type", isEmail ? "email" : "mobile");

      router.push(`/verify-otp?${searchParams.toString()}`);
    } catch (err: any) {
      console.log("FULL ERROR :", err);

      const errorMessage =
        err?.response?.data?.error ||
        err?.error ||
        err?.message ||
        "Something went wrong. Please try again.";

      // If user already exists → redirect to login page
      if (errorMessage.toLowerCase().includes("already exists")) {
        const searchParams = new URLSearchParams();
        searchParams.set("identifier", identifier.trim());

        router.push(`/login?${searchParams.toString()}`);

        return;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
      }}
      className="w-full"
    >
      {/* Header */}
      <motion.div
        custom={0}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="mb-8"
      >
        <h1 className="text-3xl font-extrabold text-[#1D496C] mb-2">
          Create an account
        </h1>
        <p className="text-[#64748B] text-sm">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-bold text-[#FFA600] hover:text-[#ED6708] transition-colors underline underline-offset-2"
          >
            Sign in instead
          </Link>
        </p>
      </motion.div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identifier (Email/Mobile) */}
        <motion.div
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="space-y-1.5"
        >
          <Label
            htmlFor="identifier"
            className="text-sm font-bold text-[#1D496C]"
          >
            Email address or Mobile number
          </Label>
          <div className="relative">
            {identifier.includes("@") ||
            (identifier.length > 0 && !/^\d+$/.test(identifier[0])) ? (
              <Mail
                className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200 ${
                  focused === "identifier" ? "text-[#FFA600]" : "text-[#94A3B8]"
                }`}
              />
            ) : (
              <Phone
                className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200 ${
                  focused === "identifier" ? "text-[#FFA600]" : "text-[#94A3B8]"
                }`}
              />
            )}
            <Input
              id="identifier"
              type="text"
              placeholder="e.g. name@example.com or 9876543210"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              onFocus={() => setFocused("identifier")}
              onBlur={() => setFocused(null)}
              className="pl-10 h-12 rounded-xl border-[#E2E8F0] bg-white text-[#0F172A] placeholder:text-[#CBD5E1] shadow-sm focus:border-[#FFA600] focus:ring-2 focus:ring-[#FFA600]/20 transition-all duration-200"
            />
          </div>
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <p className="text-sm font-semibold text-red-500">{error}</p>
          </motion.div>
        )}

        {/* Submit */}
        <motion.div
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="pt-2"
        >
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
                  Sending OTP…
                </motion.span>
              ) : (
                <motion.span
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  Continue
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </motion.div>
      </form>

      {/* Trust badges */}
      <motion.div
        custom={3}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="mt-8 pt-6 border-t border-[#F1F5F9] flex items-center justify-center gap-6"
      >
        {["Secure OTP", "Privacy Protected", "Instant Access"].map((badge) => (
          <span
            key={badge}
            className="flex items-center gap-1.5 text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#6A7626] inline-block" />
            {badge}
          </span>
        ))}
      </motion.div>
    </motion.div>
  );
}
