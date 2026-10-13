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
  Receipt,
  FileText,
  CreditCard,
  BarChart3,
  Archive,
  ShieldCheck,
  Printer,
  CheckCheck,
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
  LibraryStaff,
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
  updateCategory,
  deleteCategory,
  getAuthors,
  createAuthor,
  updateAuthor,
  deleteAuthor,
  getPublishers,
  createPublisher,
  updatePublisher,
  deletePublisher,
  getRacks,
  createRack,
  updateRack,
  deleteRack,
  getShelves,
  createShelf,
  updateShelf,
  deleteShelf,
  getBookCopies,
  generateBookCopies,
  transferBookCopy,
  changeBookCopyStatus,
  deleteBookCopy,
  getReservations,
  cancelReservation,
  checkReservationExpiries,
  getLibraryStudents,
  getLibraryStaff,
  payBookFine,
  FinePaymentResult,
  getStudentClearance,
  getPendingClearanceStudents,
  StudentClearanceData,
  PendingClearanceStudentSummary,
  getInventoryAudit,
  getMostBorrowedReport,
  getCategoryTrendsReport,
  getOverdueAndLateReport,
  getFeeCollectionReport,
  getStudentActivityReport,
  InventoryAuditData,
} from "@/lib/library";

function toTitleCase(str: string | undefined | null): string {
  if (!str) return "";
  return str
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (word.includes(".")) {
        return word
          .split(".")
          .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : ""))
          .join(".");
      }
      if (word.length > 1 && word === word.toUpperCase() && !/^[0-9]+$/.test(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export default function LibrarianDashboard() {
  const [activeTab, setActiveTab] = useState<
    "catalog" | "circulation" | "clearance" | "reservations" | "reports" | "masters" | "settings" | "history"
  >("catalog");

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
  const [staffBorrowers, setStaffBorrowers] = useState<LibraryStaff[]>([]);
  const [borrowerType, setBorrowerType] = useState<"student" | "staff">("student");
  const [librarySettings, setLibrarySettings] = useState<LibrarySetting | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [masterSubTab, setMasterSubTab] = useState<"categories" | "authors" | "publishers" | "racks">("categories");

  // Form Validation State
  const [bookFormErrors, setBookFormErrors] = useState<Record<string, string>>({});

  // Notifications
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modals & New Features State
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState<BookIssued | null>(null);
  const [showCopiesModal, setShowCopiesModal] = useState<Book | null>(null);
  const [bookCopiesList, setBookCopiesList] = useState<BookCopy[]>([]);
  const [showMasterModal, setShowMasterModal] = useState<string | null>(null);
  const [editingMaster, setEditingMaster] = useState<{
    type: "category" | "author" | "publisher" | "rack" | "shelf";
    id: number;
  } | null>(null);

  // Fine Payment & Printable Receipt Modal
  const [finePaymentModal, setFinePaymentModal] = useState<BookIssued | null>(null);
  const [finePaymentForm, setFinePaymentForm] = useState({
    amount: "",
    payment_method: "Cash",
    remarks: "",
  });
  const [receiptModal, setReceiptModal] = useState<FinePaymentResult | null>(null);

  // Copy Transfer Modal
  const [transferCopyModal, setTransferCopyModal] = useState<BookCopy | null>(null);
  const [transferForm, setTransferForm] = useState({
    rack_id: "",
    shelf_id: "",
  });

  // Clearance Desk State (Section 22)
  const [pendingClearanceList, setPendingClearanceList] = useState<PendingClearanceStudentSummary[]>([]);
  const [selectedStudentClearance, setSelectedStudentClearance] = useState<StudentClearanceData | null>(null);
  const [clearanceSearchQuery, setClearanceSearchQuery] = useState("");
  const [clearanceLoading, setClearanceLoading] = useState(false);

  // Reports & Inventory Audit State (Section 20, 21, 23)
  const [inventoryAudit, setInventoryAudit] = useState<InventoryAuditData | null>(null);
  const [mostBorrowed, setMostBorrowed] = useState<any[]>([]);
  const [categoryTrends, setCategoryTrends] = useState<any[]>([]);
  const [overdueAndLate, setOverdueAndLate] = useState<any>(null);
  const [feeCollection, setFeeCollection] = useState<any>(null);
  const [studentActivity, setStudentActivity] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsSubTab, setReportsSubTab] = useState<"audit" | "borrowed" | "trends" | "overdue" | "fees">("audit");

  // Return condition form
  const [returnForm, setReturnForm] = useState({
    condition: "GOOD",
    remarks: "",
    damage_fee: 0,
    lost_fee: 0,
    pay_now: false,
    payment_method: "Cash",
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
    book_copy: "",
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
    allow_renewal_with_fine: false,
    allow_issue_with_fine: false,
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
        staffData,
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
        getLibraryStaff().catch(() => []),
        getLibrarySettings().catch(() => null),
      ]);

      setBooks(
        (booksData || []).map((b: Book) => ({
          ...b,
          title: toTitleCase(b.title),
          author: toTitleCase(b.author),
          category: toTitleCase(b.category),
          edition: b.edition ? toTitleCase(b.edition) : "",
        }))
      );
      setIssuedRecords(issuedData);
      setReservations(reservationsData);
      setCategories(catsData);
      setAuthors(authorsData);
      setPublishers(pubsData);
      setRacks(racksData);
      setShelves(shelvesData);
      setStudents(studentsData);
      setStaffBorrowers(staffData);

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
          allow_renewal_with_fine: Boolean(settingsData.allow_renewal_with_fine),
          allow_issue_with_fine: Boolean(settingsData.allow_issue_with_fine),
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
      if (b.category) set.add(toTitleCase(b.category));
    });
    categories.forEach((c) => {
      if (c.name) set.add(toTitleCase(c.name));
    });
    return ["ALL", ...Array.from(set)];
  }, [books, categories]);

  // Filtered books
  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      const matchesSearch =
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.isbn && b.isbn.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCat =
        categoryFilter === "ALL" ||
        toTitleCase(b.category) === categoryFilter;
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

  // Validation function for Book form
  const validateBookForm = () => {
    const errors: Record<string, string> = {};
    const hasLetters = (val: string) => /[a-zA-Z]/.test(val);

    const trimmedTitle = bookForm.title?.trim() || "";
    if (!trimmedTitle) {
      errors.title = "Book Title is required.";
    } else if (trimmedTitle.length < 2) {
      errors.title = "Book Title must be at least 2 characters long.";
    } else if (!hasLetters(trimmedTitle)) {
      errors.title = "Book Title must contain letters, cannot be numbers only.";
    }

    const trimmedAuthor = bookForm.author?.trim() || "";
    if (!trimmedAuthor) {
      errors.author = "Author is required.";
    } else if (trimmedAuthor.length < 2) {
      errors.author = "Author name must be at least 2 characters long.";
    } else if (!hasLetters(trimmedAuthor)) {
      errors.author = "Author name must contain valid letters, cannot be numbers only.";
    }

    const trimmedCategory = bookForm.category?.trim() || "";
    if (!trimmedCategory) {
      errors.category = "Category / Subject is required.";
    } else if (trimmedCategory.length < 2) {
      errors.category = "Category must be at least 2 characters long.";
    } else if (!hasLetters(trimmedCategory)) {
      errors.category = "Category / Subject must contain letters, cannot be numbers only.";
    }

    if (!bookForm.rack || !String(bookForm.rack).trim()) {
      errors.rack = "Please select a Rack Location.";
    }

    if (!bookForm.shelf || !String(bookForm.shelf).trim()) {
      errors.shelf = "Please select a Shelf Location.";
    }

    if (
      bookForm.total_copies === undefined ||
      bookForm.total_copies === null ||
      Number(bookForm.total_copies) < 1
    ) {
      errors.total_copies = "Total Physical Copies must be at least 1.";
    } else if (Number(bookForm.total_copies) > 500) {
      errors.total_copies = "Cannot create more than 500 physical copies at once.";
    }

    if (bookForm.price !== undefined && bookForm.price !== null && Number(bookForm.price) < 0) {
      errors.price = "Book Price cannot be negative.";
    }
    return errors;
  };

  // Handlers: Save Book
  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateBookForm();
    if (Object.keys(errors).length > 0) {
      setBookFormErrors(errors);
      showToast("error", "Please fill in all mandatory fields marked with an asterisk (*).");
      return;
    }
    setBookFormErrors({});
    setActionLoading(true);
    try {
      const payload = {
        title: toTitleCase(bookForm.title),
        subtitle: bookForm.subtitle ? toTitleCase(bookForm.subtitle) : "",
        isbn: bookForm.isbn ? bookForm.isbn.trim() : "",
        author: toTitleCase(bookForm.author),
        category: toTitleCase(bookForm.category),
        category_ref: bookForm.category_ref ? Number(bookForm.category_ref) : null,
        author_ref: bookForm.author_ref ? Number(bookForm.author_ref) : null,
        publisher_ref: bookForm.publisher_ref ? Number(bookForm.publisher_ref) : null,
        rack: bookForm.rack ? Number(bookForm.rack) : null,
        shelf: bookForm.shelf ? Number(bookForm.shelf) : null,
        edition: bookForm.edition ? toTitleCase(bookForm.edition) : "",
        publication_year: Number(bookForm.publication_year) || new Date().getFullYear(),
        language: bookForm.language || "English",
        pages: Number(bookForm.pages) || 200,
        price: Number(bookForm.price) || 0,
        description: bookForm.description || "",
        total_copies: Number(bookForm.total_copies) || 1,
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
      setBookFormErrors({});
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
        book_copy_id: issueForm.book_copy ? Number(issueForm.book_copy) : undefined,
        ...(borrowerType === "student" ? { student: Number(issueForm.student) } : { staff: Number(issueForm.student) }),
        due_date: issueForm.due_date || undefined,
      });
      showToast("success", `Book successfully issued to ${borrowerType}!`);
      setShowIssueModal(false);
      setIssueForm({ book: "", book_copy: "", student: "", due_date: "" });
      await loadAllData();
    } catch (err: any) {
      showToast("error", err.message || "Failed to issue book.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handlers: Return Book with Condition & Pay Now
  const handleFinalizeReturn = async () => {
    if (!showReturnModal) return;
    setActionLoading(true);
    try {
      const res = await returnBookWithCondition(showReturnModal.id, {
        condition: returnForm.condition,
        remarks: returnForm.remarks,
        damage_fee: Number(returnForm.damage_fee) || undefined,
        lost_fee: Number(returnForm.lost_fee) || undefined,
        pay_now: returnForm.pay_now,
        payment_method: returnForm.payment_method,
      });
      const fineMsg = Number(res.total_fine) > 0 
        ? ` (Fine: ₹${res.total_fine}${returnForm.pay_now ? " - Paid" : " - Pending"})` 
        : "";
      showToast("success", `Book marked as ${res.status}${fineMsg}`);
      setShowReturnModal(null);
      await loadAllData();
    } catch (err: any) {
      showToast("error", err.message || "Failed to return book.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handlers: Pay Fine
  const handleOpenPayFine = (record: BookIssued) => {
    const total = Number(record.total_fine || 0);
    const paid = Number(record.fine_paid_amount || 0);
    const remaining = Math.max(0, total - paid);
    setFinePaymentModal(record);
    setFinePaymentForm({
      amount: String(remaining),
      payment_method: "Cash",
      remarks: "",
    });
  };

  const handleSubmitPayFine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finePaymentModal) return;
    setActionLoading(true);
    try {
      const result = await payBookFine(finePaymentModal.id, {
        amount: Number(finePaymentForm.amount),
        payment_method: finePaymentForm.payment_method,
      });
      showToast("success", `Fine payment recorded! Receipt No: ${result.receipt_no}`);
      setFinePaymentModal(null);
      setReceiptModal(result);
      await loadAllData();
      if (selectedStudentClearance) {
        handleSearchStudentClearance(selectedStudentClearance.student_id);
      }
    } catch (err: any) {
      showToast("error", err.message || "Failed to collect fine payment.");
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

  // Handlers: Transfer Copy
  const handleTransferCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferCopyModal) return;
    setActionLoading(true);
    try {
      await transferBookCopy(transferCopyModal.id, {
        rack_id: transferForm.rack_id ? Number(transferForm.rack_id) : null,
        shelf_id: transferForm.shelf_id ? Number(transferForm.shelf_id) : null,
      });
      showToast("success", `Copy ${transferCopyModal.accession_no} transferred successfully!`);
      setTransferCopyModal(null);
      if (showCopiesModal) {
        const updated = await getBookCopies(showCopiesModal.id);
        setBookCopiesList(updated);
      }
      await loadAllData();
    } catch (err: any) {
      showToast("error", err.message || "Failed to transfer copy.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handlers: Change Copy Status
  const handleChangeCopyStatus = async (copyId: number, newStatus: string) => {
    setActionLoading(true);
    try {
      await changeBookCopyStatus(copyId, { status: newStatus });
      showToast("success", `Copy status updated to ${newStatus}`);
      if (showCopiesModal) {
        const updated = await getBookCopies(showCopiesModal.id);
        setBookCopiesList(updated);
      }
      await loadAllData();
    } catch (err: any) {
      showToast("error", err.message || "Failed to update copy status.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handlers: Dispose Copy
  const handleDisposeCopy = async (copyId: number) => {
    if (!confirm("Are you sure you want to DISPOSE this physical copy? Historical transaction records will be preserved.")) return;
    setActionLoading(true);
    try {
      await deleteBookCopy(copyId);
      showToast("success", "Physical copy marked as DISPOSED.");
      if (showCopiesModal) {
        const updated = await getBookCopies(showCopiesModal.id);
        setBookCopiesList(updated);
      }
      await loadAllData();
    } catch (err: any) {
      showToast("error", err.message || "Failed to dispose copy.");
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

  // Handlers: Save Master (Create or Update)
  const openAddMasterModal = (type: "category" | "author" | "publisher" | "rack" | "shelf", defaultParentRack?: number) => {
    setEditingMaster(null);
    setMasterForm({
      name: "",
      code: "",
      extra: defaultParentRack ? String(defaultParentRack) : (racks.length > 0 ? String(racks[0].id) : ""),
      extra2: "",
    });
    setShowMasterModal(type);
  };

  const openEditMasterModal = (type: "category" | "author" | "publisher" | "rack" | "shelf", item: any) => {
    setEditingMaster({ type, id: item.id });
    if (type === "category") {
      setMasterForm({ name: item.name, code: item.code || "", extra: item.description || "", extra2: "" });
    } else if (type === "author") {
      setMasterForm({ name: item.name, code: item.code || "", extra: item.biography || "", extra2: "" });
    } else if (type === "publisher") {
      setMasterForm({ name: item.name, code: item.code || "", extra: item.contact_no || "", extra2: item.email || "" });
    } else if (type === "rack") {
      setMasterForm({ name: item.rack_name, code: item.rack_code || "", extra: item.description || "", extra2: "" });
    } else if (type === "shelf") {
      setMasterForm({ name: item.shelf_name, code: item.shelf_code || "", extra: String(item.rack), extra2: "" });
    }
    setShowMasterModal(type);
  };

  const handleSaveMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (showMasterModal === "category") {
        const payload = {
          name: masterForm.name.trim(),
          code: masterForm.code.trim() || undefined,
          description: masterForm.extra,
        };
        if (editingMaster) {
          await updateCategory(editingMaster.id, payload);
          showToast("success", "Category updated!");
        } else {
          await createCategory(payload);
          showToast("success", "Book Category added!");
        }
      } else if (showMasterModal === "author") {
        const payload = {
          name: masterForm.name.trim(),
          code: masterForm.code.trim() || undefined,
          biography: masterForm.extra,
        };
        if (editingMaster) {
          await updateAuthor(editingMaster.id, payload);
          showToast("success", "Author updated!");
        } else {
          await createAuthor(payload);
          showToast("success", "Author added!");
        }
      } else if (showMasterModal === "publisher") {
        const payload = {
          name: masterForm.name.trim(),
          code: masterForm.code.trim() || undefined,
          contact_no: masterForm.extra,
          email: masterForm.extra2,
        };
        if (editingMaster) {
          await updatePublisher(editingMaster.id, payload);
          showToast("success", "Publisher updated!");
        } else {
          await createPublisher(payload);
          showToast("success", "Publisher added!");
        }
      } else if (showMasterModal === "rack") {
        const payload = {
          rack_name: masterForm.name.trim(),
          rack_code: masterForm.code.trim() || masterForm.name.trim().toUpperCase().replace(/\s+/g, "-"),
          description: masterForm.extra,
        };
        if (editingMaster) {
          await updateRack(editingMaster.id, payload);
          showToast("success", "Rack updated!");
        } else {
          await createRack(payload);
          showToast("success", "Library Rack added!");
        }
      } else if (showMasterModal === "shelf") {
        const payload = {
          rack: Number(masterForm.extra),
          shelf_name: masterForm.name.trim(),
          shelf_code: masterForm.code.trim() || masterForm.name.trim().toUpperCase().replace(/\s+/g, "-"),
        };
        if (editingMaster) {
          await updateShelf(editingMaster.id, payload);
          showToast("success", "Shelf updated!");
        } else {
          await createShelf(payload);
          showToast("success", "Shelf added!");
        }
      }
      setShowMasterModal(null);
      setEditingMaster(null);
      setMasterForm({ name: "", code: "", extra: "", extra2: "" });
      await loadAllData();
    } catch (err: any) {
      showToast("error", err.message || "Failed to save master.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteMaster = async (type: "category" | "author" | "publisher" | "rack" | "shelf", id: number) => {
    if (!confirm(`Are you sure you want to delete this ${type}? It will be deactivated safely.`)) return;
    setActionLoading(true);
    try {
      if (type === "category") await deleteCategory(id);
      else if (type === "author") await deleteAuthor(id);
      else if (type === "publisher") await deletePublisher(id);
      else if (type === "rack") await deleteRack(id);
      else if (type === "shelf") await deleteShelf(id);
      showToast("success", `${type} deactivated successfully.`);
      await loadAllData();
    } catch (err: any) {
      showToast("error", err.message || `Failed to delete ${type}.`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handlers: Cancel & Sweep Reservations
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

  const handleSweepHoldExpiries = async () => {
    setActionLoading(true);
    try {
      const res = await checkReservationExpiries();
      showToast("success", res.detail || `Hold sweep completed: ${res.expired_count} expired.`);
      await loadAllData();
    } catch (err: any) {
      showToast("error", err.message || "Failed to sweep reservation hold expiries.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handlers: Clearance Desk
  const loadPendingClearance = useCallback(async () => {
    setClearanceLoading(true);
    try {
      const res = await getPendingClearanceStudents();
      setPendingClearanceList(res.results || []);
    } catch {
      setPendingClearanceList([]);
    } finally {
      setClearanceLoading(false);
    }
  }, []);

  const handleSearchStudentClearance = async (studentId?: number) => {
    setClearanceLoading(true);
    try {
      const idToSearch = studentId || (clearanceSearchQuery ? Number(clearanceSearchQuery) : undefined);
      if (!idToSearch) {
        showToast("error", "Please select or enter a Student ID or GR Number.");
        return;
      }
      const res = await getStudentClearance(idToSearch);
      setSelectedStudentClearance(res);
    } catch (err: any) {
      showToast("error", err.message || "Student clearance record not found.");
    } finally {
      setClearanceLoading(false);
    }
  };

  // Handlers: Reports & Audit
  const loadReportsData = useCallback(async () => {
    setReportsLoading(true);
    try {
      const [audit, borrowed, trends, overdue, fees, activity] = await Promise.all([
        getInventoryAudit().catch(() => null),
        getMostBorrowedReport(10).catch(() => []),
        getCategoryTrendsReport().catch(() => []),
        getOverdueAndLateReport().catch(() => null),
        getFeeCollectionReport().catch(() => null),
        getStudentActivityReport(15).catch(() => []),
      ]);
      setInventoryAudit(audit);
      setMostBorrowed(borrowed);
      setCategoryTrends(trends);
      setOverdueAndLate(overdue);
      setFeeCollection(fees);
      setStudentActivity(activity);
    } catch {
      showToast("error", "Failed to load library reports data.");
    } finally {
      setReportsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "clearance") {
      loadPendingClearance();
    } else if (activeTab === "reports") {
      loadReportsData();
    }
  }, [activeTab, loadPendingClearance, loadReportsData]);

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
        {/* Executive Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-xl border border-slate-800">
          <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          <div className="absolute right-1/3 -bottom-12 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-3.5 py-1 text-xs font-semibold text-indigo-300 border border-indigo-400/20 backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                <span>Enterprise Library Operations</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-indigo-400" />
                Library & Circulation Desk
              </h1>
              <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
                Manage physical catalogue titles, barcode accessioning, checkout & return counters, penalty registers, and student hold waitlists.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
              <button
                type="button"
                onClick={loadAllData}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 text-xs font-bold border border-white/20 backdrop-blur-sm transition-all shadow-sm active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh Desk
              </button>
              <button
                type="button"
                onClick={() => {
                  setIssueForm({ book: "", book_copy: "", student: "", due_date: "" });
                  setShowIssueModal(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
              >
                <ArrowRightLeft className="h-4 w-4" /> Issue Book
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingBook(null);
                  setBookFormErrors({});
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
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
              >
                <Plus className="h-4 w-4" /> Add New Book
              </button>
            </div>
          </div>
        </div>

        {/* Six Telemetry Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
          {/* Card 1: Total Titles */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-2xs hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Titles</span>
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <BookOpen className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-900">{stats.titlesCount}</div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                <span>{stats.totalBooksCount} Physical Copies</span>
              </div>
            </div>
          </div>

          {/* Card 2: Available Copies */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-2xs hover:shadow-md hover:border-emerald-200 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Available</span>
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-emerald-600">{stats.availableCopies}</div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Ready to lend</span>
              </div>
            </div>
          </div>

          {/* Card 3: Active Loans */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-2xs hover:shadow-md hover:border-blue-200 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Issued Active</span>
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <ArrowRightLeft className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-blue-600">{stats.activeLoansCount}</div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium text-blue-700">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                <span>In Circulation</span>
              </div>
            </div>
          </div>

          {/* Card 4: Overdue */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-2xs hover:shadow-md hover:border-rose-200 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Overdue</span>
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-rose-600">{stats.overdueCount}</div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium text-rose-700">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                <span>Past Due Date</span>
              </div>
            </div>
          </div>

          {/* Card 5: Hold Queue */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-2xs hover:shadow-md hover:border-amber-200 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Reservations</span>
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                <BookmarkPlus className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-amber-600">{stats.waitingReservationsCount}</div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <span>In Hold Queue</span>
              </div>
            </div>
          </div>

          {/* Card 6: Fine Revenue */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-2xs hover:shadow-md hover:border-purple-200 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Fines Owed/Paid</span>
              <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-100">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-purple-700">₹{stats.totalFinesCollected.toLocaleString("en-IN")}</div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium text-purple-700">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                <span>Late & Fees Owed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Segmented Navigation Tabs */}
        <div className="bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: "catalog", label: "Book Catalogue & Copies", icon: BookOpen, count: books.length },
            { id: "circulation", label: "Active Loans", icon: ArrowRightLeft, count: activeLoans.length },
            { id: "clearance", label: "Clearance Desk", icon: ShieldCheck },
            { id: "reservations", label: "Hold Queue", icon: BookmarkPlus, count: reservations.length },
            { id: "reports", label: "Reports & Audit", icon: BarChart3 },
            { id: "masters", label: "Masters & Racks", icon: Layers },
            { id: "settings", label: "Rules & Penalties", icon: Sliders },
            { id: "history", label: "Circulation History", icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? "bg-white text-indigo-600 shadow-sm border border-slate-200/60"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-indigo-600" : "text-slate-500"}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                      isActive ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: CATALOGUE */}
        {activeTab === "catalog" && (
          <div className="space-y-4">
            {/* Search & Category Filter */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-indigo-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by book title, author, or ISBN barcode..."
                  className="pl-10 rounded-xl border-slate-200 focus:border-indigo-600 focus:ring-indigo-600/20 text-xs sm:text-sm"
                />
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                <div className="flex items-center gap-1 text-xs font-bold text-slate-400 px-2 shrink-0">
                  <Filter className="h-3.5 w-3.5" /> Filter:
                </div>
                {categoryNames.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap active:scale-95 ${
                      categoryFilter === cat
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
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
                    className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-lg hover:border-indigo-200 transition-all flex flex-col justify-between gap-4 group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="inline-block px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-[11px] font-bold tracking-wide">
                          {toTitleCase(book.category) || "General"}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                            book.available_copies > 0
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              book.available_copies > 0 ? "bg-emerald-500" : "bg-rose-500"
                            }`}
                          />
                          {book.available_copies > 0 ? `${book.available_copies} Available` : "Checked Out"}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                          {toTitleCase(book.title)}
                        </h3>
                        {book.subtitle && (
                          <p className="text-xs text-slate-500 italic line-clamp-1 mt-0.5">{toTitleCase(book.subtitle)}</p>
                        )}
                        <p className="text-xs text-slate-600 font-semibold mt-1">By {toTitleCase(book.author)}</p>
                      </div>

                      {/* Rack / Shelf badges */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                        {book.rack_code && (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200 font-medium">
                            <MapPin className="h-3 w-3 text-amber-600" /> Rack {book.rack_code}
                          </span>
                        )}
                        {book.shelf_code && (
                          <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-800 px-2 py-0.5 rounded-md border border-sky-200 font-medium">
                            Shelf {book.shelf_code}
                          </span>
                        )}
                        {book.isbn && (
                          <span className="text-slate-400 font-mono text-[10px]">ISBN {book.isbn}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenCopies(book)}
                        className="text-xs gap-1.5 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 font-bold rounded-xl"
                      >
                        <QrCode className="h-3.5 w-3.5 text-indigo-600" /> Copies ({book.total_copies})
                      </Button>

                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingBook(book);
                            setBookFormErrors({});
                            setBookForm({
                              title: toTitleCase(book.title),
                              subtitle: toTitleCase(book.subtitle || ""),
                              isbn: book.isbn || "",
                              author: toTitleCase(book.author),
                              category: toTitleCase(book.category),
                              category_ref: book.category_ref ? String(book.category_ref) : "",
                              author_ref: book.author_ref ? String(book.author_ref) : "",
                              publisher_ref: book.publisher_ref ? String(book.publisher_ref) : "",
                              rack: book.rack ? String(book.rack) : "",
                              shelf: book.shelf ? String(book.shelf) : "",
                              edition: toTitleCase(book.edition || ""),
                              publication_year: book.publication_year || new Date().getFullYear(),
                              language: book.language || "English",
                              pages: book.pages || 200,
                              price: Number(book.price) || 0,
                              total_copies: book.total_copies,
                              description: book.description || "",
                            });
                            setShowAddBookModal(true);
                          }}
                          className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600 rounded-lg"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteBook(book.id)}
                          className="h-8 w-8 p-0 text-slate-500 hover:text-rose-600 rounded-lg"
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
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="p-5 border-b border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Active Book Loans Counter</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Currently circulating physical copies requiring return or renewal</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setIssueForm({ book: "", book_copy: "", student: "", due_date: "" });
                    setShowIssueModal(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 rounded-xl font-bold shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" /> New Issue Loan
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
                        <th className="px-4 py-3">Student / Staff</th>
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
                              <div className="font-medium text-slate-800">{loan.staff_name || loan.student_name}</div>
                              <div className="text-xs text-slate-400">
                                {loan.staff ? `Staff #${loan.staff} • ${loan.staff_role || ""}` : `GR: ${loan.student_gr_no || "N/A"} • Class: ${loan.student_class || ""} ${loan.student_division || ""}`}
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
                                      pay_now: false,
                                      payment_method: "CASH",
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

        {/* TAB: CLEARANCE DESK (SECTION 22) */}
        {activeTab === "clearance" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-indigo-50 border border-indigo-200 text-indigo-700">
                    Section 22 • Library Dues & TC Clearance
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mt-1">
                    <ShieldCheck className="h-5 w-5 text-indigo-600" /> Student Library Clearance Desk
                  </h2>
                  <p className="text-xs text-slate-500">
                    Verify no-dues status before issuing Transfer Certificates (TC) or year-end promotion.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadPendingClearance}
                  disabled={clearanceLoading}
                  className="text-xs gap-1.5 bg-white"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${clearanceLoading ? "animate-spin" : ""}`} /> Refresh Clearance List
                </Button>
              </div>

              <div className="pt-2">
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">Check Individual Student Clearance Status</Label>
                <select
                  value={clearanceSearchQuery}
                  onChange={(e) => {
                    setClearanceSearchQuery(e.target.value);
                    if (e.target.value) handleSearchStudentClearance(Number(e.target.value));
                  }}
                  className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white"
                >
                  <option value="">-- Select student from database --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.surname || ""} (GR: {s.gr_no || s.id}) • Class: {s.school_class_name || ""} {s.division || ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Clearance Status Card if Student is Selected */}
            {selectedStudentClearance && (
              <div className={`p-6 rounded-2xl border ${selectedStudentClearance.is_cleared ? "bg-emerald-50/60 border-emerald-200" : "bg-rose-50/60 border-rose-200"} space-y-5 shadow-sm`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${selectedStudentClearance.is_cleared ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                        {selectedStudentClearance.status}
                      </span>
                      <h3 className="text-xl font-bold text-slate-900">{selectedStudentClearance.student_name}</h3>
                    </div>
                    <p className="text-xs text-slate-600">
                      GR No: <span className="font-semibold text-slate-800">{selectedStudentClearance.gr_no || "N/A"}</span> • Class: <span className="font-semibold text-slate-800">{selectedStudentClearance.class_name || "N/A"}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedStudentClearance.is_cleared ? (
                      <Button
                        onClick={() => window.print()}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm font-medium"
                      >
                        <Printer className="h-4 w-4" /> Print Clearance Certificate
                      </Button>
                    ) : (
                      <div className="text-right">
                        <div className="text-xs font-semibold text-rose-700 uppercase">Total Dues Pending</div>
                        <div className="text-2xl font-black text-rose-700">₹{selectedStudentClearance.pending_fine_amount}</div>
                      </div>
                    )}
                  </div>
                </div>

                {!selectedStudentClearance.is_cleared && (
                  <div className="bg-white p-4 rounded-xl border border-rose-200 space-y-2">
                    <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wide">Outstanding Items Blocking Clearance:</h4>
                    <ul className="space-y-1.5 text-xs text-rose-700">
                      {selectedStudentClearance.pending_reasons.map((r, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedStudentClearance.issued_books.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
                      Unreturned Books Checked Out ({selectedStudentClearance.issued_books.length})
                    </div>
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                        <tr>
                          <th className="px-4 py-2.5">Book Title</th>
                          <th className="px-4 py-2.5">Accession / Barcode</th>
                          <th className="px-4 py-2.5">Due Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedStudentClearance.issued_books.map((b) => (
                          <tr key={b.id}>
                            <td className="px-4 py-2.5 font-semibold text-slate-900">{b.title}</td>
                            <td className="px-4 py-2.5 font-mono text-slate-600">{b.accession_no || "—"}</td>
                            <td className="px-4 py-2.5 text-rose-600 font-medium">{new Date(b.due_date).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {selectedStudentClearance.unpaid_fine_records.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
                      Unpaid Fine & Penalty Records ({selectedStudentClearance.unpaid_fine_records.length})
                    </div>
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                        <tr>
                          <th className="px-4 py-2.5">Book Title</th>
                          <th className="px-4 py-2.5">Reason</th>
                          <th className="px-4 py-2.5">Total Fine</th>
                          <th className="px-4 py-2.5">Paid</th>
                          <th className="px-4 py-2.5">Due</th>
                          <th className="px-4 py-2.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedStudentClearance.unpaid_fine_records.map((f) => (
                          <tr key={f.id}>
                            <td className="px-4 py-2.5 font-semibold text-slate-900">{f.title}</td>
                            <td className="px-4 py-2.5 text-slate-600">{f.reason}</td>
                            <td className="px-4 py-2.5 font-mono text-slate-700">₹{f.total_fine}</td>
                            <td className="px-4 py-2.5 font-mono text-emerald-600">₹{f.paid_amount}</td>
                            <td className="px-4 py-2.5 font-mono font-bold text-rose-600">₹{f.due_amount}</td>
                            <td className="px-4 py-2.5 text-right">
                              <Button
                                size="sm"
                                onClick={() => {
                                  const record = issuedRecords.find((r) => r.id === f.id);
                                  if (record) handleOpenPayFine(record);
                                }}
                                className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1"
                              >
                                <CreditCard className="h-3 w-3" /> Collect
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* List of All Students with Pending Dues across school */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-5">
              <div>
                <h3 className="font-bold text-slate-900">Students with Outstanding Library Dues</h3>
                <p className="text-xs text-slate-500">
                  {pendingClearanceList.length} students currently cannot receive clearance / TC
                </p>
              </div>

              {pendingClearanceList.length === 0 ? (
                <div className="text-center p-8">
                  <CheckCheck className="h-8 w-8 text-emerald-500 mx-auto" />
                  <p className="text-sm font-semibold text-slate-800 mt-2">All students are 100% cleared!</p>
                  <p className="text-xs text-slate-400 mt-1">No unreturned books or pending fines in the system.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Student Name</th>
                        <th className="px-4 py-3">GR No</th>
                        <th className="px-4 py-3">Class</th>
                        <th className="px-4 py-3">Unreturned Books</th>
                        <th className="px-4 py-3">Fine Due (₹)</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pendingClearanceList.map((st) => (
                        <tr key={st.student_id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-semibold text-slate-900">{st.student_name}</td>
                          <td className="px-4 py-3 font-mono text-slate-600">{st.gr_no || "N/A"}</td>
                          <td className="px-4 py-3 text-slate-600">{st.class_name || "N/A"}</td>
                          <td className="px-4 py-3">
                            {st.active_books_count > 0 ? (
                              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold font-mono">
                                {st.active_books_count} book(s)
                              </span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-rose-600">
                            {Number(st.pending_fine_total) > 0 ? `₹${st.pending_fine_total}` : "₹0"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSearchStudentClearance(st.student_id)}
                              className="h-7 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                            >
                              View Desk
                            </Button>
                          </td>
                        </tr>
                      ))}
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                <div>
                  <h3 className="font-bold text-slate-900">Student Reservation Waiting Queue</h3>
                  <p className="text-xs text-slate-500">
                    When a book has 0 available copies, students can place a hold. Holds expire after 48h if uncollected.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSweepHoldExpiries}
                  disabled={actionLoading}
                  className="text-xs border-amber-200 text-amber-700 hover:bg-amber-50 gap-1.5 self-start sm:self-auto"
                >
                  <Clock className="h-3.5 w-3.5" /> Sweep Expired Holds (48h)
                </Button>
              </div>

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
                          {res.expiry_date && ` • Expires: ${new Date(res.expiry_date).toLocaleDateString()}`}
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

        {/* TAB: REPORTS & INVENTORY AUDIT (SECTION 20, 21, 23) */}
        {activeTab === "reports" && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
              <button
                onClick={() => setReportsSubTab("audit")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                  reportsSubTab === "audit" ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Archive className="h-3.5 w-3.5" /> Year-End Inventory Audit (Section 23)
              </button>
              <button
                onClick={() => setReportsSubTab("borrowed")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                  reportsSubTab === "borrowed" ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <TrendingUp className="h-3.5 w-3.5" /> Most Borrowed Titles (Section 21)
              </button>
              <button
                onClick={() => setReportsSubTab("trends")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                  reportsSubTab === "trends" ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Layers className="h-3.5 w-3.5" /> Category Trends
              </button>
              <button
                onClick={() => setReportsSubTab("overdue")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                  reportsSubTab === "overdue" ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Clock className="h-3.5 w-3.5" /> Overdue Loans & Delays
              </button>
              <button
                onClick={() => setReportsSubTab("fees")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                  reportsSubTab === "fees" ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <DollarSign className="h-3.5 w-3.5" /> Fine Revenue & Dues
              </button>
            </div>

            {/* Sub-tab 1: Academic Year Closing Inventory Verification */}
            {reportsSubTab === "audit" && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-amber-50 border border-amber-200 text-amber-800">
                        Section 23 • Academic Year Closing
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mt-1">Physical Stock & Inventory Audit</h3>
                      <p className="text-xs text-slate-500">
                        Annual verification of total book titles, physical copies by condition/state, overdue loans, and financial pending fine balance.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={loadReportsData}
                      disabled={reportsLoading}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${reportsLoading ? "animate-spin" : ""}`} /> Run Live Audit
                    </Button>
                  </div>

                  {inventoryAudit && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="text-xs font-semibold text-slate-500 uppercase">Catalog Titles</div>
                        <div className="text-2xl font-bold text-slate-900 mt-1">{inventoryAudit.total_titles}</div>
                        <div className="text-[11px] text-slate-400">Unique catalog books</div>
                      </div>

                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <div className="text-xs font-semibold text-blue-700 uppercase">Active Physical Copies</div>
                        <div className="text-2xl font-bold text-blue-700 mt-1">{inventoryAudit.total_physical_copies}</div>
                        <div className="text-[11px] text-blue-500">Tracked with barcode/accession</div>
                      </div>

                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <div className="text-xs font-semibold text-emerald-700 uppercase">Available On Shelf</div>
                        <div className="text-2xl font-bold text-emerald-700 mt-1">{inventoryAudit.available_copies}</div>
                        <div className="text-[11px] text-emerald-500">Ready to lend</div>
                      </div>

                      <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                        <div className="text-xs font-semibold text-indigo-700 uppercase">Currently Issued</div>
                        <div className="text-2xl font-bold text-indigo-700 mt-1">{inventoryAudit.issued_copies}</div>
                        <div className="text-[11px] text-indigo-500">Checked out to borrowers</div>
                      </div>

                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <div className="text-xs font-semibold text-amber-700 uppercase">Under Repair</div>
                        <div className="text-2xl font-bold text-amber-700 mt-1">{inventoryAudit.under_repair_copies}</div>
                        <div className="text-[11px] text-amber-500">Binding / restoration</div>
                      </div>

                      <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                        <div className="text-xs font-semibold text-orange-700 uppercase">Damaged Copies</div>
                        <div className="text-2xl font-bold text-orange-700 mt-1">{inventoryAudit.damaged_copies}</div>
                        <div className="text-[11px] text-orange-500">Needs assessment</div>
                      </div>

                      <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
                        <div className="text-xs font-semibold text-rose-700 uppercase">Lost Copies</div>
                        <div className="text-2xl font-bold text-rose-700 mt-1">{inventoryAudit.lost_copies}</div>
                        <div className="text-[11px] text-rose-500">Reported missing</div>
                      </div>

                      <div className="p-4 bg-slate-100 border border-slate-300 rounded-xl">
                        <div className="text-xs font-semibold text-slate-600 uppercase">Disposed / Written Off</div>
                        <div className="text-2xl font-bold text-slate-700 mt-1">{inventoryAudit.disposed_copies}</div>
                        <div className="text-[11px] text-slate-500">Preserved in history</div>
                      </div>
                    </div>
                  )}

                  {inventoryAudit && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                      <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-rose-700 uppercase">Overdue Active Loans</div>
                          <div className="text-2xl font-black text-rose-700 mt-0.5">{inventoryAudit.total_overdue_loans}</div>
                        </div>
                        <Clock className="h-8 w-8 text-rose-300" />
                      </div>

                      <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-amber-700 uppercase">Pending Fine Dues</div>
                          <div className="text-2xl font-black text-amber-700 mt-0.5">₹{inventoryAudit.total_pending_fines}</div>
                          <div className="text-[10px] text-amber-600 mt-0.5">{inventoryAudit.borrowers_with_pending_fines_count} borrower(s) owing</div>
                        </div>
                        <DollarSign className="h-8 w-8 text-amber-300" />
                      </div>

                      <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-emerald-700 uppercase">Total Fine Collected</div>
                          <div className="text-2xl font-black text-emerald-700 mt-0.5">₹{inventoryAudit.total_collected_fines}</div>
                          <div className="text-[10px] text-emerald-600 mt-0.5">Realized revenue</div>
                        </div>
                        <Receipt className="h-8 w-8 text-emerald-300" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sub-tab 2: Most Borrowed Titles */}
            {reportsSubTab === "borrowed" && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-3">
                <div>
                  <h3 className="font-bold text-slate-900">Most Borrowed Titles</h3>
                  <p className="text-xs text-slate-500">Ranks most popular library items across all historical loans</p>
                </div>
                {mostBorrowed.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No borrowing data yet.</p>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b">
                      <tr>
                        <th className="px-4 py-3">Rank</th>
                        <th className="px-4 py-3">Book Title</th>
                        <th className="px-4 py-3">Author</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3 text-right">Times Issued</th>
                        <th className="px-4 py-3 text-right">Available Copies</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {mostBorrowed.map((b, idx) => (
                        <tr key={b.book_id || idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-bold text-indigo-600">#{idx + 1}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{b.title}</td>
                          <td className="px-4 py-3 text-slate-600">{b.author}</td>
                          <td className="px-4 py-3 text-slate-500">{b.category}</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">{b.times_issued} times</td>
                          <td className="px-4 py-3 text-right font-mono text-emerald-600">{b.available_copies} / {b.total_copies}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Sub-tab 3: Category Trends */}
            {reportsSubTab === "trends" && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                <div>
                  <h3 className="font-bold text-slate-900">Category Popularity & Issues</h3>
                  <p className="text-xs text-slate-500">Breakdown of loans per subject / category</p>
                </div>
                {categoryTrends.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No category issue data recorded.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {categoryTrends.map((c, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900">{c.category || "Uncategorized"}</div>
                          <div className="text-xs text-slate-400 mt-0.5">Category circulation</div>
                        </div>
                        <div className="text-xl font-black text-indigo-600">{c.times_issued}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 4: Overdue Loans & Delays */}
            {reportsSubTab === "overdue" && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900">Currently Overdue Loans Analysis</h3>
                    <p className="text-xs text-slate-500">Books exceeding due date + grace period</p>
                  </div>
                  {overdueAndLate && (
                    <div className="px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs font-semibold">
                      Historical Late Return Rate: {Number(overdueAndLate.historical_late_rate || 0).toFixed(1)}%
                    </div>
                  )}
                </div>

                {!overdueAndLate || overdueAndLate.currently_overdue?.length === 0 ? (
                  <div className="text-center p-8">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                    <p className="text-sm font-semibold text-slate-700 mt-2">Zero overdue loans!</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b">
                        <tr>
                          <th className="px-4 py-3">Book Title</th>
                          <th className="px-4 py-3">Borrower</th>
                          <th className="px-4 py-3">Due Date</th>
                          <th className="px-4 py-3">Days Overdue</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {overdueAndLate.currently_overdue.map((item: any) => (
                          <tr key={item.loan_id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-semibold text-slate-900">{item.book_title}</td>
                            <td className="px-4 py-3 text-slate-700">{item.borrower_name}</td>
                            <td className="px-4 py-3 text-rose-600 font-mono">{new Date(item.due_date).toLocaleDateString()}</td>
                            <td className="px-4 py-3 font-bold text-rose-700">+{item.days_overdue} days</td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                size="sm"
                                onClick={() => {
                                  const loan = issuedRecords.find((r) => r.id === item.loan_id);
                                  if (loan) {
                                    setShowReturnModal(loan);
                                    setReturnForm({
                                      condition: "GOOD",
                                      remarks: "",
                                      damage_fee: 0,
                                      lost_fee: 0,
                                      pay_now: false,
                                      payment_method: "Cash",
                                    });
                                  }
                                }}
                                className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                              >
                                Process Return
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 5: Fee Collection */}
            {reportsSubTab === "fees" && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">Fine Revenue & Late Fee Collection</h3>
                    <p className="text-xs text-slate-500">Collected fines across all time</p>
                  </div>
                  {feeCollection && (
                    <div className="text-xl font-bold text-purple-700">
                      Total: ₹{feeCollection.total_fees_collected || 0}
                    </div>
                  )}
                </div>

                {feeCollection?.monthly_breakdown?.length > 0 ? (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b">
                      <tr>
                        <th className="px-4 py-3">Month</th>
                        <th className="px-4 py-3">Late Returns Count</th>
                        <th className="px-4 py-3 text-right">Fee Collected (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {feeCollection.monthly_breakdown.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-semibold text-slate-900">{row.month}</td>
                          <td className="px-4 py-3 text-slate-600">{row.late_returns} returns</td>
                          <td className="px-4 py-3 text-right font-bold text-purple-700">₹{row.total_fees}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-xs text-slate-400 py-6 text-center">No fee breakdown records available yet.</p>
                )}
              </div>
            )}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      {categories.map((c) => (
                        <div key={c.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-900">{c.name}</div>
                            {c.code && <div className="text-xs text-slate-400">Code: {c.code}</div>}
                            {c.description && <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{c.description}</div>}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditMasterModal("category", c)}
                              className="h-7 w-7 p-0 text-slate-500 hover:text-indigo-600"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteMaster("category", c.id)}
                              className="h-7 w-7 p-0 text-slate-500 hover:text-rose-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      {authors.map((a) => (
                        <div key={a.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-900">{a.name}</div>
                            {a.code && <div className="text-xs text-slate-400">Code: {a.code}</div>}
                            {a.biography && <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{a.biography}</div>}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditMasterModal("author", a)}
                              className="h-7 w-7 p-0 text-slate-500 hover:text-indigo-600"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteMaster("author", a.id)}
                              className="h-7 w-7 p-0 text-slate-500 hover:text-rose-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {publishers.map((p) => (
                        <div key={p.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-900">{p.name}</div>
                            {p.contact_no && <div className="text-xs text-slate-500">📞 {p.contact_no}</div>}
                            {p.email && <div className="text-xs text-slate-400">✉️ {p.email}</div>}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditMasterModal("publisher", p)}
                              className="h-7 w-7 p-0 text-slate-500 hover:text-indigo-600"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteMaster("publisher", p.id)}
                              className="h-7 w-7 p-0 text-slate-500 hover:text-rose-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <span>{r.rack_code} — {r.rack_name}</span>
                            <div className="flex items-center gap-1 ml-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditMasterModal("rack", r)}
                                className="h-6 w-6 p-0 text-slate-400 hover:text-indigo-600"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteMaster("rack", r.id)}
                                className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
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
                                <span key={s.id} className="inline-flex items-center gap-1 bg-white border border-slate-200 text-xs px-2.5 py-1 rounded shadow-2xs font-medium text-slate-700">
                                  <span>{s.shelf_code} ({s.shelf_name})</span>
                                  <button
                                    onClick={() => openEditMasterModal("shelf", s)}
                                    className="text-slate-400 hover:text-indigo-600 ml-1"
                                    title="Edit shelf"
                                  >
                                    <Edit className="h-2.5 w-2.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMaster("shelf", s.id)}
                                    className="text-slate-400 hover:text-rose-600"
                                    title="Delete shelf"
                                  >
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </button>
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
              Configure maximum loan limits, issue duration, renewal policies, and strict fine-blocking rules (Section 28).
            </p>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Max Books Per Borrower (Student / Staff)</Label>
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

                {/* Section 28 Fine Policy Controls */}
                <div className="md:col-span-2 border-t pt-3 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Strict Fine Lending Policies</h4>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="allow_issue_with_fine"
                      checked={settingsForm.allow_issue_with_fine}
                      onChange={(e) => setSettingsForm({ ...settingsForm, allow_issue_with_fine: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="allow_issue_with_fine" className="text-xs text-slate-700">
                      <span className="font-semibold">Allow book issue if borrower has pending fines</span>
                      <p className="text-[11px] text-slate-400">If unchecked, borrowers with unpaid fines cannot checkout books.</p>
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="allow_renewal_with_fine"
                      checked={settingsForm.allow_renewal_with_fine}
                      onChange={(e) => setSettingsForm({ ...settingsForm, allow_renewal_with_fine: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="allow_renewal_with_fine" className="text-xs text-slate-700">
                      <span className="font-semibold">Allow book renewal if borrower has pending fines</span>
                      <p className="text-[11px] text-slate-400">If unchecked, loans cannot be renewed until pending fines are settled.</p>
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button type="submit" disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  Save Library Rules & Policies
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
                      <th className="px-4 py-3">Book & Accession</th>
                      <th className="px-4 py-3">Borrower</th>
                      <th className="px-4 py-3">Issue → Return Date</th>
                      <th className="px-4 py-3">Condition / Status</th>
                      <th className="px-4 py-3">Fine Charged & Status</th>
                      <th className="px-4 py-3">Remarks</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyLoans.map((item) => {
                      const totalFine = Number(item.total_fine || item.late_fees || 0);
                      const paidFine = Number(item.fine_paid_amount || 0);
                      const dueFine = Math.max(0, totalFine - paidFine);

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">{item.book_title}</div>
                            {item.accession_no && (
                              <div className="text-[11px] font-mono text-slate-400">Acc: {item.accession_no}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-800">{item.staff_name || item.student_name}</div>
                            <div className="text-[11px] text-slate-400">
                              {item.staff ? `Staff #${item.staff}` : `GR: ${item.student_gr_no || "N/A"}`}
                            </div>
                          </td>
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
                              {item.condition_on_return || item.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {totalFine > 0 ? (
                              <div className="space-y-0.5">
                                <div className="font-bold text-slate-900">Total: ₹{totalFine}</div>
                                {item.is_fine_paid || dueFine <= 0 ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                                    <CheckCircle2 className="h-2.5 w-2.5" /> Fully Paid
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded">
                                    Due: ₹{dueFine}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 font-mono text-xs">₹0 (No Fine)</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">{item.remarks || "—"}</td>
                          <td className="px-4 py-3 text-right">
                            {dueFine > 0 && (
                              <Button
                                size="sm"
                                onClick={() => handleOpenPayFine(item)}
                                className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1"
                              >
                                <CreditCard className="h-3 w-3" /> Collect Fine
                              </Button>
                            )}
                            {item.is_fine_paid && item.payment_receipt_no && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setReceiptModal({
                                    detail: "Paid",
                                    receipt_no: item.payment_receipt_no || "",
                                    amount_paid: String(item.fine_paid_amount || item.total_fine),
                                    remaining_due: "0.00",
                                    is_fine_paid: true,
                                    record: item,
                                  });
                                }}
                                className="h-7 text-xs border-slate-200 text-slate-700 gap-1"
                              >
                                <Receipt className="h-3 w-3" /> Receipt
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
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
              {Object.keys(bookFormErrors).length > 0 && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>Please fill in all mandatory fields marked with an asterisk (*).</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">
                      Book Title <span className="text-rose-500">*</span>
                    </Label>
                    {bookFormErrors.title && (
                      <span className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {bookFormErrors.title}
                      </span>
                    )}
                  </div>
                  <Input
                    value={bookForm.title}
                    onChange={(e) => {
                      setBookForm({ ...bookForm, title: e.target.value });
                      if (bookFormErrors.title) {
                        setBookFormErrors((prev) => ({ ...prev, title: "" }));
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value.trim()) {
                        setBookForm((prev) => ({ ...prev, title: toTitleCase(prev.title) }));
                      }
                    }}
                    placeholder="e.g. Mathematics Class 10"
                    className={bookFormErrors.title ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">
                      Author <span className="text-rose-500">*</span>
                    </Label>
                    {bookFormErrors.author && (
                      <span className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {bookFormErrors.author}
                      </span>
                    )}
                  </div>
                  <Input
                    value={bookForm.author}
                    onChange={(e) => {
                      setBookForm({ ...bookForm, author: e.target.value });
                      if (bookFormErrors.author) {
                        setBookFormErrors((prev) => ({ ...prev, author: "" }));
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value.trim()) {
                        setBookForm((prev) => ({ ...prev, author: toTitleCase(prev.author) }));
                      }
                    }}
                    placeholder="e.g. R.D. Sharma"
                    className={bookFormErrors.author ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">
                      Category / Subject <span className="text-rose-500">*</span>
                    </Label>
                    {bookFormErrors.category && (
                      <span className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {bookFormErrors.category}
                      </span>
                    )}
                  </div>
                  <Input
                    value={bookForm.category}
                    onChange={(e) => {
                      setBookForm({ ...bookForm, category: e.target.value });
                      if (bookFormErrors.category) {
                        setBookFormErrors((prev) => ({ ...prev, category: "" }));
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value.trim()) {
                        setBookForm((prev) => ({ ...prev, category: toTitleCase(prev.category) }));
                      }
                    }}
                    placeholder="e.g. Mathematics"
                    className={bookFormErrors.category ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}
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
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Book Price (₹)</Label>
                    {bookFormErrors.price && (
                      <span className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {bookFormErrors.price}
                      </span>
                    )}
                  </div>
                  <Input
                    type="number"
                    min={0}
                    value={bookForm.price}
                    onChange={(e) => {
                      setBookForm({ ...bookForm, price: Number(e.target.value) });
                      if (bookFormErrors.price) {
                        setBookFormErrors((prev) => ({ ...prev, price: "" }));
                      }
                    }}
                    placeholder="150"
                    className={bookFormErrors.price ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">
                      Rack Location <span className="text-rose-500">*</span>
                    </Label>
                    {bookFormErrors.rack && (
                      <span className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {bookFormErrors.rack}
                      </span>
                    )}
                  </div>
                  <select
                    value={bookForm.rack}
                    onChange={(e) => {
                      const newRack = e.target.value;
                      if (bookFormErrors.rack) {
                        setBookFormErrors((prev) => ({ ...prev, rack: "" }));
                      }
                      setBookForm((prev) => {
                        const isCurrentShelfInNewRack =
                          newRack && prev.shelf
                            ? shelves.some((s) => String(s.rack) === String(newRack) && String(s.id) === String(prev.shelf))
                            : false;
                        return {
                          ...prev,
                          rack: newRack,
                          shelf: isCurrentShelfInNewRack ? prev.shelf : "",
                        };
                      });
                    }}
                    className={`w-full h-9 rounded-md border px-3 text-sm ${
                      bookFormErrors.rack ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : "border-slate-200"
                    }`}
                    required
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
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">
                      Shelf Location <span className="text-rose-500">*</span>
                    </Label>
                    {bookFormErrors.shelf && (
                      <span className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {bookFormErrors.shelf}
                      </span>
                    )}
                  </div>
                  <select
                    value={bookForm.shelf}
                    onChange={(e) => {
                      setBookForm({ ...bookForm, shelf: e.target.value });
                      if (bookFormErrors.shelf) {
                        setBookFormErrors((prev) => ({ ...prev, shelf: "" }));
                      }
                    }}
                    disabled={!bookForm.rack}
                    className={`w-full h-9 rounded-md border px-3 text-sm disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${
                      bookFormErrors.shelf ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : "border-slate-200"
                    }`}
                    required
                  >
                    {!bookForm.rack ? (
                      <option value="">-- Select Rack First --</option>
                    ) : (
                      <>
                        <option value="">-- Select Shelf --</option>
                        {shelves
                          .filter((s) => String(s.rack) === String(bookForm.rack))
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.shelf_code} ({s.shelf_name})
                            </option>
                          ))}
                      </>
                    )}
                  </select>
                  {bookForm.rack && shelves.filter((s) => String(s.rack) === String(bookForm.rack)).length === 0 && (
                    <p className="text-[11px] text-amber-600 mt-0.5">
                      No shelves configured for this rack yet.
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">
                      Total Physical Copies <span className="text-rose-500">*</span>
                    </Label>
                    {bookFormErrors.total_copies && (
                      <span className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {bookFormErrors.total_copies}
                      </span>
                    )}
                  </div>
                  <Input
                    type="number"
                    min={1}
                    value={bookForm.total_copies}
                    onChange={(e) => {
                      setBookForm({ ...bookForm, total_copies: Number(e.target.value) });
                      if (bookFormErrors.total_copies) {
                        setBookFormErrors((prev) => ({ ...prev, total_copies: "" }));
                      }
                    }}
                    className={bookFormErrors.total_copies ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Edition / Year</Label>
                  <Input
                    value={bookForm.edition}
                    onChange={(e) => setBookForm({ ...bookForm, edition: e.target.value })}
                    onBlur={(e) => {
                      if (e.target.value.trim()) {
                        setBookForm((prev) => ({ ...prev, edition: toTitleCase(prev.edition) }));
                      }
                    }}
                    placeholder="e.g. 1st Edition E.S.T 800"
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
              <h2 className="text-lg font-bold text-slate-900">Issue Book to Student / Staff</h2>
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
                <Label className="text-xs font-semibold">Borrower type *</Label>
                <select aria-label="Borrower type" value={borrowerType} onChange={event => { setBorrowerType(event.target.value as "student" | "staff"); setIssueForm({ ...issueForm, student: "" }); }} className="mb-3 h-10 w-full rounded-md border border-slate-200 px-3 text-sm"><option value="student">Student</option><option value="staff">Staff</option></select>
                <Label className="text-xs font-semibold">Select {borrowerType === "student" ? "Student" : "Staff"} *</Label>
                <select
                  value={issueForm.student}
                  onChange={(e) => setIssueForm({ ...issueForm, student: e.target.value })}
                  required
                  className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm"
                >
                  <option value="">-- Choose {borrowerType} --</option>
                  {borrowerType === "staff" ? staffBorrowers.map(member => <option key={member.id} value={member.id}>{member.name} (#{member.id}) — {member.category}</option>) : students.map((s) => (
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
                  {showReturnModal.book_title} — {showReturnModal.staff_name || showReturnModal.student_name}
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
                  <option value="LOST">Lost Book</option>
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

              {/* Instant Fine Payment on Return */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="return_pay_now"
                    checked={returnForm.pay_now}
                    onChange={(e) => setReturnForm({ ...returnForm, pay_now: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="return_pay_now" className="text-xs font-semibold text-slate-800">
                    Collect Fine Now (Instant Payment Settlement)
                  </label>
                </div>
                {returnForm.pay_now && (
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Payment Method</Label>
                    <select
                      value={returnForm.payment_method}
                      onChange={(e) => setReturnForm({ ...returnForm, payment_method: e.target.value })}
                      className="w-full h-9 rounded-md border border-slate-200 px-3 text-xs bg-white"
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Online">Online</option>
                      <option value="Card">Card</option>
                    </select>
                  </div>
                )}
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
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Physical Copies & Barcodes</h2>
                <p className="text-xs text-slate-500">{showCopiesModal.title}</p>
              </div>
              <button onClick={() => setShowCopiesModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Copies list with transfer & status change */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase text-slate-500">Registered Accession Copies ({bookCopiesList.length})</h4>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {bookCopiesList.map((copy) => (
                  <div key={copy.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="font-mono text-xs font-bold text-slate-900">{copy.accession_no}</div>
                      <div className="text-[11px] text-slate-500">
                        Barcode: {copy.barcode || "N/A"} • Rack: {copy.rack_code || "—"} • Shelf: {copy.shelf_code || "—"}
                      </div>
                      <div className="text-[10px] text-slate-400">Condition: {copy.condition}</div>
                    </div>
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <select
                        value={copy.status}
                        onChange={(e) => handleChangeCopyStatus(copy.id, e.target.value)}
                        className="h-7 text-[11px] rounded border border-slate-200 bg-white px-2 font-medium"
                      >
                        <option value="AVAILABLE">Available</option>
                        <option value="UNDER_REPAIR">Under Repair</option>
                        <option value="DAMAGED">Damaged</option>
                        <option value="LOST">Lost</option>
                        <option value="DISPOSED">Disposed</option>
                      </select>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setTransferCopyModal(copy);
                          setTransferForm({
                            rack_id: copy.rack ? String(copy.rack) : "",
                            shelf_id: copy.shelf ? String(copy.shelf) : "",
                          });
                        }}
                        className="h-7 text-[11px] px-2 border-slate-200 bg-white hover:bg-slate-50 text-indigo-600"
                      >
                        <ArrowRightLeft className="h-3 w-3 mr-1" /> Transfer
                      </Button>
                      {copy.status !== "DISPOSED" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDisposeCopy(copy.id)}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                          title="Dispose physical copy"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
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
                    onChange={(e) => {
                      const newRack = e.target.value;
                      setGenerateCopiesForm((prev) => {
                        const isShelfInNewRack =
                          newRack && prev.shelf_id
                            ? shelves.some((s) => String(s.rack) === String(newRack) && String(s.id) === String(prev.shelf_id))
                            : false;
                        return {
                          ...prev,
                          rack_id: newRack,
                          shelf_id: isShelfInNewRack ? prev.shelf_id : "",
                        };
                      });
                    }}
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
                    disabled={!generateCopiesForm.rack_id}
                    className="w-full h-9 rounded-md border border-slate-200 text-xs px-2 disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    {!generateCopiesForm.rack_id ? (
                      <option value="">-- Select Rack First --</option>
                    ) : (
                      <>
                        <option value="">-- Shelf --</option>
                        {shelves
                          .filter((s) => String(s.rack) === String(generateCopiesForm.rack_id))
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.shelf_code} ({s.shelf_name})
                            </option>
                          ))}
                      </>
                    )}
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

      {/* MODAL: COLLECT FINE PAYMENT */}
      {finePaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-indigo-600" /> Collect Library Fine
                </h2>
                <p className="text-xs text-slate-500">
                  {finePaymentModal.book_title} — {finePaymentModal.staff_name || finePaymentModal.student_name}
                </p>
              </div>
              <button onClick={() => setFinePaymentModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Total Assessment Fine:</span>
                <span className="font-mono font-bold text-slate-800">₹{finePaymentModal.total_fine}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Previously Settled / Paid:</span>
                <span className="font-mono text-emerald-600">₹{finePaymentModal.fine_paid_amount || "0.00"}</span>
              </div>
              <div className="flex justify-between text-rose-700 font-bold border-t pt-1">
                <span>Remaining Balance Due:</span>
                <span className="font-mono text-base">
                  ₹{Math.max(0, Number(finePaymentModal.total_fine) - Number(finePaymentModal.fine_paid_amount || 0)).toFixed(2)}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmitPayFine} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Payment Amount (₹) *</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="1"
                  max={Math.max(0, Number(finePaymentModal.total_fine) - Number(finePaymentModal.fine_paid_amount || 0))}
                  value={finePaymentForm.amount}
                  onChange={(e) => setFinePaymentForm({ ...finePaymentForm, amount: e.target.value })}
                  required
                />
                <p className="text-[11px] text-slate-400">Supports partial or full fine collection.</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Payment Method *</Label>
                <select
                  value={finePaymentForm.payment_method}
                  onChange={(e) => setFinePaymentForm({ ...finePaymentForm, payment_method: e.target.value })}
                  className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm bg-white"
                  required
                >
                  <option value="Cash">Cash Counter</option>
                  <option value="UPI">UPI / QR Code</option>
                  <option value="Online">Online NetBanking</option>
                  <option value="Card">Debit / Credit Card</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setFinePaymentModal(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 font-medium">
                  {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Receipt className="h-3.5 w-3.5" />}
                  Record Payment & Generate Receipt
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PRINTABLE RECEIPT */}
      {receiptModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 border border-slate-200 shadow-2xl printable-area">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-slate-900">Library Fine Receipt</h2>
              </div>
              <button onClick={() => setReceiptModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-slate-50/50 space-y-3 font-mono text-xs">
              <div className="text-center border-b pb-2">
                <div className="font-bold text-sm text-slate-900">OFFICIAL LIBRARY RECEIPT</div>
                <div className="text-[11px] text-slate-500">School Library Management System</div>
                <div className="text-[11px] text-indigo-700 font-bold mt-1">Receipt No: {receiptModal.receipt_no}</div>
              </div>

              <div className="space-y-1.5 pt-1 text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Date & Time:</span>
                  <span>{new Date().toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Borrower:</span>
                  <span className="font-bold">{receiptModal.record?.staff_name || receiptModal.record?.student_name}</span>
                </div>
                {receiptModal.record?.student_gr_no && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">GR Number:</span>
                    <span>{receiptModal.record.student_gr_no}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Book Title:</span>
                  <span className="text-right max-w-[200px] truncate">{receiptModal.record?.book_title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Mode:</span>
                  <span>{receiptModal.record?.payment_method || "Cash"}</span>
                </div>
                <div className="border-t pt-1 flex justify-between font-bold text-slate-900 text-sm">
                  <span>Amount Paid:</span>
                  <span className="text-emerald-700">₹{receiptModal.amount_paid}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Remaining Due:</span>
                  <span className={Number(receiptModal.remaining_due) > 0 ? "text-rose-600 font-bold" : "text-slate-500"}>
                    ₹{receiptModal.remaining_due}
                  </span>
                </div>
              </div>

              <div className="text-center border-t pt-2 text-[10px] text-slate-400 italic">
                {receiptModal.is_fine_paid ? "All library dues for this loan transaction are fully settled." : "Partial settlement recorded."}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setReceiptModal(null)}>
                Close
              </Button>
              <Button
                onClick={() => window.print()}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-medium"
              >
                <Printer className="h-3.5 w-3.5" /> Print Receipt
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TRANSFER PHYSICAL COPY */}
      {transferCopyModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Transfer Book Copy</h2>
                <p className="text-xs font-mono text-slate-500">Accession: {transferCopyModal.accession_no}</p>
              </div>
              <button onClick={() => setTransferCopyModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleTransferCopy} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Target Rack</Label>
                <select
                  value={transferForm.rack_id}
                  onChange={(e) => setTransferForm({ ...transferForm, rack_id: e.target.value, shelf_id: "" })}
                  className="w-full h-9 rounded-md border border-slate-200 text-xs px-2 bg-white"
                >
                  <option value="">-- No Rack --</option>
                  {racks.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.rack_code} — {r.rack_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Target Shelf</Label>
                <select
                  value={transferForm.shelf_id}
                  onChange={(e) => setTransferForm({ ...transferForm, shelf_id: e.target.value })}
                  disabled={!transferForm.rack_id}
                  className="w-full h-9 rounded-md border border-slate-200 text-xs px-2 bg-white disabled:bg-slate-50 disabled:text-slate-400"
                >
                  {!transferForm.rack_id ? (
                    <option value="">-- Select Rack First --</option>
                  ) : (
                    <>
                      <option value="">-- No Shelf --</option>
                      {shelves
                        .filter((s) => String(s.rack) === String(transferForm.rack_id))
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.shelf_code} ({s.shelf_name})
                          </option>
                        ))}
                    </>
                  )}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setTransferCopyModal(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  Transfer Location
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
