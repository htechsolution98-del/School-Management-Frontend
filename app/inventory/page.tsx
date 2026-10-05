"use client";

import React from "react";
import { motion } from "framer-motion";
import { Boxes, Sparkles, Layers, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InventoryPage() {
  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center p-6 text-slate-900 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-xl w-full bg-white border border-slate-200/80 rounded-3xl p-8 md:p-10 shadow-xl shadow-slate-200/50 text-center space-y-6"
      >
        <div className="relative mx-auto w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
          <Boxes className="w-10 h-10" />
          <span className="absolute -top-1.5 -right-1.5 p-1 bg-emerald-500 rounded-full text-white ring-4 ring-white">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700 text-xs font-semibold">
            <Layers className="w-3.5 h-3.5" /> Fresh Slate Ready
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Inventory & Stores Management
          </h1>
          <p className="text-xs md:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            All previous inventory functions have been cleared. We are ready to build your custom Inventory module from scratch step-by-step!
          </p>
        </div>

        <div className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-4 text-left space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Ready for Development</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Bataiye aap sabse pehle Inventory me kya feature banana chahte hain?
          </p>
          <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside">
            <li>Item Master & Categories (e.g. Uniforms, Stationery)</li>
            <li>Stores & Warehouse Stock Balances</li>
            <li>Student Distribution (Kits, Uniforms, Books)</li>
            <li>Vendors, Purchase Orders & Stock Inward</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
}
