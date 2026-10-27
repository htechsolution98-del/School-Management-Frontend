"use client";

import React, { useState, useEffect, useMemo, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Printer,
  RotateCcw,
  Sliders,
  CheckCircle2,
  FileCheck,
  Building,
  HelpCircle,
  ChevronDown,
  Sparkles,
  Layers,
  Calendar,
  IndianRupee,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { numberToIndianWords, formatIndianNumber } from "@/lib/number-to-words";

// ─── Bank Templates Definition ──────────────────────────────────────────────────

interface BankCoordinates {
  date: { x: number; y: number; boxSpacing: number };
  payee: { x: number; y: number; maxWidth: number };
  amountWordsLine1: { x: number; y: number; maxWidth: number };
  amountWordsLine2: { x: number; y: number; maxWidth: number };
  amountFigures: { x: number; y: number };
  crossing: { x: number; y: number };
  signatory: { x: number; y: number };
}

interface BankTemplate {
  id: string;
  name: string;
  shortName: string;
  themeColor: string;
  accentColor: string;
  watermark: string;
  ifscCode: string;
  branch: string;
  coords: BankCoordinates;
}

const DEFAULT_BANK_TEMPLATES: Record<string, BankTemplate> = {
  sbi: {
    id: "sbi",
    name: "State Bank of India",
    shortName: "SBI",
    themeColor: "#1a4480",
    accentColor: "#28a745",
    watermark: "STATE BANK OF INDIA",
    ifscCode: "SBIN0001234",
    branch: "MAIN CAMPUS BRANCH",
    coords: {
      date: { x: 147.5, y: 9.6, boxSpacing: 4.8 },
      payee: { x: 26, y: 24.6, maxWidth: 130 },
      amountWordsLine1: { x: 28, y: 34.6, maxWidth: 125 },
      amountWordsLine2: { x: 18, y: 42.6, maxWidth: 135 },
      amountFigures: { x: 152, y: 43 },
      crossing: { x: 3, y: 3.5 },
      signatory: { x: 142, y: 65 },
    },
  },
  hdfc: {
    id: "hdfc",
    name: "HDFC Bank Ltd.",
    shortName: "HDFC",
    themeColor: "#004c8f",
    accentColor: "#ed1c24",
    watermark: "HDFC BANK LIMITED",
    ifscCode: "HDFC0000456",
    branch: "INSTITUTIONAL AREA BRANCH",
    coords: {
      date: { x: 152, y: 10.5, boxSpacing: 5.3 },
      payee: { x: 25, y: 23.5, maxWidth: 130 },
      amountWordsLine1: { x: 27, y: 33.5, maxWidth: 125 },
      amountWordsLine2: { x: 17, y: 41.5, maxWidth: 135 },
      amountFigures: { x: 152, y: 42.5 },
      crossing: { x: 14, y: 7.5 },
      signatory: { x: 142, y: 70 },
    },
  },
  icici: {
    id: "icici",
    name: "ICICI Bank Ltd.",
    shortName: "ICICI",
    themeColor: "#b02a30",
    accentColor: "#f58220",
    watermark: "ICICI BANK LIMITED",
    ifscCode: "ICIC0000789",
    branch: "CIVIC CENTRE BRANCH",
    coords: {
      date: { x: 150, y: 11, boxSpacing: 5.4 },
      payee: { x: 26, y: 24.5, maxWidth: 130 },
      amountWordsLine1: { x: 28, y: 34.5, maxWidth: 125 },
      amountWordsLine2: { x: 18, y: 42.5, maxWidth: 135 },
      amountFigures: { x: 153, y: 43.5 },
      crossing: { x: 15, y: 8 },
      signatory: { x: 142, y: 71 },
    },
  },
  axis: {
    id: "axis",
    name: "Axis Bank Ltd.",
    shortName: "Axis",
    themeColor: "#97144d",
    accentColor: "#f05a7e",
    watermark: "AXIS BANK LIMITED",
    ifscCode: "UTIB0001011",
    branch: "METRO CITY BRANCH",
    coords: {
      date: { x: 147.5, y: 9.8, boxSpacing: 5.0 },
      payee: { x: 26, y: 24, maxWidth: 125 },
      amountWordsLine1: { x: 28, y: 34, maxWidth: 120 },
      amountWordsLine2: { x: 18, y: 42, maxWidth: 130 },
      amountFigures: { x: 151, y: 43 },
      crossing: { x: 25, y: 9 },
      signatory: { x: 140, y: 62 },
    },
  },
  bob: {
    id: "bob",
    name: "Bank of Baroda",
    shortName: "BOB",
    themeColor: "#f26522",
    accentColor: "#004b87",
    watermark: "BANK OF BARODA",
    ifscCode: "BARB0002022",
    branch: "REGIONAL HUB BRANCH",
    coords: {
      date: { x: 150, y: 11, boxSpacing: 5.4 },
      payee: { x: 25, y: 24.5, maxWidth: 130 },
      amountWordsLine1: { x: 27, y: 34.5, maxWidth: 125 },
      amountWordsLine2: { x: 17, y: 42.5, maxWidth: 135 },
      amountFigures: { x: 152, y: 43.5 },
      crossing: { x: 15, y: 8 },
      signatory: { x: 142, y: 71 },
    },
  },
  pnb: {
    id: "pnb",
    name: "Punjab National Bank",
    shortName: "PNB",
    themeColor: "#102e5b",
    accentColor: "#e5a823",
    watermark: "PUNJAB NATIONAL BANK",
    ifscCode: "PUNB0003033",
    branch: "EDUCATION COMPLEX BRANCH",
    coords: {
      date: { x: 150.5, y: 11, boxSpacing: 5.4 },
      payee: { x: 26, y: 24.5, maxWidth: 130 },
      amountWordsLine1: { x: 28, y: 34.5, maxWidth: 125 },
      amountWordsLine2: { x: 18, y: 42.5, maxWidth: 135 },
      amountFigures: { x: 153, y: 43.5 },
      crossing: { x: 15, y: 8 },
      signatory: { x: 142, y: 71 },
    },
  },
  universal: {
    id: "universal",
    name: "Universal CTS-2010 Standard",
    shortName: "Universal CTS",
    themeColor: "#334155",
    accentColor: "#64748b",
    watermark: "CTS-2010 STANDARD CHEQUE",
    ifscCode: "BANK0000000",
    branch: "CLEARING CENTRE",
    coords: {
      date: { x: 151, y: 11, boxSpacing: 5.4 },
      payee: { x: 26, y: 24, maxWidth: 130 },
      amountWordsLine1: { x: 28, y: 34, maxWidth: 125 },
      amountWordsLine2: { x: 18, y: 42, maxWidth: 135 },
      amountFigures: { x: 153, y: 43 },
      crossing: { x: 15, y: 8 },
      signatory: { x: 142, y: 71 },
    },
  },
};

const STORAGE_CALIBRATION_KEY = "trustee_cheque_calibrations_v1";

interface CalibrationOffsets {
  globalX: number; // in mm
  globalY: number; // in mm
  dateOffsetX: number;
  dateOffsetY: number;
  payeeOffsetX: number;
  payeeOffsetY: number;
  wordsOffsetX: number;
  wordsOffsetY: number;
  figuresOffsetX: number;
  figuresOffsetY: number;
}

const DEFAULT_OFFSETS: CalibrationOffsets = {
  globalX: 0,
  globalY: 0,
  dateOffsetX: 0,
  dateOffsetY: 0,
  payeeOffsetX: 0,
  payeeOffsetY: 0,
  wordsOffsetX: 0,
  wordsOffsetY: 0,
  figuresOffsetX: 0,
  figuresOffsetY: 0,
};

// ─── Main Cheque Printing Component ─────────────────────────────────────────────

function ChequePrintingContent() {
  const searchParams = useSearchParams();

  // Form states
  const [selectedBankId, setSelectedBankId] = useState<string>("sbi");
  const [payeeName, setPayeeName] = useState<string>("");
  const [chequeDate, setChequeDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [amountNumeric, setAmountNumeric] = useState<string>("");
  const [amountWords, setAmountWords] = useState<string>("");
  const [isAccountPayee, setIsAccountPayee] = useState<boolean>(true);
  const [prefixAsterisks, setPrefixAsterisks] = useState<boolean>(true);
  const [signatoryText, setSignatoryText] = useState<string>("AUTHORISED SIGNATORY");
  const [institutionName, setInstitutionName] = useState<string>("VIDYA MANDIR TRUST");
  const [chequeNumber, setChequeNumber] = useState<string>("000452");
  const [memo, setMemo] = useState<string>("");

  // Offset & Calibration states
  const [offsets, setOffsets] = useState<CalibrationOffsets>(DEFAULT_OFFSETS);
  const [isAdvancedCalibrating, setIsAdvancedCalibrating] = useState<boolean>(false);
  const [printMode, setPrintMode] = useState<"overlay" | "full">("overlay");
  const [isGridVisible, setIsGridVisible] = useState<boolean>(false);

  // Scaler ref for fixed base canvas aspect ratio (768px x 336px CTS-2010 ratio)
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const [canvasScale, setCanvasScale] = useState<number>(1);

  useEffect(() => {
    const updateScale = () => {
      if (canvasWrapperRef.current) {
        const containerWidth = canvasWrapperRef.current.clientWidth;
        if (containerWidth > 0) {
          setCanvasScale(containerWidth / 768);
        }
      }
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && canvasWrapperRef.current) {
      observer = new ResizeObserver(() => updateScale());
      observer.observe(canvasWrapperRef.current);
    }
    return () => {
      window.removeEventListener("resize", updateScale);
      if (observer) observer.disconnect();
    };
  }, []);

  // Initialize from URL params if present (e.g., coming from Payroll)
  useEffect(() => {
    const paramPayee = searchParams.get("payee");
    const paramAmount = searchParams.get("amount");
    const paramDate = searchParams.get("date");
    const paramMemo = searchParams.get("memo");

    if (paramPayee) setPayeeName(paramPayee);
    if (paramAmount) {
      setAmountNumeric(paramAmount);
      const converted = numberToIndianWords(paramAmount);
      setAmountWords(converted);
    }
    if (paramDate) setChequeDate(paramDate);
    if (paramMemo) setMemo(paramMemo);

    if (paramPayee || paramAmount) {
      toast.info("Prefilled cheque details from salary payout record.");
    }
  }, [searchParams]);

  // Load saved calibration for selected bank
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_CALIBRATION_KEY}_${selectedBankId}`);
      if (saved) {
        setOffsets(JSON.parse(saved));
      } else {
        setOffsets(DEFAULT_OFFSETS);
      }
    } catch {
      setOffsets(DEFAULT_OFFSETS);
    }
  }, [selectedBankId]);

  // Save calibration
  const saveCalibration = () => {
    try {
      localStorage.setItem(
        `${STORAGE_CALIBRATION_KEY}_${selectedBankId}`,
        JSON.stringify(offsets)
      );
      toast.success(`Alignment offsets saved for ${DEFAULT_BANK_TEMPLATES[selectedBankId].name}!`);
    } catch {
      toast.error("Could not save offsets to local storage.");
    }
  };

  const resetOffsets = () => {
    setOffsets(DEFAULT_OFFSETS);
    try {
      localStorage.removeItem(`${STORAGE_CALIBRATION_KEY}_${selectedBankId}`);
    } catch {
      // ignore
    }
    toast.info("Offsets reset to factory defaults.");
  };

  // Auto-convert numeric amount to words on change
  const handleAmountChange = (val: string) => {
    setAmountNumeric(val);
    if (!val || isNaN(parseFloat(val))) {
      setAmountWords("");
      return;
    }
    const words = numberToIndianWords(val);
    setAmountWords(words);
  };

  // Date formatting for CTS-2010 8 boxes (DDMMYYYY)
  const dateBoxes = useMemo(() => {
    if (!chequeDate) return ["D", "D", "M", "M", "Y", "Y", "Y", "Y"];
    const [y, m, d] = chequeDate.split("-");
    if (!y || !m || !d) return ["D", "D", "M", "M", "Y", "Y", "Y", "Y"];
    const dd = d.padStart(2, "0");
    const mm = m.padStart(2, "0");
    const yyyy = y.padStart(4, "0");
    const full = dd + mm + yyyy;
    return full.split("");
  }, [chequeDate]);

  // Formatted date string for direct letter-spaced rendering (e.g., "21102026")
  const formattedDateString = useMemo(() => {
    if (!chequeDate) return "DDMMYYYY";
    const [y, m, d] = chequeDate.split("-");
    if (!y || !m || !d) return "DDMMYYYY";
    return d.padStart(2, "0") + m.padStart(2, "0") + y.padStart(4, "0");
  }, [chequeDate]);

  // Word wrapping for amount in words into 2 lines
  const { line1Words, line2Words } = useMemo(() => {
    if (!amountWords) return { line1Words: "", line2Words: "" };
    const wrappedAsterisks = prefixAsterisks ? `*** ${amountWords} ***` : amountWords;

    // If fits comfortably in line 1
    if (wrappedAsterisks.length <= 60) {
      return { line1Words: wrappedAsterisks, line2Words: "" };
    }

    // Split words smartly
    const words = wrappedAsterisks.split(" ");
    let l1 = "";
    let l2 = "";
    let currentLength = 0;

    for (const w of words) {
      if (currentLength + w.length + 1 <= 55) {
        l1 += (l1 ? " " : "") + w;
        currentLength += w.length + 1;
      } else {
        l2 += (l2 ? " " : "") + w;
      }
    }

    return { line1Words: l1, line2Words: l2 };
  }, [amountWords, prefixAsterisks]);

  // Format formatted figures
  const formattedFigure = useMemo(() => {
    if (!amountNumeric || isNaN(parseFloat(amountNumeric))) return "";
    const formatted = formatIndianNumber(amountNumeric);
    return prefixAsterisks ? `**${formatted}/-` : `${formatted}/-`;
  }, [amountNumeric, prefixAsterisks]);

  const activeBank = DEFAULT_BANK_TEMPLATES[selectedBankId] || DEFAULT_BANK_TEMPLATES.sbi;
  const isAxis = selectedBankId === "axis";
  const isSbi = selectedBankId === "sbi";

  // Print execution
  const handlePrint = () => {
    if (!payeeName.trim()) {
      toast.error("Please enter a Payee Name before printing.");
      return;
    }
    if (!amountNumeric || parseFloat(amountNumeric) <= 0) {
      toast.error("Please enter a valid Amount before printing.");
      return;
    }
    window.print();
  };

  // Populate Demo Data
  const populateDemo = () => {
    setPayeeName("DR. RAJESH KUMAR SHARMA");
    setAmountNumeric("48500");
    setAmountWords(numberToIndianWords("48500"));
    setMemo("Staff Monthly Remuneration - October 2026");
    setIsAccountPayee(true);
    toast.success("Loaded sample cheque data!");
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16 print:bg-transparent print:p-0 print:m-0 print:min-h-0 print:pb-0">
      {/* ─── Top Bar / Header (Hidden in Print) ────────────────────────────────── */}
      <div className="relative bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <Printer size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800">
                  Advanced Cheque Printing
                </h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  CTS-2010 Ready
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Precision cheque printing module with millimeter-accurate printer offset calibration
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={populateDemo}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
              title="Fill demo payee and amount"
            >
              <Sparkles size={14} className="text-amber-500" />
              Demo Data
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 transition shadow-sm shadow-indigo-200 active:scale-95"
            >
              <Printer size={15} />
              Print Cheque (Ctrl+P)
            </button>
          </div>
        </div>
      </div>

      {/* ─── Main Grid Layout ──────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 print:p-0 print:m-0 print:max-w-none">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:block">
          
          {/* ── Left Column: Form & Inputs (5 Cols, Hidden in Print) ── */}
          <div className="lg:col-span-5 space-y-5 print:hidden">
            {/* 1. Bank Template Selector */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Building size={14} className="text-indigo-600" />
                  Bank Template
                </label>
                <span className="text-[11px] text-slate-400">
                  Pre-calibrated CTS layout
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.values(DEFAULT_BANK_TEMPLATES).map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBankId(b.id)}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-semibold flex flex-col items-start gap-1 transition ${
                      selectedBankId === b.id
                        ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-xs"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <span className="truncate w-full font-bold">{b.shortName}</span>
                    <span className="text-[10px] text-slate-400 truncate w-full">
                      {b.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Cheque Information Form */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck size={14} className="text-emerald-600" />
                Cheque Details
              </h2>

              {/* Payee Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center justify-between">
                  <span>Payee Name *</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    Printed as: &quot;PAY: *** NAME ***&quot;
                  </span>
                </label>
                <div className="relative">
                  <User
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={payeeName}
                    onChange={(e) => setPayeeName(e.target.value.toUpperCase())}
                    placeholder="E.G. JOHN DOE"
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/30 uppercase"
                  />
                </div>
              </div>

              {/* Date and Amount Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Cheque Date *
                  </label>
                  <div className="relative">
                    <Calendar
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="date"
                      value={chequeDate}
                      onChange={(e) => setChequeDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-indigo-500 bg-slate-50/30"
                    />
                  </div>
                </div>

                {/* Amount Numeric */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Amount (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={amountNumeric}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      placeholder="25000"
                      className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-indigo-500 bg-slate-50/30"
                    />
                  </div>
                </div>
              </div>

              {/* Amount in Words (Auto-calculated, editable) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-600">
                    Amount in Words (Auto-Converted)
                  </label>
                  {amountNumeric && (
                    <button
                      type="button"
                      onClick={() => setAmountWords(numberToIndianWords(amountNumeric))}
                      className="text-[11px] text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                    >
                      <RotateCcw size={11} /> Reset Words
                    </button>
                  )}
                </div>
                <textarea
                  rows={2}
                  value={amountWords}
                  onChange={(e) => setAmountWords(e.target.value)}
                  placeholder="Words will auto-generate here…"
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-indigo-500 bg-slate-50/30 resize-none"
                />
              </div>

              {/* Cheque Options Toggles */}
              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                {/* A/C Payee Only checkbox */}
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAccountPayee}
                    onChange={(e) => setIsAccountPayee(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-700">
                      Cross Cheque (&quot;A/C PAYEE ONLY&quot;)
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Prints security crossing lines in top-left corner
                    </p>
                  </div>
                </label>

                {/* Asterisks Checkbox */}
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefixAsterisks}
                    onChange={(e) => setPrefixAsterisks(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-700">
                      Fraud Prevention Stars (*** Name / Amount ***)
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Wraps values in asterisks to prevent tamper
                    </p>
                  </div>
                </label>
              </div>

              {/* Institution / Signatory Customization */}
              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Signatory Heading
                  </label>
                  <input
                    type="text"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value.toUpperCase())}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Signatory Label
                  </label>
                  <input
                    type="text"
                    value={signatoryText}
                    onChange={(e) => setSignatoryText(e.target.value.toUpperCase())}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 uppercase"
                  />
                </div>
              </div>
            </div>

            {/* 3. Printer Mode & Global Offsets Quick Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders size={14} className="text-indigo-600" />
                  Printer Feed Alignment
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAdvancedCalibrating(!isAdvancedCalibrating)}
                  className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                >
                  {isAdvancedCalibrating ? "Hide Fine-Tune" : "Fine-Tune Offsets"}
                  <ChevronDown
                    size={13}
                    className={`transform transition-transform ${
                      isAdvancedCalibrating ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>

              {/* Print Mode Selector */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-600">Print Mode:</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setPrintMode("overlay")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      printMode === "overlay"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-200"
                    }`}
                  >
                    Overlay Only (Real Cheque)
                  </button>
                  <button
                    onClick={() => setPrintMode("full")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      printMode === "full"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-200"
                    }`}
                  >
                    Full Cheque (Paper Test)
                  </button>
                </div>
              </div>

              {/* Global Margins Sliders */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-semibold text-slate-600">Global X-Offset:</span>
                    <span className="font-mono font-bold text-indigo-600">
                      {offsets.globalX > 0 ? `+${offsets.globalX}` : offsets.globalX} mm
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-25"
                    max="25"
                    step="0.5"
                    value={offsets.globalX}
                    onChange={(e) =>
                      setOffsets({ ...offsets, globalX: parseFloat(e.target.value) })
                    }
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>← Left (-25mm)</span>
                    <span>Right (+25mm) →</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-semibold text-slate-600">Global Y-Offset:</span>
                    <span className="font-mono font-bold text-indigo-600">
                      {offsets.globalY > 0 ? `+${offsets.globalY}` : offsets.globalY} mm
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-25"
                    max="25"
                    step="0.5"
                    value={offsets.globalY}
                    onChange={(e) =>
                      setOffsets({ ...offsets, globalY: parseFloat(e.target.value) })
                    }
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>↑ Top (-25mm)</span>
                    <span>Bottom (+25mm) ↓</span>
                  </div>
                </div>
              </div>

              {/* Fine-Tuning Drawer */}
              {isAdvancedCalibrating && (
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3 pt-3 animate-in fade-in duration-200">
                  <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                    Individual Element Millimeter Adjustments
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[11px] text-slate-500">Date Box X/Y (mm)</label>
                      <div className="flex gap-1 mt-1">
                        <input
                          type="number"
                          step="0.5"
                          value={offsets.dateOffsetX}
                          onChange={(e) =>
                            setOffsets({ ...offsets, dateOffsetX: parseFloat(e.target.value) || 0 })
                          }
                          className="w-1/2 p-1.5 border border-slate-200 rounded text-center text-xs font-mono"
                          placeholder="X"
                        />
                        <input
                          type="number"
                          step="0.5"
                          value={offsets.dateOffsetY}
                          onChange={(e) =>
                            setOffsets({ ...offsets, dateOffsetY: parseFloat(e.target.value) || 0 })
                          }
                          className="w-1/2 p-1.5 border border-slate-200 rounded text-center text-xs font-mono"
                          placeholder="Y"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-500">Payee Line X/Y (mm)</label>
                      <div className="flex gap-1 mt-1">
                        <input
                          type="number"
                          step="0.5"
                          value={offsets.payeeOffsetX}
                          onChange={(e) =>
                            setOffsets({ ...offsets, payeeOffsetX: parseFloat(e.target.value) || 0 })
                          }
                          className="w-1/2 p-1.5 border border-slate-200 rounded text-center text-xs font-mono"
                          placeholder="X"
                        />
                        <input
                          type="number"
                          step="0.5"
                          value={offsets.payeeOffsetY}
                          onChange={(e) =>
                            setOffsets({ ...offsets, payeeOffsetY: parseFloat(e.target.value) || 0 })
                          }
                          className="w-1/2 p-1.5 border border-slate-200 rounded text-center text-xs font-mono"
                          placeholder="Y"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-500">Words Line X/Y (mm)</label>
                      <div className="flex gap-1 mt-1">
                        <input
                          type="number"
                          step="0.5"
                          value={offsets.wordsOffsetX}
                          onChange={(e) =>
                            setOffsets({ ...offsets, wordsOffsetX: parseFloat(e.target.value) || 0 })
                          }
                          className="w-1/2 p-1.5 border border-slate-200 rounded text-center text-xs font-mono"
                          placeholder="X"
                        />
                        <input
                          type="number"
                          step="0.5"
                          value={offsets.wordsOffsetY}
                          onChange={(e) =>
                            setOffsets({ ...offsets, wordsOffsetY: parseFloat(e.target.value) || 0 })
                          }
                          className="w-1/2 p-1.5 border border-slate-200 rounded text-center text-xs font-mono"
                          placeholder="Y"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-500">Figures Box X/Y (mm)</label>
                      <div className="flex gap-1 mt-1">
                        <input
                          type="number"
                          step="0.5"
                          value={offsets.figuresOffsetX}
                          onChange={(e) =>
                            setOffsets({ ...offsets, figuresOffsetX: parseFloat(e.target.value) || 0 })
                          }
                          className="w-1/2 p-1.5 border border-slate-200 rounded text-center text-xs font-mono"
                          placeholder="X"
                        />
                        <input
                          type="number"
                          step="0.5"
                          value={offsets.figuresOffsetY}
                          onChange={(e) =>
                            setOffsets({ ...offsets, figuresOffsetY: parseFloat(e.target.value) || 0 })
                          }
                          className="w-1/2 p-1.5 border border-slate-200 rounded text-center text-xs font-mono"
                          placeholder="Y"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Save & Reset buttons */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={resetOffsets}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 transition"
                >
                  <RotateCcw size={12} /> Reset to Defaults
                </button>
                <button
                  type="button"
                  onClick={saveCalibration}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                >
                  <CheckCircle2 size={13} /> Save Calibration
                </button>
              </div>
            </div>
          </div>

          {/* ── Right Column: Live Cheque Preview Stage (7 Cols) ── */}
          <div className="lg:col-span-7 space-y-4 lg:sticky lg:top-4 lg:self-start print:static print:p-0 print:m-0 print:w-auto">
            {/* Preview Toolbar (Hidden in Print) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Live Cheque Canvas
                </span>
                <span className="text-xs text-slate-400">· Standard 202mm × 92mm Ratio</span>
              </div>

              {/* View options */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsGridVisible(!isGridVisible)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition ${
                    isGridVisible
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs ring-2 ring-indigo-200"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                  title="Toggle millimeter alignment grid overlay"
                >
                  <Layers size={13} className={isGridVisible ? "text-indigo-600" : "text-slate-500"} />
                  Grid: {isGridVisible ? "ON" : "OFF"}
                </button>
              </div>
            </div>

            {/* Cheque Preview Container Card */}
            <div className="bg-slate-100/70 dark:bg-slate-800/50 rounded-2xl p-3 sm:p-5 flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-xs print:p-0 print:m-0 print:bg-transparent print:border-none print:shadow-none print:block">
              
              {/* Force strictly standard Indian cheque aspect ratio: aspect-[202/92] */}
              <div
                ref={canvasWrapperRef}
                className="cheque-canvas-wrapper cheque-canvas-container w-full max-w-[768px] aspect-[202/92] relative mx-auto flex items-center justify-center overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700 bg-white shadow-md print:absolute print:top-0 print:left-0 print:w-[202mm] print:h-[92mm] print:block print:m-0 print:p-0 print:border-none print:shadow-none print:rounded-none"
              >
                {/* Scaler that locks base coordinates to 768px x 350px (202x92mm ratio) to prevent responsive drift */}
                <div
                  className="cheque-scaler shrink-0 print:w-[202mm] print:h-[92mm] print:transform-none"
                  style={{
                    transform: `scale(${canvasScale})`,
                    transformOrigin: "center center",
                    width: "768px",
                    height: "350px",
                  }}
                >
                  {/* ─── Cheque Physical Stage Element (Base Size: 768px x 350px) ─── */}
                  <div
                    id="cheque-print-stage"
                    className={`w-[768px] h-[350px] relative select-none overflow-hidden print:w-[202mm] print:h-[92mm] print:border-none print:shadow-none print:rounded-none ${
                      printMode === "full" ? "cheque-full-mode" : "cheque-overlay-mode"
                    }`}
                    style={{
                      aspectRatio: "202 / 92",
                      backgroundColor: "#f7fafc",
                      fontFamily: "Arial, sans-serif",
                      color: "#000",
                    }}
                  >
                    {/* Bank Cheque Template Image - w-full h-full object-fill */}
                    <img
                      src={`/templates/cheques/${activeBank.id}.png`}
                      alt={`${activeBank.name} Cheque Template`}
                      className="cheque-graphic-element absolute inset-0 w-full h-full object-fill pointer-events-none"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                      }}
                    />

                    {/* Fallback Vector Background Pattern */}
                    <div
                      className="cheque-graphic-element absolute inset-0 w-full h-full pointer-events-none"
                      style={{
                        backgroundImage:
                          "radial-gradient(#e2e8f0 0.75px, transparent 0.75px), radial-gradient(#e2e8f0 0.75px, #f8fafc 0.75px)",
                        backgroundSize: "16px 16px",
                        backgroundPosition: "0 0, 8px 8px",
                      }}
                    />

                    {/* Visual Calibration Grid Overlay */}
                    {isGridVisible && (
                      <div
                        className="no-print absolute inset-0 pointer-events-none z-30"
                        style={{
                          backgroundImage: `
                            linear-gradient(to right, rgba(99, 102, 241, 0.28) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(99, 102, 241, 0.28) 1px, transparent 1px),
                            linear-gradient(to right, rgba(239, 68, 68, 0.45) 1.5px, transparent 1.5px),
                            linear-gradient(to bottom, rgba(239, 68, 68, 0.45) 1.5px, transparent 1.5px)
                          `,
                          backgroundSize: "5% 10%, 5% 10%, 25% 50%, 25% 50%",
                          backgroundColor: "rgba(99, 102, 241, 0.04)",
                        }}
                      >
                        <div className="absolute top-1.5 left-2 bg-indigo-900/90 text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded shadow-sm flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Alignment Grid Active
                        </div>
                      </div>
                    )}

                    {/* ── Bank Header & CTS-2010 Markings (Positioned to clear top-4 left-4 A/C Payee) ── */}
                    <div
                      className="cheque-graphic-element absolute flex items-center gap-2.5"
                      style={{
                        left: "92px",
                        top: "20px",
                      }}
                    >
                      <div
                        className="w-3 h-6 rounded-xs flex items-center justify-center shrink-0"
                        style={{ backgroundColor: activeBank.themeColor }}
                      />
                      <div>
                        <h4
                          className="text-[12px] font-black tracking-tight"
                          style={{ color: activeBank.themeColor }}
                        >
                          {activeBank.name}
                        </h4>
                        <p className="text-[8px] text-slate-500 tracking-wider">
                          {activeBank.branch} · IFSC: {activeBank.ifscCode}
                        </p>
                      </div>
                    </div>

                    {/* Watermark in centre (Hidden in Overlay Print) */}
                    <div
                      className="cheque-graphic-element absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 font-black text-2xl tracking-widest uppercase"
                      style={{ color: activeBank.themeColor }}
                    >
                      {activeBank.watermark}
                    </div>

                    {/* ── 1. Crossing: A/C PAYEE ONLY (Vector SVG: completely within bounds, no clipping, clears logo) ── */}
                    {isAccountPayee && (
                      <div
                        className="absolute top-0 left-0 z-20 pointer-events-none select-none"
                        style={{
                          transform: `translate(${offsets.globalX * 3.8}px, ${offsets.globalY * 3.8}px)`,
                        }}
                      >
                        <svg
                          width="96"
                          height="96"
                          viewBox="0 0 96 96"
                          className="overflow-visible"
                        >
                          {/* Inner diagonal line (cuts cleanly across the corner, safely inside borders) */}
                          <line
                            x1="8"
                            y1="64"
                            x2="64"
                            y2="8"
                            stroke="#000000"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                          {/* A/C PAYEE ONLY text: exactly centered between both lines at (43, 43), rotated -45° */}
                          <text
                            x="43"
                            y="43"
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill="#000000"
                            fontSize="7.2"
                            fontWeight="900"
                            fontFamily="Arial, sans-serif"
                            letterSpacing="1.2"
                            transform="rotate(-45 43 43)"
                          >
                            A/C PAYEE ONLY
                          </text>
                          {/* Outer diagonal line (longer parallel line enclosing text, clears bank logo by 10px) */}
                          <line
                            x1="16"
                            y1="84"
                            x2="84"
                            y2="16"
                            stroke="#000000"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                    )}

                    {/* ── 2. Cheque Date (CTS-2010 8-Box Date Alignment - Standard 202x92mm) ── */}
                    {/* Underlay Box Grids (Header labels D D M M placed ABOVE empty boxes to prevent overlap) */}
                    <div
                      className="cheque-graphic-element absolute z-0 flex flex-col items-end pointer-events-none"
                      style={{
                        top: "26px",
                        right: "42px",
                      }}
                    >
                      {/* D D M M Y Y Y Y guide label row ABOVE the boxes */}
                      <div className="flex items-center gap-[2px] mb-1">
                        <span className="text-[7.5px] font-bold text-slate-500 mr-2 select-none tracking-wider">
                          DATE
                        </span>
                        {["D", "D", "M", "M", "Y", "Y", "Y", "Y"].map((placeholder, idx) => (
                          <div
                            key={idx}
                            className="w-[15px] flex items-center justify-center text-[7.5px] text-slate-400 font-mono font-bold select-none"
                          >
                            {placeholder}
                          </div>
                        ))}
                      </div>
                      {/* 8 Empty Boxes Row */}
                      <div className="flex items-center gap-[2px]">
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((idx) => (
                          <div
                            key={idx}
                            className="w-[15px] h-[22px] border border-slate-400 bg-white/90 rounded-[1px]"
                          />
                        ))}
                      </div>
                    </div>

                    {/* Actual Printed Date Digits - Rendered directly inside empty boxes with precise gap (no overlap with D D M M) */}
                    <div
                      className="absolute z-10 flex items-center gap-[2px]"
                      style={{
                        top: `calc(42px + ${(offsets.globalY + offsets.dateOffsetY) * 3.8}px)`,
                        right: `calc(42px - ${(offsets.globalX + offsets.dateOffsetX) * 3.8}px)`,
                      }}
                    >
                      {dateBoxes.map((char, idx) => (
                        <div
                          key={idx}
                          className="w-[15px] h-[22px] flex items-center justify-center"
                        >
                          <span className="font-mono font-bold text-[13.5px] print:text-[13.5px] text-slate-950">
                            {char}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* ── 3. Payee Line ── */}
                    {/* Graphic label */}
                    <div
                      className="cheque-graphic-element absolute z-0 text-[10px] font-black text-slate-700"
                      style={{
                        left: "58px",
                        top: "96px",
                      }}
                    >
                      PAY
                    </div>
                    {/* Dotted guideline */}
                    <div
                      className="cheque-graphic-element absolute z-0 border-b border-dotted border-slate-400"
                      style={{
                        left: "98px",
                        top: "114px",
                        width: "480px",
                      }}
                    />
                    {/* Bearer box */}
                    <div
                      className="cheque-graphic-element absolute z-0 text-[8px] font-bold text-slate-500"
                      style={{
                        right: "42px",
                        top: "96px",
                      }}
                    >
                      OR BEARER
                    </div>

                    {/* Actual Printed Payee */}
                    <div
                      className="absolute z-10"
                      style={{
                        top: `calc(96px + ${(offsets.globalY + offsets.payeeOffsetY) * 3.78}px)`,
                        left: `calc(98px + ${(offsets.globalX + offsets.payeeOffsetX) * 3.78}px)`,
                        maxWidth: "475px",
                      }}
                    >
                      <span className="font-bold text-[13px] print:text-[13px] tracking-wide text-slate-950 uppercase block truncate">
                        {payeeName
                          ? prefixAsterisks
                            ? `*** ${payeeName} ***`
                            : payeeName
                          : ""}
                      </span>
                    </div>

                    {/* ── 4. Amount in Words ── */}
                    {/* Graphic label */}
                    <div
                      className="cheque-graphic-element absolute z-0 text-[10px] font-black text-slate-700"
                      style={{
                        left: "58px",
                        top: "134px",
                      }}
                    >
                      RUPEES
                    </div>
                    {/* Dotted guidelines */}
                    <div
                      className="cheque-graphic-element absolute z-0 border-b border-dotted border-slate-400"
                      style={{
                        left: "118px",
                        top: "152px",
                        width: "460px",
                      }}
                    />
                    <div
                      className="cheque-graphic-element absolute z-0 border-b border-dotted border-slate-400"
                      style={{
                        left: "58px",
                        top: "186px",
                        width: "520px",
                      }}
                    />

                    {/* Actual Printed Words - Line 1 */}
                    <div
                      className="absolute z-10"
                      style={{
                        top: `calc(134px + ${(offsets.globalY + offsets.wordsOffsetY) * 3.78}px)`,
                        left: `calc(118px + ${(offsets.globalX + offsets.wordsOffsetX) * 3.78}px)`,
                        maxWidth: "460px",
                      }}
                    >
                      <span className="font-bold text-[12px] print:text-[12px] leading-tight text-slate-950 block">
                        {line1Words}
                      </span>
                    </div>

                    {/* Actual Printed Words - Line 2 */}
                    {line2Words && (
                      <div
                        className="absolute z-10"
                        style={{
                          top: `calc(168px + ${(offsets.globalY + offsets.wordsOffsetY) * 3.78}px)`,
                          left: `calc(58px + ${(offsets.globalX + offsets.wordsOffsetX) * 3.78}px)`,
                          maxWidth: "520px",
                        }}
                      >
                        <span className="font-bold text-[12px] print:text-[12px] leading-tight text-slate-950 block">
                          {line2Words}
                        </span>
                      </div>
                    )}

                    {/* ── 5. Amount in Figures Box ── */}
                    {/* Graphic Box */}
                    <div
                      className="cheque-graphic-element absolute z-0 border-[1.8px] border-slate-600 bg-white/90 flex items-center px-2.5 rounded-[2px]"
                      style={{
                        top: "152px",
                        right: "42px",
                        width: "150px",
                        height: "40px",
                      }}
                    >
                      <span className="font-black text-sm print:text-sm text-slate-700 mr-1.5">
                        ₹
                      </span>
                    </div>

                    {/* Actual Printed Figures */}
                    <div
                      className="absolute z-10 flex items-center justify-end"
                      style={{
                        top: `calc(157px + ${(offsets.globalY + offsets.figuresOffsetY) * 3.78}px)`,
                        right: `calc(50px - ${(offsets.globalX + offsets.figuresOffsetX) * 3.78}px)`,
                        width: "135px",
                      }}
                    >
                      <span className="font-mono font-black text-[15px] print:text-[15px] tracking-wide text-slate-950">
                        {formattedFigure}
                      </span>
                    </div>

                    {/* ── 6. Signatory / Footer ── */}
                    <div
                      className="cheque-graphic-element absolute z-10 text-right"
                      style={{
                        right: "42px",
                        bottom: "58px",
                        width: "200px",
                      }}
                    >
                      <p className="text-[8px] print:text-[8px] font-bold text-slate-700 uppercase truncate">
                        For {institutionName}
                      </p>
                      <div className="h-6" /> {/* Blank space for ink signature */}
                      <p className="text-[7.5px] print:text-[7.5px] font-bold text-slate-500 uppercase">
                        {signatoryText}
                      </p>
                    </div>

                    {/* ── 7. MICR Code Band at Bottom (19mm CTS Band) ── */}
                    <div
                      className="cheque-graphic-element absolute bottom-0 inset-x-0 bg-white/85 border-t border-slate-300 flex items-center justify-center gap-8 font-mono text-[11px] print:text-[11px] tracking-widest text-slate-800"
                      style={{ height: "45px" }}
                    >
                      <span>⑈ {chequeNumber} ⑈</span>
                      <span>380002015 ⑈</span>
                      <span>000123 ⑈</span>
                      <span>10</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Measurement & Printing Guide Card (Hidden in Print) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3 print:hidden">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <HelpCircle size={14} className="text-indigo-600" />
                How to Calibrate for Your Printer
              </h4>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                <li>
                  <strong>Step 1 (First Test):</strong> Set Print Mode to{" "}
                  <span className="font-semibold text-indigo-600">
                    &quot;Full Cheque (Paper Test)&quot;
                  </span>{" "}
                  and print on standard plain A4 paper.
                </li>
                <li>
                  <strong>Step 2 (Compare):</strong> Place your real bank cheque on top of
                  the printed paper against a backlight/window to inspect alignment.
                </li>
                <li>
                  <strong>Step 3 (Adjust Offsets):</strong> Use the{" "}
                  <span className="font-semibold text-indigo-600">
                    Global X & Y Sliders
                  </span>{" "}
                  above to shift the print by the exact millimeters needed.
                </li>
                <li>
                  <strong>Step 4 (Final Print):</strong> Switch mode to{" "}
                  <span className="font-semibold text-emerald-600">
                    &quot;Overlay Only&quot;
                  </span>
                  , insert the real cheque into your printer feed tray, and click{" "}
                  <strong>Print Cheque</strong>!
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Global Print Styles ────────────────────────────────────────────── */}
      <style jsx global>{`
        @page {
          size: landscape;
          margin: 0;
        }

        @media print {
          html,
          body {
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            overflow: visible !important;
          }

          /* In overlay mode, completely hide background graphics, borders, and watermarks */
          .cheque-overlay-mode {
            background-color: transparent !important;
            background-image: none !important;
            border: none !important;
          }

          .cheque-overlay-mode .cheque-graphic-element {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function TrusteeChequePrintingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-slate-600">
              Loading Cheque Printing Module…
            </p>
          </div>
        </div>
      }
    >
      <ChequePrintingContent />
    </Suspense>
  );
}
