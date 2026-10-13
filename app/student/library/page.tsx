"use client";

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
  Filter,
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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#5c28e8] via-[#4d20cb] to-[#361399] p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-purple-200 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" /> School Library Catalogue & Self-Service
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Student Library & Loans</h1>
            <p className="text-purple-100 max-w-xl text-sm md:text-base">
              Explore textbooks, check shelf locations, track your borrowed loans, and reserve out-of-stock books.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            {isClearanceEligible && (
              <Button
                variant="outline"
                onClick={() => setShowCertificateModal(true)}
                className="border-emerald-300/40 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30 hover:text-white"
              >
                <Printer className="mr-2 h-4 w-4" /> Clearance Certificate
              </Button>
            )}
            <Button
              variant="outline"
              onClick={loadData}
              disabled={loading}
              className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* SECTION 22: STUDENT LIBRARY CLEARANCE BANNER */}
      <div
        className={`rounded-2xl p-5 border transition-all ${
          isClearanceEligible
            ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 shadow-sm"
            : "bg-gradient-to-r from-amber-50 to-rose-50 border-amber-200 shadow-sm"
        }`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`p-2.5 rounded-xl ${
                isClearanceEligible ? "bg-emerald-600 text-white shadow-emerald-500/20 shadow-md" : "bg-amber-600 text-white shadow-amber-500/20 shadow-md"
              }`}
            >
              {isClearanceEligible ? <ShieldCheck className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 text-base">
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
              <p className="text-xs text-gray-600">
                {isClearanceEligible
                  ? "All borrowed books have been returned and no outstanding fines remain. Your official library no-dues certificate is approved."
                  : "You have pending library obligations. All physical books must be returned and any fines settled at the circulation desk before Transfer Certificate (TC) or term clearance is granted."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/80 backdrop-blur px-4 py-2.5 rounded-xl border border-gray-200/60 shadow-sm text-xs">
            <div>
              <div className="text-gray-400 font-medium">Active Books Held</div>
              <div className={`font-bold text-sm ${currentlyIssued.length > 0 ? "text-amber-700" : "text-gray-900"}`}>
                {currentlyIssued.length} book(s)
              </div>
            </div>
            <div className="h-7 w-px bg-gray-200" />
            <div>
              <div className="text-gray-400 font-medium">Overdue Books</div>
              <div className={`font-bold text-sm ${overdueLoans.length > 0 ? "text-rose-600" : "text-gray-900"}`}>
                {overdueLoans.length}
              </div>
            </div>
            <div className="h-7 w-px bg-gray-200" />
            <div>
              <div className="text-gray-400 font-medium">Pending Fines</div>
              <div className={`font-bold text-sm ${totalPendingFine > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                ₹{totalPendingFine.toFixed(2)}
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
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab("catalog")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === "catalog"
              ? "bg-[#5826df] text-white shadow-md shadow-indigo-500/20"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <BookOpen className="h-4 w-4" /> Book Catalogue ({books.length})
        </button>
        <button
          onClick={() => setActiveTab("my_books")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === "my_books"
              ? "bg-[#5826df] text-white shadow-md shadow-indigo-500/20"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <BookMarked className="h-4 w-4" /> My Active Loans ({currentlyIssued.length})
        </button>
        <button
          onClick={() => setActiveTab("reservations")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === "reservations"
              ? "bg-[#5826df] text-white shadow-md shadow-indigo-500/20"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <BookmarkPlus className="h-4 w-4" /> My Reservations ({myReservations.length})
        </button>
      </div>

      {/* TAB 1: CATALOGUE */}
      {activeTab === "catalog" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search title, author, ISBN, rack..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl bg-white"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <Filter className="h-4 w-4 text-gray-500 shrink-0" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 outline-none focus:border-indigo-500"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === "ALL" ? "All Categories" : c}
                  </option>
                ))}
              </select>

              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value as "ALL" | "AVAILABLE")}
                className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Availability</option>
                <option value="AVAILABLE">Available Only</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-gray-200">
              <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
              <p className="text-sm text-gray-500 mt-2">Loading library collection...</p>
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-2xl border border-gray-200">
              <BookOpen className="h-12 w-12 text-gray-300 mx-auto" />
              <h3 className="text-base font-semibold text-gray-800 mt-2">No matching books found</h3>
              <p className="text-xs text-gray-400">Try searching for a different subject or title.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredBooks.map((book) => {
                const isReservedByMe = myReservations.some((r) => r.book === book.id && r.status === "WAITING");
                return (
                  <div
                    key={book.id}
                    className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-gray-100 text-xs font-semibold text-gray-700">
                          {book.category || "General"}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            book.available_copies > 0
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {book.available_copies > 0 ? `${book.available_copies} Copies Available` : "Out of Stock"}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-gray-900 leading-snug line-clamp-2">{book.title}</h3>
                        {book.subtitle && <p className="text-xs text-gray-400 italic mt-0.5 line-clamp-1">{book.subtitle}</p>}
                        <p className="text-xs text-gray-500 font-medium mt-1">Author: {book.author}</p>
                        {book.isbn && <p className="text-[11px] text-gray-400 font-mono mt-0.5">ISBN: {book.isbn}</p>}
                      </div>

                      {/* Location Badge */}
                      <div className="flex items-center gap-2 pt-1 text-[11px]">
                        {book.rack_code && (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200 font-medium">
                            <MapPin className="h-3 w-3" /> Rack {book.rack_code}
                          </span>
                        )}
                        {book.shelf_code && (
                          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200 font-medium">
                            Shelf {book.shelf_code}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 mt-4 flex items-center justify-between">
                      <span className="text-xs text-gray-400">Total: {book.total_copies} copies</span>

                      {book.available_copies === 0 ? (
                        <Button
                          size="sm"
                          onClick={() => handleReserveBook(book.id)}
                          disabled={actionLoading || isReservedByMe}
                          className="text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1"
                        >
                          <BookmarkPlus className="h-3 w-3" />
                          {isReservedByMe ? "Reserved" : "Reserve Hold"}
                        </Button>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" /> Visit desk to borrow
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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
              <div className="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <BookOpen className="h-8 w-8 text-gray-300 mx-auto" />
                <p className="text-sm font-semibold text-gray-700 mt-2">You currently have no borrowed books.</p>
                <p className="text-xs text-gray-400 mt-1">Visit the school library to borrow books.</p>
              </div>
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
                          className="text-xs gap-1 border-indigo-200 text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
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
              <p className="text-xs text-gray-400">No past borrowing history recorded yet.</p>
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
            <div className="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <BookmarkPlus className="h-8 w-8 text-gray-300 mx-auto" />
              <p className="text-sm font-semibold text-gray-700 mt-2">No active book reservations.</p>
              <p className="text-xs text-gray-400 mt-1">You can reserve any out-of-stock book directly from the catalogue.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {myReservations.map((res) => (
                <div key={res.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="font-bold text-gray-900">{res.book_title}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-semibold">
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

      {/* STUDENT CLEARANCE CERTIFICATE MODAL */}
      <AnimatePresence>
        {showCertificateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 relative border border-gray-100"
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

              <div className="flex justify-end gap-3 print:hidden">
                <Button variant="outline" onClick={() => setShowCertificateModal(false)}>
                  Close
                </Button>
                <Button
                  onClick={() => window.print()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <Printer className="h-4 w-4" /> Print Certificate
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
