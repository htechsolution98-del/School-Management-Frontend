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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Book,
  BookIssued,
  BookReservation,
  getPublicBooks,
  getStudentMyBooks,
  getReservations,
  createReservation,
  cancelReservation,
  studentRenewLoan,
} from "@/lib/library";

export default function StudentLibraryPage() {
  const [activeTab, setActiveTab] = useState<"catalog" | "my_books" | "reservations">("catalog");
  const [books, setBooks] = useState<Book[]>([]);
  const [myLoans, setMyLoans] = useState<BookIssued[]>([]);
  const [myReservations, setMyReservations] = useState<BookReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [booksData, myLoansData, myResData] = await Promise.all([
        getPublicBooks().catch(() => []),
        getStudentMyBooks().catch(() => []),
        getReservations().catch(() => []),
      ]);
      setBooks(booksData);
      setMyLoans(myLoansData);
      setMyReservations(myResData);
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
        (b.isbn && b.isbn.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCat = categoryFilter === "ALL" || b.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [books, searchQuery, categoryFilter]);

  const currentlyIssued = useMemo(() => {
    return myLoans.filter((l) => l.status === "ISSUED");
  }, [myLoans]);

  const pastLoans = useMemo(() => {
    return myLoans.filter((l) => l.status !== "ISSUED");
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
      showToast("error", err.message || "Failed to cancel.");
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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" /> School Library Catalogue
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Student Library & Loans</h1>
            <p className="text-blue-100 max-w-xl text-sm md:text-base">
              Explore textbooks, check shelf locations, track your borrowed loans, and reserve out-of-stock books.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={loadData}
            disabled={loading}
            className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white self-start md:self-auto"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab("catalog")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === "catalog"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <BookOpen className="h-4 w-4" /> Book Catalogue ({books.length})
        </button>
        <button
          onClick={() => setActiveTab("my_books")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === "my_books"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <BookMarked className="h-4 w-4" /> My Active Loans ({currentlyIssued.length})
        </button>
        <button
          onClick={() => setActiveTab("reservations")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === "reservations"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
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
                placeholder="Search by title, author, ISBN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl bg-white"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <Filter className="h-4 w-4 text-gray-500" />
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
                          {loan.renewal_count > 0 && (
                            <div className="text-[11px] text-indigo-600">Renewed {loan.renewal_count} time(s)</div>
                          )}
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
                          disabled={actionLoading}
                          className="text-xs gap-1 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
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

          {/* Past Loans History */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-1">Previous Borrowing History</h3>
            <p className="text-xs text-gray-500 mb-4">Books you have successfully returned in the past.</p>

            {pastLoans.length === 0 ? (
              <p className="text-xs text-gray-400">No past borrowing history recorded yet.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {pastLoans.map((loan) => (
                  <div key={loan.id} className="py-3 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-semibold text-gray-900">{loan.book_title}</div>
                      <div className="text-xs text-gray-400">
                        Returned on: {loan.actual_return_date ? new Date(loan.actual_return_date).toLocaleDateString() : "N/A"}
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                        loan.status === "RETURNED" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {loan.status}
                    </span>
                  </div>
                ))}
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
              When a reserved book is returned by another student, you will be notified to collect it.
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
                <div key={res.id} className="py-3 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="font-bold text-gray-900">{res.book_title}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-semibold">
                        Queue Position #{res.queue_number}
                      </span>
                      <span>Reserved on: {new Date(res.reservation_date).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                        res.status === "AVAILABLE"
                          ? "bg-emerald-100 text-emerald-800"
                          : res.status === "WAITING"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {res.status === "AVAILABLE" ? "Ready for Pickup at Library!" : res.status}
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
    </div>
  );
}
