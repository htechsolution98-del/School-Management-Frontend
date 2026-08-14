"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { School } from "lucide-react";

export default function ClerkDashboard() {
  const [schoolName, setSchoolName] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSchoolName(localStorage.getItem("school_name"));
    }
  }, []);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md space-y-4"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#4F46E5]/20 bg-[#4F46E5]/10 text-[#4F46E5] shadow-sm">
          <span className="text-2xl font-bold">CL</span>
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Welcome, Clerk!</h2>
        {schoolName && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-50 border border-indigo-200/80 text-indigo-900 font-bold text-base shadow-xs my-1">
            <School className="h-5 w-5 text-indigo-600 shrink-0" />
            <span>{schoolName}</span>
          </div>
        )}
        <p className="text-base leading-relaxed text-gray-500">
          Your dashboard layout is ready. Soon you&apos;ll be able to manage daily administrative tasks, correspondence, and records here.
        </p>
      </motion.div>
    </div>
  );
}
