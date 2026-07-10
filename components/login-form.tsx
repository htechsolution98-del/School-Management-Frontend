"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, User, Lock, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { loginUser, getDashboardRoute } from "@/lib/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { FaceScan } from "@/components/face-scan";

const STAFF_ROLES = ["teacher"];

function isStaff(roles: string[]): boolean {
  return roles.some((role) => STAFF_ROLES.includes(role.toLowerCase()));
}

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

function LoginFormInner() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  // Face scanning states
  const [showFaceScan, setShowFaceScan] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [pendingRoute, setPendingRoute] = useState("");

  useEffect(() => {
    const identifier = searchParams.get("identifier");
    if (identifier) {
      setUsername(identifier);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Determine payload based on input type
    // const isEmail = username.includes("@");
    // const isMobile = /^\d+$/.test(username);

    // let payload: any = { password };

    // if (isEmail) {
    //   payload.email = username;
    // } else if (isMobile) {
    //   if (username.length !== 10) {
    //     setError("Mobile number must be exactly 10 digits.");
    //     setIsLoading(false);
    //     return;
    //   }
    //   payload.mobile = username;
    // } else {
    //   setError("Please enter a valid email or 10-digit mobile number.");
    //   setIsLoading(false);
    //   return;
    // }

    // now this is for the studend 
    const isEmail = username.includes("@");

    let payload: any = { password };

    if (isEmail) {
      payload.email = username;
    } else {
      payload.mobile = username;
    }

    try {
      const response = await loginUser(payload);
      // roles might be top-level or in user.roles depending on backend
      console.log("response : ",response,"response.user?.roles : ",response.roles, response.user?.roles);
      const roles = response.roles || response.user?.roles || [];
      const route = getDashboardRoute(roles);

      if (typeof window !== "undefined") {
        localStorage.setItem("username", username);
      }

      if (isStaff(roles)) {
        const todayStr = new Date().toISOString().split("T")[0];
        const lastVerified = localStorage.getItem(`face_verified_date_${username}`);
        if (lastVerified === todayStr) {
          router.push(route);
        } else {
          setUserRoles(roles);
          setPendingRoute(route);
          setShowFaceScan(true);
        }
      } else {
        router.push(route);
      }
    } catch (err: any) {
      setError(
        err.message || "Failed to login. Please verify your credentials.",
      );
      console.warn("Login failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (showFaceScan) {
    return (
      <FaceScan
        username={username}
        roles={userRoles}
        onSuccess={() => {
          router.push(pendingRoute);
        }}
        onCancel={() => {
          setShowFaceScan(false);
          setIsLoading(false);
        }}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
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
        <h1 className="text-3xl font-extrabold text-[#1D496C] mb-2">Sign in</h1>
      </motion.div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Username */}
        <motion.div
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="space-y-1.5"
        >
          <Label
            htmlFor="username"
            className="text-sm font-bold text-[#1D496C]"
          >
            Username
          </Label>
          <div className="relative">
            <User
              className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200 ${
                focused === "username" ? "text-[#FFA600]" : "text-[#94A3B8]"
              }`}
            />
            <Input
              id="username"
              type="text"
              placeholder="Enter your username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onFocus={() => setFocused("username")}
              onBlur={() => setFocused(null)}
              className="pl-10 h-12 rounded-xl border-[#E2E8F0] bg-white text-[#0F172A] placeholder:text-[#CBD5E1] shadow-sm focus:border-[#FFA600] focus:ring-2 focus:ring-[#FFA600]/20 transition-all duration-200"
            />
          </div>
        </motion.div>

        {/* Password */}
        <motion.div
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <Label
              htmlFor="password"
              className="text-sm font-bold text-[#1D496C]"
            >
              Password
            </Label>
            <a
              href="#"
              className="text-xs font-bold text-[#FFA600] hover:text-[#ED6708] transition-colors underline-offset-2 hover:underline"
            >
              Forgot password?
            </a>
          </div>
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
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </motion.span>
              </AnimatePresence>
            </button>
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
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="pt-1"
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
                  Signing in…
                </motion.span>
              ) : (
                <motion.span
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  Sign in
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
        className="mt-6 pt-5 border-t border-[#F1F5F9] flex items-center justify-center gap-6"
      >
        {["256-bit SSL", "GDPR Compliant", "99.9% uptime"].map((badge) => (
          <span
            key={badge}
            className="flex items-center gap-1 text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#6A7626] inline-block" />
            {badge}
          </span>
        ))}
      </motion.div>
    </motion.div>
  );
}

export function LoginForm() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#FFA600]" />
        </div>
      }
    >
      <LoginFormInner />
    </Suspense>
  );
}
