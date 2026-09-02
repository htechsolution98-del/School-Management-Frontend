"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Plus,
  Search,
  BookMarked,
  Clock,
  CheckCircle2,
  AlertCircle,
  Settings,
  Trash2,
  Edit,
  ArrowRightLeft,
  RotateCcw,
  Users,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  Loader2,
  DollarSign,
  TrendingUp,
  Filter,
  BookmarkPlus,
  QrCode,
  ShieldAlert,
  Sliders,
  MapPin,
  Building,
  UserCheck,
  X,
  ChevronRight,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Book,
  BookIssued,
  LibrarySetting,
  BookCategory,
  Author,
  Publisher,
  Rack,
  Shelf,
  BookCopy,
  BookReservation,
  LibraryStudent,
  getBooks,
  createBook,
  updateBook,
  deleteBook,
  getIssuedBooks,
  issueBook,
  returnBookWithCondition,
  renewBookLoan,
  markBookLost,
  getLibrarySettings,
  updateLibrarySettings,
  getCategories,
  createCategory,
  getAuthors,
  createAuthor,
  getPublishers,
  createPublisher,
  getRacks,
  createRack,
  getShelves,
  createShelf,
  getBookCopies,
  generateBookCopies,
  getReservations,
  cancelReservation,
  getLibraryStudents,
} from "@/lib/library";

export default function LibrarianDashboard() {
  const [activeTab, setActiveTab] = useState<"catalog" | "circulation" | "reservations" | "masters" | "settings" | "history">("catalog");

  // Data states
  const [books, setBooks] = useState<Book[]>([]);
  const [issuedRecords, setIssuedRecords] = useState<BookIssued[]>([]);
  const [reservations, setReservations] = useState<BookReservation[]>([]);
  const [categories, setCategories] = useState<BookCategory[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [students, setStudents] = useState<LibraryStudent[]>([]);
  const [librarySettings, setLibrarySettings] = useState<LibrarySetting | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [masterSubTab, setMasterSubTab] = useState<"categories" | "authors" | "publishers" | "racks">("categories");

  // Notifications
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modals
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState<BookIssued | null>(null);
  const [showCopiesModal, setShowCopiesModal] = useState<Book | null>(null);
  const [bookCopiesList, setBookCopiesList] = useState<BookCopy[]>([]);
  const [showMasterModal, setShowMasterModal] = useState<string | null>(null);

  // Return condition form
  const [returnForm, setReturnForm] = useState({
    condition: "GOOD",
    remarks: "",
    damage_fee: 0,
    lost_fee: 0,
  });

  // Copy generation form
  const [generateCopiesForm, setGenerateCopiesForm] = useState({
    count: 1,
    rack_id: "",
    shelf_id: "",
  });

  // Book Form state
  const [bookForm, setBookForm] = useState({
    title: "",
    subtitle: "",
    isbn: "",
    author: "",
    category: "",
    category_ref: "",
    author_ref: "",
    publisher_ref: "",
    rack: "",
    shelf: "",
    edition: "",
    publication_year: new Date().getFullYear(),
    language: "English",
    pages: 200,
    price: 150,
    total_copies: 1,
    description: "",
  });

  // Issue Form state
  const [issueForm, setIssueForm] = useState({
    book: "",
    student: "",
    due_date: "",
  });

  // Masters form state
  const [masterForm, setMasterForm] = useState({
    name: "",
    code: "",
    extra: "",
    extra2: "",
  });

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    max_books_per_student: 3,
    issue_duration_days: 14,
    max_renewal_count: 2,
    fine_per_day: 2,
    grace_period_days: 0,
    lost_penalty: 100,
    damage_penalty: 50,
  });

  const showToast = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        booksData,
        issuedData,
        reservationsData,
        catsData,
        authorsData,
        pubsData,
        racksData,
        shelvesData,
        studentsData,
        settingsData,
      ] = await Promise.all([
        getBooks().catch(() => []),
        getIssuedBooks().catch(() => []),
        getReservations().catch(() => []),
        getCategories().catch(() => []),
        getAuthors().catch(() => []),
        getPublishers().catch(() => []),
        getRacks().catch(() => []),
        getShelves().catch(() => []),
        getLibraryStudents().catch(() => []),
        getLibrarySettings().catch(() => null),
      ]);

      setBooks(booksData);
      setIssuedRecords(issuedData);
      setReservations(reservationsData);
      setCategories(catsData);
      setAuthors(authorsData);
      setPublishers(pubsData);
      setRacks(racksData);
      setShelves(shelvesData);
      setStudents(studentsData);

      if (settingsData) {
        setLibrarySettings(settingsData);
        setSettingsForm({
          max_books_per_student: Number(settingsData.max_books_per_student) || 3,
          issue_duration_days: Number(settingsData.issue_duration_days) || 14,
          max_renewal_count: Number(settingsData.max_renewal_count) || 2,
          fine_per_day: Number(settingsData.fine_per_day) || 2,
          grace_period_days: Number(settingsData.grace_period_days) || 0,
          lost_penalty: Number(settingsData.lost_penalty) || 100,
          damage_penalty: Number(settingsData.damage_penalty) || 50,
        });
      }
    } catch {
      showToast("error", "Error loading library data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Derived statistics
  const stats = useMemo(() => {
    const totalBooksCount = books.reduce((acc, b) => acc + (b.total_copies || 0), 0);
    const availableCopies = books.reduce((acc, b) => acc + (b.available_copies || 0), 0);
    const activeLoans = issuedRecords.filter((r) => r.status === "ISSUED");
    const activeLoansCount = activeLoans.length;

    const now = new Date();
    const overdueCount = activeLoans.filter((r) => new Date(r.due_date) < now).length;
    const totalFinesCollected = issuedRecords.reduce((acc, r) => acc + Number(r.total_fine || r.late_fees || 0), 0);
    const waitingReservationsCount = reservations.filter((r) => r.status === "WAITING").length;

    return {
      titlesCount: books.length,
      totalBooksCount,
      availableCopies,
      activeLoansCount,
      overdueCount,
      totalFinesCollected,
      waitingReservationsCount,
    };
  }, [books, issuedRecords, reservations]);

  // Book categories list
  const categoryNames = useMemo(() => {
    const set = new Set<string>();
    books.forEach((b) => {
      if (b.category) set.add(b.category);
    });
    categories.forEach((c) => set.add(c.name));
    return ["ALL", ...Array.from(set)];
  }, [books, categories]);

  // Filtered books
  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      const matchesSearch =
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.isbn && b.isbn.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCat = categoryFilter === "ALL" || b.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [books, searchQuery, categoryFilter]);

  // Active vs History circulation
  const activeLoans = useMemo(() => {
    return issuedRecords.filter((r) => r.status === "ISSUED");
  }, [issuedRecords]);

  const historyLoans = useMemo(() => {
    return issuedRecords.filter((r) => r.status !== "ISSUED");
  }, [issuedRecords]);

  // Handlers: Save Book
  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        title: bookForm.title,
        subtitle: bookForm.subtitle,
        isbn: bookForm.isbn,
        author: bookForm.author,
        category: bookForm.category,
        category_ref: bookForm.category_ref ? Number(bookForm.category_ref) : null,
        author_ref: bookForm.author_ref ? Number(bookForm.author_ref) : null,
        publisher_ref: bookForm.publisher_ref ? Number(bookForm.publisher_ref) : null,
        rack: bookForm.rack ? Number(bookForm.rack) : null,
        shelf: bookForm.shelf ? Number(bookForm.shelf) : null,
        edition: bookForm.edition,
        publication_year: Number(bookForm.publication_year),
        language: bookForm.language,
        pages: Number(bookForm.pages),
        price: Number(bookForm.price),
        description: bookForm.description,
        total_copies: Number(bookForm.total_copies),
      };

      if (editingBook) {
        await updateBook(editingBook.id, payload);
        showToast("success", "Book updated successfully!");
      } else {
        await createBook(payload);
        showToast("success", "New book & accession copies created successfully!");
      }
      setShowAddBookModal(false);
      setEditingBook(null);
      await loadAllData();
    } catch (err: any) {
      showToast("error", err.message || "Failed to save book.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handlers: Delete Book
  const handleDeleteBook = async (id: number) => {
    if (!confirm("Are you sure you want to delete this book?")) return;
    setActionLoading(true);
    try {
      await deleteBook(id);
      showToast("success", "Book removed from catalogue.");
      await loadAllData();
    } catch (err: any) {
      showToast("error", err.message || "Failed to delete book.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handlers: Issue Book
  const handleIssueBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await issueBook({
        book: Number(issueForm.book),
        student: Number(issueForm.student),
        due_date: issueForm.due_date || undefined,
      });
      showToast("success", "Book successfully issued to student!");
      setShowIssueModal(false);
      setIssueForm({ book: "", student: "", due_date: "" });
      await loadAllData();
    } catch (err: any) {
      showToast("error", err.message || "Failed to issue book.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handlers: Return Book with Condition
  const handleFinalizeReturn = async () => {
    if (!showReturnModal) return;
    setActionLoading(true);
    try {
      const res = await returnBookWithCondition(showReturnModal.id, {
        condition: returnForm.condition,
        remarks: returnForm.remarks,
        damage_fee: Number(returnForm.damage_fee) || undefined,
        lost_fee: Number(returnForm.lost_fee) || undefined,
      });
      const fineMsg = Number(res.total_fine) > 0 ? ` (Total Fine: ₹${res.total_fine})` : "";
      showToast("success", `Book marked as ${res.status}${fineMsg}`);
      setShowReturnModal(null);
      await loadAllData();
    } catch (err: any) {
      showToast("error", err.message || "Failed to return book.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handlers: Renew Book
  const handleRenewBook = async (id: number) => {
    setActionLoading(true);
    try {
      const res = await renewBookLoan(id);
      showToast("success", `Loan renewed! New due date: ${new Date(res.due_date).toLocaleDateString()}`);
      await loadAllData();
    } catch (err: any) {
      showToast("error", err.message || "Failed to renew book.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handlers: Mark Lost
  const handleMarkLost = async (id: number) => {
    if (!confirm("Are you sure you want to mark this book as LOST? A replacement fee will be charged.")) return;
    setActionLoading(true);
    try {
      await markBookLost(id);
      showToast("success", "Book marked as Lost and penalty calculated.");
      await loadAllData();
    } catch (err: any) {
      showToast("error", err.message || "Failed to mark book lost.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handlers: View Copies
  const handleOpenCopies = async (book: Book) => {
    setShowCopiesModal(book);
    try {
      const copies = await getBookCopies(book.id);
      setBookCopiesList(copies);
    } catch {
      setBookCopiesList([]);
    }
  };

  // Handlers: Generate Copies
  const handleGenerateCopies = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCopiesModal) return;
    setActionLoading(true);
    try {
      await generateBookCopies({
        book_id: showCopiesModal.id,
        count: Number(generateCopiesForm.count),
        rack_id: generateCopiesForm.rack_id ? Number(generateCopiesForm.rack_id) : null,
        shelf_id: generateCopiesForm.shelf_id ? Number(generateCopiesForm.shelf_id) : null,
      });
      showToast("success", "Physical barcode copies generated!");
      const updatedCopies = await getBookCopies(showCopiesModal.id);
      setBookCopiesList(updatedCopies);
      await loadAllData();
    } catch (err: any) {
      showToast("error", err.message || "Failed to generate copies.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handlers: Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const updated = await updateLibrarySettings(settingsForm);
      setLibrarySettings(updated);
      showToast("success", "Library rules and policies saved successfully!");
    } catch (err: any) {
      showToast("error", err.message || "Failed to save settings.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handlers: Save Master
  const openAddMasterModal = (type: "category" | "author" | "publisher" | "rack" | "shelf", defaultParentRack?: number) => {
    setMasterForm({
      name: "",
      code: "",
      extra: defaultParentRack ? String(defaultParentRack) : (racks.length > 0 ? String(racks[0].id) : ""),
      extra2: "",
    });
    setShowMasterModal(type);
  };

  const handleSaveMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (showMasterModal === "category") {
        await createCategory({
          name: masterForm.name.trim(),
          code: masterForm.code.trim() || undefined,
          description: masterForm.extra,
        });
        showToast("success", "Book Category added!");
      } else if (showMasterModal === "author") {
        await createAuthor({
          name: masterForm.name.trim(),
          code: masterForm.code.trim() || undefined,
          biography: masterForm.extra,
        });
        showToast("success", "Author added!");
      } else if (showMasterModal === "publisher") {
        await createPublisher({
          name: masterForm.name.trim(),
          code: masterForm.code.trim() || undefined,
          contact_no: masterForm.extra,
          email: masterForm.extra2,
        });
        showToast("success", "Publisher added!");
      } else if (showMasterModal === "rack") {
        await createRack({
          rack_name: masterForm.name.trim(),
          rack_code: masterForm.code.trim() || masterForm.name.trim().toUpperCase().replace(/\s+/g, "-"),
          description: masterForm.extra,
        });
        showToast("success", "Library Rack added!");
      } else if (showMasterModal === "shelf") {
        await createShelf({
          rack: Number(masterForm.extra),
          shelf_name: masterForm.name.trim(),
          shelf_code: masterForm.code.trim() || masterForm.name.trim().toUpperCase().replace(/\s+/g, "-"),
        });
        showToast("success", "Shelf added!");
      }
      setShowMasterModal(null);
      setMasterForm({ name: "", code: "", extra: "", extra2: "" });
      await loadAllData();
    } catch (err: any) {
      showToast("error", err.message || "Failed to add master.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handlers: Cancel Reservation
  const handleCancelReservation = async (id: number) => {
    if (!confirm("Cancel this student reservation?")) return;
    try {
      await cancelReservation(id);
      showToast("success", "Reservation cancelled.");
      await loadAllData();
    } catch (err: any) {
      showToast("error", err.message || "Failed to cancel.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-indigo-50/20 text-slate-800 p-4 md:p-8">
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

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" /> Enterprise Library Management
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Library & Circulation Desk</h1>
            <p className="text-sm text-slate-500">
              Manage physical book copies, accession barcodes, lending limits, returns, fines, and student hold queues.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={loadAllData}
              disabled={loading}
              className="gap-2 bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button
              onClick={() => {
                setIssueForm({ book: "", student: "", due_date: "" });
                setShowIssueModal(true);
              }}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 font-medium"
            >
              <ArrowRightLeft className="h-4 w-4" /> Issue Book
            </Button>
            <Button
              onClick={() => {
                setEditingBook(null);
                setBookForm({
                  title: "",
                  subtitle: "",
                  isbn: "",
                  author: "",
                  category: "",
                  category_ref: "",
                  author_ref: "",
                  publisher_ref: "",
                  rack: "",
                  shelf: "",
                  edition: "",
                  publication_year: new Date().getFullYear(),
                  language: "English",
                  pages: 200,
                  price: 150,
                  total_copies: 1,
                  description: "",
                });
                setShowAddBookModal(true);
              }}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 font-medium"
            >
              <Plus className="h-4 w-4" /> Add New Book
            </Button>
          </div>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase">Total Titles</span>
              <BookOpen className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{stats.titlesCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">{stats.totalBooksCount} Physical Copies</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase">Available</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-600">{stats.availableCopies}</div>
            <div className="text-[11px] text-slate-400 mt-1">Ready to lend</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase">Issued Active</span>
              <ArrowRightLeft className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-blue-600">{stats.activeLoansCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">Checked out</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase">Overdue</span>
              <Clock className="h-4 w-4 text-rose-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-rose-600">{stats.overdueCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">Past due date</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase">Reservations</span>
              <BookmarkPlus className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-600">{stats.waitingReservationsCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">In hold queue</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase">Fines Owed/Paid</span>
              <DollarSign className="h-4 w-4 text-purple-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-purple-700">₹{stats.totalFinesCollected.toFixed(0)}</div>
            <div className="text-[11px] text-slate-400 mt-1">Late & condition fees</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 bg-white/50 px-2 pt-2 rounded-t-xl overflow-x-auto">
          <button
            onClick={() => setActiveTab("catalog")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "catalog"
                ? "border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <BookOpen className="h-4 w-4" /> Book Catalogue & Copies
          </button>
          <button
            onClick={() => setActiveTab("circulation")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "circulation"
                ? "border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <ArrowRightLeft className="h-4 w-4" /> Active Loans ({activeLoans.length})
          </button>
          <button
            onClick={() => setActiveTab("reservations")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "reservations"
                ? "border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <BookmarkPlus className="h-4 w-4" /> Hold Queue ({reservations.length})
          </button>
          <button
            onClick={() => setActiveTab("masters")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "masters"
                ? "border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers className="h-4 w-4" /> Masters & Racks
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "settings"
                ? "border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sliders className="h-4 w-4" /> Rules & Penalties
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "history"
                ? "border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="h-4 w-4" /> Circulation History
          </button>
        </div>

        {/* TAB 1: CATALOGUE */}
        {activeTab === "catalog" && (
          <div className="space-y-4">
            {/* Search & Category Filter */}
            <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by book title, author, or ISBN..."
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <Filter className="h-4 w-4 text-slate-400 shrink-0" />
                {categoryNames.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                      categoryFilter === cat
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Books Grid */}
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200">
                <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                <p className="text-xs text-slate-500 mt-2">Loading library catalogue...</p>
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className="text-center p-12 bg-white rounded-2xl border border-slate-200">
                <BookOpen className="h-10 w-10 text-slate-300 mx-auto" />
                <h3 className="text-base font-semibold text-slate-800 mt-2">No books found</h3>
                <p className="text-xs text-slate-500 mt-1">Try adjusting your search query or add a new book to the catalogue.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBooks.map((book) => (
                  <div
                    key={book.id}
                    className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="inline-block px-2.5 py-0.5 bg-slate-100 rounded text-[11px] font-semibold text-slate-700">
                          {book.category || "General"}
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            book.available_copies > 0
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {book.available_copies > 0 ? `${book.available_copies} Available` : "Checked Out"}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 line-clamp-1">{book.title}</h3>
                      {book.subtitle && <p className="text-xs text-slate-500 italic line-clamp-1">{book.subtitle}</p>}
                      <p className="text-xs text-slate-600 font-medium">By {book.author}</p>

                      {/* Rack / Shelf badges */}
                      <div className="flex items-center gap-2 pt-2 text-[11px] text-slate-500">
                        {book.rack_code && (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                            <MapPin className="h-3 w-3" /> Rack: {book.rack_code}
                          </span>
                        )}
                        {book.shelf_code && (
                          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                            Shelf: {book.shelf_code}
                          </span>
                        )}
                        {book.isbn && <span className="text-slate-400">ISBN: {book.isbn}</span>}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenCopies(book)}
                        className="text-xs gap-1.5 border-slate-200"
                      >
                        <QrCode className="h-3.5 w-3.5 text-indigo-600" /> Copies ({book.total_copies})
                      </Button>

                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingBook(book);
                            setBookForm({
                              title: book.title,
                              subtitle: book.subtitle || "",
                              isbn: book.isbn || "",
                              author: book.author,
                              category: book.category,
                              category_ref: book.category_ref ? String(book.category_ref) : "",
                              author_ref: book.author_ref ? String(book.author_ref) : "",
                              publisher_ref: book.publisher_ref ? String(book.publisher_ref) : "",
                              rack: book.rack ? String(book.rack) : "",
                              shelf: book.shelf ? String(book.shelf) : "",
                              edition: book.edition || "",
                              publication_year: book.publication_year || new Date().getFullYear(),
                              language: book.language || "English",
                              pages: book.pages || 200,
                              price: Number(book.price) || 150,
                              total_copies: book.total_copies,
                              description: book.description || "",
                            });
                            setShowAddBookModal(true);
                          }}
                          className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteBook(book.id)}
                          className="h-8 w-8 p-0 text-slate-500 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ACTIVE CIRCULATION */}
        {activeTab === "circulation" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">Active Book Loans</h3>
                  <p className="text-xs text-slate-500">Currently issued books requiring return or renewal</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setIssueForm({ book: "", student: "", due_date: "" });
                    setShowIssueModal(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> New Issue
                </Button>
              </div>

              {activeLoans.length === 0 ? (
                <div className="text-center p-12">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                  <p className="text-sm font-semibold text-slate-800 mt-2">All books are safely in the library!</p>
                  <p className="text-xs text-slate-400 mt-1">No active loans outstanding.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Book & Accession</th>
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Issued Date</th>
                        <th className="px-4 py-3">Due Date</th>
                        <th className="px-4 py-3">Renewals</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeLoans.map((loan) => {
                        const isOverdue = new Date(loan.due_date) < new Date();
                        return (
                          <tr key={loan.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-900">{loan.book_title}</div>
                              <div className="text-xs text-slate-500 font-mono">
                                {loan.accession_no || `BC-${loan.book}`}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-800">{loan.student_name}</div>
                              <div className="text-xs text-slate-400">
                                GR: {loan.student_gr_no || "N/A"} • Class: {loan.student_class} {loan.student_division}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {new Date(loan.book_issued_date).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3">
                              <div className={`inline-flex items-center gap-1 font-semibold ${isOverdue ? "text-rose-600" : "text-slate-700"}`}>
                                {new Date(loan.due_date).toLocaleDateString()}
                                {isOverdue && (
                                  <span className="bg-rose-100 text-rose-800 text-[10px] px-1.5 py-0.2 rounded uppercase">Overdue</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">
                                {loan.renewal_count || 0} / {librarySettings?.max_renewal_count || 2}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRenewBook(loan.id)}
                                  disabled={actionLoading}
                                  className="text-xs h-8 border-slate-200"
                                >
                                  <RotateCcw className="h-3 w-3 mr-1 text-blue-600" /> Renew
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setShowReturnModal(loan);
                                    setReturnForm({
                                      condition: "GOOD",
                                      remarks: "",
                                      damage_fee: Number(librarySettings?.damage_penalty || 50),
                                      lost_fee: Number(librarySettings?.lost_penalty || 100),
                                    });
                                  }}
                                  className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                  <CheckCircle2 className="h-3 w-3 mr-1" /> Return
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleMarkLost(loan.id)}
                                  className="text-xs h-8 text-rose-600 hover:bg-rose-50"
                                >
                                  Lost
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: RESERVATIONS QUEUE */}
        {activeTab === "reservations" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h3 className="font-bold text-slate-900">Student Reservation Waiting Queue</h3>
              <p className="text-xs text-slate-500">
                When a book has 0 available copies, students can place a hold. Upon return, the first in queue is promoted.
              </p>

              {reservations.length === 0 ? (
                <div className="text-center p-12">
                  <BookmarkPlus className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700 mt-2">No active book reservations.</p>
                </div>
              ) : (
                <div className="mt-4 divide-y divide-slate-100">
                  {reservations.map((res) => (
                    <div key={res.id} className="py-3 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{res.book_title}</span>
                          <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-0.5 rounded-full font-semibold">
                            Queue Rank #{res.queue_number}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-semibold ${
                              res.status === "AVAILABLE"
                                ? "bg-emerald-100 text-emerald-800"
                                : res.status === "WAITING"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {res.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Student: <span className="font-medium text-slate-700">{res.student_name}</span> (GR: {res.student_gr_no}) • Reserved on:{" "}
                          {new Date(res.reservation_date).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {res.status === "WAITING" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancelReservation(res.id)}
                            className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: MASTERS SETUP */}
        {activeTab === "masters" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                onClick={() => setMasterSubTab("categories")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  masterSubTab === "categories" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                Categories ({categories.length})
              </button>
              <button
                onClick={() => setMasterSubTab("authors")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  masterSubTab === "authors" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                Authors ({authors.length})
              </button>
              <button
                onClick={() => setMasterSubTab("publishers")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  masterSubTab === "publishers" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                Publishers ({publishers.length})
              </button>
              <button
                onClick={() => setMasterSubTab("racks")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  masterSubTab === "racks" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                Racks & Shelves ({racks.length} Racks)
              </button>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 capitalize">Manage {masterSubTab}</h3>
                <Button
                  size="sm"
                  onClick={() => {
                    if (masterSubTab === "categories") openAddMasterModal("category");
                    else if (masterSubTab === "authors") openAddMasterModal("author");
                    else if (masterSubTab === "publishers") openAddMasterModal("publisher");
                    else if (masterSubTab === "racks") openAddMasterModal("rack");
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> Add New {masterSubTab === "racks" ? "Rack" : masterSubTab === "categories" ? "Category" : masterSubTab === "authors" ? "Author" : "Publisher"}
                </Button>
              </div>

              {masterSubTab === "categories" && (
                <div className="space-y-3">
                  {categories.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4">No categories created yet. Click above to add one.</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {categories.map((c) => (
                        <div key={c.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                          <div className="font-bold text-slate-900">{c.name}</div>
                          {c.code && <div className="text-xs text-slate-400">Code: {c.code}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {masterSubTab === "authors" && (
                <div className="space-y-3">
                  {authors.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4">No authors created yet. Click above to add one.</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {authors.map((a) => (
                        <div key={a.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                          <div className="font-bold text-slate-900">{a.name}</div>
                          {a.code && <div className="text-xs text-slate-400">Code: {a.code}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {masterSubTab === "publishers" && (
                <div className="space-y-3">
                  {publishers.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4">No publishers created yet. Click above to add one.</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {publishers.map((p) => (
                        <div key={p.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                          <div className="font-bold text-slate-900">{p.name}</div>
                          {p.contact_no && <div className="text-xs text-slate-500">📞 {p.contact_no}</div>}
                          {p.email && <div className="text-xs text-slate-400">✉️ {p.email}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {masterSubTab === "racks" && (
                <div className="space-y-3">
                  {racks.length === 0 ? (
                    <div className="p-6 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                      <p className="text-xs text-slate-500 mb-2">No physical racks created yet.</p>
                      <Button
                        size="sm"
                        onClick={() => openAddMasterModal("rack")}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add First Rack
                      </Button>
                    </div>
                  ) : (
                    racks.map((r) => (
                      <div key={r.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-slate-900">
                            {r.rack_code} — {r.rack_name}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAddMasterModal("shelf", r.id)}
                            className="text-xs h-7 border-slate-200 bg-white"
                          >
                            <Plus className="h-3 w-3 mr-1" /> Add Shelf
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {shelves.filter((s) => s.rack === r.id).length === 0 ? (
                            <span className="text-[11px] text-slate-400 italic">No shelves added to this rack yet. Click Add Shelf.</span>
                          ) : (
                            shelves
                              .filter((s) => s.rack === r.id)
                              .map((s) => (
                                <span key={s.id} className="bg-white border border-slate-200 text-xs px-2.5 py-1 rounded shadow-2xs font-medium text-slate-700">
                                  Shelf: {s.shelf_code} ({s.shelf_name})
                                </span>
                              ))
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: RULES & PENALTIES */}
        {activeTab === "settings" && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-2xl">
            <h3 className="font-bold text-slate-900 text-lg mb-1">Library Circulation Rules & Policy</h3>
            <p className="text-xs text-slate-500 mb-6">
              Configure maximum loan limits, issue duration, renewal policies, and automatic overdue/damage penalties.
            </p>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Max Books Per Student</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={settingsForm.max_books_per_student}
                    onChange={(e) => setSettingsForm({ ...settingsForm, max_books_per_student: Number(e.target.value) })}
                    required
                  />
                  <p className="text-[11px] text-slate-400">Default: 3 books</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Loan Duration (Days)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={settingsForm.issue_duration_days}
                    onChange={(e) => setSettingsForm({ ...settingsForm, issue_duration_days: Number(e.target.value) })}
                    required
                  />
                  <p className="text-[11px] text-slate-400">Default: 14 days</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Max Renewals Allowed</Label>
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    value={settingsForm.max_renewal_count}
                    onChange={(e) => setSettingsForm({ ...settingsForm, max_renewal_count: Number(e.target.value) })}
                    required
                  />
                  <p className="text-[11px] text-slate-400">Default: 2 times</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Late Fee (₹ Per Day)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.5"
                    value={settingsForm.fine_per_day}
                    onChange={(e) => setSettingsForm({ ...settingsForm, fine_per_day: Number(e.target.value) })}
                    required
                  />
                  <p className="text-[11px] text-slate-400">Default: ₹2.00 / day</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Grace Period (Days)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={14}
                    value={settingsForm.grace_period_days}
                    onChange={(e) => setSettingsForm({ ...settingsForm, grace_period_days: Number(e.target.value) })}
                    required
                  />
                  <p className="text-[11px] text-slate-400">Days before late fee starts</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Default Book Damage Fee (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={settingsForm.damage_penalty}
                    onChange={(e) => setSettingsForm({ ...settingsForm, damage_penalty: Number(e.target.value) })}
                    required
                  />
                  <p className="text-[11px] text-slate-400">Charged on minor/major damages</p>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Lost Book Penalty Extra Fee (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={settingsForm.lost_penalty}
                    onChange={(e) => setSettingsForm({ ...settingsForm, lost_penalty: Number(e.target.value) })}
                    required
                  />
                  <p className="text-[11px] text-slate-400">Added on top of book price when lost</p>
                </div>
              </div>

              <div className="pt-4">
                <Button type="submit" disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  Save Library Rules
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 6: HISTORY */}
        {activeTab === "history" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-900">Completed Circulation History</h3>
              <p className="text-xs text-slate-500">Historical records of returned, damaged, or lost books</p>
            </div>

            {historyLoans.length === 0 ? (
              <div className="text-center p-12">
                <Clock className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-sm text-slate-500 mt-2">No circulation history yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Book</th>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Issue / Return Date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Fine Charged</th>
                      <th className="px-4 py-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyLoans.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-semibold text-slate-900">{item.book_title}</td>
                        <td className="px-4 py-3">{item.student_name}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {new Date(item.book_issued_date).toLocaleDateString()} →{" "}
                          {item.actual_return_date ? new Date(item.actual_return_date).toLocaleDateString() : "N/A"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-semibold ${
                              item.status === "RETURNED"
                                ? "bg-emerald-50 text-emerald-700"
                                : item.status === "LOST"
                                ? "bg-rose-50 text-rose-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {Number(item.total_fine || item.late_fees || 0) > 0 ? (
                            <span className="text-purple-700">₹{item.total_fine || item.late_fees}</span>
                          ) : (
                            <span className="text-slate-400">₹0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{item.remarks || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: ADD / EDIT BOOK */}
      {showAddBookModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-slate-900">{editingBook ? "Edit Book Item" : "Add New Book Master"}</h2>
              <button onClick={() => setShowAddBookModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBook} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs font-semibold">Book Title *</Label>
                  <Input
                    value={bookForm.title}
                    onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                    placeholder="e.g. Mathematics Class 10"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Author *</Label>
                  <Input
                    value={bookForm.author}
                    onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                    placeholder="e.g. R.D. Sharma"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Category / Subject *</Label>
                  <Input
                    value={bookForm.category}
                    onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
                    placeholder="e.g. Mathematics"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">ISBN (Optional)</Label>
                  <Input
                    value={bookForm.isbn}
                    onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
                    placeholder="e.g. 978-3-16-148410-0"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Book Price (₹)</Label>
                  <Input
                    type="number"
                    value={bookForm.price}
                    onChange={(e) => setBookForm({ ...bookForm, price: Number(e.target.value) })}
                    placeholder="150"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Rack Location</Label>
                  <select
                    value={bookForm.rack}
                    onChange={(e) => setBookForm({ ...bookForm, rack: e.target.value })}
                    className="w-full h-9 rounded-md border border-slate-200 px-3 text-sm"
                  >
                    <option value="">-- Select Rack --</option>
                    {racks.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.rack_code} - {r.rack_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Shelf Location</Label>
                  <select
                    value={bookForm.shelf}
                    onChange={(e) => setBookForm({ ...bookForm, shelf: e.target.value })}
                    className="w-full h-9 rounded-md border border-slate-200 px-3 text-sm"
                  >
                    <option value="">-- Select Shelf --</option>
                    {shelves.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.shelf_code} ({s.shelf_name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Total Physical Copies</Label>
                  <Input
                    type="number"
                    min={1}
                    value={bookForm.total_copies}
                    onChange={(e) => setBookForm({ ...bookForm, total_copies: Number(e.target.value) })}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Edition / Year</Label>
                  <Input
                    value={bookForm.edition}
                    onChange={(e) => setBookForm({ ...bookForm, edition: e.target.value })}
                    placeholder="e.g. 5th Edition (2026)"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowAddBookModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {editingBook ? "Update Book" : "Create Book & Generate Barcodes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ISSUE BOOK */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-slate-900">Issue Book to Student</h2>
              <button onClick={() => setShowIssueModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleIssueBook} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Select Book *</Label>
                <select
                  value={issueForm.book}
                  onChange={(e) => setIssueForm({ ...issueForm, book: e.target.value })}
                  required
                  className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm"
                >
                  <option value="">-- Choose available book --</option>
                  {books
                    .filter((b) => b.available_copies > 0)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} (Available: {b.available_copies})
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Select Student *</Label>
                <select
                  value={issueForm.student}
                  onChange={(e) => setIssueForm({ ...issueForm, student: e.target.value })}
                  required
                  className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm"
                >
                  <option value="">-- Choose student --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.surname} (GR: {s.gr_no || s.id}) - {s.school_class_name} {s.division}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Custom Due Date (Optional)</Label>
                <Input
                  type="date"
                  value={issueForm.due_date}
                  onChange={(e) => setIssueForm({ ...issueForm, due_date: e.target.value })}
                />
                <p className="text-[11px] text-slate-400">Leave blank to use default policy ({librarySettings?.issue_duration_days || 14} days).</p>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowIssueModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  Confirm Issue
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RETURN BOOK WITH CONDITION */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Return & Inspect Book</h2>
                <p className="text-xs text-slate-500">
                  {showReturnModal.book_title} — {showReturnModal.student_name}
                </p>
              </div>
              <button onClick={() => setShowReturnModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Book Physical Condition</Label>
                <select
                  value={returnForm.condition}
                  onChange={(e) => setReturnForm({ ...returnForm, condition: e.target.value })}
                  className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm font-semibold"
                >
                  <option value="GOOD">Good Condition (No Damage)</option>
                  <option value="MINOR_DAMAGE">Minor Damage (Torn pages / cover)</option>
                  <option value="MAJOR_DAMAGE">Major Damage (Water / Unusable)</option>
                  <option value="LOST">Lost Book (Student lost book)</option>
                </select>
              </div>

              {returnForm.condition !== "GOOD" && returnForm.condition !== "LOST" && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Damage Penalty Fee (₹)</Label>
                  <Input
                    type="number"
                    value={returnForm.damage_fee}
                    onChange={(e) => setReturnForm({ ...returnForm, damage_fee: Number(e.target.value) })}
                  />
                </div>
              )}

              {returnForm.condition === "LOST" && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Lost Penalty Fee (₹)</Label>
                  <Input
                    type="number"
                    value={returnForm.lost_fee}
                    onChange={(e) => setReturnForm({ ...returnForm, lost_fee: Number(e.target.value) })}
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Inspector Remarks (Optional)</Label>
                <Input
                  value={returnForm.remarks}
                  onChange={(e) => setReturnForm({ ...returnForm, remarks: e.target.value })}
                  placeholder="e.g. Returned on time, pages verified"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowReturnModal(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleFinalizeReturn}
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Complete Return
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BOOK COPIES & BARCODES */}
      {showCopiesModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-xl w-full max-h-[85vh] overflow-y-auto space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Physical Copies & Barcodes</h2>
                <p className="text-xs text-slate-500">{showCopiesModal.title}</p>
              </div>
              <button onClick={() => setShowCopiesModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Copies list */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase text-slate-500">Registered Accession Numbers</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {bookCopiesList.map((copy) => (
                  <div key={copy.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-mono text-xs font-bold text-slate-800">{copy.accession_no}</div>
                      <div className="text-[10px] text-slate-400">Barcode: {copy.barcode || "N/A"}</div>
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                        copy.status === "AVAILABLE"
                          ? "bg-emerald-100 text-emerald-800"
                          : copy.status === "ISSUED"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {copy.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Add extra copies form */}
            <form onSubmit={handleGenerateCopies} className="pt-3 border-t space-y-3">
              <h4 className="text-xs font-bold uppercase text-slate-500">Generate Additional Copies</h4>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Count</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={generateCopiesForm.count}
                    onChange={(e) => setGenerateCopiesForm({ ...generateCopiesForm, count: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Rack</Label>
                  <select
                    value={generateCopiesForm.rack_id}
                    onChange={(e) => setGenerateCopiesForm({ ...generateCopiesForm, rack_id: e.target.value })}
                    className="w-full h-9 rounded-md border border-slate-200 text-xs px-2"
                  >
                    <option value="">-- Rack --</option>
                    {racks.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.rack_code}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Shelf</Label>
                  <select
                    value={generateCopiesForm.shelf_id}
                    onChange={(e) => setGenerateCopiesForm({ ...generateCopiesForm, shelf_id: e.target.value })}
                    className="w-full h-9 rounded-md border border-slate-200 text-xs px-2"
                  >
                    <option value="">-- Shelf --</option>
                    {shelves.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.shelf_code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCopiesModal(null)}>
                  Close
                </Button>
                <Button type="submit" size="sm" disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  Generate Barcodes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD MASTER */}
      {showMasterModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold text-slate-900 capitalize">
                Add New {showMasterModal === "rack" ? "Library Rack" : showMasterModal === "shelf" ? "Rack Shelf" : showMasterModal}
              </h2>
              <button onClick={() => setShowMasterModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMaster} className="space-y-3">
              {showMasterModal === "shelf" && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Select Parent Rack *</Label>
                  <select
                    value={masterForm.extra}
                    onChange={(e) => setMasterForm({ ...masterForm, extra: e.target.value })}
                    required
                    className="w-full h-9 rounded-md border border-slate-200 text-xs px-2"
                  >
                    <option value="">-- Choose Rack --</option>
                    {racks.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.rack_code} - {r.rack_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs font-semibold">
                  {showMasterModal === "rack"
                    ? "Rack Name / Description *"
                    : showMasterModal === "shelf"
                    ? "Shelf Name / Number *"
                    : showMasterModal === "author"
                    ? "Author Full Name *"
                    : showMasterModal === "publisher"
                    ? "Publisher Name *"
                    : "Category / Subject Name *"}
                </Label>
                <Input
                  value={masterForm.name}
                  onChange={(e) => setMasterForm({ ...masterForm, name: e.target.value })}
                  placeholder={
                    showMasterModal === "rack"
                      ? "e.g. Science Section Rack A"
                      : showMasterModal === "shelf"
                      ? "e.g. Shelf 1 - Textbooks"
                      : showMasterModal === "author"
                      ? "e.g. H.C. Verma"
                      : showMasterModal === "publisher"
                      ? "e.g. Oxford University Press"
                      : "e.g. Physics / Mathematics"
                  }
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">
                  {showMasterModal === "rack"
                    ? "Rack Code *"
                    : showMasterModal === "shelf"
                    ? "Shelf Code *"
                    : "Short Code (Optional)"}
                </Label>
                <Input
                  value={masterForm.code}
                  onChange={(e) => setMasterForm({ ...masterForm, code: e.target.value })}
                  placeholder={
                    showMasterModal === "rack"
                      ? "e.g. RACK-A"
                      : showMasterModal === "shelf"
                      ? "e.g. S-01"
                      : "e.g. SCI / RDS"
                  }
                  required={showMasterModal === "rack" || showMasterModal === "shelf"}
                />
              </div>

              {showMasterModal === "publisher" && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Contact Phone (Optional)</Label>
                    <Input
                      value={masterForm.extra}
                      onChange={(e) => setMasterForm({ ...masterForm, extra: e.target.value })}
                      placeholder="+91 9876543210"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Contact Email (Optional)</Label>
                    <Input
                      value={masterForm.extra2}
                      onChange={(e) => setMasterForm({ ...masterForm, extra2: e.target.value })}
                      placeholder="contact@publisher.com"
                    />
                  </div>
                </>
              )}

              {showMasterModal === "category" && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Description (Optional)</Label>
                  <Input
                    value={masterForm.extra}
                    onChange={(e) => setMasterForm({ ...masterForm, extra: e.target.value })}
                    placeholder="Brief subject details"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowMasterModal(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                  Save Master
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
