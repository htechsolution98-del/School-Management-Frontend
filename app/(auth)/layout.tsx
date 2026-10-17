"use client";

import { GraduationCap, CheckCircle2, Shield, Users, BarChart2 } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

const features = [
  { icon: Shield, text: "Role-based access for all stakeholders" },
  { icon: Users, text: "50,000+ students managed across 500+ schools" },
  { icon: BarChart2, text: "Real-time analytics & automated reports" },
  { icon: CheckCircle2, text: "99.9% uptime with enterprise-grade security" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Memoize the left branding panel so it only animates on first mount
  // and stays stable during navigation between auth pages.
  const brandingPanel = useMemo(() => (
    <div className="relative hidden lg:flex flex-col justify-center gap-12 overflow-hidden bg-gradient-to-br from-[#142044] via-[#1E2E62] to-[#392BC9] p-12">
      {/* Animated blob background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-[#5436F5]/20 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#5436F5]/25 blur-3xl animate-pulse [animation-delay:1s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-white/5 blur-2xl" />
        {/* Grid dots */}
        <svg className="absolute inset-0 h-full w-full opacity-10" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10"
      >
        <Link href="/" className="flex items-center gap-3 group w-fit">
          <div className="flex h-11 w-auto items-center justify-center rounded-xl bg-white p-1.5 shadow-md border border-white/10 group-hover:scale-105 transition-all duration-300">
            <img src="/logo.png" alt="VidyaSanchalan Logo" className="h-8 w-auto max-w-[140px] object-contain" />
          </div>
          <span className="text-xl font-black tracking-tight text-white">
            Vidya<span className="text-[#A78BFA]">Sanchalan</span>
          </span>
        </Link>
      </motion.div>

      {/* Centre content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="relative z-10 flex flex-col gap-8"
      >
        <div>
          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            Welcome to VidyaSanchalan!
          </h2>
          <p className="text-purple-100/80 text-lg leading-relaxed max-w-sm font-medium">
            Manage your school seamlessly with our cutting-edge unified ERP platform.
          </p>
        </div>

        {/* Feature list */}
        <ul className="space-y-4">
          {features.map((f, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
              className="flex items-center gap-3 font-semibold"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                <f.icon className="h-4 w-4 text-[#A78BFA]" />
              </div>
              <span className="text-sm text-white/90">{f.text}</span>
            </motion.li>
          ))}
        </ul>

        {/* Stats row */}
        <div className="flex gap-8 pt-2 border-t border-white/10">
          {[
            { value: "500+", label: "Schools" },
            { value: "50K+", label: "Students" },
            { value: "4.9★", label: "Rating" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.7 + i * 0.1 }}
            >
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-white/60 uppercase tracking-wider">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  ), []);

  return (
    <div className="grid min-h-svh lg:grid-cols-2 bg-[#F5F7FC]">
      {brandingPanel}

      {/* ── RIGHT: Auth forms ── */}
      <div className="flex flex-col bg-[#F5F7FC]">
        {/* Mobile logo */}
        <div className="flex justify-center p-6 lg:hidden">
          <Link href="/" className="flex items-center gap-2 group font-medium">
            <div className="flex h-10 w-auto items-center justify-center rounded-lg bg-white p-1 shadow-sm border border-slate-100">
              <img src="/logo.png" alt="VidyaSanchalan Logo" className="h-6 w-auto max-w-[100px] object-contain" />
            </div>
            <span className="text-base font-black tracking-tight">
              <span className="text-[#142044]">Vidya</span><span className="text-[#5436F5]">Sanchalan</span>
            </span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-md relative overflow-hidden">
            {/* AnimatePresence for smooth route transitions */}
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <p className="pb-6 text-center text-xs text-[#94A3B8] font-bold">
          © {new Date().getFullYear()} VidyaSanchalan · School Management Platform
        </p>
      </div>
    </div>
  );
}
