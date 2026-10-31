"use client";

import { StudentEmptyState } from "@/components/student/student-empty-state";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Search,
  BookMarked,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Loader2,
  Calendar,
  RotateCcw,
  BookmarkPlus,
  MapPin,
  Check,
  X,
  ShieldCheck,
  AlertTriangle,
  Printer,
  FileCheck,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MobileSelectDrawer, MobileSelectTrigger } from "@/components/ui/mobile-select-drawer";
import {
  Book,
  BookIssued,
  BookReservation,
  LibrarySetting,
  getPublicBooks,
  getStudentMyBooks,
  getReservations,
  getLibrarySettings,
  createReservation,
  cancelReservation,
  studentRenewLoan,
} from "@/lib/library";

export default function StudentLibraryPage() {
  const [activeTab, setActiveTab] = useState<"catalog" | "my_books" | "reservations">("catalog");
  const [books, setBooks] = useState<Book[]>([]);
  const [myLoans, setMyLoans] = useState<BookIssued[]>([]);
  const [myReservations, setMyReservations] = useState<BookReservation[]>([]);
  const [settings, setSettings] = useState<LibrarySetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [availabilityFilter, setAvailabilityFilter] = useState<"ALL" | "AVAILABLE">("ALL");
  const [mobileFilterDrawer, setMobileFilterDrawer] = useState<"category" | "availability" | null>(null);
  const [catalogPage, setCatalogPage] = useState(1);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [booksData, myLoansData, myResData, settingsData] = await Promise.all([
        getPublicBooks().catch(() => []),
        getStudentMyBooks().catch(() => []),
        getReservations().catch(() => []),
        getLibrarySettings().catch(() => null),
      ]);
      setBooks(booksData);
      setMyLoans(myLoansData);
      setMyReservations(myResData);
      setSettings(settingsData);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    books.forEach((b) => {
      if (b.category) set.add(b.category);
    });
    return ["ALL", ...Array.from(set)];
  }, [books]);

  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      const matchesSearch =
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.category && b.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.isbn && b.isbn.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.rack_code && b.rack_code.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCat = categoryFilter === "ALL" || b.category === categoryFilter;
      const matchesAvail = availabilityFilter === "ALL" || b.available_copies > 0;
      return matchesSearch && matchesCat && matchesAvail;
    });
  }, [books, searchQuery, categoryFilter, availabilityFilter]);
  const catalogPageSize = 6;
  const catalogPageCount = Math.max(1, Math.ceil(filteredBooks.length / catalogPageSize));
  const pagedBooks = useMemo(() => filteredBooks.slice((catalogPage - 1) * catalogPageSize, catalogPage * catalogPageSize), [filteredBooks, catalogPage]);

  useEffect(() => setCatalogPage(1), [searchQuery, categoryFilter, availabilityFilter]);

  const currentlyIssued = useMemo(() => {
    return myLoans.filter((l) => l.status === "ISSUED");
  }, [myLoans]);

  const pastLoans = useMemo(() => {
    return myLoans.filter((l) => l.status !== "ISSUED");
  }, [myLoans]);

  const overdueLoans = useMemo(() => {
    const now = new Date();
    return currentlyIssued.filter((l) => new Date(l.due_date) < now);
  }, [currentlyIssued]);

  // Total pending fines across all loans (both active and past)
  const totalPendingFine = useMemo(() => {
    return myLoans.reduce((sum, loan) => {
      const assessedFine = Number(loan.total_fine || 0);
      const paidFine = Number(loan.fine_paid_amount || 0);
      const remaining = Math.max(0, assessedFine - paidFine);
      return sum + remaining;
    }, 0);
  }, [myLoans]);

  const isClearanceEligible = currentlyIssued.length === 0 && totalPendingFine === 0;

  // Student details derived from loans if available
  const studentInfo = useMemo(() => {
    const sample = myLoans[0];
    return {
      name: sample?.student_name || "Enrolled Student",
      grNo: sample?.student_gr_no || "N/A",
      rollNo: sample?.student_roll_no || "N/A",
      classDiv: [sample?.student_class, sample?.student_division].filter(Boolean).join(" - ") || "Current Session",
    };
  }, [myLoans]);

  // Handle student renewal
  const handleRenewLoan = async (loanId: number) => {
    setActionLoading(true);
    try {
      const updated = await studentRenewLoan(loanId);
      showToast("success", `Loan renewed! New Due Date: ${new Date(updated.due_date).toLocaleDateString()}`);
      await loadData();
    } catch (err: any) {
      showToast("error", err.message || "Failed to renew book.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle reserve out-of-stock book
  const handleReserveBook = async (bookId: number) => {
    setActionLoading(true);
    try {
      const res = await createReservation(bookId);
      showToast("success", `Book reserved successfully! You are #${res.queue_number} in the waiting queue.`);
      await loadData();
    } catch (err: any) {
      showToast("error", err.message || "Failed to reserve book.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle cancel reservation
  const handleCancelRes = async (resId: number) => {
    try {
      await cancelReservation(resId);
      showToast("success", "Reservation cancelled.");
      await loadData();
    } catch (err: any) {
      showToast("error", err.message || "Failed to cancel reservation.");
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-2 sm:pb-8 w-full min-w-0 overflow-x-hidden">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-white font-medium ${
              notification.type === "success" ? "bg-emerald-600 shadow-emerald-500/20" : "bg-rose-600 shadow-rose-500/20"
            }`}
          >
            {notification.type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            <span>{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <section className="relative isolate min-h-[260px] overflow-hidden rounded-[1.5rem] border border-blue-100/80 bg-gradient-to-br from-white via-blue-50 to-sky-100 shadow-[0_18px_45px_-30px_rgba(37,99,235,.5)] sm:min-h-[300px] sm:rounded-[2rem] xl:min-h-[320px]">
        <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_75%_15%,rgba(96,165,250,.4),transparent_45%),linear-gradient(110deg,transparent_36%,rgba(59,130,246,.16)_68%,rgba(37,99,235,.62))]" />
        <div className="pointer-events-none absolute -right-20 top-[-35%] z-0 h-[420px] w-[420px] rounded-full border border-white/60 bg-white/15" />
        <div className="relative z-10 max-w-[68%] px-4 py-5 sm:max-w-[62%] sm:px-8 sm:py-8 xl:max-w-[57%] xl:px-9 xl:py-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-100/90 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wide text-blue-700 sm:text-[11px]">
            <Sparkles className="h-3.5 w-3.5" /> School Library Catalogue & Self-Service
          </div>
          <h1 className="mt-3 text-[1.6rem] font-black leading-[1.05] tracking-tight text-slate-950 sm:text-4xl xl:text-[2.7rem]">
            Student <span className="bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 bg-clip-text text-transparent">Library & Loans</span>
          </h1>
          <p className="mt-3 max-w-xl text-[11px] leading-relaxed text-slate-600 sm:text-sm xl:text-base">
            Explore textbooks, check shelf locations, track your borrowed loans, and reserve out-of-stock books.
          </p>
          <div className="mt-4 flex w-max max-w-full flex-row items-center gap-2 sm:flex-wrap sm:gap-2.5 xl:mt-6">
            {isClearanceEligible && <Button onClick={() => setShowCertificateModal(true)} className="h-9 shrink-0 justify-center whitespace-nowrap rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-2.5 text-[9px] font-bold text-white shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-sky-600 sm:h-10 sm:px-5 sm:text-xs"><Printer className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />Clearance Certificate</Button>}
            <Button type="button" variant="outline" onClick={loadData} disabled={loading} aria-label="Refresh library" title="Refresh library" className="h-9 w-9 shrink-0 rounded-xl border-blue-200 bg-white/75 p-0 text-blue-700 hover:bg-white sm:h-10 sm:w-10"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
          </div>
        </div>

        <img src="/images/Books-with-calendar.png" alt="Books and study calendar illustration" className="pointer-events-none absolute right-[-34px] top-[54px] z-0 w-[190px] object-contain drop-shadow-xl sm:right-[14%] sm:top-5 sm:w-[330px] xl:right-[18%] xl:top-0 xl:w-[400px]" />

        <div className="absolute right-5 top-1/2 z-10 hidden w-[208px] -translate-y-1/2 space-y-3 rounded-2xl border border-white/80 bg-white/65 p-4 shadow-lg shadow-blue-900/10 backdrop-blur-lg xl:block">
          {[[BookOpen, "Thousands of Books", "text-blue-600 bg-blue-100"], [Search, "Easy Search", "text-sky-600 bg-sky-100"], [BookMarked, "Track Your Loans", "text-emerald-600 bg-emerald-100"], [BookmarkPlus, "Reserve Books", "text-cyan-600 bg-cyan-100"]].map(([Icon, label, color]: any) => <div key={label} className="flex items-center gap-2.5 text-xs font-medium text-slate-700"><span className={`flex h-8 w-8 items-center justify-center rounded-full ${color}`}><Icon className="h-4 w-4" /></span>{label}</div>)}
        </div>
      </section>

      {/* SECTION 22: STUDENT LIBRARY CLEARANCE BANNER */}
      <div
        className={`rounded-2xl p-3.5 sm:p-4 border transition-all ${
          isClearanceEligible
            ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 shadow-sm"
            : "bg-gradient-to-r from-amber-50 to-rose-50 border-amber-200 shadow-sm"
        }`}
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`p-2.5 rounded-xl ${
                isClearanceEligible ? "bg-emerald-600 text-white shadow-emerald-500/20 shadow-md" : "bg-amber-600 text-white shadow-amber-500/20 shadow-md"
              }`}
            >
              {isClearanceEligible ? <ShieldCheck className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="font-bold text-gray-900 text-sm sm:text-base">
                  Library Clearance Status:
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    isClearanceEligible
                      ? "bg-emerald-200 text-emerald-900"
                      : "bg-rose-200 text-rose-900"
                  }`}
                >
                  {isClearanceEligible ? "No Dues / Approved" : "Action Required / Dues Pending"}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-gray-600 sm:text-xs">
                {isClearanceEligible
                  ? "All borrowed books have been returned and no outstanding fines remain. Your official library no-dues certificate is approved."
                  : "You have pending library obligations. All physical books must be returned and any fines settled at the circulation desk before Transfer Certificate (TC) or term clearance is granted."}
              </p>
            </div>
          </div>

          <div className="grid w-full lg:w-auto grid-cols-3 gap-2 rounded-2xl border border-white/80 bg-white/65 p-2 text-[10px] shadow-sm backdrop-blur sm:text-xs">
            <div className="flex min-w-0 items-center gap-1.5 rounded-xl bg-white/85 px-1.5 py-2 sm:gap-2 sm:px-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600"><BookOpen className="h-4 w-4" /></span><div className="min-w-0">
              <div className="truncate text-gray-500 font-medium">Active Books Held</div>
              <div className={`mt-1 font-bold text-xs sm:text-sm ${currentlyIssued.length > 0 ? "text-amber-700" : "text-gray-900"}`}>
                {currentlyIssued.length} book(s)
              </div>
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-1.5 rounded-xl bg-white/85 px-1.5 py-2 sm:gap-2 sm:px-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600"><Clock className="h-4 w-4" /></span><div className="min-w-0">
              <div className="truncate text-gray-500 font-medium">Overdue Books</div>
              <div className={`mt-1 font-bold text-xs sm:text-sm ${overdueLoans.length > 0 ? "text-rose-600" : "text-gray-900"}`}>
                {overdueLoans.length}
              </div>
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-1.5 rounded-xl bg-white/85 px-1.5 py-2 sm:gap-2 sm:px-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><IndianRupee className="h-4 w-4" /></span><div className="min-w-0">
              <div className="truncate text-gray-500 font-medium">Pending Fines</div>
              <div className={`mt-1 font-bold text-xs sm:text-sm ${totalPendingFine > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                ₹{totalPendingFine.toFixed(2)}
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ready for collection hold alerts (Section 15 & 19) */}
      {myReservations.some((r) => r.status === "AVAILABLE") && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300 text-amber-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs sm:text-sm font-semibold">
              ⚡ Good news! One or more of your reserved books are ready for collection at the library desk. Please collect them within 48 hours.
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => setActiveTab("reservations")}
            className="text-xs bg-amber-600 hover:bg-amber-700 text-white shrink-0"
          >
            View Holds
          </Button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="grid grid-cols-3 sm:flex items-center gap-1.5 sm:gap-2 border-b border-gray-200 pb-2 max-w-full min-w-0">
        <button
          onClick={() => setActiveTab("catalog")}
          className={`min-w-0 flex items-center justify-center gap-1 sm:gap-2 px-1.5 sm:px-4 py-2.5 rounded-xl font-semibold text-[10px] sm:text-sm transition-all ${
            activeTab === "catalog"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <BookOpen className="h-4 w-4 shrink-0" /><span className="truncate sm:hidden">Catalogue ({books.length})</span><span className="hidden sm:inline">Book Catalogue ({books.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("my_books")}
          className={`min-w-0 flex items-center justify-center gap-1 sm:gap-2 px-1.5 sm:px-4 py-2.5 rounded-xl font-semibold text-[10px] sm:text-sm transition-all ${
            activeTab === "my_books"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <BookMarked className="h-4 w-4 shrink-0" /><span className="truncate sm:hidden">Loans ({currentlyIssued.length})</span><span className="hidden sm:inline">My Active Loans ({currentlyIssued.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("reservations")}
          className={`min-w-0 flex items-center justify-center gap-1 sm:gap-2 px-1.5 sm:px-4 py-2.5 rounded-xl font-semibold text-[10px] sm:text-sm transition-all ${
            activeTab === "reservations"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <BookmarkPlus className="h-4 w-4 shrink-0" /><span className="truncate sm:hidden">Holds ({myReservations.length})</span><span className="hidden sm:inline">My Reservations ({myReservations.length})</span>
        </button>
      </div>

      {/* TAB 1: CATALOGUE */}
      {activeTab === "catalog" && (
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between rounded-2xl border border-slate-100 bg-white p-3 sm:p-4 shadow-sm">
            <div className="relative w-full lg:flex-1 lg:max-w-[42rem] min-w-0">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by title, author, ISBN, rack or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 pl-10 rounded-xl border-slate-200 bg-white text-sm"
              />
            </div>

            <div className="grid grid-cols-2 lg:flex items-center gap-2 w-full lg:w-auto min-w-0">
              <MobileSelectTrigger valueLabel={categoryFilter === "ALL" ? "All Categories" : categoryFilter} onClick={() => setMobileFilterDrawer("category")} className="w-full" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="hidden md:block h-11 min-w-[150px] px-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 outline-none focus:border-blue-500"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === "ALL" ? "All Categories" : c}
                  </option>
                ))}
              </select>

              <MobileSelectTrigger valueLabel={availabilityFilter === "ALL" ? "All Availability" : "Available Only"} onClick={() => setMobileFilterDrawer("availability")} className="w-full" />
              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value as "ALL" | "AVAILABLE")}
                className="hidden md:block h-11 min-w-[160px] px-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 outline-none focus:border-blue-500"
              >
                <option value="ALL">All Availability</option>
                <option value="AVAILABLE">Available Only</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-gray-200">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              <p className="text-sm text-gray-500 mt-2">Loading library collection...</p>
            </div>
          ) : filteredBooks.length === 0 ? (
            <StudentEmptyState
              title="No matching books found"
              description="Try searching for a different subject, author, or book title in the catalogue."
            />
          ) : (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {pagedBooks.map((book) => {
                const isReservedByMe = myReservations.some((r) => r.book === book.id && r.status === "WAITING");
                const coverThemes = ["from-slate-950 via-slate-800 to-blue-900", "from-blue-950 via-blue-800 to-sky-700", "from-emerald-950 via-emerald-800 to-teal-600", "from-rose-950 via-rose-800 to-orange-700"];
                return (
                  <div
                    key={book.id}
                    className="group min-w-0 overflow-hidden rounded-2xl border border-slate-100 bg-white p-3.5 sm:p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md"
                  >
                    <div className="flex min-w-0 gap-3">
                      <div className={`relative flex h-[112px] w-[76px] shrink-0 flex-col justify-between overflow-hidden rounded-lg bg-gradient-to-br ${coverThemes[book.id % coverThemes.length]} p-2 text-white shadow-md`}>
                        <BookOpen className="h-5 w-5 text-white/80" />
                        <div className="absolute -right-4 top-6 h-14 w-14 rounded-full border border-white/20" />
                        <div className="relative z-10"><p className="line-clamp-3 text-[10px] font-black uppercase leading-tight">{book.title}</p><p className="mt-1 line-clamp-1 text-[8px] text-white/70">{book.author}</p></div>
                        <span className="absolute bottom-0 left-0 h-1 w-full bg-white/30" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1.5">
                          <span className="max-w-[45%] truncate rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{book.category || "General"}</span>
                          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold sm:text-[10px] ${book.available_copies > 0 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
                            {book.available_copies > 0 ? `${book.available_copies} Available` : "Out of Stock"}
                          </span>
                        </div>
                        <h3 className="line-clamp-2 text-sm font-extrabold leading-tight text-slate-900 sm:text-base">{book.title}</h3>
                        {book.subtitle && <p className="mt-0.5 line-clamp-1 text-[10px] italic text-slate-400">{book.subtitle}</p>}
                        <p className="mt-1 truncate text-[11px] text-slate-500">Author: {book.author}</p>
                        {book.isbn && <p className="mt-0.5 truncate font-mono text-[10px] text-slate-400">ISBN: {book.isbn}</p>}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-3 text-[10px]">
                      {book.rack_code && <span className="inline-flex max-w-[65%] items-center gap-1 truncate rounded-md border border-amber-200 bg-amber-50 px-2 py-1 font-medium text-amber-800"><MapPin className="h-3 w-3 shrink-0" />Rack {book.rack_code}</span>}
                      {book.shelf_code && <span className="inline-flex max-w-[45%] items-center gap-1 truncate rounded-md border border-blue-200 bg-blue-50 px-2 py-1 font-medium text-blue-700">Shelf {book.shelf_code}</span>}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-3">
                      <span className="inline-flex min-w-0 items-center gap-1 truncate text-[10px] text-slate-500 sm:text-xs"><BookMarked className="h-3.5 w-3.5 shrink-0" />Total: {book.total_copies} copies</span>
                      {book.available_copies === 0 ? (
                        <Button
                          size="sm"
                          onClick={() => handleReserveBook(book.id)}
                          disabled={actionLoading || isReservedByMe}
                          className="h-8 shrink-0 gap-1 rounded-lg bg-blue-600 px-2.5 text-[10px] text-white hover:bg-blue-700 sm:text-xs"
                        >
                          <BookmarkPlus className="h-3 w-3" />
                          {isReservedByMe ? "Reserved" : "Reserve Hold"}
                        </Button>
                      ) : (
                        <span role="note" className="inline-flex shrink-0 items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[9px] font-medium text-blue-700 sm:text-[10px]">
                          <MapPin className="h-3 w-3" /> Visit desk to borrow
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-col gap-3 pt-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>Showing {filteredBooks.length ? (catalogPage - 1) * catalogPageSize + 1 : 0}–{Math.min(catalogPage * catalogPageSize, filteredBooks.length)} of {filteredBooks.length} books</span>
              <div className="flex items-center justify-center gap-1.5">
                <button type="button" onClick={() => setCatalogPage((page) => Math.max(1, page - 1))} disabled={catalogPage === 1} aria-label="Previous page" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
                {Array.from({ length: catalogPageCount }, (_, index) => index + 1).map((page) => <button key={page} type="button" onClick={() => setCatalogPage(page)} className={`h-9 min-w-9 rounded-lg px-2 text-xs font-semibold ${catalogPage === page ? "bg-blue-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{page}</button>)}
                <button type="button" onClick={() => setCatalogPage((page) => Math.min(catalogPageCount, page + 1))} disabled={catalogPage === catalogPageCount} aria-label="Next page" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
              </div>
              <span className="hidden sm:inline-flex items-center gap-2">Items per page <span className="rounded-lg border border-slate-200 bg-white px-3 py-2">{catalogPageSize} <ChevronRight className="ml-2 inline h-3 w-3 rotate-90" /></span></span>
            </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: MY ISSUED BOOKS */}
      {activeTab === "my_books" && (
        <div className="space-y-6">
          {/* Active Loans */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-1">Currently Borrowed Books</h3>
            <p className="text-xs text-gray-500 mb-4">Books currently in your possession. Return before the due date to avoid fines.</p>

            {currentlyIssued.length === 0 ? (
              <StudentEmptyState
                title="No borrowed books"
                description="You currently have no books checked out from the school library."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentlyIssued.map((loan) => {
                  const isOverdue = new Date(loan.due_date) < new Date();
                  const maxRenewals = settings?.max_renewal_count ?? 1;
                  const canRenew = loan.renewal_count < maxRenewals && !isOverdue;

                  return (
                    <div key={loan.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex flex-col justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <h4 className="font-bold text-gray-900 line-clamp-1">{loan.book_title}</h4>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                              isOverdue ? "bg-rose-100 text-rose-800" : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {isOverdue ? "Overdue" : "Active Loan"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 font-medium">By {loan.book_author}</p>
                        <div className="text-xs text-gray-600 space-y-1 pt-1">
                          <div className="flex items-center gap-1 text-slate-500">
                            <Calendar className="h-3.5 w-3.5" /> Issued: {new Date(loan.book_issued_date).toLocaleDateString()}
                          </div>
                          <div className={`flex items-center gap-1 font-semibold ${isOverdue ? "text-rose-600" : "text-slate-700"}`}>
                            <Clock className="h-3.5 w-3.5" /> Due Date: {new Date(loan.due_date).toLocaleDateString()}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            Renewals used: {loan.renewal_count} / {maxRenewals}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                        <span className="text-[11px] text-gray-400 font-mono">
                          {loan.accession_no || `BC-${loan.book}`}
                        </span>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRenewLoan(loan.id)}
                          disabled={actionLoading || !canRenew}
                          title={
                            !canRenew
                              ? isOverdue
                                ? "Cannot renew overdue loan. Return at desk."
                                : "Maximum renewal limit reached."
                              : "Request 1-click renewal"
                          }
                          className="text-xs gap-1 border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                        >
                          <RotateCcw className="h-3 w-3" /> Request Renewal
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Past Loans History with Fine Status (Section 28) */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-1">Previous Borrowing History</h3>
            <p className="text-xs text-gray-500 mb-4">Books you have returned, along with return conditions and fine settlement status.</p>

            {pastLoans.length === 0 ? (
              <StudentEmptyState
                title="No borrowing history"
                description="Past returns and settled circulation records will be listed here."
              />
            ) : (
              <div className="divide-y divide-gray-100">
                {pastLoans.map((loan) => {
                  const fineAssessed = Number(loan.total_fine || 0);
                  const finePaid = Number(loan.fine_paid_amount || 0);
                  const fineRemaining = Math.max(0, fineAssessed - finePaid);

                  return (
                    <div key={loan.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-gray-900">{loan.book_title}</div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                          <span>
                            Returned: {loan.actual_return_date ? new Date(loan.actual_return_date).toLocaleDateString() : "Recorded"}
                          </span>
                          {loan.condition_on_return && (
                            <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[11px] font-medium">
                              Condition: {loan.condition_on_return}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {fineAssessed > 0 ? (
                          loan.is_fine_paid || fineRemaining === 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle className="h-3 w-3" /> Paid ₹{finePaid}
                              {loan.payment_receipt_no && (
                                <span className="text-[10px] text-emerald-800 font-mono">({loan.payment_receipt_no})</span>
                              )}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertCircle className="h-3 w-3" /> Fine Due: ₹{fineRemaining}
                            </span>
                          )
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">
                            No Fine
                          </span>
                        )}

                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                            loan.status === "RETURNED"
                              ? "bg-emerald-50 text-emerald-700"
                              : loan.status === "LOST"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {loan.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: MY RESERVATIONS */}
      {activeTab === "reservations" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">My Reserved Book Holds</h3>
            <p className="text-xs text-gray-500">
              When a reserved book is returned by another student, the copy is held for you at the library circulation desk.
            </p>
          </div>

          {myReservations.length === 0 ? (
            <StudentEmptyState
              title="No active book reservations"
              description="You can reserve any out-of-stock book directly from the catalogue."
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {myReservations.map((res) => (
                <div key={res.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="font-bold text-gray-900">{res.book_title}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold">
                        Queue Position #{res.queue_number}
                      </span>
                      <span>Reserved on: {new Date(res.reservation_date).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                        res.status === "AVAILABLE"
                          ? "bg-emerald-100 text-emerald-800 animate-pulse border border-emerald-300"
                          : res.status === "WAITING"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {res.status === "AVAILABLE" ? "⚡ Ready for Pickup at Library!" : res.status}
                    </span>

                    {res.status === "WAITING" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCancelRes(res.id)}
                        className="text-xs text-rose-600 hover:bg-rose-50 h-8"
                      >
                        Cancel Hold
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <MobileSelectDrawer
        isOpen={mobileFilterDrawer !== null}
        onClose={() => setMobileFilterDrawer(null)}
        title={mobileFilterDrawer === "category" ? "Choose a category" : "Filter availability"}
        subtitle="Refine the books shown in the catalogue"
        options={mobileFilterDrawer === "category"
          ? categories.map((category) => ({ label: category === "ALL" ? "All Categories" : category, value: category }))
          : [{ label: "All Availability", value: "ALL" }, { label: "Available Only", value: "AVAILABLE" }]}
        selectedValue={mobileFilterDrawer === "category" ? categoryFilter : availabilityFilter}
        onSelect={(value) => mobileFilterDrawer === "category" ? setCategoryFilter(String(value)) : setAvailabilityFilter(value as "ALL" | "AVAILABLE")}
      />

      {/* STUDENT CLEARANCE CERTIFICATE MODAL */}
      <AnimatePresence>
        {showCertificateModal && (
          <div className="fixed inset-0 z-50 flex sm:items-center sm:justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm overflow-hidden" onClick={() => setShowCertificateModal(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative border border-gray-100"
            >
              <button
                onClick={() => setShowCertificateModal(false)}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 print:hidden"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Printable Clearance Certificate */}
              <div id="student-clearance-cert" className="border-4 border-double border-emerald-600/30 p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-white via-slate-50/50 to-white text-center space-y-4">
                <div className="flex justify-center">
                  <div className="p-3 bg-emerald-100 rounded-full text-emerald-700">
                    <ShieldCheck className="h-10 w-10" />
                  </div>
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-900">
                    Official Library Clearance Certificate
                  </h2>
                  <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">
                    No-Dues Verification Certificate · Section 22 Library Code
                  </p>
                </div>

                <div className="h-px bg-slate-200 my-3" />

                <div className="text-left bg-white p-4 rounded-xl border border-slate-200 text-xs sm:text-sm space-y-2 text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Student Name:</span>
                    <span className="font-bold text-slate-900">{studentInfo.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">GR / Admission No:</span>
                    <span className="font-mono font-semibold text-slate-900">{studentInfo.grNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Class / Division:</span>
                    <span className="font-semibold text-slate-900">{studentInfo.classDiv}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Issued Date:</span>
                    <span className="font-semibold text-slate-900">{new Date().toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-medium text-left space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                    <CheckCircle className="h-4 w-4" /> Certification Statement:
                  </div>
                  <p>
                    This is to certify that the student named above has returned all issued library textbooks and materials in acceptable condition and carries <strong>₹0.00 outstanding dues or fines</strong>.
                  </p>
                  <p className="text-[11px] text-emerald-700 pt-1">
                    This student is officially <strong>CLEARED</strong> for Transfer Certificate (TC) clearance, Board Examination Hall Ticket clearance, and Academic Year Graduation.
                  </p>
                </div>

                <div className="pt-6 flex justify-between items-end text-left text-[11px] text-slate-500">
                  <div>
                    <div className="font-mono text-[10px] text-slate-400">
                      REF-ID: NOC-LIB-{Date.now().toString().slice(-8)}
                    </div>
                    <div>Digital Verification Valid</div>
                  </div>
                  <div className="text-right">
                    <div className="h-10 border-b border-dashed border-slate-300 w-32" />
                    <div className="pt-1 font-semibold text-slate-700">Librarian Signature & Seal</div>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5 border-t border-slate-100 bg-white shrink-0 flex items-center gap-3 w-full print:hidden">
                <button
                  type="button"
                  onClick={() => setShowCertificateModal(false)}
                  className="flex-1 py-3 px-4 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-98 transition-all text-center flex items-center justify-center cursor-pointer shadow-2xs"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer className="h-4 w-4" /> Print Certificate
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
