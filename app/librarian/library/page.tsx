"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
  ChevronDown,
  Check,
  Hash,
  Receipt,
  FileText,
  CreditCard,
  BarChart3,
  Archive,
  ShieldCheck,
  Printer,
  CheckCheck,
  GraduationCap,
  LayoutGrid,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
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
  bulkIssueBooks,
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
import { getSchoolClasses } from "@/lib/clerk/classes";

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
  const [schoolClasses, setSchoolClasses] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Particular Book filter in Catalog
  const [particularBookFilter, setParticularBookFilter] = useState("ALL");
  const [isParticularBookDropdownOpen, setIsParticularBookDropdownOpen] = useState(false);
  const [particularBookSearch, setParticularBookSearch] = useState("");
  const particularBookDropdownRef = useRef<HTMLDivElement>(null);
  const [catalogViewMode, setCatalogViewMode] = useState<"grid" | "table">("grid");

  // Circulation Desk Search & Filters
  const [circulationSearch, setCirculationSearch] = useState("");
  const [circulationBookFilter, setCirculationBookFilter] = useState("ALL");
  const [circulationCategoryFilter, setCirculationCategoryFilter] = useState("ALL");
  const [circulationStatusFilter, setCirculationStatusFilter] = useState<"ALL" | "OVERDUE" | "DUE_SOON">("ALL");

  // History Tab Search & Filters
  const [historySearch, setHistorySearch] = useState("");
  const [historyBookFilter, setHistoryBookFilter] = useState("ALL");
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState("ALL");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("ALL");

  // Multi-Student Book Issue State
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [issueCategoryFilter, setIssueCategoryFilter] = useState("ALL");
  const [issueBookSearch, setIssueBookSearch] = useState("");
  const [isIssueBookDropdownOpen, setIsIssueBookDropdownOpen] = useState(false);
  const issueBookDropdownRef = useRef<HTMLDivElement>(null);

  const [masterSubTab, setMasterSubTab] = useState<"categories" | "authors" | "publishers" | "racks">("racks");

  // Circulation Issue Modal Student/Staff cascading filter & search states
  const [issueClassFilter, setIssueClassFilter] = useState("");
  const [issueDivisionFilter, setIssueDivisionFilter] = useState("");
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
  const studentDropdownRef = useRef<HTMLDivElement>(null);

  const [staffSearchQuery, setStaffSearchQuery] = useState("");
  const [isStaffDropdownOpen, setIsStaffDropdownOpen] = useState(false);
  const staffDropdownRef = useRef<HTMLDivElement>(null);

  // Form Validation State
  const [bookFormErrors, setBookFormErrors] = useState<Record<string, string>>({});
  const [issueErrors, setIssueErrors] = useState<Record<string, string>>({});
  const [masterErrors, setMasterErrors] = useState<Record<string, string>>({});
  const [finePaymentError, setFinePaymentError] = useState("");

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
  const [clearanceClassFilter, setClearanceClassFilter] = useState("");
  const [clearanceDivisionFilter, setClearanceDivisionFilter] = useState("");
  const [clearanceStudentSearch, setClearanceStudentSearch] = useState("");
  const [isClearanceStudentDropdownOpen, setIsClearanceStudentDropdownOpen] = useState(false);
  const clearanceStudentDropdownRef = useRef<HTMLDivElement>(null);

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
        classesData,
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
        getSchoolClasses().catch(() => []),
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

      const normalizedStudents: LibraryStudent[] = (studentsData || []).map((s: any) => {
        const clsName = (s.class_name || s.school_class_name || "").trim();
        return {
          ...s,
          class_name: clsName,
          school_class_name: clsName,
          division: (s.division || "").trim(),
        };
      });
      setStudents(normalizedStudents);

      const classNamesFromApi = (classesData || [])
        .map((c: any) => (c.school_class || c.name || "").trim())
        .filter(Boolean);
      setSchoolClasses(classNamesFromApi);

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

  // Book count per category for badge counters
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: books.length };
    books.forEach((b) => {
      const cat = toTitleCase(b.category);
      if (cat) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    });
    return counts;
  }, [books]);

  // Filtered categories within the dropdown search
  const filteredCategoryNames = useMemo(() => {
    if (!categorySearch.trim()) return categoryNames;
    const q = categorySearch.toLowerCase().trim();
    return categoryNames.filter((cat) => cat.toLowerCase().includes(q));
  }, [categoryNames, categorySearch]);

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCategoryDropdownOpen(false);
      }
      if (
        studentDropdownRef.current &&
        !studentDropdownRef.current.contains(event.target as Node)
      ) {
        setIsStudentDropdownOpen(false);
      }
      if (
        particularBookDropdownRef.current &&
        !particularBookDropdownRef.current.contains(event.target as Node)
      ) {
        setIsParticularBookDropdownOpen(false);
      }
      if (
        staffDropdownRef.current &&
        !staffDropdownRef.current.contains(event.target as Node)
      ) {
        setIsStaffDropdownOpen(false);
      }
      if (
        issueBookDropdownRef.current &&
        !issueBookDropdownRef.current.contains(event.target as Node)
      ) {
        setIsIssueBookDropdownOpen(false);
      }
      if (
        clearanceStudentDropdownRef.current &&
        !clearanceStudentDropdownRef.current.contains(event.target as Node)
      ) {
        setIsClearanceStudentDropdownOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsCategoryDropdownOpen(false);
        setIsParticularBookDropdownOpen(false);
        setIsStudentDropdownOpen(false);
        setIsStaffDropdownOpen(false);
        setIsIssueBookDropdownOpen(false);
        setIsClearanceStudentDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Unique classes extracted from students list and school classes for Circulation Desk
  const availableClasses = useMemo(() => {
    const classSet = new Set<string>();
    schoolClasses.forEach((c) => {
      if (c && c.trim()) classSet.add(c.trim());
    });
    students.forEach((s) => {
      const cls = (s.class_name || s.school_class_name || "").trim();
      if (cls) classSet.add(cls);
    });
    return Array.from(classSet).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ""), 10);
      const numB = parseInt(b.replace(/\D/g, ""), 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [students, schoolClasses]);

  // Unique divisions strictly according to the selected class
  const availableDivisions = useMemo(() => {
    if (!issueClassFilter) return [];
    const divSet = new Set<string>();
    students.forEach((s) => {
      const cls = (s.class_name || s.school_class_name || "").trim();
      if (cls.toLowerCase() === issueClassFilter.toLowerCase()) {
        if (s.division && s.division.trim()) {
          divSet.add(s.division.trim().toUpperCase());
        }
      }
    });
    return Array.from(divSet).sort();
  }, [students, issueClassFilter]);

  // Filtered students by class, division, and direct search query
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const cls = (s.class_name || s.school_class_name || "").trim();
      const div = (s.division || "").trim().toUpperCase();

      const matchesClass = !issueClassFilter || cls.toLowerCase() === issueClassFilter.toLowerCase();
      const matchesDiv = !issueDivisionFilter || div === issueDivisionFilter.toUpperCase();

      const q = studentSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        `${s.name} ${s.surname || ""}`.toLowerCase().includes(q) ||
        (s.gr_no && s.gr_no.toLowerCase().includes(q)) ||
        (s.roll_no && String(s.roll_no).toLowerCase().includes(q)) ||
        cls.toLowerCase().includes(q);

      return matchesClass && matchesDiv && matchesSearch;
    });
  }, [students, issueClassFilter, issueDivisionFilter, studentSearchQuery]);

  // Unique divisions according to selected class for Clearance Desk
  const clearanceDivisions = useMemo(() => {
    if (!clearanceClassFilter) return [];
    const divSet = new Set<string>();
    students.forEach((s) => {
      const cls = (s.class_name || s.school_class_name || "").trim();
      if (cls.toLowerCase() === clearanceClassFilter.toLowerCase()) {
        if (s.division && s.division.trim()) {
          divSet.add(s.division.trim().toUpperCase());
        }
      }
    });
    return Array.from(divSet).sort();
  }, [students, clearanceClassFilter]);

  // Filtered students by class, division, and search query for Clearance Desk
  const filteredClearanceStudents = useMemo(() => {
    return students.filter((s) => {
      const cls = (s.class_name || s.school_class_name || "").trim();
      const div = (s.division || "").trim().toUpperCase();

      const matchesClass = !clearanceClassFilter || cls.toLowerCase() === clearanceClassFilter.toLowerCase();
      const matchesDiv = !clearanceDivisionFilter || div === clearanceDivisionFilter.toUpperCase();

      const q = clearanceStudentSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        `${s.name} ${s.surname || ""}`.toLowerCase().includes(q) ||
        (s.gr_no && s.gr_no.toLowerCase().includes(q)) ||
        (s.roll_no && String(s.roll_no).toLowerCase().includes(q)) ||
        cls.toLowerCase().includes(q);

      return matchesClass && matchesDiv && matchesSearch;
    });
  }, [students, clearanceClassFilter, clearanceDivisionFilter, clearanceStudentSearch]);

  // Selected student object helper
  const selectedStudentObj = useMemo(() => {
    if (!issueForm.student || borrowerType !== "student") return null;
    return students.find((s) => String(s.id) === String(issueForm.student)) || null;
  }, [students, issueForm.student, borrowerType]);

  // Filtered staff by search query
  const filteredStaffBorrowers = useMemo(() => {
    const q = staffSearchQuery.toLowerCase().trim();
    if (!q) return staffBorrowers;
    return staffBorrowers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        String(s.id).includes(q) ||
        (s.category && s.category.toLowerCase().includes(q))
    );
  }, [staffBorrowers, staffSearchQuery]);

  // Selected staff object helper
  const selectedStaffObj = useMemo(() => {
    if (!issueForm.student || borrowerType !== "staff") return null;
    return staffBorrowers.find((s) => String(s.id) === String(issueForm.student)) || null;
  }, [staffBorrowers, issueForm.student, borrowerType]);

  // Selected book for issuance
  const selectedIssueBook = useMemo(() => {
    if (!issueForm.book) return null;
    return books.find((b) => String(b.id) === String(issueForm.book)) || null;
  }, [books, issueForm.book]);

  // Available books for Issue Modal (filtered by Category & search)
  const availableBooksForIssue = useMemo(() => {
    return books.filter((b) => {
      if (b.available_copies <= 0) return false;
      const matchesCat =
        issueCategoryFilter === "ALL" ||
        toTitleCase(b.category) === issueCategoryFilter;
      const matchesSearch =
        !issueBookSearch.trim() ||
        b.title.toLowerCase().includes(issueBookSearch.toLowerCase()) ||
        b.author.toLowerCase().includes(issueBookSearch.toLowerCase()) ||
        (b.isbn && b.isbn.toLowerCase().includes(issueBookSearch.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [books, issueCategoryFilter, issueBookSearch]);

  // Filtered books (Search, Category, and Particular Book)
  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      const matchesSearch =
        !searchQuery.trim() ||
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.isbn && b.isbn.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCat =
        categoryFilter === "ALL" ||
        toTitleCase(b.category) === categoryFilter;
      const matchesBook =
        particularBookFilter === "ALL" ||
        String(b.id) === String(particularBookFilter);
      return matchesSearch && matchesCat && matchesBook;
    });
  }, [books, searchQuery, categoryFilter, particularBookFilter]);

  // Books available for the Particular Book dropdown (filtered by category if one is active)
  const availableBooksForParticularDropdown = useMemo(() => {
    const list = categoryFilter === "ALL" 
      ? books 
      : books.filter((b) => toTitleCase(b.category) === categoryFilter);
    if (!particularBookSearch.trim()) return list;
    const q = particularBookSearch.toLowerCase().trim();
    return list.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        (b.isbn && b.isbn.toLowerCase().includes(q))
    );
  }, [books, categoryFilter, particularBookSearch]);

  // Selected particular book object helper
  const selectedParticularBook = useMemo(() => {
    if (particularBookFilter === "ALL") return null;
    return books.find((b) => String(b.id) === String(particularBookFilter)) || null;
  }, [books, particularBookFilter]);

  // Active vs History circulation
  const activeLoans = useMemo(() => {
    return issuedRecords.filter((r) => r.status === "ISSUED");
  }, [issuedRecords]);

  const historyLoans = useMemo(() => {
    return issuedRecords.filter((r) => r.status !== "ISSUED");
  }, [issuedRecords]);

  // Unique books currently in active loans
  const uniqueActiveLoanBooks = useMemo(() => {
    const map = new Map<number, { id: number; title: string; count: number }>();
    activeLoans.forEach((loan) => {
      const bookId = Number(loan.book);
      const title = loan.book_title || `Book #${bookId}`;
      if (!map.has(bookId)) {
        map.set(bookId, { id: bookId, title, count: 1 });
      } else {
        map.get(bookId)!.count += 1;
      }
    });
    return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
  }, [activeLoans]);

  // Unique categories currently in active loans
  const uniqueActiveLoanCategories = useMemo(() => {
    const map = new Map<string, number>();
    activeLoans.forEach((loan) => {
      const cat = toTitleCase(loan.book_category) || "Uncategorized";
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries()).map(([cat, count]) => ({ cat, count }));
  }, [activeLoans]);

  // Filtered Active Loans for Circulation Desk
  const filteredActiveLoans = useMemo(() => {
    const now = new Date();
    const q = circulationSearch.trim().toLowerCase();
    return activeLoans.filter((loan) => {
      const matchesSearch =
        !q ||
        (loan.book_title && loan.book_title.toLowerCase().includes(q)) ||
        (loan.student_name && loan.student_name.toLowerCase().includes(q)) ||
        (loan.staff_name && loan.staff_name.toLowerCase().includes(q)) ||
        (loan.student_gr_no && loan.student_gr_no.toLowerCase().includes(q)) ||
        (loan.student_roll_no && String(loan.student_roll_no).toLowerCase().includes(q)) ||
        (loan.accession_no && loan.accession_no.toLowerCase().includes(q)) ||
        (loan.student_class && loan.student_class.toLowerCase().includes(q));

      const matchesBook =
        circulationBookFilter === "ALL" ||
        String(loan.book) === String(circulationBookFilter);

      const matchesCategory =
        circulationCategoryFilter === "ALL" ||
        toTitleCase(loan.book_category) === circulationCategoryFilter;

      let matchesStatus = true;
      if (circulationStatusFilter === "OVERDUE") {
        matchesStatus = new Date(loan.due_date) < now;
      } else if (circulationStatusFilter === "DUE_SOON") {
        const dueDate = new Date(loan.due_date);
        const diffDays = (dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
        matchesStatus = diffDays >= 0 && diffDays <= 3;
      }

      return matchesSearch && matchesBook && matchesCategory && matchesStatus;
    });
  }, [activeLoans, circulationSearch, circulationBookFilter, circulationCategoryFilter, circulationStatusFilter]);

  // Unique books in history loans
  const uniqueHistoryLoanBooks = useMemo(() => {
    const map = new Map<number, { id: number; title: string; count: number }>();
    historyLoans.forEach((loan) => {
      const bookId = Number(loan.book);
      const title = loan.book_title || `Book #${bookId}`;
      if (!map.has(bookId)) {
        map.set(bookId, { id: bookId, title, count: 1 });
      } else {
        map.get(bookId)!.count += 1;
      }
    });
    return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
  }, [historyLoans]);

  // Filtered History Loans
  const filteredHistoryLoans = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    return historyLoans.filter((item) => {
      const matchesSearch =
        !q ||
        (item.book_title && item.book_title.toLowerCase().includes(q)) ||
        (item.student_name && item.student_name.toLowerCase().includes(q)) ||
        (item.staff_name && item.staff_name.toLowerCase().includes(q)) ||
        (item.student_gr_no && item.student_gr_no.toLowerCase().includes(q)) ||
        (item.accession_no && item.accession_no.toLowerCase().includes(q)) ||
        (item.remarks && item.remarks.toLowerCase().includes(q));

      const matchesBook =
        historyBookFilter === "ALL" ||
        String(item.book) === String(historyBookFilter);

      const matchesCategory =
        historyCategoryFilter === "ALL" ||
        toTitleCase(item.book_category) === historyCategoryFilter;

      const matchesStatus =
        historyStatusFilter === "ALL" ||
        item.status === historyStatusFilter;

      return matchesSearch && matchesBook && matchesCategory && matchesStatus;
    });
  }, [historyLoans, historySearch, historyBookFilter, historyCategoryFilter, historyStatusFilter]);

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

  // Handlers: Issue Book (Supports single student and multi-student according to stock)
  const handleIssueBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (actionLoading) return;

    const errors: Record<string, string> = {};
    if (!issueForm.book) {
      errors.book = "Please select a book to issue.";
    }

    const selectedBook = books.find((b) => String(b.id) === String(issueForm.book));
    const availableCopies = selectedBook?.available_copies || 0;

    if (borrowerType === "student") {
      if (selectedStudentIds.length === 0 && !issueForm.student) {
        errors.student = "Please select at least one student to issue this book.";
      } else if (selectedStudentIds.length > availableCopies) {
        errors.student = `Cannot select more than ${availableCopies} student(s) based on available stock (${availableCopies} available).`;
      }
    } else {
      if (!issueForm.student) {
        errors.student = "Please select a staff member to issue this book.";
      }
    }

    // Due date validation (must be in future, not in the past)
    const todayStr = new Date().toISOString().split("T")[0];
    if (issueForm.due_date) {
      if (issueForm.due_date < todayStr) {
        errors.due_date = "Due date must be in the future, not in the past.";
      }
    }

    if (Object.keys(errors).length > 0) {
      setIssueErrors(errors);
      return;
    }
    setIssueErrors({});
    setActionLoading(true);
    try {
      if (borrowerType === "student") {
        const studentIdsToIssue =
          selectedStudentIds.length > 0
            ? selectedStudentIds
            : issueForm.student
            ? [Number(issueForm.student)]
            : [];

        const res = await bulkIssueBooks({
          book: Number(issueForm.book),
          students: studentIdsToIssue,
          due_date: issueForm.due_date || undefined,
        });
        showToast(
          "success",
          res.message ||
            `Book successfully issued to ${studentIdsToIssue.length} student${studentIdsToIssue.length > 1 ? "s" : ""}!`
        );
      } else {
        await issueBook({
          book: Number(issueForm.book),
          book_copy_id: issueForm.book_copy ? Number(issueForm.book_copy) : undefined,
          staff: Number(issueForm.student),
          due_date: issueForm.due_date || undefined,
        });
        showToast("success", `Book successfully issued to staff member!`);
      }
      setShowIssueModal(false);
      setIssueForm({ book: "", book_copy: "", student: "", due_date: "" });
      setSelectedStudentIds([]);
      setIssueCategoryFilter("ALL");
      setIssueBookSearch("");
      setIsIssueBookDropdownOpen(false);
      setIssueErrors({});
      await loadAllData();
    } catch (err: any) {
      if (err.fieldErrors && typeof err.fieldErrors === "object") {
        const backendErrors: Record<string, string> = {};
        for (const [key, val] of Object.entries(err.fieldErrors)) {
          if (Array.isArray(val) && val.length > 0) {
            backendErrors[key] = String(val[0]);
          } else if (typeof val === "string") {
            backendErrors[key] = val;
          }
        }
        if (backendErrors.non_field_errors) {
          showToast("error", backendErrors.non_field_errors);
        }
        setIssueErrors((prev) => ({ ...prev, ...backendErrors }));
      }
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
    setFinePaymentError("");
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
    if (!finePaymentForm.amount || Number(finePaymentForm.amount) <= 0) {
      setFinePaymentError("Please enter a valid fine amount to collect (minimum ₹1).");
      return;
    }
    const maxPayable = Math.max(0, Number(finePaymentModal.total_fine) - Number(finePaymentModal.fine_paid_amount || 0));
    if (Number(finePaymentForm.amount) > maxPayable) {
      setFinePaymentError(`Payment amount cannot exceed the pending balance of ₹${maxPayable.toFixed(2)}.`);
      return;
    }
    setFinePaymentError("");
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
    setMasterErrors({});
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
    setMasterErrors({});
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
    const errors: Record<string, string> = {};
    if (!masterForm.name.trim()) {
      errors.name = `${showMasterModal === "rack" ? "Rack Name" : showMasterModal === "shelf" ? "Shelf Name" : "Name"} is required.`;
    }
    if (showMasterModal === "shelf" && (!masterForm.extra || !masterForm.extra.trim())) {
      errors.extra = "Please select a parent rack.";
    }
    if (Object.keys(errors).length > 0) {
      setMasterErrors(errors);
      return;
    }
    setMasterErrors({});
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
        if (editingMaster) {
          let code = masterForm.code.trim();
          if (!code) {
            const base = masterForm.name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-");
            let candidate = base;
            let counter = 1;
            while (racks.some((r) => r.id !== editingMaster.id && r.rack_code?.toUpperCase() === candidate)) {
              candidate = `${base}-${counter}`;
              counter++;
            }
            code = candidate;
          }
          const payload = {
            rack_name: masterForm.name.trim(),
            rack_code: code,
            description: masterForm.extra,
          };
          await updateRack(editingMaster.id, payload);
          showToast("success", "Rack updated!");
        } else {
          // Supports multiple comma-separated rack names: e.g. "Rack A, Rack B, Rack C"
          const rackNames = masterForm.name
            .split(",")
            .map((n) => n.trim())
            .filter(Boolean);

          if (rackNames.length === 0) {
            throw new Error("Please enter at least one rack name.");
          }

          const usedCodes = new Set(racks.map((r) => r.rack_code?.toUpperCase()));
          const createdRacks: Rack[] = [];

          for (let i = 0; i < rackNames.length; i++) {
            const rName = rackNames[i];
            let candidate = "";
            if (masterForm.code.trim()) {
              const baseCode = masterForm.code.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-");
              candidate = rackNames.length > 1 ? `${baseCode}-${i + 1}` : baseCode;
              let counter = 1;
              while (usedCodes.has(candidate)) {
                candidate = `${baseCode}-${i + 1}-${counter}`;
                counter++;
              }
            } else {
              let clean = rName.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
              if (!clean) clean = `RACK-${i + 1}`;
              candidate = clean.slice(0, 40);
              let counter = 1;
              while (usedCodes.has(candidate)) {
                candidate = `${clean.slice(0, 35)}-${counter}`;
                counter++;
              }
            }
            usedCodes.add(candidate);

            const payload = {
              rack_name: rName,
              rack_code: candidate,
              description: masterForm.extra,
            };
            const created = await createRack(payload);
            createdRacks.push(created);
          }

          if (createdRacks.length > 1) {
            showToast("success", `Created ${createdRacks.length} library racks successfully!`);
          } else {
            showToast("success", "Library Rack added!");
          }

          if (createdRacks.length > 0 && createdRacks[0].id) {
            setBookForm((prev) => ({ ...prev, rack: String(createdRacks[0].id) }));
            setBookFormErrors((prev) => ({ ...prev, rack: "" }));
          }
        }
      } else if (showMasterModal === "shelf") {
        const parentRackId = Number(masterForm.extra);
        if (editingMaster) {
          let code = masterForm.code.trim();
          if (!code) {
            const base = masterForm.name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-");
            let candidate = base;
            let counter = 1;
            while (shelves.some((s) => s.id !== editingMaster.id && s.rack === parentRackId && s.shelf_code?.toUpperCase() === candidate)) {
              candidate = `${base}-${counter}`;
              counter++;
            }
            code = candidate;
          }
          const payload = {
            rack: parentRackId,
            shelf_name: masterForm.name.trim(),
            shelf_code: code,
          };
          await updateShelf(editingMaster.id, payload);
          showToast("success", "Shelf updated!");
        } else {
          // Supports multiple comma-separated shelf names: e.g. "Shelf 1, Shelf 2, Shelf 3"
          const shelfNames = masterForm.name
            .split(",")
            .map((n) => n.trim())
            .filter(Boolean);

          if (shelfNames.length === 0) {
            throw new Error("Please enter at least one shelf name.");
          }

          const usedShelfCodes = new Set(
            shelves.filter((s) => s.rack === parentRackId).map((s) => s.shelf_code?.toUpperCase())
          );
          const createdShelves: Shelf[] = [];

          for (let i = 0; i < shelfNames.length; i++) {
            const sName = shelfNames[i];
            let candidate = "";
            if (masterForm.code.trim()) {
              const baseCode = masterForm.code.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-");
              candidate = shelfNames.length > 1 ? `${baseCode}-${i + 1}` : baseCode;
              let counter = 1;
              while (usedShelfCodes.has(candidate)) {
                candidate = `${baseCode}-${i + 1}-${counter}`;
                counter++;
              }
            } else {
              let clean = sName.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
              if (!clean) clean = `S-${i + 1}`;
              candidate = clean.slice(0, 40);
              let counter = 1;
              while (usedShelfCodes.has(candidate)) {
                candidate = `${clean.slice(0, 35)}-${counter}`;
                counter++;
              }
            }
            usedShelfCodes.add(candidate);

            const payload = {
              rack: parentRackId,
              shelf_name: sName,
              shelf_code: candidate,
            };
            const created = await createShelf(payload);
            createdShelves.push(created);
          }

          if (createdShelves.length > 1) {
            showToast("success", `Created ${createdShelves.length} shelves successfully!`);
          } else {
            showToast("success", "Shelf added!");
          }

          if (createdShelves.length > 0 && createdShelves[0].id) {
            setBookForm((prev) => ({ ...prev, shelf: String(createdShelves[0].id) }));
            setBookFormErrors((prev) => ({ ...prev, shelf: "" }));
          }
        }
      }
      setShowMasterModal(null);
      setEditingMaster(null);
      setMasterErrors({});
      setMasterForm({ name: "", code: "", extra: "", extra2: "" });
      await loadAllData();
    } catch (err: any) {
      const msg = err.message || "Failed to save master.";
      showToast("error", msg);
      const isCodeError = msg.toLowerCase().includes("code") || msg.toLowerCase().includes("already exists");
      const isNameError = msg.toLowerCase().includes("name");
      setMasterErrors({
        code: isCodeError ? msg : "",
        name: isNameError ? msg : (!isCodeError ? msg : ""),
        extra: msg.toLowerCase().includes("rack") && showMasterModal === "shelf" ? msg : "",
      });
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
      setClearanceSearchQuery(String(idToSearch));

      // Auto-sync class and division dropdowns if student found
      const matched = students.find((s) => s.id === idToSearch);
      if (matched) {
        const cls = (matched.class_name || matched.school_class_name || "").trim();
        if (cls) setClearanceClassFilter(cls);
        if (matched.division) setClearanceDivisionFilter(matched.division.trim().toUpperCase());
      }
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

      <div className="w-full space-y-4">
        {/* Sleek Top Header Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Library Management
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <Sparkles className="h-3 w-3 text-indigo-500" /> Live Operations
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Physical catalogue titles, accession barcodes, counter lending, student clearance & stock tracking
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 shrink-0">
            <Button
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-3.5 rounded-xl shadow-xs gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Add New Book
            </Button>
            <Button
              type="button"
              onClick={() => {
                setIssueForm({ book: "", book_copy: "", student: "", due_date: "" });
                setIssueErrors({});
                setShowIssueModal(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-3.5 rounded-xl shadow-xs gap-1.5"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" /> Issue Book
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={loadAllData}
              disabled={loading}
              className="border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs h-9 px-3 rounded-xl gap-1.5 bg-white"
              title="Refresh all library records"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Six Telemetry Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Card 1: Total Titles */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Titles</span>
              <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
                <BookOpen className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-black text-slate-900">{stats.titlesCount}</div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-medium text-slate-500 truncate">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                <span>{stats.totalBooksCount} Copies</span>
              </div>
            </div>
          </div>

          {/* Card 2: Available Copies */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Available</span>
              <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-black text-emerald-600">{stats.availableCopies}</div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-medium text-emerald-700 truncate">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Ready to lend</span>
              </div>
            </div>
          </div>

          {/* Card 3: Active Loans */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Issued Active</span>
              <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                <ArrowRightLeft className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-black text-blue-600">{stats.activeLoansCount}</div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-medium text-blue-700 truncate">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                <span>In circulation</span>
              </div>
            </div>
          </div>

          {/* Card 4: Overdue */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs hover:shadow-md hover:border-rose-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Overdue</span>
              <div className="h-7 w-7 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
                <Clock className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-black text-rose-600">{stats.overdueCount}</div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-medium text-rose-700 truncate">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                <span>Past due date</span>
              </div>
            </div>
          </div>

          {/* Card 5: Hold Queue */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs hover:shadow-md hover:border-amber-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Reservations</span>
              <div className="h-7 w-7 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
                <BookmarkPlus className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-black text-amber-600">{stats.waitingReservationsCount}</div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-medium text-amber-700 truncate">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>Waitlist</span>
              </div>
            </div>
          </div>

          {/* Card 6: Fine Revenue */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs hover:shadow-md hover:border-purple-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Dues / Fines</span>
              <div className="h-7 w-7 rounded-lg bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center">
                <DollarSign className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-black text-purple-700">₹{stats.totalFinesCollected.toLocaleString("en-IN")}</div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-medium text-purple-700 truncate">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0" />
                <span>Pending dues</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Workspace Layout: In-Page Stepper Sidebar on Left + Active Content on Right */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* IN-PAGE STEPPER SIDEBAR (LEFT) */}
          <aside className="w-full lg:w-64 xl:w-72 shrink-0 lg:sticky lg:top-4 space-y-3">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 space-y-2">
              <div className="px-2 pt-1 pb-2.5 flex items-center justify-between border-b border-slate-100">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200">
                    <Sparkles className="h-3 w-3 text-indigo-500" /> Library Operations
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-sm mt-1">Workflow Steps</h3>
                </div>
                <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  8 Modules
                </span>
              </div>

              {/* Vertical Stepper Navigation */}
              <nav className="space-y-1">
                {[
                  {
                    id: "masters",
                    step: "1",
                    label: "Racks & Locations",
                    subLabel: "Storage layout & shelves",
                    icon: Layers,
                    badge: `${racks.length} Racks`,
                  },
                  {
                    id: "catalog",
                    step: "2",
                    label: "Book Catalog",
                    subLabel: "Titles, barcodes & stock",
                    icon: BookOpen,
                    count: books.length,
                  },
                  {
                    id: "circulation",
                    step: "3",
                    label: "Circulation Desk",
                    subLabel: "Active loans & counter desk",
                    icon: ArrowRightLeft,
                    count: activeLoans.length,
                  },
                  {
                    id: "reservations",
                    step: "4",
                    label: "Hold Queue",
                    subLabel: "Student waitlists & pickups",
                    icon: BookmarkPlus,
                    count: reservations.length,
                  },
                  {
                    id: "history",
                    step: "5",
                    label: "Loan History",
                    subLabel: "Returned, lost & damaged logs",
                    icon: Clock,
                    count: historyLoans.length,
                  },
                  {
                    id: "clearance",
                    step: "6",
                    label: "Student Clearance",
                    subLabel: "NOC certificates & fine check",
                    icon: ShieldCheck,
                  },
                  {
                    id: "reports",
                    step: "7",
                    label: "Reports & Audit",
                    subLabel: "Audits & circulation trends",
                    icon: BarChart3,
                  },
                  {
                    id: "settings",
                    step: "8",
                    label: "Library Rules",
                    subLabel: "Loan limits, grace & fees",
                    icon: Sliders,
                  },
                ].map((step) => {
                  const isActive = activeTab === step.id;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(step.id as any);
                        if (step.id === "masters" && !masterSubTab) {
                          setMasterSubTab("racks");
                        }
                      }}
                      className={`w-full group relative flex items-start gap-2.5 p-2.5 rounded-xl text-left transition-all duration-150 border ${
                        isActive
                          ? "bg-indigo-50/90 border-indigo-200/90 shadow-2xs text-indigo-950 font-bold before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-1 before:bg-indigo-600 before:rounded-r"
                          : "bg-white hover:bg-slate-50/80 border-transparent text-slate-700 hover:border-slate-200/60"
                      }`}
                    >
                      {/* Step Number Circle */}
                      <div
                        className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 transition-colors ${
                          isActive
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-700"
                        }`}
                      >
                        {step.step}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`text-xs font-extrabold truncate ${
                              isActive ? "text-indigo-950" : "text-slate-800"
                            }`}
                          >
                            {step.label}
                          </span>
                          {step.count !== undefined && (
                            <span
                              className={`px-1.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                                isActive ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {step.count}
                            </span>
                          )}
                          {step.badge && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                                isActive ? "bg-purple-200/70 text-purple-900" : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {step.badge}
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-[11px] truncate mt-0.5 ${
                            isActive ? "text-indigo-700/80 font-medium" : "text-slate-400"
                          }`}
                        >
                          {step.subLabel}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* In-Page Sidebar Operational Tip Card */}
            <div className="bg-gradient-to-br from-indigo-50/70 via-indigo-50/30 to-purple-50/40 rounded-2xl border border-indigo-100/90 p-3.5 space-y-1.5 text-xs text-indigo-900">
              <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                <span>Recommended Sequence</span>
              </div>
              <p className="text-[11px] text-indigo-800/80 leading-relaxed">
                Step 1 (Racks) &rarr; Step 2 (Books) &rarr; Step 3 (Lend). Define physical racks &amp; shelves before assigning copies!
              </p>
            </div>
          </aside>

          {/* MAIN CONTENT WORKSPACE (RIGHT) */}
          <main className="flex-1 min-w-0 w-full space-y-4">
            {/* Contextual Active Step Header */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                    {activeTab === "masters" && "Step 1 of 8"}
                    {activeTab === "catalog" && "Step 2 of 8"}
                    {activeTab === "circulation" && "Step 3 of 8"}
                    {activeTab === "reservations" && "Step 4 of 8"}
                    {activeTab === "history" && "Step 5 of 8"}
                    {activeTab === "clearance" && "Step 6 of 8"}
                    {activeTab === "reports" && "Step 7 of 8"}
                    {activeTab === "settings" && "Step 8 of 8"}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    {activeTab === "masters" && "Storage & Locations Setup"}
                    {activeTab === "catalog" && "Book Titles & Barcode Register"}
                    {activeTab === "circulation" && "Counter Desk & Active Lending"}
                    {activeTab === "reservations" && "Student Waitlist & Holds"}
                    {activeTab === "history" && "Completed Return & Lost Archives"}
                    {activeTab === "clearance" && "Student Dues & NOC Issuance"}
                    {activeTab === "reports" && "Audit & Utilization Analytics"}
                    {activeTab === "settings" && "Circulation Rules & Policies"}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  {activeTab === "masters" && <Layers className="h-5 w-5 text-indigo-600" />}
                  {activeTab === "catalog" && <BookOpen className="h-5 w-5 text-indigo-600" />}
                  {activeTab === "circulation" && <ArrowRightLeft className="h-5 w-5 text-indigo-600" />}
                  {activeTab === "reservations" && <BookmarkPlus className="h-5 w-5 text-indigo-600" />}
                  {activeTab === "history" && <Clock className="h-5 w-5 text-indigo-600" />}
                  {activeTab === "clearance" && <ShieldCheck className="h-5 w-5 text-indigo-600" />}
                  {activeTab === "reports" && <BarChart3 className="h-5 w-5 text-indigo-600" />}
                  {activeTab === "settings" && <Sliders className="h-5 w-5 text-indigo-600" />}

                  {activeTab === "masters" && "Racks & Locations"}
                  {activeTab === "catalog" && "Book Catalog"}
                  {activeTab === "circulation" && "Circulation Desk (Active Loans)"}
                  {activeTab === "reservations" && "Hold Queue (Student Reservations)"}
                  {activeTab === "history" && "Loan History (Completed Records)"}
                  {activeTab === "clearance" && "Library Clearance Desk"}
                  {activeTab === "reports" && "Reports & Inventory Audit"}
                  {activeTab === "settings" && "Library Rules & Policy Settings"}
                </h2>
              </div>

              {/* Action Buttons in Header */}
              <div className="flex items-center gap-2 shrink-0">
                {activeTab === "catalog" && (
                  <Button
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
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Add New Book
                  </Button>
                )}
                {activeTab === "circulation" && (
                  <Button
                    type="button"
                    onClick={() => {
                      setIssueForm({ book: "", book_copy: "", student: "", due_date: "" });
                      setIssueErrors({});
                      setShowIssueModal(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs"
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" /> Issue Book
                  </Button>
                )}
                {activeTab === "reservations" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSweepHoldExpiries}
                    disabled={actionLoading}
                    className="text-xs border-amber-300 text-amber-800 hover:bg-amber-50 rounded-xl"
                  >
                    <Clock className="h-3.5 w-3.5 mr-1.5 text-amber-600" /> Sweep Expired Holds (48h)
                  </Button>
                )}
                {activeTab === "masters" && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={() => openAddMasterModal("rack")}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Rack
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openAddMasterModal("shelf")}
                      className="border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Shelf
                    </Button>
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={loadAllData}
                  disabled={loading}
                  className="text-xs border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl"
                  title="Reload current data"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            {/* TAB 1: CATALOGUE */}
            {activeTab === "catalog" && (
              <div className="space-y-4">
                {/* Search & Category Filter Toolbar */}
                <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-indigo-500" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by book title, author, or ISBN barcode..."
                      className="pl-10 h-10 rounded-xl border-slate-200 focus:border-indigo-600 focus:ring-indigo-600/20 text-xs sm:text-sm bg-slate-50/50 hover:bg-white focus:bg-white transition-colors"
                    />
                  </div>

                  {/* Filters & View Switcher */}
                  <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 shrink-0">
                    {/* Category Filter Dropdown */}
                    <div className="relative" ref={categoryDropdownRef}>
                      <button
                        type="button"
                        id="category-filter-dropdown-btn"
                        onClick={() => setIsCategoryDropdownOpen((prev) => !prev)}
                        className={`h-10 flex items-center gap-2 px-3.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all shadow-2xs ${
                          categoryFilter !== "ALL"
                            ? "bg-indigo-50 border-indigo-300 text-indigo-700 ring-2 ring-indigo-500/10 font-bold"
                            : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      >
                        <Layers className={`h-4 w-4 shrink-0 ${categoryFilter !== "ALL" ? "text-indigo-600" : "text-slate-400"}`} />
                        <span className="truncate max-w-[120px] sm:max-w-[160px]">
                          {categoryFilter === "ALL" ? "All Categories" : categoryFilter}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                            categoryFilter !== "ALL"
                              ? "bg-indigo-200/80 text-indigo-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {categoryCounts[categoryFilter] ?? (categoryFilter === "ALL" ? books.length : 0)}
                        </span>
                        {categoryFilter !== "ALL" && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCategoryFilter("ALL");
                            }}
                            className="p-0.5 rounded-md hover:bg-indigo-200 text-indigo-700 transition-colors"
                            title="Reset to All Categories"
                          >
                            <X className="h-3.5 w-3.5" />
                          </span>
                        )}
                        <ChevronDown
                          className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                            isCategoryDropdownOpen ? "rotate-180 text-indigo-600" : ""
                          }`}
                        />
                      </button>

                      {/* Dropdown Menu */}
                      {isCategoryDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-72 max-w-[90vw] bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                          {categoryNames.length > 5 && (
                            <div className="relative mb-2 px-1">
                              <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                              <input
                                type="text"
                                value={categorySearch}
                                onChange={(e) => setCategorySearch(e.target.value)}
                                placeholder="Search category..."
                                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                                autoFocus
                              />
                              {categorySearch && (
                                <button
                                  type="button"
                                  onClick={() => setCategorySearch("")}
                                  className="absolute right-3 top-2 text-slate-400 hover:text-slate-600"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          )}

                          <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1">
                            {(!categorySearch.trim() || "all categories".includes(categorySearch.toLowerCase().trim())) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCategoryFilter("ALL");
                                  setIsCategoryDropdownOpen(false);
                                  setCategorySearch("");
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                                  categoryFilter === "ALL"
                                    ? "bg-indigo-600 text-white"
                                    : "text-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <BookOpen className={`h-3.5 w-3.5 ${categoryFilter === "ALL" ? "text-white" : "text-indigo-500"}`} />
                                  <span>All Categories</span>
                                </div>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                    categoryFilter === "ALL" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {books.length}
                                </span>
                              </button>
                            )}

                            {filteredCategoryNames
                              .filter((cat) => cat !== "ALL")
                              .map((cat) => {
                                const isSelected = categoryFilter === cat;
                                const count = categoryCounts[cat] || 0;
                                return (
                                  <button
                                    key={cat}
                                    type="button"
                                    onClick={() => {
                                      setCategoryFilter(cat);
                                      setIsCategoryDropdownOpen(false);
                                      setCategorySearch("");
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                                      isSelected
                                        ? "bg-indigo-600 text-white"
                                        : "text-slate-700 hover:bg-slate-100"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <span
                                        className={`h-2 w-2 rounded-full shrink-0 ${
                                          isSelected ? "bg-white" : count > 0 ? "bg-indigo-500" : "bg-slate-300"
                                        }`}
                                      />
                                      <span className="truncate">{cat}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                          isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                                        }`}
                                      >
                                        {count}
                                      </span>
                                      {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                                    </div>
                                  </button>
                                );
                              })}

                            {filteredCategoryNames.filter((cat) => cat !== "ALL").length === 0 &&
                              categorySearch.trim() &&
                              !"all categories".includes(categorySearch.toLowerCase().trim()) && (
                                <div className="text-center py-4 text-xs text-slate-400 font-medium">
                                  No categories matching &quot;{categorySearch}&quot;
                                </div>
                              )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Particular Book Filter Dropdown */}
                    <div className="relative" ref={particularBookDropdownRef}>
                      <button
                        type="button"
                        id="particular-book-filter-btn"
                        onClick={() => setIsParticularBookDropdownOpen((prev) => !prev)}
                        className={`h-10 flex items-center gap-2 px-3.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all shadow-2xs ${
                          particularBookFilter !== "ALL"
                            ? "bg-indigo-50 border-indigo-300 text-indigo-700 ring-2 ring-indigo-500/10 font-bold"
                            : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      >
                        <BookMarked className={`h-4 w-4 shrink-0 ${particularBookFilter !== "ALL" ? "text-indigo-600" : "text-slate-400"}`} />
                        <span className="truncate max-w-[120px] sm:max-w-[160px]">
                          {selectedParticularBook ? selectedParticularBook.title : "All Books"}
                        </span>
                        {selectedParticularBook ? (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-200/80 text-indigo-800">
                            {selectedParticularBook.available_copies}/{selectedParticularBook.total_copies}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-600">
                            {books.length}
                          </span>
                        )}
                        {particularBookFilter !== "ALL" && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              setParticularBookFilter("ALL");
                            }}
                            className="p-0.5 rounded-md hover:bg-indigo-200 text-indigo-700 transition-colors"
                            title="Reset to All Books"
                          >
                            <X className="h-3.5 w-3.5" />
                          </span>
                        )}
                        <ChevronDown
                          className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                            isParticularBookDropdownOpen ? "rotate-180 text-indigo-600" : ""
                          }`}
                        />
                      </button>

                      {/* Particular Book Dropdown Menu */}
                      {isParticularBookDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-80 max-w-[92vw] bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                          <div className="relative mb-2 px-1">
                            <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                            <input
                              type="text"
                              value={particularBookSearch}
                              onChange={(e) => setParticularBookSearch(e.target.value)}
                              placeholder="Search particular book title/author..."
                              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                              autoFocus
                            />
                            {particularBookSearch && (
                              <button
                                type="button"
                                onClick={() => setParticularBookSearch("")}
                                className="absolute right-3 top-2 text-slate-400 hover:text-slate-600"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="max-h-64 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                            {(!particularBookSearch.trim() || "all books".includes(particularBookSearch.toLowerCase().trim())) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setParticularBookFilter("ALL");
                                  setIsParticularBookDropdownOpen(false);
                                  setParticularBookSearch("");
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                                  particularBookFilter === "ALL"
                                    ? "bg-indigo-600 text-white"
                                    : "text-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <BookOpen className={`h-3.5 w-3.5 ${particularBookFilter === "ALL" ? "text-white" : "text-indigo-500"}`} />
                                  <span>All Books</span>
                                </div>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                    particularBookFilter === "ALL" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {books.length}
                                </span>
                              </button>
                            )}

                            {availableBooksForParticularDropdown.map((b) => {
                              const isSelected = String(particularBookFilter) === String(b.id);
                              return (
                                <button
                                  key={b.id}
                                  type="button"
                                  onClick={() => {
                                    setParticularBookFilter(String(b.id));
                                    setIsParticularBookDropdownOpen(false);
                                    setParticularBookSearch("");
                                  }}
                                  className={`w-full flex items-start justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left ${
                                    isSelected
                                      ? "bg-indigo-600 text-white"
                                      : "text-slate-700 hover:bg-slate-50"
                                  }`}
                                >
                                  <div className="truncate pr-2">
                                    <div className="font-bold truncate">{b.title}</div>
                                    <div className={`text-[10px] truncate ${isSelected ? "text-indigo-100" : "text-slate-400"}`}>
                                      {b.author} • {b.category}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                                    <span
                                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                                        isSelected
                                          ? "bg-white/20 text-white"
                                          : b.available_copies > 0
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                          : "bg-rose-50 text-rose-700 border border-rose-100"
                                      }`}
                                    >
                                      Stock: {b.available_copies}
                                    </span>
                                    {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                                  </div>
                                </button>
                              );
                            })}

                            {availableBooksForParticularDropdown.length === 0 && (
                              <div className="text-center py-4 text-xs text-slate-400 font-medium">
                                No books found matching &quot;{particularBookSearch}&quot;
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Grid / Table View Switcher */}
                    <div className="flex items-center h-10 bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0">
                      <button
                        type="button"
                        onClick={() => setCatalogViewMode("grid")}
                        className={`h-8 px-2.5 flex items-center gap-1.5 rounded-lg text-xs font-bold transition-all ${
                          catalogViewMode === "grid"
                            ? "bg-white text-indigo-700 shadow-xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                        title="Card Grid View"
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Grid</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCatalogViewMode("table")}
                        className={`h-8 px-2.5 flex items-center gap-1.5 rounded-lg text-xs font-bold transition-all ${
                          catalogViewMode === "table"
                            ? "bg-white text-indigo-700 shadow-xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                        title="Detailed Table View"
                      >
                        <List className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Table</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Active Filters Bar */}
                {(categoryFilter !== "ALL" || particularBookFilter !== "ALL" || searchQuery) && (
                  <div className="flex items-center flex-wrap gap-2 px-1 text-xs">
                    <span className="text-slate-400 font-semibold text-[11px]">Active Filters:</span>
                    {categoryFilter !== "ALL" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold">
                        Category: {categoryFilter}
                        <button type="button" onClick={() => setCategoryFilter("ALL")} className="hover:text-indigo-900">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    {particularBookFilter !== "ALL" && selectedParticularBook && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold">
                        Book: {selectedParticularBook.title}
                        <button type="button" onClick={() => setParticularBookFilter("ALL")} className="hover:text-indigo-900">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    {searchQuery && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-medium">
                        Search: &quot;{searchQuery}&quot;
                        <button type="button" onClick={() => setSearchQuery("")} className="hover:text-slate-900">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryFilter("ALL");
                        setParticularBookFilter("ALL");
                        setSearchQuery("");
                      }}
                      className="text-[11px] font-bold text-rose-600 hover:underline ml-2"
                    >
                      Reset All Filters
                    </button>
                  </div>
                )}

                {/* Books Display: Table or Grid View */}
                {loading ? (
                  <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200">
                    <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                    <p className="text-xs text-slate-500 mt-2 font-medium">Loading library catalogue...</p>
                  </div>
                ) : filteredBooks.length === 0 ? (
                  <div className="text-center p-12 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                    <BookOpen className="h-10 w-10 text-slate-300 mx-auto" />
                    <h3 className="text-base font-bold text-slate-800 mt-2">No books found</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Try adjusting your search query, clearing filters, or register a new book to the catalogue.
                    </p>
                    <Button
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
                      className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" /> Add New Book Now
                    </Button>
                  </div>
                ) : catalogViewMode === "table" ? (
                  /* ================= DETAILED TABLE VIEW ================= */
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-500">
                            <th className="py-3.5 px-4">Book Title &amp; Details</th>
                            <th className="py-3.5 px-4">Category</th>
                            <th className="py-3.5 px-4">Storage Location</th>
                            <th className="py-3.5 px-4">Stock Status</th>
                            <th className="py-3.5 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredBooks.map((book) => (
                            <tr key={book.id} className="hover:bg-slate-50/60 transition-colors group">
                              <td className="py-3.5 px-4">
                                <div className="flex items-start gap-3">
                                  <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                                    <BookOpen className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-sm">
                                      {toTitleCase(book.title)}
                                    </p>
                                    <p className="text-[11px] text-slate-500">
                                      by <span className="font-semibold text-slate-700">{toTitleCase(book.author)}</span>
                                      {book.publication_year && <span> • {book.publication_year}</span>}
                                      {book.isbn && <span className="font-mono text-slate-400"> • ISBN {book.isbn}</span>}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                  {toTitleCase(book.category) || "General"}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-1.5 text-[11px]">
                                  {book.rack_code ? (
                                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200 font-medium">
                                      <MapPin className="h-3 w-3 text-amber-600" /> Rack {book.rack_code}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic">No rack</span>
                                  )}
                                  {book.shelf_code && (
                                    <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-800 px-2 py-0.5 rounded-md border border-sky-200 font-medium">
                                      Shelf {book.shelf_code}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="space-y-1">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
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
                                  <div className="text-[10px] text-slate-400 font-medium">
                                    {book.available_copies} of {book.total_copies} total copies
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenCopies(book)}
                                    className="h-8 px-2.5 text-xs gap-1 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 font-bold rounded-lg"
                                    title="Manage individual barcode copies"
                                  >
                                    <QrCode className="h-3.5 w-3.5 text-indigo-600" />
                                    <span>Copies ({book.total_copies})</span>
                                  </Button>

                                  {book.available_copies > 0 && (
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setIssueForm({
                                          book: String(book.id),
                                          book_copy: "",
                                          student: "",
                                          due_date: "",
                                        });
                                        setSelectedStudentIds([]);
                                        setIssueErrors({});
                                        setShowIssueModal(true);
                                      }}
                                      className="h-8 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg gap-1 shadow-xs"
                                      title={`Issue this book (${book.available_copies} copies available)`}
                                    >
                                      <ArrowRightLeft className="h-3.5 w-3.5" />
                                      <span>Issue</span>
                                    </Button>
                                  )}

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
                                    title="Edit Title"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteBook(book.id)}
                                    className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 rounded-lg"
                                    title="Delete Title"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  /* ================= MODERN CARD GRID VIEW ================= */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredBooks.map((book) => (
                      <div
                        key={book.id}
                        className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between overflow-hidden group relative"
                      >
                        {/* Top Accent Gradient Stripe */}
                        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600" />

                        <div className="p-4 sm:p-5 space-y-3">
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

                        <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 flex items-center justify-between border-t border-slate-100">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenCopies(book)}
                            className="text-xs gap-1.5 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 font-bold rounded-xl"
                          >
                            <QrCode className="h-3.5 w-3.5 text-indigo-600" /> Copies ({book.total_copies})
                          </Button>

                          <div className="flex items-center gap-1">
                            {book.available_copies > 0 && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setIssueForm({
                                    book: String(book.id),
                                    book_copy: "",
                                    student: "",
                                    due_date: "",
                                  });
                                  setSelectedStudentIds([]);
                                  setIssueErrors({});
                                  setShowIssueModal(true);
                                }}
                                className="h-8 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 text-xs font-bold rounded-lg border border-indigo-200/80 gap-1 transition-all"
                                title={`Issue this book (${book.available_copies} copies available)`}
                              >
                                <ArrowRightLeft className="h-3.5 w-3.5 text-indigo-600" />
                                <span>Issue</span>
                              </Button>
                            )}
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

                    {/* Add New Book Placeholder Card to eliminate awkward blank space */}
                    {!searchQuery && categoryFilter === "ALL" && particularBookFilter === "ALL" && (
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
                        className="rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20 p-6 flex flex-col items-center justify-center text-center transition-all group min-h-[220px]"
                      >
                        <div className="h-11 w-11 rounded-2xl bg-white group-hover:bg-indigo-600 text-indigo-600 group-hover:text-white border border-slate-200 group-hover:border-indigo-600 shadow-2xs flex items-center justify-center transition-all mb-2">
                          <Plus className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-700">Add Another Book</span>
                        <span className="text-xs text-slate-400 mt-1 max-w-[200px]">
                          Register a new title, generate barcode copies and assign rack locations
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

        {/* TAB 2: ACTIVE CIRCULATION */}
        {activeTab === "circulation" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-slate-200/80 bg-white space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Active Book Loans Counter</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Currently circulating physical copies requiring return or renewal</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setIssueForm({ book: "", book_copy: "", student: "", due_date: "" });
                      setSelectedStudentIds([]);
                      setIssueCategoryFilter("ALL");
                      setIssueBookSearch("");
                      setIssueClassFilter("");
                      setIssueDivisionFilter("");
                      setStudentSearchQuery("");
                      setStaffSearchQuery("");
                      setIsStudentDropdownOpen(false);
                      setIsStaffDropdownOpen(false);
                      setShowIssueModal(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 rounded-xl font-bold shadow-sm"
                  >
                    <Plus className="h-3.5 w-3.5" /> New Issue Loan
                  </Button>
                </div>

                {/* Circulation Search & Filters Toolbar */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 pt-1">
                  {/* Search input */}
                  <div className="md:col-span-5 relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      value={circulationSearch}
                      onChange={(e) => setCirculationSearch(e.target.value)}
                      placeholder="Search borrower, book title, accession no, GR..."
                      className="pl-9 h-9 text-xs rounded-xl border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                    {circulationSearch && (
                      <button
                        type="button"
                        onClick={() => setCirculationSearch("")}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Filter by Particular Book Dropdown */}
                  <div className="md:col-span-4">
                    <select
                      value={circulationBookFilter}
                      onChange={(e) => setCirculationBookFilter(e.target.value)}
                      className={`w-full h-9 rounded-xl border px-3 text-xs font-semibold transition-colors ${
                        circulationBookFilter !== "ALL"
                          ? "bg-indigo-50 border-indigo-300 text-indigo-700 ring-1 ring-indigo-500/20"
                          : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      <option value="ALL">Filter by Book (All {uniqueActiveLoanBooks.length} titles)</option>
                      {uniqueActiveLoanBooks.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.title} ({b.count} loan{b.count > 1 ? "s" : ""})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filter by Category Dropdown */}
                  <div className="md:col-span-3">
                    <select
                      value={circulationCategoryFilter}
                      onChange={(e) => setCirculationCategoryFilter(e.target.value)}
                      className={`w-full h-9 rounded-xl border px-3 text-xs font-semibold transition-colors ${
                        circulationCategoryFilter !== "ALL"
                          ? "bg-indigo-50 border-indigo-300 text-indigo-700 ring-1 ring-indigo-500/20"
                          : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      <option value="ALL">Filter by Category (All)</option>
                      {uniqueActiveLoanCategories.map((c) => (
                        <option key={c.cat} value={c.cat}>
                          {c.cat} ({c.count})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Filter Pills & Status Toggle */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setCirculationStatusFilter("ALL")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                        circulationStatusFilter === "ALL"
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      All ({activeLoans.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCirculationStatusFilter("OVERDUE")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                        circulationStatusFilter === "OVERDUE"
                          ? "bg-rose-600 text-white"
                          : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                      }`}
                    >
                      Overdue ({activeLoans.filter((l) => new Date(l.due_date) < new Date()).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCirculationStatusFilter("DUE_SOON")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                        circulationStatusFilter === "DUE_SOON"
                          ? "bg-amber-600 text-white"
                          : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                      }`}
                    >
                      Due Soon (≤3d)
                    </button>

                    {(circulationSearch || circulationBookFilter !== "ALL" || circulationCategoryFilter !== "ALL" || circulationStatusFilter !== "ALL") && (
                      <button
                        type="button"
                        onClick={() => {
                          setCirculationSearch("");
                          setCirculationBookFilter("ALL");
                          setCirculationCategoryFilter("ALL");
                          setCirculationStatusFilter("ALL");
                        }}
                        className="text-rose-600 font-bold hover:underline ml-2"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>

                  <span className="text-[11px] font-semibold text-slate-400">
                    Showing {filteredActiveLoans.length} of {activeLoans.length} active loan{activeLoans.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              {activeLoans.length === 0 ? (
                <div className="text-center p-12">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                  <p className="text-sm font-semibold text-slate-800 mt-2">All books are safely in the library!</p>
                  <p className="text-xs text-slate-400 mt-1">No active loans outstanding.</p>
                </div>
              ) : filteredActiveLoans.length === 0 ? (
                <div className="text-center p-12">
                  <AlertCircle className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="text-sm font-semibold text-slate-800 mt-2">No active loans match the selected filters</p>
                  <p className="text-xs text-slate-400 mt-1">Try clearing or changing your search criteria.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setCirculationSearch("");
                      setCirculationBookFilter("ALL");
                      setCirculationCategoryFilter("ALL");
                      setCirculationStatusFilter("ALL");
                    }}
                    className="mt-3 text-xs"
                  >
                    Reset All Filters
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/90 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3.5 whitespace-nowrap">Book Title</th>
                        <th className="px-4 py-3.5 whitespace-nowrap">Accession No</th>
                        <th className="px-4 py-3.5 whitespace-nowrap">Borrower</th>
                        <th className="px-4 py-3.5 whitespace-nowrap">Issued Date</th>
                        <th className="px-4 py-3.5 whitespace-nowrap">Due Date</th>
                        <th className="px-4 py-3.5 whitespace-nowrap">Renewals</th>
                        <th className="px-4 py-3.5 whitespace-nowrap text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredActiveLoans.map((loan) => {
                        const isOverdue = new Date(loan.due_date) < new Date();
                        return (
                          <tr key={loan.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                  <BookOpen className="h-3.5 w-3.5" />
                                </div>
                                <span className="font-bold text-slate-900 text-sm">{toTitleCase(loan.book_title)}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                                {loan.accession_no || `BC-${loan.book}`}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-800">{toTitleCase(loan.staff_name || loan.student_name || "Unknown")}</span>
                                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                                  {loan.staff ? `Staff #${loan.staff}` : `GR: ${loan.student_gr_no || "N/A"}`}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap font-medium text-slate-700 text-xs">
                              {new Date(loan.book_issued_date).toLocaleDateString("en-GB")}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <div className={`inline-flex items-center gap-1.5 font-bold text-xs ${isOverdue ? "text-rose-600" : "text-slate-700"}`}>
                                <span>{new Date(loan.due_date).toLocaleDateString("en-GB")}</span>
                                {isOverdue && (
                                  <span className="bg-rose-100 text-rose-800 text-[10px] px-2 py-0.5 rounded-full uppercase border border-rose-200">Overdue</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap text-slate-600">
                              <span className="bg-slate-100 px-2.5 py-1 rounded-md text-xs font-mono font-medium border border-slate-200">
                                {loan.renewal_count || 0} / {librarySettings?.max_renewal_count || 2}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRenewBook(loan.id)}
                                  disabled={actionLoading}
                                  className="text-xs h-8 border-slate-200 hover:bg-slate-50 font-bold rounded-lg"
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
                                  className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-2xs"
                                >
                                  <CheckCircle2 className="h-3 w-3 mr-1" /> Return
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleMarkLost(loan.id)}
                                  className="text-xs h-8 text-rose-600 hover:bg-rose-50 font-bold rounded-lg"
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

              {/* Cascading Class -> Division -> Student Selection */}
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4 text-indigo-600" />
                    Select Student for Clearance Verification
                  </Label>
                  {(clearanceClassFilter || clearanceDivisionFilter || clearanceStudentSearch || clearanceSearchQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setClearanceClassFilter("");
                        setClearanceDivisionFilter("");
                        setClearanceStudentSearch("");
                        setClearanceSearchQuery("");
                        setSelectedStudentClearance(null);
                      }}
                      className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline"
                    >
                      Reset Selection
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* 1. Class Filter */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">1. Filter Class</Label>
                    <select
                      value={clearanceClassFilter}
                      onChange={(e) => {
                        const newClass = e.target.value;
                        setClearanceClassFilter(newClass);
                        setClearanceDivisionFilter("");
                        setClearanceSearchQuery("");
                        setSelectedStudentClearance(null);
                      }}
                      className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs sm:text-sm font-medium bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors shadow-2xs"
                    >
                      <option value="">-- All Classes ({availableClasses.length}) --</option>
                      {availableClasses.map((cls) => (
                        <option key={cls} value={cls}>
                          Class: {cls}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2. Division Filter */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">
                      2. Filter Division {clearanceClassFilter ? `(${clearanceClassFilter})` : ""}
                    </Label>
                    <select
                      value={clearanceDivisionFilter}
                      onChange={(e) => {
                        setClearanceDivisionFilter(e.target.value);
                        setClearanceSearchQuery("");
                        setSelectedStudentClearance(null);
                      }}
                      disabled={!clearanceClassFilter}
                      className={`w-full h-10 rounded-xl border px-3 text-xs sm:text-sm font-medium transition-colors shadow-2xs ${
                        !clearanceClassFilter
                          ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                          : "bg-white border-slate-200 text-slate-700 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                      }`}
                    >
                      {!clearanceClassFilter ? (
                        <option value="">-- Choose Class First --</option>
                      ) : clearanceDivisions.length === 0 ? (
                        <option value="">-- No Divisions in {clearanceClassFilter} --</option>
                      ) : (
                        <>
                          <option value="">-- All Divisions ({clearanceDivisions.length}) --</option>
                          {clearanceDivisions.map((div) => (
                            <option key={div} value={div}>
                              Division {div}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>

                  {/* 3. Search Student by Name / GR */}
                  <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                    <Label className="text-xs font-semibold text-slate-700">3. Quick Search Student</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-indigo-500" />
                      <input
                        type="text"
                        value={clearanceStudentSearch}
                        onChange={(e) => setClearanceStudentSearch(e.target.value)}
                        placeholder="Search name, GR, or Roll No..."
                        className="w-full h-10 pl-8 pr-7 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 bg-white transition-colors shadow-2xs"
                      />
                      {clearanceStudentSearch && (
                        <button
                          type="button"
                          onClick={() => setClearanceStudentSearch("")}
                          className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. Student Selection Combobox Dropdown strictly matching Issue Loan UI */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span className="font-semibold text-slate-700">
                      Choose Student ({filteredClearanceStudents.length} {filteredClearanceStudents.length === 1 ? "student" : "students"} available)
                    </span>
                    {filteredClearanceStudents.length > 0 && clearanceClassFilter && (
                      <span className="text-indigo-600 font-semibold text-[11px]">
                        Filtered by Class {clearanceClassFilter} {clearanceDivisionFilter ? `• Div ${clearanceDivisionFilter}` : ""}
                      </span>
                    )}
                  </div>

                  <div className="relative" ref={clearanceStudentDropdownRef}>
                    {/* Trigger Button */}
                    <button
                      type="button"
                      onClick={() => setIsClearanceStudentDropdownOpen((prev) => !prev)}
                      className={`w-full min-h-[46px] px-3.5 py-2 rounded-xl border flex items-center justify-between text-left transition-all shadow-2xs ${
                        isClearanceStudentDropdownOpen
                          ? "border-indigo-600 ring-2 ring-indigo-500/20 bg-white"
                          : clearanceSearchQuery && students.some((s) => String(s.id) === String(clearanceSearchQuery))
                          ? "border-indigo-300 bg-indigo-50/40 text-slate-900"
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      {(() => {
                        const selStudent = students.find((s) => String(s.id) === String(clearanceSearchQuery));
                        if (selStudent) {
                          return (
                            <div className="flex items-center gap-2.5 truncate flex-1 mr-2">
                              <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                                {selStudent.name ? selStudent.name.charAt(0).toUpperCase() : "S"}
                              </div>
                              <div className="truncate flex-1">
                                <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                  {selStudent.name} {selStudent.surname || ""}
                                </div>
                                <div className="text-[11px] text-slate-500 truncate flex items-center gap-2">
                                  <span className="font-mono text-slate-600">GR: {selStudent.gr_no || selStudent.id}</span>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-indigo-600 font-medium">
                                    Class {selStudent.school_class_name || selStudent.class_name || "N/A"}{" "}
                                    {selStudent.division || ""}
                                  </span>
                                </div>
                              </div>
                              {selectedStudentClearance && (
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[11px] font-black shrink-0 ${
                                    selectedStudentClearance.is_cleared
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                      : "bg-rose-100 text-rose-800 border border-rose-200"
                                  }`}
                                >
                                  {selectedStudentClearance.status}
                                </span>
                              )}
                            </div>
                          );
                        }
                        return (
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 font-medium">
                            <GraduationCap className="h-4 w-4 text-slate-400" />
                            <span>
                              {filteredClearanceStudents.length > 0
                                ? `-- Choose student for clearance verification (${filteredClearanceStudents.length} matches) --`
                                : `-- No students found in ${clearanceClassFilter ? `Class ${clearanceClassFilter}` : "filters"} --`}
                            </span>
                          </div>
                        );
                      })()}

                      <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
                        {clearanceSearchQuery && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              setClearanceSearchQuery("");
                              setSelectedStudentClearance(null);
                            }}
                            className="p-1 rounded-md hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
                            title="Clear selection"
                          >
                            <X className="h-3.5 w-3.5" />
                          </span>
                        )}
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${
                            isClearanceStudentDropdownOpen ? "rotate-180 text-indigo-600" : ""
                          }`}
                        />
                      </div>
                    </button>

                    {/* Dropdown Menu with Search INSIDE */}
                    {isClearanceStudentDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                        {/* Search Bar inside student dropdown */}
                        <div className="mb-2 pb-2 border-b border-slate-100">
                          <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-indigo-500" />
                            <input
                              type="text"
                              value={clearanceStudentSearch}
                              onChange={(e) => setClearanceStudentSearch(e.target.value)}
                              placeholder="Search student by name, GR No, or Roll..."
                              className="w-full pl-8 pr-7 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 bg-slate-50/70 focus:bg-white transition-all font-medium"
                              autoFocus
                            />
                            {clearanceStudentSearch && (
                              <button
                                type="button"
                                onClick={() => setClearanceStudentSearch("")}
                                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold mt-1.5 px-1">
                            <span>
                              {clearanceClassFilter ? `Class: ${clearanceClassFilter}` : "All Classes"}{" "}
                              {clearanceDivisionFilter ? `• Div: ${clearanceDivisionFilter}` : ""}
                            </span>
                            <span>{filteredClearanceStudents.length} student{filteredClearanceStudents.length === 1 ? "" : "s"} found</span>
                          </div>
                        </div>

                        {/* Scrollable List of Students */}
                        <div className="max-h-64 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                          {filteredClearanceStudents.map((s) => {
                            const isSelected = String(clearanceSearchQuery) === String(s.id);
                            const pendingDue = pendingClearanceList.find((p) => p.student_id === s.id);

                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => {
                                  setClearanceSearchQuery(String(s.id));
                                  handleSearchStudentClearance(s.id);
                                  setIsClearanceStudentDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors ${
                                  isSelected
                                    ? "bg-indigo-600 text-white shadow-sm"
                                    : "text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 truncate pr-2">
                                  <div
                                    className={`h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                      isSelected
                                        ? "bg-white/20 text-white"
                                        : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    {s.name ? s.name.charAt(0).toUpperCase() : "S"}
                                  </div>
                                  <div className="truncate">
                                    <div className="text-xs sm:text-sm font-bold truncate">
                                      {s.name} {s.surname || ""}
                                    </div>
                                    <div
                                      className={`text-[11px] truncate flex items-center gap-1.5 mt-0.5 ${
                                        isSelected ? "text-indigo-100" : "text-slate-400"
                                      }`}
                                    >
                                      <span className="font-mono">GR: {s.gr_no || s.id}</span>
                                      <span>•</span>
                                      <span>Class: {s.school_class_name || s.class_name || "N/A"} {s.division || ""}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {pendingDue ? (
                                    <span
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                        isSelected
                                          ? "bg-white/20 text-white"
                                          : "bg-rose-50 text-rose-700 border border-rose-200"
                                      }`}
                                    >
                                      Due: ₹{pendingDue.pending_fine_total}
                                    </span>
                                  ) : (
                                    <span
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                        isSelected
                                          ? "bg-white/20 text-white"
                                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      }`}
                                    >
                                      Cleared
                                    </span>
                                  )}
                                  {isSelected && <Check className="h-4 w-4 text-white" />}
                                </div>
                              </button>
                            );
                          })}

                          {filteredClearanceStudents.length === 0 && (
                            <div className="text-center py-6 text-xs text-slate-400">
                              <Users className="h-6 w-6 text-slate-300 mx-auto mb-1" />
                              No students found matching filters
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
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
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                          <tr>
                            <th className="px-4 py-2.5 whitespace-nowrap">Book Title</th>
                            <th className="px-4 py-2.5 whitespace-nowrap">Accession / Barcode</th>
                            <th className="px-4 py-2.5 whitespace-nowrap">Due Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedStudentClearance.issued_books.map((b) => (
                            <tr key={b.id}>
                              <td className="px-4 py-2.5 whitespace-nowrap font-semibold text-slate-900">{b.title}</td>
                              <td className="px-4 py-2.5 whitespace-nowrap font-mono text-slate-600">{b.accession_no || "—"}</td>
                              <td className="px-4 py-2.5 whitespace-nowrap text-rose-600 font-medium">{new Date(b.due_date).toLocaleDateString("en-GB")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {selectedStudentClearance.unpaid_fine_records.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
                      Unpaid Fine & Penalty Records ({selectedStudentClearance.unpaid_fine_records.length})
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                          <tr>
                            <th className="px-4 py-2.5 whitespace-nowrap">Book Title</th>
                            <th className="px-4 py-2.5 whitespace-nowrap">Reason</th>
                            <th className="px-4 py-2.5 whitespace-nowrap">Total Fine</th>
                            <th className="px-4 py-2.5 whitespace-nowrap">Paid</th>
                            <th className="px-4 py-2.5 whitespace-nowrap">Due</th>
                            <th className="px-4 py-2.5 whitespace-nowrap text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedStudentClearance.unpaid_fine_records.map((f) => (
                            <tr key={f.id}>
                              <td className="px-4 py-2.5 whitespace-nowrap font-semibold text-slate-900">{f.title}</td>
                              <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">{f.reason}</td>
                              <td className="px-4 py-2.5 whitespace-nowrap font-mono text-slate-700">₹{f.total_fine}</td>
                              <td className="px-4 py-2.5 whitespace-nowrap font-mono text-emerald-600">₹{f.paid_amount}</td>
                              <td className="px-4 py-2.5 whitespace-nowrap font-mono font-bold text-rose-600">₹{f.due_amount}</td>
                              <td className="px-4 py-2.5 whitespace-nowrap text-right">
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
                        <th className="px-4 py-3 whitespace-nowrap">Student Name</th>
                        <th className="px-4 py-3 whitespace-nowrap">GR No</th>
                        <th className="px-4 py-3 whitespace-nowrap">Class</th>
                        <th className="px-4 py-3 whitespace-nowrap">Unreturned Books</th>
                        <th className="px-4 py-3 whitespace-nowrap">Fine Due (₹)</th>
                        <th className="px-4 py-3 whitespace-nowrap text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pendingClearanceList.map((st) => (
                        <tr key={st.student_id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 whitespace-nowrap font-semibold text-slate-900">{st.student_name}</td>
                          <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-600">{st.gr_no || "N/A"}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-600">{st.class_name || "N/A"}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {st.active_books_count > 0 ? (
                              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold font-mono">
                                {st.active_books_count} book(s)
                              </span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap font-mono font-bold text-rose-600">
                            {Number(st.pending_fine_total) > 0 ? `₹${st.pending_fine_total}` : "₹0"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
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

            <form noValidate onSubmit={handleSaveSettings} className="space-y-4">
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
            <div className="p-4 border-b border-slate-200 bg-white space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Completed Circulation History</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Historical records of returned, damaged, or lost books</p>
                </div>
                <span className="text-xs font-semibold text-slate-400">
                  Showing {filteredHistoryLoans.length} of {historyLoans.length} records
                </span>
              </div>

              {/* History Search & Filters Toolbar */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 pt-1">
                <div className="md:col-span-5 relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search borrower, book, accession, remarks..."
                    className="pl-9 h-9 text-xs rounded-xl border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                  {historySearch && (
                    <button
                      type="button"
                      onClick={() => setHistorySearch("")}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter by Particular Book */}
                <div className="md:col-span-4">
                  <select
                    value={historyBookFilter}
                    onChange={(e) => setHistoryBookFilter(e.target.value)}
                    className={`w-full h-9 rounded-xl border px-3 text-xs font-semibold transition-colors ${
                      historyBookFilter !== "ALL"
                        ? "bg-indigo-50 border-indigo-300 text-indigo-700 ring-1 ring-indigo-500/20"
                        : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    <option value="ALL">Filter by Book (All {uniqueHistoryLoanBooks.length} titles)</option>
                    {uniqueHistoryLoanBooks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} ({b.count} record{b.count > 1 ? "s" : ""})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter by Category */}
                <div className="md:col-span-3">
                  <select
                    value={historyCategoryFilter}
                    onChange={(e) => setHistoryCategoryFilter(e.target.value)}
                    className={`w-full h-9 rounded-xl border px-3 text-xs font-semibold transition-colors ${
                      historyCategoryFilter !== "ALL"
                        ? "bg-indigo-50 border-indigo-300 text-indigo-700 ring-1 ring-indigo-500/20"
                        : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    <option value="ALL">Filter by Category (All)</option>
                    {categoryNames.filter((c) => c !== "ALL").map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status Chips & Reset */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                {["ALL", "RETURNED", "LOST", "DAMAGED"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setHistoryStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                      historyStatusFilter === st
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {st === "ALL" ? "All History" : st.charAt(0) + st.slice(1).toLowerCase()}
                  </button>
                ))}

                {(historySearch || historyBookFilter !== "ALL" || historyCategoryFilter !== "ALL" || historyStatusFilter !== "ALL") && (
                  <button
                    type="button"
                    onClick={() => {
                      setHistorySearch("");
                      setHistoryBookFilter("ALL");
                      setHistoryCategoryFilter("ALL");
                      setHistoryStatusFilter("ALL");
                    }}
                    className="text-rose-600 font-bold hover:underline ml-2"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>

            {historyLoans.length === 0 ? (
              <div className="text-center p-12">
                <Clock className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-sm text-slate-500 mt-2">No circulation history yet.</p>
              </div>
            ) : filteredHistoryLoans.length === 0 ? (
              <div className="text-center p-12">
                <AlertCircle className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-800 mt-2">No history records match the selected filters</p>
                <p className="text-xs text-slate-400 mt-1">Try clearing or changing your search criteria.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setHistorySearch("");
                    setHistoryBookFilter("ALL");
                    setHistoryCategoryFilter("ALL");
                    setHistoryStatusFilter("ALL");
                  }}
                  className="mt-3 text-xs"
                >
                  Reset All Filters
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/90 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3.5 whitespace-nowrap">Book Title</th>
                      <th className="px-4 py-3.5 whitespace-nowrap">Accession No</th>
                      <th className="px-4 py-3.5 whitespace-nowrap">Borrower</th>
                      <th className="px-4 py-3.5 whitespace-nowrap">Issue Date</th>
                      <th className="px-4 py-3.5 whitespace-nowrap">Return Date</th>
                      <th className="px-4 py-3.5 whitespace-nowrap">Condition / Status</th>
                      <th className="px-4 py-3.5 whitespace-nowrap">Fine Amount &amp; Status</th>
                      <th className="px-4 py-3.5 whitespace-nowrap">Remarks</th>
                      <th className="px-4 py-3.5 whitespace-nowrap text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredHistoryLoans.map((item) => {
                      const totalFine = Number(item.total_fine || item.late_fees || 0);
                      const paidFine = Number(item.fine_paid_amount || 0);
                      const dueFine = Math.max(0, totalFine - paidFine);

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                <BookOpen className="h-3.5 w-3.5" />
                              </div>
                              <span className="font-bold text-slate-900 text-sm">{toTitleCase(item.book_title)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {item.accession_no ? (
                              <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                                {item.accession_no}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800">{toTitleCase(item.staff_name || item.student_name || "Unknown")}</span>
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                                {item.staff ? `Staff #${item.staff}` : `GR: ${item.student_gr_no || "N/A"}`}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap font-medium text-slate-700 text-xs">
                            {item.book_issued_date ? new Date(item.book_issued_date).toLocaleDateString("en-GB") : "—"}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap font-medium text-slate-700 text-xs">
                            {item.actual_return_date ? (
                              new Date(item.actual_return_date).toLocaleDateString("en-GB")
                            ) : (
                              <span className="text-slate-400 italic">Not Returned</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span
                              className={`text-xs px-2.5 py-1 rounded-full font-bold border inline-flex items-center gap-1.5 ${
                                item.status === "RETURNED"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : item.status === "LOST"
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  item.status === "RETURNED"
                                    ? "bg-emerald-500"
                                    : item.status === "LOST"
                                    ? "bg-rose-500"
                                    : "bg-amber-500"
                                }`}
                              />
                              {item.condition_on_return || item.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {totalFine > 0 ? (
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-xs">Total: ₹{totalFine}</span>
                                {item.is_fine_paid || dueFine <= 0 ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                                    <CheckCircle2 className="h-2.5 w-2.5" /> Fully Paid
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-full">
                                    Due: ₹{dueFine}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 font-mono text-xs bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                ₹0 (No Fine)
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-500">{item.remarks || "—"}</td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-right">
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              {dueFine > 0 && (
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenPayFine(item)}
                                  className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1 shadow-2xs rounded-lg"
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
                                  className="h-7 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 font-bold gap-1 rounded-lg"
                                >
                                  <Receipt className="h-3 w-3" /> Receipt
                                </Button>
                              )}
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
        )}
          </main>
        </div>
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

            <form noValidate onSubmit={handleSaveBook} className="space-y-4">
              {Object.keys(bookFormErrors).length > 0 && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span className="font-semibold">Please correct the highlighted mandatory fields marked in red below.</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-800">
                      Book Title <span className="text-rose-500">*</span>
                    </Label>
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
                    className={`transition-colors ${
                      bookFormErrors.title ? "border-rose-500 bg-rose-50/20 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20" : "border-slate-200"
                    }`}
                  />
                  {bookFormErrors.title && (
                    <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {bookFormErrors.title}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-800">
                      Author <span className="text-rose-500">*</span>
                    </Label>
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
                    className={`transition-colors ${
                      bookFormErrors.author ? "border-rose-500 bg-rose-50/20 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20" : "border-slate-200"
                    }`}
                  />
                  {bookFormErrors.author && (
                    <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {bookFormErrors.author}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-800">
                      Category / Subject <span className="text-rose-500">*</span>
                    </Label>
                    <span className="text-[10px] text-slate-400">Select existing or type new</span>
                  </div>
                  <Input
                    list="existing-book-categories"
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
                    placeholder="e.g. Science, Mathematics, Literature..."
                    className={`transition-colors ${
                      bookFormErrors.category ? "border-rose-500 bg-rose-50/20 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20" : "border-slate-200"
                    }`}
                  />
                  <datalist id="existing-book-categories">
                    {categoryNames.filter((c) => c !== "ALL").map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                  {categoryNames.filter((c) => c !== "ALL").length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 pt-1">
                      <span className="text-[10px] font-medium text-slate-400">Quick pick:</span>
                      {categoryNames.filter((c) => c !== "ALL").slice(0, 6).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setBookForm({ ...bookForm, category: c });
                            if (bookFormErrors.category) setBookFormErrors((prev) => ({ ...prev, category: "" }));
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                            bookForm.category === c
                              ? "bg-indigo-600 text-white border-indigo-600 font-bold"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                  {bookFormErrors.category && (
                    <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {bookFormErrors.category}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-800">ISBN (Optional)</Label>
                  <Input
                    value={bookForm.isbn}
                    onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
                    placeholder="e.g. 978-3-16-148410-0"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-800">Book Price (₹)</Label>
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
                    className={`transition-colors ${
                      bookFormErrors.price ? "border-rose-500 bg-rose-50/20 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20" : "border-slate-200"
                    }`}
                  />
                  {bookFormErrors.price && (
                    <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {bookFormErrors.price}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-800">
                      Rack Location <span className="text-rose-500">*</span>
                    </Label>
                    <button
                      type="button"
                      onClick={() => openAddMasterModal("rack")}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 hover:underline"
                    >
                      <Plus className="h-3 w-3" /> Add Rack
                    </button>
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
                    className={`w-full h-9 rounded-md border px-3 text-sm transition-colors ${
                      bookFormErrors.rack ? "border-rose-500 bg-rose-50/20 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20" : "border-slate-200"
                    }`}
                  >
                    <option value="">{racks.length === 0 ? "-- No Racks Available (Click + Add Rack) --" : "-- Select Rack --"}</option>
                    {racks.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.rack_code} - {r.rack_name}
                      </option>
                    ))}
                  </select>
                  {bookFormErrors.rack && (
                    <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {bookFormErrors.rack}
                    </p>
                  )}
                  {racks.length === 0 && !bookFormErrors.rack && (
                    <p className="text-[11px] font-medium text-amber-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 shrink-0" /> No racks created yet. Click{" "}
                      <button type="button" onClick={() => openAddMasterModal("rack")} className="font-bold underline text-indigo-600 hover:text-indigo-800 ml-0.5">
                        + Add Rack
                      </button>{" "}
                      to set up one.
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-800">
                      Shelf Location <span className="text-rose-500">*</span>
                    </Label>
                    {bookForm.rack && (
                      <button
                        type="button"
                        onClick={() => openAddMasterModal("shelf", Number(bookForm.rack))}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 hover:underline"
                      >
                        <Plus className="h-3 w-3" /> Add Shelf
                      </button>
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
                    className={`w-full h-9 rounded-md border px-3 text-sm transition-colors disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${
                      bookFormErrors.shelf ? "border-rose-500 bg-rose-50/20 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20" : "border-slate-200"
                    }`}
                  >
                    {!bookForm.rack ? (
                      <option value="">-- Select Rack First --</option>
                    ) : (
                      <>
                        <option value="">
                          {shelves.filter((s) => String(s.rack) === String(bookForm.rack)).length === 0
                            ? "-- No Shelves in this Rack (Click + Add Shelf) --"
                            : "-- Select Shelf --"}
                        </option>
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
                  {bookFormErrors.shelf && (
                    <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {bookFormErrors.shelf}
                    </p>
                  )}
                  {bookForm.rack && shelves.filter((s) => String(s.rack) === String(bookForm.rack)).length === 0 && !bookFormErrors.shelf && (
                    <p className="text-[11px] font-medium text-amber-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 shrink-0" /> No shelves in this rack. Click{" "}
                      <button type="button" onClick={() => openAddMasterModal("shelf", Number(bookForm.rack))} className="font-bold underline text-indigo-600 hover:text-indigo-800 ml-0.5">
                        + Add Shelf
                      </button>{" "}
                      to create one.
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-800">
                      Total Physical Copies <span className="text-rose-500">*</span>
                    </Label>
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
                    className={`transition-colors ${
                      bookFormErrors.total_copies ? "border-rose-500 bg-rose-50/20 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20" : "border-slate-200"
                    }`}
                  />
                  {bookFormErrors.total_copies && (
                    <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {bookFormErrors.total_copies}
                    </p>
                  )}
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
      {/* MODAL: ISSUE BOOK */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full space-y-4 border border-slate-200 shadow-2xl overflow-y-auto max-h-[92vh]">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-indigo-600" />
                  Issue Book to Borrower
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lend physical copies to students or staff. Select multiple students at once if stock allows!
                </p>
              </div>
              <button
                onClick={() => {
                  setShowIssueModal(false);
                  setSelectedStudentIds([]);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form noValidate onSubmit={handleIssueBook} className="space-y-4">
              {/* STEP 1: BOOK SELECTION & STOCK INFO */}
              <div className="space-y-3 p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <BookMarked className="h-3.5 w-3.5 text-indigo-600" />
                    1. Select Book to Issue <span className="text-rose-500">*</span>
                  </Label>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {availableBooksForIssue.length} title{availableBooksForIssue.length === 1 ? "" : "s"} available
                  </span>
                </div>

                {/* Outside Category Filter */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-700">Category</Label>
                    {issueCategoryFilter !== "ALL" && (
                      <button
                        type="button"
                        onClick={() => setIssueCategoryFilter("ALL")}
                        className="text-[11px] font-bold text-indigo-600 hover:underline"
                      >
                        Reset to All Categories
                      </button>
                    )}
                  </div>
                  <select
                    value={issueCategoryFilter}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      setIssueCategoryFilter(newCat);
                      if (
                        selectedIssueBook &&
                        newCat !== "ALL" &&
                        toTitleCase(selectedIssueBook.category) !== newCat
                      ) {
                        setIssueForm((prev) => ({ ...prev, book: "" }));
                        setSelectedStudentIds([]);
                      }
                    }}
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs sm:text-sm font-semibold bg-white text-slate-700 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors shadow-2xs"
                  >
                    <option value="ALL">All Categories</option>
                    {categoryNames
                      .filter((c) => c !== "ALL")
                      .map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Choose Book from Available Stock (Searchable Combobox) */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Choose Book {issueCategoryFilter !== "ALL" ? `(${issueCategoryFilter})` : ""} *
                  </Label>
                  <div className="relative" ref={issueBookDropdownRef}>
                    {/* Dropdown Trigger Button */}
                    <button
                      type="button"
                      onClick={() => setIsIssueBookDropdownOpen((prev) => !prev)}
                      className={`w-full min-h-[44px] px-3.5 py-2 rounded-xl border flex items-center justify-between text-left transition-all shadow-2xs ${
                        issueErrors.book
                          ? "border-rose-400 bg-rose-50/40 text-rose-900 ring-2 ring-rose-500/10"
                          : isIssueBookDropdownOpen
                          ? "border-indigo-600 ring-2 ring-indigo-500/20 bg-white"
                          : selectedIssueBook
                          ? "border-indigo-200 bg-indigo-50/30 text-slate-900 hover:border-indigo-300"
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-500"
                      }`}
                    >
                      {selectedIssueBook ? (
                        <div className="flex items-center gap-2.5 truncate flex-1 mr-2">
                          <BookOpen className="h-4 w-4 text-indigo-600 shrink-0" />
                          <div className="truncate flex-1">
                            <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                              {toTitleCase(selectedIssueBook.title)}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate flex items-center gap-2">
                              <span>{toTitleCase(selectedIssueBook.author)}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-indigo-600 font-medium">{toTitleCase(selectedIssueBook.category)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                                selectedIssueBook.available_copies > 1
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : "bg-blue-100 text-blue-800 border border-blue-200"
                              }`}
                            >
                              Stock: {selectedIssueBook.available_copies}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 font-medium">
                          <BookOpen className="h-4 w-4 text-slate-400" />
                          <span>
                            {availableBooksForIssue.length > 0
                              ? `-- Choose book from available stock (${availableBooksForIssue.length}) --`
                              : `-- No books available in ${issueCategoryFilter !== "ALL" ? issueCategoryFilter : "stock"} --`}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
                        {selectedIssueBook && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              setIssueForm((prev) => ({ ...prev, book: "" }));
                              setSelectedStudentIds([]);
                            }}
                            className="p-1 rounded-md hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
                            title="Clear selection"
                          >
                            <X className="h-3.5 w-3.5" />
                          </span>
                        )}
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${
                            isIssueBookDropdownOpen ? "rotate-180 text-indigo-600" : ""
                          }`}
                        />
                      </div>
                    </button>

                    {/* Dropdown Menu / Selection List with Search bar INSIDE */}
                    {isIssueBookDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                        {/* Search Bar INSIDE the book selection list */}
                        <div className="mb-2 pb-2 border-b border-slate-100">
                          <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-indigo-500" />
                            <input
                              type="text"
                              value={issueBookSearch}
                              onChange={(e) => setIssueBookSearch(e.target.value)}
                              placeholder={
                                issueCategoryFilter !== "ALL"
                                  ? `Search ${issueCategoryFilter} books by title, author, or ISBN...`
                                  : "Type to search title, author, or ISBN barcode..."
                              }
                              className="w-full pl-8 pr-7 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 bg-slate-50/70 focus:bg-white transition-all font-medium"
                              autoFocus
                            />
                            {issueBookSearch && (
                              <button
                                type="button"
                                onClick={() => setIssueBookSearch("")}
                                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold mt-1.5 px-1">
                            <span>
                              {issueCategoryFilter !== "ALL" ? `Category: ${issueCategoryFilter}` : "All Categories"}
                            </span>
                            <span>
                              {availableBooksForIssue.length} title{availableBooksForIssue.length === 1 ? "" : "s"} found
                            </span>
                          </div>
                        </div>

                        {/* Scrollable List of Available Books according to category */}
                        <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                          {availableBooksForIssue.map((b) => {
                            const isSelected = String(issueForm.book) === String(b.id);
                            return (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => {
                                  setIssueForm((prev) => ({ ...prev, book: String(b.id) }));
                                  setSelectedStudentIds([]);
                                  if (issueErrors.book) setIssueErrors((prev) => ({ ...prev, book: "" }));
                                  setIsIssueBookDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors ${
                                  isSelected
                                    ? "bg-indigo-600 text-white shadow-sm"
                                    : "text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                <div className="truncate pr-2">
                                  <div className="text-xs sm:text-sm font-bold truncate">{toTitleCase(b.title)}</div>
                                  <div
                                    className={`text-[11px] truncate flex items-center gap-1.5 mt-0.5 ${
                                      isSelected ? "text-indigo-100" : "text-slate-400"
                                    }`}
                                  >
                                    <span>{toTitleCase(b.author)}</span>
                                    <span>•</span>
                                    <span>{toTitleCase(b.category) || "General"}</span>
                                    {b.isbn && (
                                      <>
                                        <span>•</span>
                                        <span className="font-mono text-[10px]">ISBN: {b.isbn}</span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                      isSelected
                                        ? "bg-white/20 text-white"
                                        : b.available_copies > 1
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : "bg-blue-50 text-blue-700 border border-blue-200"
                                    }`}
                                  >
                                    Stock: {b.available_copies}
                                  </span>
                                  {isSelected && <Check className="h-4 w-4 text-white" />}
                                </div>
                              </button>
                            );
                          })}

                          {availableBooksForIssue.length === 0 && (
                            <div className="text-center py-6 px-3">
                              <BookOpen className="h-6 w-6 text-slate-300 mx-auto mb-1.5" />
                              <p className="text-xs font-semibold text-slate-700">No books found</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {issueBookSearch
                                  ? `No books matching "${issueBookSearch}" in ${issueCategoryFilter}`
                                  : `No books with available stock in ${issueCategoryFilter}`}
                              </p>
                              {(issueBookSearch || issueCategoryFilter !== "ALL") && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIssueBookSearch("");
                                    setIssueCategoryFilter("ALL");
                                  }}
                                  className="mt-2 text-[11px] font-bold text-indigo-600 hover:underline"
                                >
                                  Reset search & category
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {issueErrors.book && (
                  <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{issueErrors.book}</span>
                  </p>
                )}

                {/* Selected Book Stock Banner & Details */}
                {selectedIssueBook && (
                  <div className="mt-2 p-3 rounded-xl border transition-all animate-in fade-in duration-200 bg-white border-indigo-100 shadow-2xs space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-extrabold text-slate-900 text-sm">{selectedIssueBook.title}</div>
                        <div className="text-xs text-slate-500">
                          by <span className="font-semibold text-slate-700">{selectedIssueBook.author}</span> • Category:{" "}
                          <span className="font-semibold text-indigo-600">{selectedIssueBook.category}</span>
                        </div>
                      </div>

                      {/* Stock Badge */}
                      <div className="text-right shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black ${
                            selectedIssueBook.available_copies > 1
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-blue-100 text-blue-800 border border-blue-200"
                          }`}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Stock: {selectedIssueBook.available_copies} / {selectedIssueBook.total_copies}
                        </span>
                      </div>
                    </div>

                    {/* Stock Multi-Student Notification */}
                    {selectedIssueBook.available_copies > 1 ? (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50/80 border border-emerald-200/80 text-emerald-900 text-xs">
                        <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>
                          <strong>Multi-Student Stock Available:</strong> This book has{" "}
                          <strong>{selectedIssueBook.available_copies} copies</strong> in stock. You can select up to{" "}
                          <strong>{selectedIssueBook.available_copies} students</strong> below to issue simultaneously in a single click!
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50/80 border border-blue-200/80 text-blue-900 text-xs">
                        <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        <span>Stock has 1 copy available for single borrower lending.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* STEP 2: BORROWER TYPE & SELECTION */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Borrower type *</Label>
                  <select
                    aria-label="Borrower type"
                    value={borrowerType}
                    onChange={(event) => {
                      setBorrowerType(event.target.value as "student" | "staff");
                      setIssueForm({ ...issueForm, student: "" });
                      setSelectedStudentIds([]);
                      setStudentSearchQuery("");
                      setStaffSearchQuery("");
                      setIsStudentDropdownOpen(false);
                      setIsStaffDropdownOpen(false);
                      if (issueErrors.student) setIssueErrors((prev) => ({ ...prev, student: "" }));
                    }}
                    className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-medium"
                  >
                    <option value="student">Student</option>
                    <option value="staff">Staff / Faculty</option>
                  </select>
                </div>

                {borrowerType === "student" ? (
                  <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80">
                    {/* Header with Stock Counter */}
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-indigo-600" />
                        {selectedIssueBook && selectedIssueBook.available_copies > 1
                          ? `Select Students (Stock allows up to ${selectedIssueBook.available_copies} students)`
                          : "Select Student"}{" "}
                        <span className="text-rose-500">*</span>
                      </Label>

                      {selectedIssueBook && selectedIssueBook.available_copies > 1 && (
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-black transition-colors ${
                            selectedStudentIds.length === selectedIssueBook.available_copies
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : selectedStudentIds.length > 0
                              ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {selectedStudentIds.length} / {selectedIssueBook.available_copies} Selected
                        </span>
                      )}
                    </div>

                    {/* Selected Student Chips / Tags */}
                    {selectedStudentIds.length > 0 && (
                      <div className="p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-indigo-900">
                          <span>Selected Borrowers ({selectedStudentIds.length}):</span>
                          <button
                            type="button"
                            onClick={() => setSelectedStudentIds([])}
                            className="text-rose-600 hover:underline"
                          >
                            Clear All
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1 custom-scrollbar">
                          {selectedStudentIds.map((sId) => {
                            const stud = students.find((s) => s.id === sId);
                            if (!stud) return null;
                            return (
                              <span
                                key={sId}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-semibold shadow-2xs animate-in zoom-in-95 duration-150"
                              >
                                <span>
                                  {stud.name} {stud.surname || ""}
                                </span>
                                <span className="text-[10px] text-indigo-200 font-normal">
                                  ({stud.school_class_name || "Class"} {stud.division || ""})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedStudentIds((prev) => prev.filter((id) => id !== sId))}
                                  className="ml-1 hover:bg-white/20 rounded p-0.5 text-white transition-colors"
                                  title="Remove student"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Class & Division Filters */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-700">Filter Class</Label>
                        <select
                          value={issueClassFilter}
                          onChange={(e) => {
                            setIssueClassFilter(e.target.value);
                            setIssueDivisionFilter("");
                          }}
                          className="w-full h-9 rounded-xl border border-slate-200 px-2.5 text-xs font-medium bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors"
                        >
                          <option value="">-- All Classes ({availableClasses.length}) --</option>
                          {availableClasses.map((cls) => (
                            <option key={cls} value={cls}>
                              Class: {cls}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-700">
                          Filter Division {issueClassFilter ? `(${issueClassFilter})` : ""}
                        </Label>
                        <select
                          value={issueDivisionFilter}
                          onChange={(e) => setIssueDivisionFilter(e.target.value)}
                          disabled={!issueClassFilter}
                          className={`w-full h-9 rounded-xl border px-2.5 text-xs font-medium transition-colors ${
                            !issueClassFilter
                              ? "bg-slate-100/70 border-slate-200 text-slate-400 cursor-not-allowed"
                              : "bg-white border-slate-200 text-slate-700 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                          }`}
                        >
                          {!issueClassFilter ? (
                            <option value="">-- Select Class First --</option>
                          ) : availableDivisions.length === 0 ? (
                            <option value="">-- No Divisions in {issueClassFilter} --</option>
                          ) : (
                            <>
                              <option value="">-- All Divisions ({availableDivisions.length}) --</option>
                              {availableDivisions.map((div) => (
                                <option key={div} value={div}>
                                  Division {div}
                                </option>
                              ))}
                            </>
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Student Direct Search Box */}
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-indigo-500" />
                      <input
                        type="text"
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        placeholder="Search student by name, GR No, or Roll No..."
                        className="w-full pl-8 pr-7 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 bg-white"
                      />
                      {studentSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setStudentSearchQuery("")}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Quick Selection for Multiple Students */}
                    {selectedIssueBook && selectedIssueBook.available_copies > 1 && (
                      <div className="flex items-center justify-between text-xs pt-0.5">
                        <span className="text-[11px] font-semibold text-slate-400">
                          {filteredStudents.length} student{filteredStudents.length === 1 ? "" : "s"} listed
                        </span>
                        {issueClassFilter && filteredStudents.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const remainingLimit = selectedIssueBook.available_copies - selectedStudentIds.length;
                              if (remainingLimit <= 0) {
                                showToast("error", `Stock limit of ${selectedIssueBook.available_copies} already reached.`);
                                return;
                              }
                              const unselected = filteredStudents
                                .map((s) => s.id)
                                .filter((id) => !selectedStudentIds.includes(id));
                              const toAdd = unselected.slice(0, remainingLimit);
                              if (toAdd.length === 0) {
                                showToast("error", "All students in this class filter are already selected.");
                                return;
                              }
                              setSelectedStudentIds((prev) => [...prev, ...toAdd]);
                              if (issueErrors.student) setIssueErrors((prev) => ({ ...prev, student: "" }));
                              showToast("success", `Selected ${toAdd.length} students from Class ${issueClassFilter}!`);
                            }}
                            className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                          >
                            + Select next in this class (up to stock limit)
                          </button>
                        )}
                      </div>
                    )}

                    {/* Student List with Multi-Select Checkboxes */}
                    <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar border border-slate-200 rounded-xl p-1.5 bg-white">
                      {filteredStudents.length === 0 ? (
                        <div className="text-center py-6 text-xs text-slate-400">
                          <Users className="h-6 w-6 text-slate-300 mx-auto mb-1" />
                          No students found {studentSearchQuery ? `matching "${studentSearchQuery}"` : "in this class/division"}
                        </div>
                      ) : (
                        filteredStudents.map((s) => {
                          const isSelected = selectedStudentIds.includes(s.id);
                          const maxStock = selectedIssueBook?.available_copies || 1;

                          // Check if student already has active loan for this book
                          const alreadyHasBook = selectedIssueBook
                            ? activeLoans.some(
                                (loan) =>
                                  String(loan.book) === String(selectedIssueBook.id) &&
                                  loan.student === s.id &&
                                  loan.status === "ISSUED"
                              )
                            : false;

                          return (
                            <div
                              key={s.id}
                              onClick={() => {
                                if (alreadyHasBook) return;
                                if (isSelected) {
                                  setSelectedStudentIds((prev) => prev.filter((id) => id !== s.id));
                                } else {
                                  if (maxStock > 1) {
                                    if (selectedStudentIds.length >= maxStock) {
                                      showToast(
                                        "error",
                                        `Stock limit reached: Book only has ${maxStock} available copies.`
                                      );
                                      return;
                                    }
                                    setSelectedStudentIds((prev) => [...prev, s.id]);
                                  } else {
                                    setSelectedStudentIds([s.id]);
                                    setIssueForm((prev) => ({ ...prev, student: String(s.id) }));
                                  }
                                  if (issueErrors.student) setIssueErrors((prev) => ({ ...prev, student: "" }));
                                }
                              }}
                              className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition-colors cursor-pointer select-none ${
                                alreadyHasBook
                                  ? "bg-slate-50 text-slate-400 opacity-60 cursor-not-allowed"
                                  : isSelected
                                  ? "bg-indigo-50 border border-indigo-200 text-indigo-950 font-semibold"
                                  : "hover:bg-slate-50 text-slate-700 border border-transparent"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                {/* Checkbox / Indicator */}
                                <div
                                  className={`h-4 w-4 rounded flex items-center justify-center border transition-colors shrink-0 ${
                                    isSelected
                                      ? "bg-indigo-600 border-indigo-600 text-white"
                                      : "border-slate-300 bg-white"
                                  }`}
                                >
                                  {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                                </div>

                                <div className="truncate">
                                  <div className="font-bold truncate text-slate-900">
                                    {s.name} {s.surname || ""}
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate">
                                    GR: {s.gr_no || s.id} {s.roll_no ? `• Roll: ${s.roll_no}` : ""} • Class:{" "}
                                    {s.school_class_name || "N/A"} {s.division || ""}
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0 ml-2">
                                {alreadyHasBook ? (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                                    Already Borrowed
                                  </span>
                                ) : isSelected ? (
                                  <span className="text-[10px] font-black text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                                    Selected
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                ) : (
                  /* Staff Searchable Dropdown */
                  <div className="space-y-1 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80" ref={staffDropdownRef}>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-800">
                        Select Staff Member <span className="text-rose-500">*</span>
                      </Label>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {filteredStaffBorrowers.length} staff member{filteredStaffBorrowers.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsStaffDropdownOpen((prev) => !prev)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm border transition-all text-left ${
                          issueErrors.student
                            ? "border-rose-500 bg-rose-50/40 text-rose-900"
                            : selectedStaffObj
                            ? "border-indigo-300 bg-indigo-50/70 text-indigo-950 font-semibold ring-2 ring-indigo-500/10"
                            : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                        }`}
                      >
                        {selectedStaffObj ? (
                          <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                            <div className="h-6 w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                              {selectedStaffObj.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="truncate">
                              <span className="font-bold text-slate-900">{selectedStaffObj.name}</span>
                              <span className="text-xs text-indigo-600 ml-1.5 font-medium">
                                (#{selectedStaffObj.id})
                              </span>
                              <span className="text-[11px] text-slate-400 ml-1">
                                • {selectedStaffObj.category}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 flex items-center gap-2">
                            <Search className="h-3.5 w-3.5 text-slate-400" />
                            <span>-- Choose staff member or direct search --</span>
                          </span>
                        )}

                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {selectedStaffObj && (
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                setIssueForm({ ...issueForm, student: "" });
                              }}
                              className="p-1 rounded-md hover:bg-indigo-200 text-slate-400 hover:text-slate-700 transition-colors"
                              title="Clear selection"
                            >
                              <X className="h-3.5 w-3.5" />
                            </span>
                          )}
                          <ChevronDown
                            className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                              isStaffDropdownOpen ? "rotate-180 text-indigo-600" : ""
                            }`}
                          />
                        </div>
                      </button>

                      {/* Dropdown Menu with Search Bar */}
                      {isStaffDropdownOpen && (
                        <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                          {/* Search Input */}
                          <div className="relative mb-2">
                            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-indigo-500" />
                            <input
                              type="text"
                              value={staffSearchQuery}
                              onChange={(e) => setStaffSearchQuery(e.target.value)}
                              placeholder="Direct search by staff name or ID..."
                              className="w-full pl-8 pr-7 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                              autoFocus
                            />
                            {staffSearchQuery && (
                              <button
                                type="button"
                                onClick={() => setStaffSearchQuery("")}
                                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                            {filteredStaffBorrowers.length === 0 ? (
                              <div className="text-center py-6 text-xs text-slate-400">
                                No staff members found matching &quot;{staffSearchQuery}&quot;
                              </div>
                            ) : (
                              filteredStaffBorrowers.map((member) => {
                                const isSelected = String(issueForm.student) === String(member.id);
                                return (
                                  <button
                                    key={member.id}
                                    type="button"
                                    onClick={() => {
                                      setIssueForm({ ...issueForm, student: String(member.id) });
                                      if (issueErrors.student) setIssueErrors((prev) => ({ ...prev, student: "" }));
                                      setIsStaffDropdownOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left ${
                                      isSelected
                                        ? "bg-indigo-600 text-white"
                                        : "hover:bg-slate-50 text-slate-700"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 truncate">
                                      <span
                                        className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                          isSelected
                                            ? "bg-white/20 text-white"
                                            : "bg-indigo-100 text-indigo-700"
                                        }`}
                                      >
                                        {member.name.charAt(0).toUpperCase()}
                                      </span>
                                      <div className="truncate">
                                        <div className="font-bold truncate">{member.name}</div>
                                        <div
                                          className={`text-[10px] truncate ${
                                            isSelected ? "text-indigo-100" : "text-slate-400"
                                          }`}
                                        >
                                          #{member.id} • {member.category}
                                        </div>
                                      </div>
                                    </div>
                                    {isSelected && <Check className="h-4 w-4 text-white shrink-0 ml-2" />}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {issueErrors.student && (
                  <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{issueErrors.student}</span>
                  </p>
                )}
              </div>

              {/* STEP 3: DUE DATE */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Custom Due Date (Optional)</Label>
                <DatePicker
                  min={new Date().toISOString().split("T")[0]}
                  value={issueForm.due_date}
                  onChange={(val) => {
                    setIssueForm({ ...issueForm, due_date: val });
                    const todayStr = new Date().toISOString().split("T")[0];
                    if (val && val < todayStr) {
                      setIssueErrors((prev) => ({
                        ...prev,
                        due_date: "Due date must be in the future, not in the past.",
                      }));
                    } else {
                      setIssueErrors((prev) => ({ ...prev, due_date: "" }));
                    }
                  }}
                  className={`rounded-xl ${
                    issueErrors.due_date
                      ? "border-rose-500 bg-rose-50/40 text-rose-900 focus:border-rose-600 focus:ring-rose-200"
                      : "border-slate-200"
                  }`}
                />
                {issueErrors.due_date ? (
                  <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{issueErrors.due_date}</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    Leave blank to use default policy ({librarySettings?.issue_duration_days || 14} days). Must be in the future, not in the past.
                  </p>
                )}
              </div>

              {/* STEP 4: CONFIRM BUTTON */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowIssueModal(false);
                    setSelectedStudentIds([]);
                    setIssueErrors({});
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Issuing Book...
                    </>
                  ) : borrowerType === "student" && selectedStudentIds.length > 1 ? (
                    `Issue Book to ${selectedStudentIds.length} Students (${selectedStudentIds.length} Copies)`
                  ) : (
                    "Confirm Issue"
                  )}
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
                        disabled={copy.status === "ISSUED" || copy.status === "RESERVED"}
                        className="h-7 text-[11px] rounded border border-slate-200 bg-white px-2 font-medium disabled:bg-slate-100 disabled:text-slate-500"
                        title={copy.status === "ISSUED" ? "Cannot change status while book is issued on loan" : ""}
                      >
                        <option value="AVAILABLE">Available</option>
                        <option value="ISSUED">Issued (On Loan)</option>
                        <option value="RESERVED">Reserved</option>
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
            <form noValidate onSubmit={handleGenerateCopies} className="pt-3 border-t space-y-3">
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
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold text-slate-900 capitalize">
                {editingMaster ? "Edit" : "Add New"}{" "}
                {showMasterModal === "rack" ? "Library Rack(s)" : showMasterModal === "shelf" ? "Rack Shelf / Shelves" : showMasterModal}
              </h2>
              <button onClick={() => setShowMasterModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form noValidate onSubmit={handleSaveMaster} className="space-y-3">
              {showMasterModal === "shelf" && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Select Parent Rack *</Label>
                  <select
                    value={masterForm.extra}
                    onChange={(e) => {
                      setMasterForm({ ...masterForm, extra: e.target.value });
                      if (masterErrors.extra) setMasterErrors((prev) => ({ ...prev, extra: "" }));
                    }}
                    className={`w-full h-9 rounded-md border text-xs px-2 transition-colors ${
                      masterErrors.extra
                        ? "border-rose-500 bg-rose-50/40 text-slate-900 focus:border-rose-600 focus:ring-rose-200"
                        : "border-slate-200"
                    }`}
                  >
                    <option value="">-- Choose Rack --</option>
                    {racks.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.rack_code} - {r.rack_name}
                      </option>
                    ))}
                  </select>
                  {masterErrors.extra && (
                    <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{masterErrors.extra}</span>
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs font-semibold">
                  {showMasterModal === "rack"
                    ? editingMaster ? "Rack Name *" : "Rack Name(s) * (comma-separated for multiple)"
                    : showMasterModal === "shelf"
                    ? editingMaster ? "Shelf Name / Number *" : "Shelf Name(s) / Number(s) * (comma-separated for multiple)"
                    : showMasterModal === "author"
                    ? "Author Full Name *"
                    : showMasterModal === "publisher"
                    ? "Publisher Name *"
                    : "Category / Subject Name *"}
                </Label>
                <Input
                  value={masterForm.name}
                  onChange={(e) => {
                    setMasterForm({ ...masterForm, name: e.target.value });
                    if (masterErrors.name) setMasterErrors((prev) => ({ ...prev, name: "" }));
                  }}
                  placeholder={
                    showMasterModal === "rack"
                      ? "e.g. Science Rack A, Science Rack B, Physics Rack C"
                      : showMasterModal === "shelf"
                      ? "e.g. Shelf 1, Shelf 2, Shelf 3, Shelf 4"
                      : showMasterModal === "author"
                      ? "e.g. H.C. Verma"
                      : showMasterModal === "publisher"
                      ? "e.g. Oxford University Press"
                      : "e.g. Physics / Mathematics"
                  }
                  className={
                    masterErrors.name
                      ? "border-rose-500 bg-rose-50/40 text-slate-900 focus-visible:ring-rose-200"
                      : ""
                  }
                />
                {(showMasterModal === "rack" || showMasterModal === "shelf") && !editingMaster && (
                  <p className="text-[11px] text-indigo-600 font-medium">
                    💡 Tip: Enter multiple names separated by commas (e.g. {showMasterModal === "rack" ? "Rack A, Rack B, Rack C" : "Shelf 1, Shelf 2, Shelf 3"}) to create all at once!
                  </p>
                )}
                {masterErrors.name && (
                  <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{masterErrors.name}</span>
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">
                  {showMasterModal === "rack"
                    ? "Rack Code (Optional)"
                    : showMasterModal === "shelf"
                    ? "Shelf Code (Optional)"
                    : "Short Code (Optional)"}
                </Label>
                <Input
                  value={masterForm.code}
                  onChange={(e) => {
                    setMasterForm({ ...masterForm, code: e.target.value });
                    if (masterErrors.code) setMasterErrors((prev) => ({ ...prev, code: "" }));
                  }}
                  placeholder={
                    showMasterModal === "rack"
                      ? "e.g. RACK-A (auto-generated if blank)"
                      : showMasterModal === "shelf"
                      ? "e.g. S-01 (auto-generated if blank)"
                      : "e.g. SCI / RDS"
                  }
                  className={
                    masterErrors.code
                      ? "border-rose-500 bg-rose-50/40 text-slate-900 focus-visible:ring-rose-200"
                      : ""
                  }
                />
                {masterErrors.code && (
                  <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{masterErrors.code}</span>
                  </p>
                )}
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
                <Button type="submit" size="sm" disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium">
                  {actionLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : editingMaster ? (
                    "Save Changes"
                  ) : (showMasterModal === "rack" || showMasterModal === "shelf") && masterForm.name.includes(",") ? (
                    `Create ${masterForm.name.split(",").filter((s) => s.trim().length > 0).length} ${
                      showMasterModal === "rack" ? "Racks" : "Shelves"
                    }`
                  ) : (
                    "Save Master"
                  )}
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

            <form noValidate onSubmit={handleSubmitPayFine} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Payment Amount (₹) *</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={finePaymentForm.amount}
                  onChange={(e) => {
                    setFinePaymentForm({ ...finePaymentForm, amount: e.target.value });
                    if (finePaymentError) setFinePaymentError("");
                  }}
                  className={
                    finePaymentError
                      ? "border-rose-500 bg-rose-50/40 text-slate-900 focus-visible:ring-rose-200"
                      : ""
                  }
                />
                {finePaymentError ? (
                  <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{finePaymentError}</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400">Supports partial or full fine collection.</p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Payment Method *</Label>
                <select
                  value={finePaymentForm.payment_method}
                  onChange={(e) => setFinePaymentForm({ ...finePaymentForm, payment_method: e.target.value })}
                  className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm bg-white"
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

            <form noValidate onSubmit={handleTransferCopy} className="space-y-3">
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
