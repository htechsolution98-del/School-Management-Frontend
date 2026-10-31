"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Plus,
  Search,
  ArrowLeft,
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
  User,
  Power,
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
  AlertOctagon,
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
import { TablePagination } from "@/components/ui/table-pagination";
import { MobileBottomDrawer } from "@/components/ui/mobile-bottom-drawer";
import {
  MobileSelectDrawer,
  MobileSelectTrigger,
  MobileSelectOption,
} from "@/components/ui/mobile-select-drawer";
import { toast } from "sonner";
import {
  Book,
  BookIssued,
  LibrarySetting,
  BookCategory,
  Author,
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
  toggleCategoryActive,
  getAuthors,
  createAuthor,
  updateAuthor,
  deleteAuthor,
  toggleAuthorActive,
  getRacks,
  createRack,
  updateRack,
  deleteRack,
  toggleRackActive,
  getShelves,
  createShelf,
  updateShelf,
  deleteShelf,
  toggleShelfActive,
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
  getStoredDashboardSummary,
  getStoredLibraryList,
  LibraryDashboardSummary,
  getLibraryDashboardSummary,
} from "@/lib/library";
import { getSchoolClasses } from "@/lib/clerk/classes";
import { CategoryCombobox } from "@/components/library/CategoryCombobox";
import { ConfirmDeleteModal } from "@/components/library/ConfirmDeleteModal";
import { ManageCopiesModal } from "@/components/library/ManageCopiesModal";
import { PrintBarcodeStickerModal } from "@/components/library/PrintBarcodeStickerModal";
import { BarcodeSvg } from "@/components/library/BarcodeSvg";
import { LibraryFineReceiptModal } from "@/components/library/LibraryFineReceiptModal";

function MetricValue({
  value,
  loading,
  className = "",
}: {
  value: React.ReactNode;
  loading: boolean;
  className?: string;
}) {
  if (loading) {
    return <span className={`inline-block h-5 w-12 bg-slate-200/80 animate-pulse rounded my-0.5 ${className}`} />;
  }
  return <span className={className}>{value}</span>;
}

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<
    "catalog" | "circulation" | "clearance" | "reservations" | "reports" | "masters" | "settings" | "history"
  >("catalog");

  // Instant SWR Persistent Data states
  const [summary, setSummary] = useState<LibraryDashboardSummary | null>(() => getStoredDashboardSummary());
  const [books, setBooks] = useState<Book[]>(() => getStoredLibraryList<Book>("books_"));
  const [issuedRecords, setIssuedRecords] = useState<BookIssued[]>(() => getStoredLibraryList<BookIssued>("issued_books"));
  const [reservations, setReservations] = useState<BookReservation[]>(() => getStoredLibraryList<BookReservation>("reservations"));
  const [categories, setCategories] = useState<BookCategory[]>(() => getStoredLibraryList<BookCategory>("book_categories"));
  const [authors, setAuthors] = useState<Author[]>(() => getStoredLibraryList<Author>("book_authors"));
  const [racks, setRacks] = useState<Rack[]>(() => getStoredLibraryList<Rack>("book_racks"));
  const [shelves, setShelves] = useState<Shelf[]>(() => getStoredLibraryList<Shelf>("book_shelves"));
  const [students, setStudents] = useState<LibraryStudent[]>(() => getStoredLibraryList<LibraryStudent>("library_students"));
  const [staffBorrowers, setStaffBorrowers] = useState<LibraryStaff[]>(() => getStoredLibraryList<LibraryStaff>("library_staff"));
  const [borrowerType, setBorrowerType] = useState<"student" | "staff">("student");
  const [librarySettings, setLibrarySettings] = useState<LibrarySetting | null>(null);
  const [schoolClasses, setSchoolClasses] = useState<string[]>([]);

  const [loading, setLoading] = useState<boolean>(() => !getStoredDashboardSummary() && getStoredLibraryList("books_").length === 0);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Author filter in Catalog
  const [authorFilter, setAuthorFilter] = useState("ALL");
  const [isAuthorDropdownOpen, setIsAuthorDropdownOpen] = useState(false);
  const [authorSearch, setAuthorSearch] = useState("");
  const authorDropdownRef = useRef<HTMLDivElement>(null);

  // Particular Book filter in Catalog
  const [particularBookFilter, setParticularBookFilter] = useState("ALL");
  const [isParticularBookDropdownOpen, setIsParticularBookDropdownOpen] = useState(false);
  const [particularBookSearch, setParticularBookSearch] = useState("");
  const particularBookDropdownRef = useRef<HTMLDivElement>(null);
  // Catalog Table Pagination & Mobile Drawer
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogPageSize, setCatalogPageSize] = useState(10);
  const [selectedMobileBook, setSelectedMobileBook] = useState<Book | null>(null);

  // Circulation Table Pagination & Mobile Drawer
  const [circulationPage, setCirculationPage] = useState(1);
  const [circulationPageSize, setCirculationPageSize] = useState(10);
  const [selectedMobileLoan, setSelectedMobileLoan] = useState<BookIssued | null>(null);

  // History Table Pagination & Mobile Drawer
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [selectedMobileHistory, setSelectedMobileHistory] = useState<BookIssued | null>(null);

  // Reservations Table Pagination & Mobile Drawer
  const [reservationsPage, setReservationsPage] = useState(1);
  const [reservationsPageSize, setReservationsPageSize] = useState(10);
  const [reservationsSearch, setReservationsSearch] = useState("");
  const [reservationsStatusFilter, setReservationsStatusFilter] = useState("ALL");
  const [selectedMobileReservation, setSelectedMobileReservation] = useState<BookReservation | null>(null);

  // Clearance Table Pagination & Mobile Drawer
  const [clearancePage, setClearancePage] = useState(1);
  const [clearancePageSize, setClearancePageSize] = useState(10);
  const [clearanceTableSearch, setClearanceTableSearch] = useState("");
  const [selectedMobileClearance, setSelectedMobileClearance] = useState<any | null>(null);

  // Masters Table Pagination & Mobile Drawer
  const [mastersPage, setMastersPage] = useState(1);
  const [mastersPageSize, setMastersPageSize] = useState(10);
  const [mastersSearch, setMastersSearch] = useState("");
  const [selectedMobileMaster, setSelectedMobileMaster] = useState<any | null>(null);

  // Active Mobile Select Drawer for bottom sheet selection
  const [activeSelectDrawer, setActiveSelectDrawer] = useState<{
    title: string;
    subtitle?: string;
    options: MobileSelectOption[];
    selectedValue: string | number;
    onSelect: (val: any) => void;
  } | null>(null);

  const [circulationSearch, setCirculationSearch] = useState("");
  const [circulationBookFilter, setCirculationBookFilter] = useState("ALL");
  const [circulationCategoryFilter, setCirculationCategoryFilter] = useState("ALL");
  const [circulationStatusFilter, setCirculationStatusFilter] = useState<"ALL" | "OVERDUE" | "DUE_SOON">("ALL");

  // History Tab Search & Filters
  const [historySearch, setHistorySearch] = useState("");
  const [historyBookFilter, setHistoryBookFilter] = useState("ALL");
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState("ALL");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("ALL");
  const [historyPaymentTypeFilter, setHistoryPaymentTypeFilter] = useState("ALL");

  // Multi-Student Book Issue State
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [issueCategoryFilter, setIssueCategoryFilter] = useState("ALL");
  const [issueBookSearch, setIssueBookSearch] = useState("");
  const [isIssueBookDropdownOpen, setIsIssueBookDropdownOpen] = useState(false);
  const issueBookDropdownRef = useRef<HTMLDivElement>(null);

  const [masterSubTab, setMasterSubTab] = useState<"categories" | "authors" | "racks">("racks");

  // Sync tab with URL search parameter (?tab=...) from sidebar navigation
  useEffect(() => {
    const tabParam = searchParams?.get("tab");
    if (
      tabParam &&
      [
        "masters",
        "catalog",
        "circulation",
        "reservations",
        "history",
        "clearance",
        "reports",
        "settings",
      ].includes(tabParam)
    ) {
      setActiveTab(tabParam as any);
      if (tabParam === "masters" && !masterSubTab) {
        setMasterSubTab("racks");
      }
    }
  }, [searchParams, masterSubTab]);

  const handleTabChange = (
    newTab:
      | "masters"
      | "catalog"
      | "circulation"
      | "clearance"
      | "reservations"
      | "reports"
      | "settings"
      | "history"
  ) => {
    setActiveTab(newTab);
    if (newTab === "masters" && !masterSubTab) {
      setMasterSubTab("racks");
    }
    router.replace(`/librarian/library?tab=${newTab}`, { scroll: false });
  };

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


  // Modals & New Features State
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState<BookIssued | null>(null);
  const [returnError, setReturnError] = useState("");
  const [showCopiesModal, setShowCopiesModal] = useState<Book | null>(null);
  const [bookCopiesList, setBookCopiesList] = useState<BookCopy[]>([]);
  const [showMasterModal, setShowMasterModal] = useState<string | null>(null);
  const [editingMaster, setEditingMaster] = useState<{
    type: "category" | "author" | "rack" | "shelf";
    id: number;
  } | null>(null);

  // Custom Delete Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    itemName?: string;
    itemType?: "rack" | "shelf" | "book" | "copy" | "reservation" | "custom";
    description?: string;
    consequences?: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: "",
    onConfirm: () => {},
  });

  // Barcode Sticker & Labels Printable Modal State
  const [printStickerModal, setPrintStickerModal] = useState<{
    isOpen: boolean;
    copy?: BookCopy | null;
    book?: Book | null;
    allCopies?: BookCopy[];
  }>({
    isOpen: false,
  });

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
  const [feeReportSubView, setFeeReportSubView] = useState<"dues" | "damage" | "collected">("dues");

  // Return condition form
  const [returnForm, setReturnForm] = useState({
    condition: "GOOD",
    remarks: "",
    damage_fee: 0,
    lost_fee: 0,
    pay_now: true,
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
    if (type === "success") {
      toast.success(message);
    } else {
      toast.error(message);
    }
  };

  const loadAllData = useCallback(async (options?: boolean | any) => {
    const forceFresh = typeof options === "boolean" ? options : true;
    try {
      // Stage 1: Load essential telemetry & catalog data (<20ms via backend cache)
      const [summaryData, booksData, issuedData, reservationsData] = await Promise.all([
        getLibraryDashboardSummary(forceFresh).catch(() => null),
        getBooks(undefined, forceFresh).catch(() => []),
        getIssuedBooks(forceFresh).catch(() => []),
        getReservations(forceFresh).catch(() => []),
      ]);

      if (summaryData) {
        setSummary(summaryData);
      }

      if (Array.isArray(booksData) && booksData.length > 0) {
        setBooks(
          booksData.map((b: Book) => ({
            ...b,
            title: toTitleCase(b.title),
            author: toTitleCase(b.author),
            category: toTitleCase(b.category),
            edition: b.edition ? toTitleCase(b.edition) : "",
          }))
        );
      }

      if (Array.isArray(issuedData) && issuedData.length > 0) {
        const sortedIssued = issuedData.slice().sort((a: any, b: any) => {
          const timeA = a.actual_return_date ? new Date(a.actual_return_date).getTime() : (a.book_issued_date ? new Date(a.book_issued_date).getTime() : 0);
          const timeB = b.actual_return_date ? new Date(b.actual_return_date).getTime() : (b.book_issued_date ? new Date(b.book_issued_date).getTime() : 0);
          if (timeB !== timeA) return timeB - timeA;
          return Number(b.id) - Number(a.id);
        });
        setIssuedRecords(sortedIssued);
      }

      if (Array.isArray(reservationsData) && reservationsData.length > 0) {
        const sortedReservations = reservationsData.slice().sort((a: any, b: any) => {
          const timeA = a.reservation_date ? new Date(a.reservation_date).getTime() : 0;
          const timeB = b.reservation_date ? new Date(b.reservation_date).getTime() : 0;
          if (timeB !== timeA) return timeB - timeA;
          return Number(b.id) - Number(a.id);
        });
        setReservations(sortedReservations);
      }

      setLoading(false);

      // Stage 2: Load ancillary master dropdowns quietly in the background
      Promise.all([
        getCategories(forceFresh).catch(() => []),
        getAuthors(forceFresh).catch(() => []),
        getRacks(forceFresh).catch(() => []),
        getShelves(undefined, forceFresh).catch(() => []),
        getLibraryStudents(forceFresh).catch(() => []),
        getLibraryStaff(forceFresh).catch(() => []),
        getLibrarySettings().catch(() => null),
        getSchoolClasses().catch(() => []),
      ]).then(([catsData, authorsData, racksData, shelvesData, studentsData, staffData, settingsData, classesData]) => {
        if (Array.isArray(catsData) && catsData.length) setCategories(catsData);
        if (Array.isArray(authorsData) && authorsData.length) setAuthors(authorsData);
        if (Array.isArray(racksData) && racksData.length) setRacks(racksData);
        if (Array.isArray(shelvesData) && shelvesData.length) setShelves(shelvesData);

        if (Array.isArray(studentsData) && studentsData.length) {
          const normalizedStudents: LibraryStudent[] = studentsData.map((s: any) => {
            const clsName = (s.class_name || s.school_class_name || "").trim();
            return {
              ...s,
              class_name: clsName,
              school_class_name: clsName,
              division: (s.division || "").trim(),
            };
          });
          setStudents(normalizedStudents);
        }

        if (Array.isArray(classesData) && classesData.length) {
          const classNamesFromApi = classesData
            .map((c: any) => (c.school_class || c.name || "").trim())
            .filter(Boolean);
          setSchoolClasses(classNamesFromApi);
        }

        if (Array.isArray(staffData) && staffData.length) setStaffBorrowers(staffData);

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
      });
    } catch {
      showToast("error", "Error loading library data.");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Refresh the waitlist whenever staff open its panel so newly submitted
  // student reservations appear without requiring a full page reload.
  useEffect(() => {
    if (activeTab !== "reservations") return;
    getReservations(true)
      .then((items) => setReservations(items.slice().sort((a, b) =>
        new Date(b.reservation_date || 0).getTime() - new Date(a.reservation_date || 0).getTime()
      )))
      .catch(() => undefined);
  }, [activeTab]);

  // Derived statistics (Live real-time computed from data or instant SWR summary)
  const stats = useMemo(() => {
    if (books.length > 0 || issuedRecords.length > 0) {
      const totalBooksCount = books.reduce((acc, b) => acc + (b.total_copies || 0), 0);
      const availableCopies = books.reduce((acc, b) => acc + (b.available_copies || 0), 0);
      const activeLoans = issuedRecords.filter((r) => r.status === "ISSUED");
      const activeLoansCount = activeLoans.length;

      const now = new Date();
      const overdueCount = activeLoans.filter((r) => new Date(r.due_date) < now).length;
      const totalFinesCollected = issuedRecords.reduce(
        (acc, r) => acc + Number(r.fine_paid_amount || (r.status === "RETURNED" ? (r.total_fine || 0) : 0)),
        0
      );
      const totalPendingDues = issuedRecords.reduce((acc, r) => {
        const remaining = Number(r.total_fine || 0) - Number(r.fine_paid_amount || 0);
        return acc + Math.max(0, remaining);
      }, 0);
      const lostDamagedCount = issuedRecords.filter(
        (r) => r.status === "DAMAGED" || r.status === "LOST" || ["MINOR_DAMAGE", "MAJOR_DAMAGE", "LOST"].includes(r.condition_on_return || "")
      ).length;
      const waitingReservationsCount = reservations.filter((r) => r.status === "WAITING").length;

      return {
        titlesCount: books.length,
        totalBooksCount: totalBooksCount || summary?.total_physical_copies || 0,
        availableCopies: availableCopies || summary?.available_copies || 0,
        activeLoansCount: activeLoansCount || summary?.active_loans_count || 0,
        overdueCount: overdueCount || summary?.overdue_count || 0,
        totalFinesCollected: totalFinesCollected || Number(summary?.total_fines_settled || 0),
        totalPendingDues: totalPendingDues || Number(summary?.total_fines_due || 0),
        lostDamagedCount: lostDamagedCount || summary?.lost_damaged_count || 0,
        waitingReservationsCount: waitingReservationsCount || summary?.waiting_reservations_count || 0,
      };
    }

    return {
      titlesCount: summary?.titles ?? 0,
      totalBooksCount: summary?.total_physical_copies ?? 0,
      availableCopies: summary?.available_copies ?? 0,
      activeLoansCount: summary?.active_loans_count ?? 0,
      overdueCount: summary?.overdue_count ?? 0,
      totalFinesCollected: Number(summary?.total_fines_settled || 0),
      totalPendingDues: Number(summary?.total_fines_due || 0),
      lostDamagedCount: summary?.lost_damaged_count ?? 0,
      waitingReservationsCount: summary?.waiting_reservations_count ?? 0,
    };
  }, [books, issuedRecords, reservations, summary]);

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

  // Book authors list
  const authorNames = useMemo(() => {
    const set = new Set<string>();
    books.forEach((b) => {
      if (b.author) set.add(toTitleCase(b.author));
    });
    authors.forEach((a) => {
      if (a.name) set.add(toTitleCase(a.name));
    });
    return ["ALL", ...Array.from(set)];
  }, [books, authors]);

  // Book count per author for badge counters
  const authorCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: books.length };
    books.forEach((b) => {
      const auth = toTitleCase(b.author);
      if (auth) {
        counts[auth] = (counts[auth] || 0) + 1;
      }
    });
    return counts;
  }, [books]);

  // Filtered authors within the dropdown search
  const filteredAuthorNames = useMemo(() => {
    if (!authorSearch.trim()) return authorNames;
    const q = authorSearch.toLowerCase().trim();
    return authorNames.filter((auth) => auth.toLowerCase().includes(q));
  }, [authorNames, authorSearch]);

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
        authorDropdownRef.current &&
        !authorDropdownRef.current.contains(event.target as Node)
      ) {
        setIsAuthorDropdownOpen(false);
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
        setIsAuthorDropdownOpen(false);
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

  // Filtered books (Search, Category, Author, and Particular Book)
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
      const matchesAuth =
        authorFilter === "ALL" ||
        toTitleCase(b.author) === authorFilter;
      const matchesBook =
        particularBookFilter === "ALL" ||
        String(b.id) === String(particularBookFilter);
      return matchesSearch && matchesCat && matchesAuth && matchesBook;
    });
  }, [books, searchQuery, categoryFilter, authorFilter, particularBookFilter]);

  // Books available for the Particular Book dropdown (filtered by category and author if active)
  const availableBooksForParticularDropdown = useMemo(() => {
    let list = books;
    if (categoryFilter !== "ALL") {
      list = list.filter((b) => toTitleCase(b.category) === categoryFilter);
    }
    if (authorFilter !== "ALL") {
      list = list.filter((b) => toTitleCase(b.author) === authorFilter);
    }
    if (!particularBookSearch.trim()) return list;
    const q = particularBookSearch.toLowerCase().trim();
    return list.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        (b.isbn && b.isbn.toLowerCase().includes(q))
    );
  }, [books, categoryFilter, authorFilter, particularBookSearch]);

  // Selected particular book object helper
  const selectedParticularBook = useMemo(() => {
    if (particularBookFilter === "ALL") return null;
    return books.find((b) => String(b.id) === String(particularBookFilter)) || null;
  }, [books, particularBookFilter]);

  // Active vs History circulation (Current to Past: newest first)
  const activeLoans = useMemo(() => {
    return issuedRecords
      .filter((r) => r.status === "ISSUED")
      .slice()
      .sort((a, b) => {
        const timeA = a.book_issued_date ? new Date(a.book_issued_date).getTime() : 0;
        const timeB = b.book_issued_date ? new Date(b.book_issued_date).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;
        return Number(b.id) - Number(a.id);
      });
  }, [issuedRecords]);

  const historyLoans = useMemo(() => {
    return issuedRecords
      .filter((r) => r.status !== "ISSUED")
      .slice()
      .sort((a, b) => {
        const timeA = a.actual_return_date ? new Date(a.actual_return_date).getTime() : (a.book_issued_date ? new Date(a.book_issued_date).getTime() : 0);
        const timeB = b.actual_return_date ? new Date(b.actual_return_date).getTime() : (b.book_issued_date ? new Date(b.book_issued_date).getTime() : 0);
        if (timeB !== timeA) return timeB - timeA;
        return Number(b.id) - Number(a.id);
      });
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
        (item.payment_method && item.payment_method.toLowerCase().includes(q)) ||
        (item.payment_receipt_no && item.payment_receipt_no.toLowerCase().includes(q)) ||
        (item.remarks && item.remarks.toLowerCase().includes(q));

      const matchesBook =
        historyBookFilter === "ALL" ||
        String(item.book) === String(historyBookFilter);

      const matchesCategory =
        historyCategoryFilter === "ALL" ||
        toTitleCase(item.book_category) === historyCategoryFilter;

      const isDamaged =
        item.status === "DAMAGED" ||
        item.condition_on_return === "MINOR_DAMAGE" ||
        item.condition_on_return === "MAJOR_DAMAGE" ||
        Number(item.damage_fees || 0) > 0;

      const matchesStatus =
        historyStatusFilter === "ALL" ||
        (historyStatusFilter === "DAMAGED" ? isDamaged : item.status === historyStatusFilter);

      const totalFine = Number(item.total_fine || 0);
      const paidFine = Number(item.fine_paid_amount || 0);
      const isPaid = item.is_fine_paid || (totalFine > 0 && paidFine >= totalFine);
      const pMethod = (item.payment_method || "").toLowerCase();

      let matchesPaymentType = true;
      if (historyPaymentTypeFilter === "CASH") {
        matchesPaymentType = pMethod === "cash";
      } else if (historyPaymentTypeFilter === "ONLINE") {
        matchesPaymentType = pMethod === "online" || pMethod === "upi" || pMethod === "card";
      } else if (historyPaymentTypeFilter === "PAID") {
        matchesPaymentType = totalFine > 0 && isPaid;
      } else if (historyPaymentTypeFilter === "UNPAID") {
        matchesPaymentType = totalFine > 0 && !isPaid;
      } else if (historyPaymentTypeFilter === "NO_FINE") {
        matchesPaymentType = totalFine <= 0;
      }

      return matchesSearch && matchesBook && matchesCategory && matchesStatus && matchesPaymentType;
    });
  }, [historyLoans, historySearch, historyBookFilter, historyCategoryFilter, historyStatusFilter, historyPaymentTypeFilter]);

  // Catalog pagination slice
  const paginatedBooks = useMemo(() => {
    const start = (catalogPage - 1) * catalogPageSize;
    return filteredBooks.slice(start, start + catalogPageSize);
  }, [filteredBooks, catalogPage, catalogPageSize]);

  useEffect(() => {
    setCatalogPage(1);
  }, [searchQuery, categoryFilter, authorFilter, particularBookFilter]);

  // Circulation pagination slice
  const paginatedActiveLoans = useMemo(() => {
    const start = (circulationPage - 1) * circulationPageSize;
    return filteredActiveLoans.slice(start, start + circulationPageSize);
  }, [filteredActiveLoans, circulationPage, circulationPageSize]);

  useEffect(() => {
    setCirculationPage(1);
  }, [circulationSearch, circulationBookFilter, circulationCategoryFilter, circulationStatusFilter]);

  // History pagination slice
  const paginatedHistoryLoans = useMemo(() => {
    const start = (historyPage - 1) * historyPageSize;
    return filteredHistoryLoans.slice(start, start + historyPageSize);
  }, [filteredHistoryLoans, historyPage, historyPageSize]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historySearch, historyBookFilter, historyCategoryFilter, historyStatusFilter, historyPaymentTypeFilter]);

  // Reservations filtered and paginated slices
  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      if (reservationsStatusFilter !== "ALL" && r.status !== reservationsStatusFilter) return false;
      if (!reservationsSearch.trim()) return true;
      const q = reservationsSearch.trim().toLowerCase();
      return (
        (r.book_title && r.book_title.toLowerCase().includes(q)) ||
        (r.student_name && r.student_name.toLowerCase().includes(q)) ||
        (r.student_gr_no && r.student_gr_no.toLowerCase().includes(q))
      );
    });
  }, [reservations, reservationsSearch, reservationsStatusFilter]);

  const paginatedReservations = useMemo(() => {
    const start = (reservationsPage - 1) * reservationsPageSize;
    return filteredReservations.slice(start, start + reservationsPageSize);
  }, [filteredReservations, reservationsPage, reservationsPageSize]);

  useEffect(() => {
    setReservationsPage(1);
  }, [reservationsSearch, reservationsStatusFilter]);

  // Clearance filtered and paginated slices
  const filteredPendingClearanceList = useMemo(() => {
    if (!clearanceTableSearch.trim()) return pendingClearanceList;
    const q = clearanceTableSearch.trim().toLowerCase();
    return pendingClearanceList.filter((st) => {
      return (
        (st.student_name && st.student_name.toLowerCase().includes(q)) ||
        (st.gr_no && String(st.gr_no).toLowerCase().includes(q)) ||
        (st.class_name && st.class_name.toLowerCase().includes(q))
      );
    });
  }, [pendingClearanceList, clearanceTableSearch]);

  const paginatedClearance = useMemo(() => {
    const start = (clearancePage - 1) * clearancePageSize;
    return filteredPendingClearanceList.slice(start, start + clearancePageSize);
  }, [filteredPendingClearanceList, clearancePage, clearancePageSize]);

  useEffect(() => {
    setClearancePage(1);
  }, [clearanceTableSearch]);

  // Masters filtered and paginated slices
  const filteredCategories = useMemo(() => {
    const q = mastersSearch.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.code && c.code.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q))
    );
  }, [categories, mastersSearch]);

  const paginatedCategories = useMemo(() => {
    const start = (mastersPage - 1) * mastersPageSize;
    return filteredCategories.slice(start, start + mastersPageSize);
  }, [filteredCategories, mastersPage, mastersPageSize]);

  const filteredAuthors = useMemo(() => {
    const q = mastersSearch.trim().toLowerCase();
    if (!q) return authors;
    return authors.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.code && a.code.toLowerCase().includes(q)) ||
        (a.biography && a.biography.toLowerCase().includes(q))
    );
  }, [authors, mastersSearch]);

  const paginatedAuthors = useMemo(() => {
    const start = (mastersPage - 1) * mastersPageSize;
    return filteredAuthors.slice(start, start + mastersPageSize);
  }, [filteredAuthors, mastersPage, mastersPageSize]);

  const filteredRacks = useMemo(() => {
    const q = mastersSearch.trim().toLowerCase();
    if (!q) return racks;
    return racks.filter(
      (r) =>
        r.rack_name.toLowerCase().includes(q) ||
        r.rack_code.toLowerCase().includes(q)
    );
  }, [racks, mastersSearch]);

  const paginatedRacks = useMemo(() => {
    const start = (mastersPage - 1) * mastersPageSize;
    return filteredRacks.slice(start, start + mastersPageSize);
  }, [filteredRacks, mastersPage, mastersPageSize]);

  useEffect(() => {
    setMastersPage(1);
  }, [mastersSearch, masterSubTab]);

  // Helper to check for duplicate ISBN in real-time
  const checkIsbnDuplicate = useCallback(
    (enteredIsbn: string, currentBookId?: number | null) => {
      const trimmed = (enteredIsbn || "").trim();
      if (!trimmed) return "";
      const cleanEntered = trimmed.replace(/[-\s]/g, "").toLowerCase();
      const duplicate = books.find((b) => {
        if (currentBookId && b.id === currentBookId) return false;
        if (!b.isbn) return false;
        const cleanExisting = b.isbn.trim().replace(/[-\s]/g, "").toLowerCase();
        return cleanExisting === cleanEntered;
      });
      if (duplicate) {
        return `A book with ISBN "${trimmed}" already exists: "${toTitleCase(duplicate.title)}" by ${toTitleCase(duplicate.author)} (Book ID #${duplicate.id}). Each book must have a unique ISBN.`;
      }
      return "";
    },
    [books]
  );

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

    const trimmedIsbn = bookForm.isbn?.trim() || "";
    if (trimmedIsbn) {
      const duplicateError = checkIsbnDuplicate(trimmedIsbn, editingBook?.id);
      if (duplicateError) {
        errors.isbn = duplicateError;
      }
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
      if (errors.isbn) {
        showToast("error", errors.isbn);
      } else {
        showToast("error", "Please fill in all mandatory fields marked with an asterisk (*).");
      }
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
      const msg = err.message || "Failed to save book.";
      showToast("error", msg);
      if (msg.toLowerCase().includes("isbn")) {
        setBookFormErrors((prev) => ({ ...prev, isbn: msg }));
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Handlers: Delete Book
  const handleDeleteBook = (target: Book | number, fallbackTitle?: string) => {
    const bookId = typeof target === "number" ? target : target.id;
    const title = typeof target === "object" ? target.title : fallbackTitle || `Book #${bookId}`;
    const bookObj = typeof target === "object" ? target : books.find((b) => b.id === bookId);
    const copiesCount = bookObj?.total_copies || 0;
    const isIssued = bookObj ? bookObj.available_copies < bookObj.total_copies : false;

    if (isIssued) {
      setConfirmModal({
        isOpen: true,
        title: "Cannot Delete Book On Loan",
        itemName: title,
        itemType: "book",
        description: `Book "${title}" is currently issued to students or staff.`,
        consequences: "All borrowed copies must be returned and cleared before this book can be deleted.",
        confirmText: "Understood",
        cancelText: "Close",
        isDestructive: false,
        onConfirm: () => {},
      });
      return;
    }

    if (copiesCount > 0) {
      setConfirmModal({
        isOpen: true,
        title: "Cannot Delete Book With Inventory Copies",
        itemName: title,
        itemType: "book",
        description: `Book "${title}" has ${copiesCount} physical inventory copies in circulation. Books with existing data cannot be deleted.`,
        consequences: "To delete this book master, you must first dispose of or clear its physical copies in the Copies modal.",
        confirmText: "Manage Copies",
        cancelText: "Cancel",
        isDestructive: false,
        onConfirm: () => {
          if (bookObj) handleOpenCopies(bookObj);
        },
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Delete Book Title?",
      itemName: title,
      itemType: "book",
      description: `Are you sure you want to delete book master "${title}" (ID #${bookId})?`,
      consequences:
        "This book has 0 physical copies and will be permanently removed from your catalogue.",
      confirmText: "Delete Book",
      isDestructive: true,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await deleteBook(bookId);
          showToast("success", `"${title}" removed from catalogue.`);
          await loadAllData();
        } catch (err: any) {
          showToast("error", err.message || "Failed to delete book.");
          throw err;
        } finally {
          setActionLoading(false);
        }
      },
    });
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
      const errorMsg = err.message || "Failed to issue book.";
      const backendErrors: Record<string, string> = { general: errorMsg };
      if (err.fieldErrors && typeof err.fieldErrors === "object") {
        for (const [key, val] of Object.entries(err.fieldErrors)) {
          if (Array.isArray(val) && val.length > 0) {
            backendErrors[key] = String(val[0]);
          } else if (typeof val === "string") {
            backendErrors[key] = val;
          }
        }
      }
      setIssueErrors((prev) => ({ ...prev, ...backendErrors }));
      showToast("error", backendErrors.non_field_errors || errorMsg);
    } finally {
      setActionLoading(false);
    }
  };

  // Handlers: Return Book with Condition & Pay Now
  const handleFinalizeReturn = async () => {
    if (!showReturnModal) return;
    setReturnError("");
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
      if (returnForm.pay_now && Number(res.total_fine) > 0) {
        setReceiptModal({
          detail: "Fine Settled on Return",
          receipt_no: res.payment_receipt_no || `LIB-RCP-${res.id}`,
          amount_paid: String(res.fine_paid_amount || res.total_fine),
          remaining_due: "0.00",
          is_fine_paid: true,
          record: res,
        });
      }
      await loadAllData();
      loadReportsData();
    } catch (err: any) {
      const msg = err.message || "Failed to return book.";
      setReturnError(msg);
      showToast("error", msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Handlers: Pay Fine
  const handleOpenPayFine = (record: BookIssued) => {
    const late = Number(record.late_fees || 0);
    const damage = Number(record.damage_fees || 0);
    const lost = Number(record.lost_fees || 0);
    const explicitTotal = Number(record.total_fine || 0);
    const total = explicitTotal > 0 ? explicitTotal : (late + damage + lost);
    const paid = Number(record.fine_paid_amount || 0);
    const remaining =
      record.fine_remaining !== undefined && record.fine_remaining !== null && Number(record.fine_remaining) > 0
        ? Number(record.fine_remaining)
        : Math.max(0, total - paid);

    setFinePaymentError("");
    setFinePaymentModal(record);
    setFinePaymentForm({
      amount: remaining > 0 ? String(remaining.toFixed(2)) : "0",
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
    const late = Number(finePaymentModal.late_fees || 0);
    const damage = Number(finePaymentModal.damage_fees || 0);
    const lost = Number(finePaymentModal.lost_fees || 0);
    const explicitTotal = Number(finePaymentModal.total_fine || 0);
    const total = explicitTotal > 0 ? explicitTotal : (late + damage + lost);
    const paid = Number(finePaymentModal.fine_paid_amount || 0);
    const maxPayable =
      finePaymentModal.fine_remaining !== undefined && finePaymentModal.fine_remaining !== null && Number(finePaymentModal.fine_remaining) > 0
        ? Number(finePaymentModal.fine_remaining)
        : Math.max(0, total - paid);

    if (Number(finePaymentForm.amount) > maxPayable + 0.01) {
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
      loadReportsData();
      if (selectedStudentClearance) {
        handleSearchStudentClearance(selectedStudentClearance.student_id);
      }
    } catch (err: any) {
      const errorMsg = err.message || "Failed to collect fine payment.";
      setFinePaymentError(errorMsg);
      showToast("error", errorMsg);
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
  const handleMarkLost = (id: number, bookTitle?: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Mark Book as Lost?",
      itemName: bookTitle || `Loan Record #${id}`,
      itemType: "copy",
      description: "Are you sure you want to mark this issued book as LOST?",
      consequences:
        "The physical copy status will become LOST, and a book replacement penalty fee will be billed to the borrower according to library policy.",
      confirmText: "Mark as Lost",
      isDestructive: true,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await markBookLost(id);
          showToast("success", "Book marked as Lost and penalty fee recorded.");
          await loadAllData();
        } catch (err: any) {
          showToast("error", err.message || "Failed to mark book lost.");
          throw err;
        } finally {
          setActionLoading(false);
        }
      },
    });
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
  const handleDisposeCopy = (copyId: number, accessionNo?: string) => {
    const accLabel = accessionNo || `Copy #${copyId}`;
    setConfirmModal({
      isOpen: true,
      title: "Dispose Physical Copy?",
      itemName: accLabel,
      itemType: "copy",
      description: `Are you sure you want to DISPOSE physical copy "${accLabel}"?`,
      consequences:
        "This copy will be retired from circulation inventory. Historical checkout and clearance logs will be retained for audit tracking.",
      confirmText: "Dispose Copy",
      isDestructive: true,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await deleteBookCopy(copyId);
          showToast("success", `Physical copy "${accLabel}" marked as DISPOSED.`);
          if (showCopiesModal) {
            const updated = await getBookCopies(showCopiesModal.id);
            setBookCopiesList(updated);
          }
          await loadAllData();
        } catch (err: any) {
          showToast("error", err.message || "Failed to dispose copy.");
          throw err;
        } finally {
          setActionLoading(false);
        }
      },
    });
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
  const openAddMasterModal = (type: "category" | "author" | "rack" | "shelf", defaultParentRack?: number) => {
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

  const openEditMasterModal = (type: "category" | "author" | "rack" | "shelf", item: any) => {
    setEditingMaster({ type, id: item.id });
    setMasterErrors({});
    if (type === "category") {
      setMasterForm({ name: item.name, code: item.code || "", extra: item.description || "", extra2: "" });
    } else if (type === "author") {
      setMasterForm({ name: item.name, code: item.code || "", extra: item.biography || "", extra2: "" });
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

  const handleToggleActiveMaster = async (
    type: "category" | "author" | "rack" | "shelf",
    id: number,
    name: string,
    currentActive: boolean
  ) => {
    setActionLoading(true);
    try {
      let res: any;
      if (type === "category") res = await toggleCategoryActive(id);
      else if (type === "author") res = await toggleAuthorActive(id);
      else if (type === "rack") res = await toggleRackActive(id);
      else if (type === "shelf") res = await toggleShelfActive(id);

      const isNowActive = res?.is_active ?? !currentActive;
      showToast(
        "success",
        `${type.charAt(0).toUpperCase() + type.slice(1)} "${name}" is now ${isNowActive ? "Activated" : "Deactivated"}.`
      );
      await loadAllData();
    } catch (err: any) {
      showToast("error", err.message || `Failed to change status of ${type}.`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteMaster = (
    type: "category" | "author" | "rack" | "shelf",
    id: number,
    name?: string,
    hasDataCount: number = 0
  ) => {
    const typeLabel =
      type === "rack" ? "Rack" : type === "shelf" ? "Shelf" : type.charAt(0).toUpperCase() + type.slice(1);
    const itemLabel = name || `${typeLabel} #${id}`;

    if (hasDataCount > 0) {
      setConfirmModal({
        isOpen: true,
        title: `Cannot Delete ${typeLabel}`,
        itemName: itemLabel,
        itemType: type === "rack" ? "rack" : type === "shelf" ? "shelf" : "custom",
        description: `"${itemLabel}" currently contains ${hasDataCount} associated book(s) or record(s). Items containing active data cannot be deleted.`,
        consequences: `To maintain library catalogue integrity, items with data cannot be permanently removed. You can deactivate it instead to prevent new assignments while keeping existing data safe.`,
        confirmText: `Deactivate ${typeLabel} Instead`,
        cancelText: "Cancel",
        isDestructive: false,
        onConfirm: async () => {
          await handleToggleActiveMaster(type, id, itemLabel, true);
        },
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: `Delete ${typeLabel}?`,
      itemName: itemLabel,
      itemType: type === "rack" ? "rack" : type === "shelf" ? "shelf" : "custom",
      description: `Are you sure you want to permanently delete ${typeLabel} "${itemLabel}"?`,
      consequences: `This ${typeLabel} contains 0 records and will be permanently removed. This action cannot be undone.`,
      confirmText: `Delete ${typeLabel}`,
      isDestructive: true,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          if (type === "category") await deleteCategory(id);
          else if (type === "author") await deleteAuthor(id);
          else if (type === "rack") await deleteRack(id);
          else if (type === "shelf") await deleteShelf(id);
          showToast("success", `${typeLabel} deleted successfully.`);
          await loadAllData();
        } catch (err: any) {
          showToast("error", err.message || `Failed to delete ${typeLabel}.`);
          throw err;
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  // Handlers: Cancel & Sweep Reservations
  const handleCancelReservation = (id: number, bookTitle?: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Cancel Student Hold Reservation?",
      itemName: bookTitle || `Hold Reservation #${id}`,
      itemType: "reservation",
      description: "Are you sure you want to cancel this student book hold reservation?",
      consequences:
        "The student will be removed from the waitlist queue, and the next waiting student will become eligible for lending.",
      confirmText: "Cancel Reservation",
      isDestructive: true,
      onConfirm: async () => {
        try {
          await cancelReservation(id);
          showToast("success", "Reservation cancelled.");
          await loadAllData();
        } catch (err: any) {
          showToast("error", err.message || "Failed to cancel reservation.");
          throw err;
        }
      },
    });
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
    <div className="space-y-3 sm:space-y-4 max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-4.5 pb-3 sm:pb-5 lg:pb-8 w-full min-w-0 overflow-x-hidden font-sans text-slate-800">
      <div className="w-full space-y-3 sm:space-y-4">
        {/* Sleek Top Header Bar (Only displayed in Racks & Storage [masters] and Issue & Return [circulation]) */}
        {(activeTab === "masters" || activeTab === "circulation") && (
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs p-3.5 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
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
            </div>
          </div>
        )}

        {/* Eight Telemetry Statistics Cards (Desktop: All 8 pages; Mobile: Only 1st page - catalog) */}
        <div className={`grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-2.5 sm:gap-3 ${activeTab !== "catalog" ? "hidden md:grid" : ""}`}>
          {/* Card 1: Total Titles */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Titles</span>
              <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
                <BookOpen className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-black text-slate-900">
                <MetricValue value={stats.titlesCount} loading={loading && !summary && books.length === 0} />
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-medium text-slate-500 truncate">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                <span>
                  <MetricValue value={`${stats.totalBooksCount} Copies`} loading={loading && !summary && books.length === 0} />
                </span>
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
              <div className="text-xl font-black text-emerald-600">
                <MetricValue value={stats.availableCopies} loading={loading && !summary && books.length === 0} />
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-medium text-emerald-700 truncate">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Ready to lend</span>
              </div>
            </div>
          </div>

          {/* Card 3: Active Loans */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Issued</span>
              <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                <ArrowRightLeft className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-black text-blue-600">
                <MetricValue value={stats.activeLoansCount} loading={loading && !summary && books.length === 0} />
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-medium text-blue-700 truncate">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                <span>Circulating</span>
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
              <div className="text-xl font-black text-rose-600">
                <MetricValue value={stats.overdueCount} loading={loading && !summary && books.length === 0} />
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-medium text-rose-700 truncate">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                <span>Past due</span>
              </div>
            </div>
          </div>

          {/* Card 5: Hold Queue */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs hover:shadow-md hover:border-purple-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Holds</span>
              <div className="h-7 w-7 rounded-lg bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center">
                <BookmarkPlus className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-black text-purple-600">
                <MetricValue value={stats.waitingReservationsCount} loading={loading && !summary && books.length === 0} />
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-medium text-purple-700 truncate">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0" />
                <span>Waitlist</span>
              </div>
            </div>
          </div>

          {/* Card 6: Lost & Damaged */}
          <div className="rounded-xl border border-red-200/80 bg-white p-3 shadow-2xs hover:shadow-md hover:border-red-400 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">Lost & Damaged</span>
              <div className="h-7 w-7 rounded-lg bg-red-50 text-red-600 border border-red-100 flex items-center justify-center">
                <AlertOctagon className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-black text-red-600">
                <MetricValue value={stats.lostDamagedCount} loading={loading && !summary && books.length === 0} />
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-medium text-red-600 truncate">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                <span>Stock audit loss</span>
              </div>
            </div>
          </div>

          {/* Card 7: Pending Dues */}
          <div className="rounded-xl border border-amber-200/80 bg-white p-3 shadow-2xs hover:shadow-md hover:border-amber-400 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Pending Dues</span>
              <div className="h-7 w-7 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
                <Receipt className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-black text-amber-700">
                <MetricValue value={`₹${stats.totalPendingDues.toLocaleString("en-IN")}`} loading={loading && !summary && books.length === 0} />
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-medium text-amber-700 truncate">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>Unsettled fines</span>
              </div>
            </div>
          </div>

          {/* Card 8: Fines Collected */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Fines Settled</span>
              <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                <DollarSign className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-black text-emerald-600">
                <MetricValue value={`₹${stats.totalFinesCollected.toLocaleString("en-IN")}`} loading={loading && !summary && books.length === 0} />
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-medium text-emerald-700 truncate">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Settled revenue</span>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN WORKSPACE CONTENT AREA (FULL WIDTH - NO DUAL SIDEBAR) */}
        <div className="w-full min-w-0 space-y-4 pb-24 sm:pb-12 lg:pb-8">
          {/* Contextual Active Step Header (Only for non-table tabs) */}
          {(activeTab === "reports" || activeTab === "settings") && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                    {activeTab === "reports" && "Step 7 of 8"}
                    {activeTab === "settings" && "Step 8 of 8"}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    {activeTab === "reports" && "Circulation statistics & inventory valuation reports"}
                    {activeTab === "settings" && "Loan durations, limits & late fine policies"}
                  </span>
                </div>
                <h2 className="text-base sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  {activeTab === "reports" && <BarChart3 className="h-5 w-5 text-indigo-600 shrink-0" />}
                  {activeTab === "settings" && <Sliders className="h-5 w-5 text-indigo-600 shrink-0" />}
                  <span>
                    {activeTab === "reports" && "Reports & Audit"}
                    {activeTab === "settings" && "Rules & Policies"}
                  </span>
                </h2>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={loadAllData}
                disabled={loading}
                className="shrink-0 h-9 w-9 p-0 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                title="Reload current data"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          )}

          {/* TAB 1: CATALOGUE (SUPERADMIN UNIFIED TABLE CARD) */}
          {activeTab === "catalog" && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              {/* Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 p-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 shadow-2xs">
                      <BookOpen className="h-4 w-4" />
                    </span>
                    <h3 className="text-base font-bold text-slate-900">Book Catalog</h3>
                    <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200/60">
                      {filteredBooks.length} {filteredBooks.length === 1 ? "Book" : "Books"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Manage books, copies, rack placements & barcode generation
                  </p>
                </div>

                <div className="flex items-center gap-2">
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
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add New Book
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={loadAllData}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-indigo-600 hover:text-indigo-600 transition-colors shadow-2xs cursor-pointer"
                    title="Reload catalog"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>

              {/* Filter and Search Bar Directly on Top of Table Data */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 sm:gap-3 border-b border-slate-200 bg-slate-50/50 p-3 sm:p-4">
                {/* Search & Mobile Page Size (Row 1 on mobile) */}
                <div className="flex items-center gap-2 w-full md:flex-1 md:max-w-md">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCatalogPage(1);
                      }}
                      placeholder="Search by book title, author, or ISBN barcode…"
                      className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/10 shadow-2xs"
                    />
                  </div>

                  {/* Mobile Page Size Trigger (Next to search on mobile, hidden on desktop) */}
                  <MobileSelectTrigger
                    className="shrink-0"
                    valueLabel={`${catalogPageSize} per page`}
                    onClick={() =>
                      setActiveSelectDrawer({
                        title: "Rows Per Page",
                        subtitle: "Choose number of books to display per page",
                        options: [
                          { label: "5 per page", value: 5 },
                          { label: "10 per page", value: 10 },
                          { label: "20 per page", value: 20 },
                          { label: "50 per page", value: 50 },
                        ],
                        selectedValue: catalogPageSize,
                        onSelect: (val) => {
                          setCatalogPageSize(Number(val));
                          setCatalogPage(1);
                        },
                      })
                    }
                  />
                </div>

                {/* Dropdown Filters (Row 2 on mobile: 2 equal-width columns) */}
                <div className="grid grid-cols-2 md:flex md:flex-nowrap items-center gap-2 w-full md:w-auto">
                  {/* Category Filter */}
                  <select
                    value={categoryFilter}
                    onChange={(e) => {
                      setCategoryFilter(e.target.value);
                      setCatalogPage(1);
                    }}
                    className="hidden md:block rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-blue-600 focus:outline-none shadow-2xs"
                  >
                    <option value="ALL">All Categories</option>
                    {categoryNames.filter((cat) => cat !== "ALL").map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <MobileSelectTrigger
                    className="w-full"
                    label="Category"
                    valueLabel={categoryFilter === "ALL" ? "All Categories" : categoryFilter}
                    onClick={() =>
                      setActiveSelectDrawer({
                        title: "Book Category",
                        subtitle: "Filter catalogue by category",
                        options: [
                          { label: "All Categories", value: "ALL" },
                          ...categoryNames
                            .filter((cat) => cat !== "ALL")
                            .map((cat) => ({ label: cat, value: cat })),
                        ],
                        selectedValue: categoryFilter,
                        onSelect: (val) => {
                          setCategoryFilter(val);
                          setCatalogPage(1);
                        },
                      })
                    }
                  />

                  {/* Author Filter */}
                  <select
                    value={authorFilter}
                    onChange={(e) => {
                      setAuthorFilter(e.target.value);
                      setCatalogPage(1);
                    }}
                    className="hidden md:block rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-blue-600 focus:outline-none shadow-2xs"
                  >
                    <option value="ALL">All Authors</option>
                    {authorNames.filter((auth) => auth !== "ALL").map((auth) => (
                      <option key={auth} value={auth}>
                        {auth}
                      </option>
                    ))}
                  </select>
                  <MobileSelectTrigger
                    className="w-full"
                    label="Author"
                    valueLabel={authorFilter === "ALL" ? "All Authors" : authorFilter}
                    onClick={() =>
                      setActiveSelectDrawer({
                        title: "Book Author",
                        subtitle: "Filter catalogue by author",
                        options: [
                          { label: "All Authors", value: "ALL" },
                          ...authorNames
                            .filter((auth) => auth !== "ALL")
                            .map((auth) => ({ label: auth, value: auth })),
                        ],
                        selectedValue: authorFilter,
                        onSelect: (val) => {
                          setAuthorFilter(val);
                          setCatalogPage(1);
                        },
                      })
                    }
                  />

                  {/* Desktop Page Size */}
                  <select
                    value={catalogPageSize}
                    onChange={(e) => {
                      setCatalogPageSize(Number(e.target.value));
                      setCatalogPage(1);
                    }}
                    className="hidden md:block rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-blue-600 focus:outline-none shadow-2xs"
                  >
                    <option value={5}>5 per page</option>
                    <option value={10}>10 per page</option>
                    <option value={20}>20 per page</option>
                    <option value={50}>50 per page</option>
                  </select>
                </div>
              </div>

              {/* Table Content */}
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                  <p className="text-xs text-slate-400 mt-2 font-medium">Loading library catalogue...</p>
                </div>
              ) : filteredBooks.length === 0 ? (
                <div className="text-center py-12">
                  <img
                    src="/images/empty-folder.png"
                    alt="No books"
                    className="mx-auto mb-3 h-24 w-24 object-contain"
                  />
                  <p className="font-semibold text-slate-700 text-sm">
                    {searchQuery || categoryFilter !== "ALL" || authorFilter !== "ALL"
                      ? "No books match your search or filter criteria"
                      : "No books registered in the catalogue"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {searchQuery || categoryFilter !== "ALL" || authorFilter !== "ALL"
                      ? "Try adjusting or clearing your search and filters."
                      : "Add books to your catalogue using the Add Book button above."}
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Full Data Table (Separate Columns, Single Row) */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-500">
                            <th className="py-3.5 px-3 text-center w-12">#</th>
                            <th className="py-3.5 px-4">Book Title</th>
                            <th className="py-3.5 px-4">Author</th>
                            <th className="py-3.5 px-4">Category</th>
                            <th className="py-3.5 px-4">ISBN / Code</th>
                            <th className="py-3.5 px-4">Storage Location</th>
                            <th className="py-3.5 px-4 text-center">Stock (Avail / Total)</th>
                            <th className="py-3.5 px-4 text-right">Price</th>
                            <th className="py-3.5 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {paginatedBooks.map((book, idx) => (
                            <tr key={book.id} className="hover:bg-slate-50/70 transition-colors group">
                              <td className="py-3.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                                {(catalogPage - 1) * catalogPageSize + idx + 1}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                    <BookOpen className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-sm truncate max-w-xs">
                                      {toTitleCase(book.title)}
                                    </p>
                                    {book.subtitle && (
                                      <p className="text-[10px] text-slate-400 truncate max-w-xs">{toTitleCase(book.subtitle)}</p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 font-semibold">
                                {toTitleCase(book.author)}
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                  {toTitleCase(book.category) || "General"}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-600 text-xs">
                                {book.isbn || "—"}
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
                              <td className="py-3.5 px-4 whitespace-nowrap text-center">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
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
                                  {book.available_copies} / {book.total_copies}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap text-right font-bold text-slate-800 font-mono">
                                ₹{Number(book.price || 0).toLocaleString("en-IN")}
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap text-right">
                                <div className="inline-flex items-center gap-1.5 justify-end">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenCopies(book)}
                                    className="h-8 px-2.5 text-xs gap-1 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 font-bold rounded-lg"
                                    title="Manage copies & barcodes"
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
                                      <ArrowRightLeft className="h-3.5 w-3.5" /> Issue
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
                                    title="Edit Book Details"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteBook(book)}
                                    className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 rounded-lg"
                                    title="Delete Book"
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

                    {/* Mobile Single Row Compact View (Tap to Open Bottom Sheet) */}
                    <div className="divide-y divide-slate-100 block md:hidden">
                      {paginatedBooks.map((book) => (
                        <div
                          key={book.id}
                          onClick={() => setSelectedMobileBook(book)}
                          className="p-3.5 bg-white hover:bg-slate-50 active:bg-slate-100 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm truncate">
                                {toTitleCase(book.title)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                              <span className="truncate">{toTitleCase(book.author)}</span>
                              <span>•</span>
                              <span className="text-indigo-600 font-semibold">{toTitleCase(book.category) || "General"}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                book.available_copies > 0
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {book.available_copies > 0 ? `${book.available_copies}/${book.total_copies} Avail` : "Out of Stock"}
                            </span>
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Superadmin Style Bottom Pagination */}
                    <TablePagination
                      currentPage={catalogPage}
                      totalItems={filteredBooks.length}
                      pageSize={catalogPageSize}
                      onPageChange={setCatalogPage}
                      onPageSizeChange={setCatalogPageSize}
                      itemLabel="books"
                    />
                  </>
                )}
              </div>
            )}

        {/* TAB 2: ACTIVE CIRCULATION (SUPERADMIN UNIFIED TABLE CARD) */}
        {activeTab === "circulation" && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            {/* Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 p-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 shadow-2xs">
                    <ArrowRightLeft className="h-4 w-4" />
                  </span>
                  <h3 className="text-base font-bold text-slate-900">Active Book Loans Counter</h3>
                  <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200/60">
                    {filteredActiveLoans.length} {filteredActiveLoans.length === 1 ? "Loan" : "Loans"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Currently circulating physical copies requiring return or renewal
                </p>
              </div>

              <div className="flex items-center gap-2">
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
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-2xs cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> New Issue Loan
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={loadAllData}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-indigo-600 hover:text-indigo-600 transition-colors shadow-2xs cursor-pointer"
                  title="Reload loans"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            {/* Filter and Search Bar Directly on Top of Table Data */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 sm:gap-3 border-b border-slate-200 bg-slate-50/50 p-3 sm:p-4">
              {/* Search & Mobile Page Size (Row 1 on mobile) */}
              <div className="flex items-center gap-2 w-full md:flex-1 md:max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={circulationSearch}
                    onChange={(e) => {
                      setCirculationSearch(e.target.value);
                      setCirculationPage(1);
                    }}
                    placeholder="Search borrower, book title, accession no, GR…"
                    className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/10 shadow-2xs"
                  />
                </div>

                {/* Mobile Page Size */}
                <MobileSelectTrigger
                  className="shrink-0"
                  valueLabel={`${circulationPageSize} per page`}
                  onClick={() =>
                    setActiveSelectDrawer({
                      title: "Rows Per Page",
                      subtitle: "Choose number of circulation records to display",
                      options: [
                        { label: "5 per page", value: 5 },
                        { label: "10 per page", value: 10 },
                        { label: "20 per page", value: 20 },
                        { label: "50 per page", value: 50 },
                      ],
                      selectedValue: circulationPageSize,
                      onSelect: (val) => {
                        setCirculationPageSize(Number(val));
                        setCirculationPage(1);
                      },
                    })
                  }
                />
              </div>

              {/* Dropdown Filters (Row 2 on mobile: 2-column grid; on desktop: inline flex) */}
              <div className="grid grid-cols-2 md:flex md:flex-nowrap items-center gap-2 w-full md:w-auto">
                {/* Status Filter */}
                <select
                  value={circulationStatusFilter}
                  onChange={(e) => {
                    setCirculationStatusFilter(e.target.value as "ALL" | "OVERDUE" | "DUE_SOON");
                    setCirculationPage(1);
                  }}
                  className="hidden md:block rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-blue-600 focus:outline-none shadow-2xs"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="OVERDUE">Overdue Only</option>
                  <option value="DUE_SOON">Due Soon (≤3d)</option>
                </select>
                <MobileSelectTrigger
                  className="w-full"
                  label="Status"
                  valueLabel={
                    circulationStatusFilter === "ALL"
                      ? "All Statuses"
                      : circulationStatusFilter === "OVERDUE"
                      ? "Overdue Only"
                      : "Due Soon (≤3d)"
                  }
                  onClick={() =>
                    setActiveSelectDrawer({
                      title: "Circulation Status",
                      subtitle: "Filter active loans by loan status",
                      options: [
                        { label: "All Statuses", value: "ALL" },
                        { label: "Overdue Only", value: "OVERDUE" },
                        { label: "Due Soon (≤3d)", value: "DUE_SOON" },
                      ],
                      selectedValue: circulationStatusFilter,
                      onSelect: (val) => {
                        setCirculationStatusFilter(val);
                        setCirculationPage(1);
                      },
                    })
                  }
                />

                {/* Category Filter */}
                <select
                  value={circulationCategoryFilter}
                  onChange={(e) => {
                    setCirculationCategoryFilter(e.target.value);
                    setCirculationPage(1);
                  }}
                  className="hidden md:block rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-blue-600 focus:outline-none shadow-2xs max-w-[160px] truncate"
                >
                  <option value="ALL">All Categories</option>
                  {uniqueActiveLoanCategories.map((c) => (
                    <option key={c.cat} value={c.cat}>
                      {c.cat}
                    </option>
                  ))}
                </select>
                <MobileSelectTrigger
                  className="w-full"
                  label="Category"
                  valueLabel={circulationCategoryFilter === "ALL" ? "All Categories" : circulationCategoryFilter}
                  onClick={() =>
                    setActiveSelectDrawer({
                      title: "Filter by Category",
                      subtitle: "Show loans for a specific category",
                      options: [
                        { label: "All Categories", value: "ALL" },
                        ...uniqueActiveLoanCategories.map((c) => ({ label: c.cat, value: c.cat })),
                      ],
                      selectedValue: circulationCategoryFilter,
                      onSelect: (val) => {
                        setCirculationCategoryFilter(val);
                        setCirculationPage(1);
                      },
                    })
                  }
                />

                {/* Book Filter */}
                <select
                  value={circulationBookFilter}
                  onChange={(e) => {
                    setCirculationBookFilter(e.target.value);
                    setCirculationPage(1);
                  }}
                  className="hidden md:block rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-blue-600 focus:outline-none shadow-2xs max-w-[180px] truncate"
                >
                  <option value="ALL">All Books</option>
                  {uniqueActiveLoanBooks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
                <MobileSelectTrigger
                  className="col-span-2 md:col-auto w-full md:w-auto"
                  label="Book"
                  valueLabel={
                    circulationBookFilter === "ALL"
                      ? "All Books"
                      : uniqueActiveLoanBooks.find((b) => String(b.id) === String(circulationBookFilter))?.title || "Selected Book"
                  }
                  onClick={() =>
                    setActiveSelectDrawer({
                      title: "Filter by Book",
                      subtitle: "Show loans for a specific book",
                      options: [
                        { label: "All Books", value: "ALL" },
                        ...uniqueActiveLoanBooks.map((b) => ({ label: b.title, value: b.id })),
                      ],
                      selectedValue: circulationBookFilter,
                      onSelect: (val) => {
                        setCirculationBookFilter(val);
                        setCirculationPage(1);
                      },
                    })
                  }
                />

                {/* Desktop Page Size */}
                <select
                  value={circulationPageSize}
                  onChange={(e) => {
                    setCirculationPageSize(Number(e.target.value));
                    setCirculationPage(1);
                  }}
                  className="hidden md:block rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-blue-600 focus:outline-none shadow-2xs"
                >
                  <option value={5}>5 per page</option>
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>
            </div>

            {/* Table Content */}
            {activeLoans.length === 0 ? (
              <div className="text-center p-12">
                <img
                  src="/images/empty-folder.png"
                  alt="No active loans"
                  className="mx-auto mb-3 h-24 w-24 object-contain"
                />
                <p className="text-sm font-semibold text-slate-800">All books are safely in the library!</p>
                <p className="text-xs text-slate-400 mt-1">No active loans outstanding.</p>
              </div>
            ) : filteredActiveLoans.length === 0 ? (
              <div className="text-center p-12">
                <img
                  src="/images/empty-folder.png"
                  alt="No active loans"
                  className="mx-auto mb-3 h-24 w-24 object-contain"
                />
                <p className="text-sm font-semibold text-slate-800">No active loans match the selected filters</p>
                <p className="text-xs text-slate-400 mt-1">Try clearing or changing your search criteria.</p>
              </div>
            ) : (
              <>
                {/* Desktop Full Circulation Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50/90 text-slate-600 text-[11px] font-black uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-3.5 px-3 text-center w-12">#</th>
                          <th className="py-3.5 px-4 whitespace-nowrap">Book Title</th>
                          <th className="py-3.5 px-4 whitespace-nowrap">Borrower Name</th>
                          <th className="py-3.5 px-4 whitespace-nowrap">Borrower ID / GR</th>
                          <th className="py-3.5 px-4 whitespace-nowrap">Accession No</th>
                          <th className="py-3.5 px-4 whitespace-nowrap">Issued Date</th>
                          <th className="py-3.5 px-4 whitespace-nowrap">Due Date</th>
                          <th className="py-3.5 px-4 whitespace-nowrap text-center">Renewals</th>
                          <th className="py-3.5 px-4 whitespace-nowrap text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {paginatedActiveLoans.map((loan, idx) => {
                          const isOverdue = new Date(loan.due_date) < new Date();
                          return (
                            <tr key={loan.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                                {(circulationPage - 1) * circulationPageSize + idx + 1}
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <div className="h-7 w-7 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                    <BookOpen className="h-3.5 w-3.5" />
                                  </div>
                                  <span className="font-bold text-slate-900 text-sm">{toTitleCase(loan.book_title)}</span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-slate-800">
                                {toTitleCase(loan.staff_name || loan.student_name || "Unknown")}
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
                                  {loan.staff ? `Staff #${loan.staff}` : `GR: ${loan.student_gr_no || "N/A"}`}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span className="font-mono text-xs font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md border border-indigo-200">
                                  {loan.accession_no || `BC-${loan.book}`}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-700 text-xs">
                                {new Date(loan.book_issued_date).toLocaleDateString("en-GB")}
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className={`inline-flex items-center gap-1.5 font-bold text-xs ${isOverdue ? "text-rose-600" : "text-slate-700"}`}>
                                  <span>{new Date(loan.due_date).toLocaleDateString("en-GB")}</span>
                                  {isOverdue && (
                                    <span className="bg-rose-100 text-rose-800 text-[10px] px-2 py-0.5 rounded-full uppercase border border-rose-200">Overdue</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap text-center text-slate-600">
                                <span className="bg-slate-100 px-2 py-0.5 rounded-md text-xs font-mono font-medium border border-slate-200">
                                  {loan.renewal_count || 0} / {librarySettings?.max_renewal_count || 2}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap text-right">
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
                                        pay_now: true,
                                        payment_method: "Cash",
                                      });
                                    }}
                                    className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-2xs"
                                  >
                                    <CheckCircle2 className="h-3 w-3 mr-1" /> Return
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleMarkLost(loan.id, loan.book_title)}
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

                  {/* Mobile Single Row Compact View */}
                  <div className="divide-y divide-slate-100 block md:hidden">
                    {paginatedActiveLoans.map((loan) => {
                      const isOverdue = new Date(loan.due_date) < new Date();
                      return (
                        <div
                          key={loan.id}
                          onClick={() => setSelectedMobileLoan(loan)}
                          className="p-3.5 bg-white hover:bg-slate-50 active:bg-slate-100 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-slate-900 text-sm truncate block">
                              {toTitleCase(loan.book_title)}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                              <span className="truncate">{toTitleCase(loan.staff_name || loan.student_name || "Unknown")}</span>
                              <span>•</span>
                              <span className="font-mono text-[11px] text-slate-600">
                                {loan.staff ? `Staff #${loan.staff}` : `GR: ${loan.student_gr_no || "N/A"}`}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isOverdue
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              }`}
                            >
                              {isOverdue ? "Overdue" : `Due: ${new Date(loan.due_date).toLocaleDateString("en-GB")}`}
                            </span>
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Superadmin Style Bottom Pagination */}
                  <TablePagination
                    currentPage={circulationPage}
                    totalItems={filteredActiveLoans.length}
                    pageSize={circulationPageSize}
                    onPageChange={setCirculationPage}
                    onPageSizeChange={setCirculationPageSize}
                    itemLabel="active loans"
                  />
                </>
              )}
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
                  size="icon"
                  onClick={loadPendingClearance}
                  disabled={clearanceLoading}
                  className="h-8 w-8 rounded-lg bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0"
                  title="Refresh Clearance List"
                  aria-label="Refresh Clearance List"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${clearanceLoading ? "animate-spin" : ""}`} />
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
                      className="hidden md:block w-full h-10 rounded-xl border border-slate-200 px-3 text-xs sm:text-sm font-medium bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors shadow-2xs"
                    >
                      <option value="">-- All Classes ({availableClasses.length}) --</option>
                      {availableClasses.map((cls) => (
                        <option key={cls} value={cls}>
                          Class: {cls}
                        </option>
                      ))}
                    </select>
                    <MobileSelectTrigger
                      className="w-full h-10 justify-between"
                      label="Class"
                      valueLabel={clearanceClassFilter ? `Class: ${clearanceClassFilter}` : "All Classes"}
                      onClick={() =>
                        setActiveSelectDrawer({
                          title: "Filter by Class",
                          subtitle: "Select class to inspect clearance records",
                          options: [
                            { label: `-- All Classes (${availableClasses.length}) --`, value: "" },
                            ...availableClasses.map((cls) => ({ label: `Class: ${cls}`, value: cls })),
                          ],
                          selectedValue: clearanceClassFilter,
                          onSelect: (newClass) => {
                            setClearanceClassFilter(newClass);
                            setClearanceDivisionFilter("");
                            setClearanceSearchQuery("");
                            setSelectedStudentClearance(null);
                          },
                        })
                      }
                    />
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
                      className={`hidden md:block w-full h-10 rounded-xl border px-3 text-xs sm:text-sm font-medium transition-colors shadow-2xs ${
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
                    <MobileSelectTrigger
                      className="w-full h-10 justify-between"
                      label="Division"
                      valueLabel={
                        !clearanceClassFilter
                          ? "Choose Class First"
                          : clearanceDivisionFilter
                          ? `Division ${clearanceDivisionFilter}`
                          : "All Divisions"
                      }
                      onClick={() => {
                        if (!clearanceClassFilter) {
                          toast.info("Please select a class first");
                          return;
                        }
                        setActiveSelectDrawer({
                          title: `Filter Division (${clearanceClassFilter})`,
                          subtitle: "Select division to filter students",
                          options: [
                            { label: `-- All Divisions (${clearanceDivisions.length}) --`, value: "" },
                            ...clearanceDivisions.map((div) => ({ label: `Division ${div}`, value: div })),
                          ],
                          selectedValue: clearanceDivisionFilter,
                          onSelect: (div) => {
                            setClearanceDivisionFilter(div);
                            setClearanceSearchQuery("");
                            setSelectedStudentClearance(null);
                          },
                        });
                      }}
                    />
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

            {/* List of All Students with Pending Dues across school (SUPERADMIN UNIFIED TABLE CARD) */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              {/* Header Bar */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50/80 p-4 sm:p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600 shadow-2xs shrink-0">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                    <h3 className="text-base font-bold text-slate-900">Students with Outstanding Library Dues</h3>
                    <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200/60 shrink-0">
                      {filteredPendingClearanceList.length} {filteredPendingClearanceList.length === 1 ? "Student" : "Students"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Students with unreturned books or pending library fines requiring settlement
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={loadAllData}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-indigo-600 hover:text-indigo-600 transition-colors shadow-2xs cursor-pointer"
                    title="Reload dues list"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>

              {/* Filter and Search Bar Directly on Top of Table Data */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/50 p-4">
                {/* Search */}
                <div className="relative min-w-[260px] flex-1 sm:max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={clearanceTableSearch}
                    onChange={(e) => {
                      setClearanceTableSearch(e.target.value);
                      setClearancePage(1);
                    }}
                    placeholder="Search by student name, GR No, or class…"
                    className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/10 shadow-2xs"
                  />
                </div>

                {/* Dropdown Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={clearancePageSize}
                    onChange={(e) => {
                      setClearancePageSize(Number(e.target.value));
                      setClearancePage(1);
                    }}
                    className="hidden md:block rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-indigo-600 focus:outline-none shadow-2xs"
                  >
                    <option value={5}>5 per page</option>
                    <option value={10}>10 per page</option>
                    <option value={20}>20 per page</option>
                    <option value={50}>50 per page</option>
                  </select>
                  <MobileSelectTrigger
                    valueLabel={`${clearancePageSize} per page`}
                    onClick={() =>
                      setActiveSelectDrawer({
                        title: "Rows Per Page",
                        subtitle: "Choose number of clearance records to display",
                        options: [
                          { label: "5 per page", value: 5 },
                          { label: "10 per page", value: 10 },
                          { label: "20 per page", value: 20 },
                          { label: "50 per page", value: 50 },
                        ],
                        selectedValue: clearancePageSize,
                        onSelect: (val) => {
                          setClearancePageSize(Number(val));
                          setClearancePage(1);
                        },
                      })
                    }
                  />
                </div>
              </div>

              {pendingClearanceList.length === 0 ? (
                <div className="text-center p-8">
                  <CheckCheck className="h-8 w-8 text-emerald-500 mx-auto" />
                  <p className="text-sm font-semibold text-slate-800 mt-2">All students are 100% cleared!</p>
                  <p className="text-xs text-slate-400 mt-1">No unreturned books or pending fines in the system.</p>
                </div>
              ) : filteredPendingClearanceList.length === 0 ? (
                <div className="text-center p-8 text-xs text-slate-400">
                  <Search className="h-6 w-6 text-slate-300 mx-auto mb-1" />
                  No students match "{clearanceTableSearch}"
                </div>
              ) : (
                <div>
                  {/* Desktop Clearance Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200 text-[11px]">
                        <tr>
                          <th className="py-3 px-3 text-center w-12">#</th>
                          <th className="px-4 py-3 whitespace-nowrap">Student Name</th>
                          <th className="px-4 py-3 whitespace-nowrap">GR No</th>
                          <th className="px-4 py-3 whitespace-nowrap">Class</th>
                          <th className="px-4 py-3 whitespace-nowrap">Unreturned Books</th>
                          <th className="px-4 py-3 whitespace-nowrap">Fine Due (₹)</th>
                          <th className="px-4 py-3 whitespace-nowrap text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {paginatedClearance.map((st, idx) => (
                          <tr key={st.student_id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                              {(clearancePage - 1) * clearancePageSize + idx + 1}
                            </td>
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
                                className="h-7 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-bold rounded-lg"
                              >
                                View Desk
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Single Row View */}
                  <div className="divide-y divide-slate-100 block md:hidden">
                    {paginatedClearance.map((st) => (
                      <div
                        key={st.student_id}
                        onClick={() => setSelectedMobileClearance(st)}
                        className="p-3.5 bg-white hover:bg-slate-50 active:bg-slate-100 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-slate-900 text-sm truncate block">
                            {st.student_name}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                            <span>GR: {st.gr_no || "N/A"}</span>
                            <span>•</span>
                            <span>{st.class_name || "General"}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Due: ₹{st.pending_fine_total || 0}
                          </span>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Superadmin Style Bottom Pagination */}
                  <TablePagination
                    currentPage={clearancePage}
                    totalItems={filteredPendingClearanceList.length}
                    pageSize={clearancePageSize}
                    onPageChange={setClearancePage}
                    onPageSizeChange={setClearancePageSize}
                    itemLabel="students"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: RESERVATIONS QUEUE (SUPERADMIN UNIFIED TABLE CARD) */}
        {activeTab === "reservations" && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            {/* Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 p-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 shadow-2xs">
                    <BookmarkPlus className="h-4 w-4" />
                  </span>
                  <h3 className="text-base font-bold text-slate-900">Book Reservations Queue</h3>
                  <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200/60">
                    {filteredReservations.length} {filteredReservations.length === 1 ? "Reservation" : "Reservations"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Student waitlist holds for out-of-stock titles; holds expire automatically after 48h
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSweepHoldExpiries}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 transition-colors shadow-2xs cursor-pointer"
                >
                  <Clock className="h-3.5 w-3.5" /> Sweep Expired Holds (48h)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={loadAllData}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-indigo-600 hover:text-indigo-600 transition-colors shadow-2xs cursor-pointer"
                  title="Reload reservations"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            {/* Filter and Search Bar Directly on Top of Table Data */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/50 p-4">
              <div className="relative min-w-[260px] flex-1 sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={reservationsSearch}
                  onChange={(e) => {
                    setReservationsSearch(e.target.value);
                    setReservationsPage(1);
                  }}
                  placeholder="Search reservation by book title, student name, or GR…"
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/10 shadow-2xs"
                />
              </div>

              <div className="flex flex-wrap md:flex-nowrap items-center gap-2 w-full sm:w-auto">
                <select
                  value={reservationsStatusFilter}
                  onChange={(e) => {
                    setReservationsStatusFilter(e.target.value);
                    setReservationsPage(1);
                  }}
                  className="hidden md:block rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-indigo-600 focus:outline-none shadow-2xs"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="WAITING">Waiting Queue</option>
                  <option value="AVAILABLE">Available / Ready</option>
                  <option value="FULFILLED">Fulfilled</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="EXPIRED">Expired</option>
                </select>
                <MobileSelectTrigger
                  label="Status"
                  valueLabel={
                    reservationsStatusFilter === "ALL"
                      ? "All Statuses"
                      : reservationsStatusFilter === "WAITING"
                      ? "Waiting Queue"
                      : reservationsStatusFilter === "AVAILABLE"
                      ? "Available / Ready"
                      : reservationsStatusFilter === "FULFILLED"
                      ? "Fulfilled"
                      : reservationsStatusFilter === "CANCELLED"
                      ? "Cancelled"
                      : reservationsStatusFilter === "EXPIRED"
                      ? "Expired"
                      : reservationsStatusFilter
                  }
                  onClick={() =>
                    setActiveSelectDrawer({
                      title: "Reservation Status",
                      subtitle: "Filter book reservations by status",
                      options: [
                        { label: "All Statuses", value: "ALL" },
                        { label: "Waiting Queue", value: "WAITING" },
                        { label: "Available / Ready", value: "AVAILABLE" },
                        { label: "Fulfilled", value: "FULFILLED" },
                        { label: "Cancelled", value: "CANCELLED" },
                        { label: "Expired", value: "EXPIRED" },
                      ],
                      selectedValue: reservationsStatusFilter,
                      onSelect: (val) => {
                        setReservationsStatusFilter(val);
                        setReservationsPage(1);
                      },
                    })
                  }
                />

                <select
                  value={reservationsPageSize}
                  onChange={(e) => {
                    setReservationsPageSize(Number(e.target.value));
                    setReservationsPage(1);
                  }}
                  className="hidden md:block rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-indigo-600 focus:outline-none shadow-2xs"
                >
                  <option value={5}>5 per page</option>
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                </select>
                <MobileSelectTrigger
                  valueLabel={`${reservationsPageSize} per page`}
                  onClick={() =>
                    setActiveSelectDrawer({
                      title: "Rows Per Page",
                      subtitle: "Choose number of reservations to display per page",
                      options: [
                        { label: "5 per page", value: 5 },
                        { label: "10 per page", value: 10 },
                        { label: "20 per page", value: 20 },
                      ],
                      selectedValue: reservationsPageSize,
                      onSelect: (val) => {
                        setReservationsPageSize(Number(val));
                        setReservationsPage(1);
                      },
                    })
                  }
                />
              </div>
            </div>

            {/* Table Content */}
            {reservations.length === 0 ? (
              <div className="text-center p-12">
                <img
                  src="/images/empty-folder.png"
                  alt="No reservations"
                  className="mx-auto mb-3 h-24 w-24 object-contain"
                />
                <p className="text-sm font-semibold text-slate-700">No active book reservations</p>
                <p className="text-xs text-slate-400 mt-1">Reservations made by students or staff will appear here.</p>
              </div>
            ) : filteredReservations.length === 0 ? (
              <div className="text-center p-12">
                <img
                  src="/images/empty-folder.png"
                  alt="No reservations found"
                  className="mx-auto mb-3 h-24 w-24 object-contain"
                />
                <p className="text-sm font-semibold text-slate-700">No reservations match your search or filter criteria</p>
                <p className="text-xs text-slate-400 mt-1">Try clearing or changing your search criteria.</p>
              </div>
            ) : (
              <>
                {/* Desktop Full Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                        <th className="p-4 text-center w-12">#</th>
                        <th className="p-4 whitespace-nowrap">Book Title</th>
                        <th className="p-4 whitespace-nowrap">Student Name</th>
                        <th className="p-4 whitespace-nowrap">GR No</th>
                        <th className="p-4 whitespace-nowrap text-center">Queue Rank</th>
                        <th className="p-4 whitespace-nowrap">Reserved Date</th>
                        <th className="p-4 whitespace-nowrap">Expiry Date</th>
                        <th className="p-4 whitespace-nowrap text-center">Status</th>
                        <th className="p-4 whitespace-nowrap text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {paginatedReservations.map((res, idx) => (
                        <tr key={res.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-4 text-center text-slate-400 font-mono text-[11px]">
                            {(reservationsPage - 1) * reservationsPageSize + idx + 1}
                          </td>
                          <td className="p-4 whitespace-nowrap font-bold text-slate-900">
                            {toTitleCase(res.book_title)}
                          </td>
                          <td className="p-4 whitespace-nowrap text-slate-800 font-semibold">
                            {toTitleCase(res.student_name)}
                          </td>
                          <td className="p-4 whitespace-nowrap font-mono text-slate-600">
                            {res.student_gr_no || "N/A"}
                          </td>
                          <td className="p-4 whitespace-nowrap text-center">
                            <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                              Rank #{res.queue_number}
                            </span>
                          </td>
                          <td className="p-4 whitespace-nowrap text-slate-600">
                            {new Date(res.reservation_date).toLocaleDateString("en-GB")}
                          </td>
                          <td className="p-4 whitespace-nowrap text-slate-600">
                            {res.expiry_date ? new Date(res.expiry_date).toLocaleDateString("en-GB") : "—"}
                          </td>
                          <td className="p-4 whitespace-nowrap text-center">
                            <span
                              className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                                res.status === "AVAILABLE"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : res.status === "WAITING"
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              {res.status}
                            </span>
                          </td>
                          <td className="p-4 whitespace-nowrap text-right">
                            {res.status === "WAITING" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCancelReservation(res.id, res.book_title)}
                                className="text-xs h-7 text-rose-600 border-rose-200 hover:bg-rose-50 font-bold rounded-lg cursor-pointer"
                              >
                                Cancel
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Single Row View */}
                <div className="divide-y divide-slate-100 block md:hidden">
                  {paginatedReservations.map((res) => (
                    <div
                      key={res.id}
                      onClick={() => setSelectedMobileReservation(res)}
                      className="p-3.5 bg-white hover:bg-slate-50 active:bg-slate-100 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-slate-900 text-sm truncate block">
                          {toTitleCase(res.book_title)}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                          <span>{toTitleCase(res.student_name)}</span>
                          <span>•</span>
                          <span className="font-mono text-[11px]">Rank #{res.queue_number}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            res.status === "AVAILABLE"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {res.status}
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Superadmin Style Bottom Pagination */}
                <TablePagination
                  currentPage={reservationsPage}
                  totalItems={filteredReservations.length}
                  pageSize={reservationsPageSize}
                  onPageChange={setReservationsPage}
                  onPageSizeChange={setReservationsPageSize}
                  itemLabel="reservations"
                />
              </>
            )}
          </div>
        )}

        {/* TAB: REPORTS & INVENTORY AUDIT (SECTION 20, 21, 23) */}
        {activeTab === "reports" && (
          <div className="space-y-6">
            <div
              style={{
                WebkitBackdropFilter: "blur(24px) saturate(180%)",
                backdropFilter: "blur(24px) saturate(180%)",
              }}
              className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/25 border border-slate-200/80 shadow-xs overflow-x-auto no-scrollbar scroll-smooth w-full"
            >
              <button
                onClick={() => setReportsSubTab("audit")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  reportsSubTab === "audit"
                    ? "bg-white/40 text-slate-900 border border-slate-300 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/40 active:bg-white/60"
                }`}
              >
                <Archive className="h-3.5 w-3.5" />
                <span className="sm:hidden">Inventory Audit</span>
                <span className="hidden sm:inline">Year-End Inventory Audit (Section 23)</span>
              </button>
              <button
                onClick={() => setReportsSubTab("borrowed")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  reportsSubTab === "borrowed"
                    ? "bg-white/40 text-slate-900 border border-slate-300 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/40 active:bg-white/60"
                }`}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="sm:hidden">Most Borrowed</span>
                <span className="hidden sm:inline">Most Borrowed Titles (Section 21)</span>
              </button>
              <button
                onClick={() => setReportsSubTab("trends")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  reportsSubTab === "trends"
                    ? "bg-white/40 text-slate-900 border border-slate-300 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/40 active:bg-white/60"
                }`}
              >
                <Layers className="h-3.5 w-3.5" /> Category Trends
              </button>
              <button
                onClick={() => setReportsSubTab("overdue")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  reportsSubTab === "overdue"
                    ? "bg-white/40 text-slate-900 border border-slate-300 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/40 active:bg-white/60"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span className="sm:hidden">Overdue Loans</span>
                <span className="hidden sm:inline">Overdue Loans &amp; Delays</span>
              </button>
              <button
                onClick={() => setReportsSubTab("fees")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  reportsSubTab === "fees"
                    ? "bg-white/40 text-slate-900 border border-slate-300 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/40 active:bg-white/60"
                }`}
              >
                <DollarSign className="h-3.5 w-3.5" /> Fine Revenue &amp; Dues
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
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-4 sm:p-5 space-y-3">
                <div>
                  <h3 className="font-bold text-slate-900">Most Borrowed Titles</h3>
                  <p className="text-xs text-slate-500">Ranks most popular library items across all historical loans</p>
                </div>
                {mostBorrowed.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No borrowing data yet.</p>
                ) : (
                  <>
                    {/* Desktop Full Data Table */}
                    <div className="hidden md:block overflow-x-auto min-w-0">
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
                    </div>

                    {/* Mobile Non-Scrolling Card List View (Zero Horizontal Scroll) */}
                    <div className="divide-y divide-slate-100 block md:hidden">
                      {mostBorrowed.map((b, idx) => (
                        <div key={b.book_id || idx} className="py-3 px-1 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-[11px] font-black text-indigo-700 border border-indigo-200 shrink-0">
                                #{idx + 1}
                              </span>
                              <span className="font-bold text-slate-900 text-sm break-words">
                                {b.title}
                              </span>
                            </div>
                            <span className="shrink-0 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200">
                              {b.times_issued} {b.times_issued === 1 ? "time" : "times"}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 gap-1 pl-8">
                            <div>
                              <span className="text-slate-700 font-medium">{b.author}</span>
                              {b.category && <span> • {b.category}</span>}
                            </div>
                            <div className="font-mono text-emerald-600 font-semibold">
                              {b.available_copies} / {b.total_copies} available
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
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
                      Historical Late Return Rate: {(() => {
                        const raw = typeof overdueAndLate.historical_late_rate === "object"
                          ? overdueAndLate.historical_late_rate?.late_rate_percent
                          : overdueAndLate.historical_late_rate;
                        const num = Number(raw);
                        return isNaN(num) ? "0.0" : num.toFixed(1);
                      })()}%
                    </div>
                  )}
                </div>

                {!overdueAndLate || overdueAndLate.currently_overdue?.length === 0 ? (
                  <div className="text-center p-8">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                    <p className="text-sm font-semibold text-slate-700 mt-2">Zero overdue loans!</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop Full Data Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b">
                          <tr>
                            <th className="px-4 py-3">Book Title</th>
                            <th className="px-4 py-3">Borrower</th>
                            <th className="px-4 py-3">Due Date</th>
                            <th className="px-4 py-3">Days Overdue</th>
                            <th className="px-4 py-3">Accrued Due Penalty (₹)</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {overdueAndLate.currently_overdue.map((item: any) => {
                            const matchingLoan = issuedRecords.find((r) => r.id === item.loan_id);
                            const borrowerName =
                              item.borrower_name ||
                              item.student_name ||
                              matchingLoan?.student_name ||
                              matchingLoan?.staff_name ||
                              (matchingLoan?.student_gr_no ? `GR: ${matchingLoan.student_gr_no}` : "") ||
                              (item.student_id ? `Student #${item.student_id}` : "Borrower");

                            const accruedPenalty = item.due_penalty !== undefined && item.due_penalty !== null
                              ? Number(item.due_penalty)
                              : (Number(item.days_overdue || 0) * (Number(librarySettings?.fine_per_day) || 2));

                            return (
                              <tr key={item.loan_id} className="hover:bg-slate-50/50">
                                <td className="px-4 py-3 font-semibold text-slate-900">{item.book_title}</td>
                                <td className="px-4 py-3 text-slate-700 font-medium">
                                  <div>{toTitleCase(borrowerName)}</div>
                                  {(item.borrower_gr || item.borrower_class) && (
                                    <div className="text-[10px] text-slate-400 font-mono">
                                      {item.borrower_gr ? `GR: ${item.borrower_gr}` : ""} {item.borrower_class ? `• ${item.borrower_class}` : ""}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-rose-600 font-mono">{new Date(item.due_date).toLocaleDateString()}</td>
                                <td className="px-4 py-3 font-bold text-rose-700">+{item.days_overdue} days</td>
                                <td className="px-4 py-3 font-mono">
                                  <span className="font-bold text-rose-700 text-sm">₹{accruedPenalty.toFixed(2)}</span>
                                  <span className="text-[10px] text-slate-400 block font-sans">
                                    +{item.days_overdue}d @ ₹{item.per_day_fee || librarySettings?.fine_per_day || 2}/day
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      const loan = matchingLoan || issuedRecords.find((r) => r.id === item.loan_id);
                                      if (loan) {
                                        setReturnError("");
                                        setShowReturnModal(loan);
                                        setReturnForm({
                                          condition: "GOOD",
                                          remarks: "",
                                          damage_fee: Number(librarySettings?.damage_penalty || 50),
                                          lost_fee: Number(librarySettings?.lost_penalty || 100),
                                          pay_now: true,
                                          payment_method: "Cash",
                                        });
                                      }
                                    }}
                                    className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                                  >
                                    Process Return
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Non-Scrolling Card List View (Zero Horizontal Scroll) */}
                    <div className="divide-y divide-slate-100 block md:hidden">
                      {overdueAndLate.currently_overdue.map((item: any) => {
                        const matchingLoan = issuedRecords.find((r) => r.id === item.loan_id);
                        const borrowerName =
                          item.borrower_name ||
                          item.student_name ||
                          matchingLoan?.student_name ||
                          matchingLoan?.staff_name ||
                          (matchingLoan?.student_gr_no ? `GR: ${matchingLoan.student_gr_no}` : "") ||
                          (item.student_id ? `Student #${item.student_id}` : "Borrower");

                        const accruedPenalty = item.due_penalty !== undefined && item.due_penalty !== null
                          ? Number(item.due_penalty)
                          : (Number(item.days_overdue || 0) * (Number(librarySettings?.fine_per_day) || 2));

                        return (
                          <div key={item.loan_id} className="py-3.5 px-1 space-y-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-slate-900 text-sm block">
                                  {item.book_title}
                                </span>
                                <div className="text-xs text-slate-600 font-medium mt-0.5">
                                  {toTitleCase(borrowerName)}
                                  {(item.borrower_gr || item.borrower_class) && (
                                    <span className="text-[10px] text-slate-400 font-mono ml-1.5">
                                      {item.borrower_gr ? `GR: ${item.borrower_gr}` : ""} {item.borrower_class ? `• ${item.borrower_class}` : ""}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="shrink-0 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                +{item.days_overdue}d overdue
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-xs bg-slate-50/80 rounded-xl p-2.5 border border-slate-100">
                              <div>
                                <span className="text-slate-400 text-[10px] uppercase font-semibold block">Due Date</span>
                                <span className="font-mono text-rose-600 font-semibold">{new Date(item.due_date).toLocaleDateString()}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-slate-400 text-[10px] uppercase font-semibold block">Accrued Due</span>
                                <span className="font-bold text-rose-700 text-sm font-mono">₹{accruedPenalty.toFixed(2)}</span>
                              </div>
                            </div>

                            <Button
                              size="sm"
                              onClick={() => {
                                const loan = matchingLoan || issuedRecords.find((r) => r.id === item.loan_id);
                                if (loan) {
                                  setReturnError("");
                                  setShowReturnModal(loan);
                                  setReturnForm({
                                    condition: "GOOD",
                                    remarks: "",
                                    damage_fee: Number(librarySettings?.damage_penalty || 50),
                                    lost_fee: Number(librarySettings?.lost_penalty || 100),
                                    pay_now: true,
                                    payment_method: "Cash",
                                  });
                                }
                              }}
                              className="w-full h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl flex items-center justify-center gap-1.5"
                            >
                              Process Return
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Sub-tab 5: Fee Collection & Dues Analysis (Organized in Separate Tables) */}
            {reportsSubTab === "fees" && (
              <div className="space-y-5">
                {/* 4 Financial KPI Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Settled Revenue</div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
                      ₹{Number(feeCollection?.total_fees_collected || 0).toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Fines collected & cleared</div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-sm">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-rose-500">Unsettled Due Penalties</div>
                    <div className="text-xl sm:text-2xl font-black text-rose-600 mt-1">
                      ₹{Number(feeCollection?.total_pending_dues || 0).toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Awaiting borrower payment</div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-sm">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Damage Costs Assessed</div>
                    <div className="text-xl sm:text-2xl font-black text-amber-700 mt-1">
                      ₹{Number(feeCollection?.total_damage_collected || 0).toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Physical book repair fees</div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-indigo-200 bg-indigo-50/20 shadow-sm">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">Late Fees Settled</div>
                    <div className="text-xl sm:text-2xl font-black text-indigo-700 mt-1">
                      ₹{Number(feeCollection?.total_late_collected || 0).toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Overdue delay settlements</div>
                  </div>
                </div>

                {/* Main Unified Table Container with Organized Sub-Tab Switcher */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Sub-navigation buttons */}
                  <div className="border-b border-slate-200 bg-slate-50/80 p-3 sm:p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                      <button
                        type="button"
                        onClick={() => setFeeReportSubView("dues")}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all shadow-2xs text-center ${
                          feeReportSubView === "dues"
                            ? "bg-rose-600 text-white shadow-sm ring-2 ring-rose-500/20"
                            : "bg-white hover:bg-slate-50 border border-slate-200 text-slate-700"
                        }`}
                      >
                        Pending Due Penalties ({(feeCollection?.pending_dues || []).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeeReportSubView("damage")}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all shadow-2xs text-center ${
                          feeReportSubView === "damage"
                            ? "bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/20"
                            : "bg-white hover:bg-slate-50 border border-slate-200 text-slate-700"
                        }`}
                      >
                        Damage &amp; Lost Cost Audit ({(feeCollection?.damage_records || []).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeeReportSubView("collected")}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all shadow-2xs text-center ${
                          feeReportSubView === "collected"
                            ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20"
                            : "bg-white hover:bg-slate-50 border border-slate-200 text-slate-700"
                        }`}
                      >
                        Monthly Trends &amp; Revenue Ledger
                      </button>
                    </div>
                  </div>

                  {/* TABLE 1: Outstanding Due Penalties */}
                  {feeReportSubView === "dues" && (
                    <div>
                      {(!feeCollection?.pending_dues || feeCollection.pending_dues.length === 0) ? (
                        <div className="text-center p-10">
                          <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                          <p className="text-sm font-bold text-slate-800 mt-2">Zero Pending Due Penalties!</p>
                          <p className="text-xs text-slate-400 mt-0.5">All assessed library fines and damages have been settled.</p>
                        </div>
                      ) : (
                        <>
                          {/* Desktop Full Data Table */}
                          <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b text-[11px]">
                                <tr>
                                  <th className="px-4 py-3">#</th>
                                  <th className="px-4 py-3">Borrower Name</th>
                                  <th className="px-4 py-3">Role / Class</th>
                                  <th className="px-4 py-3">Book Title</th>
                                  <th className="px-4 py-3">Return Date</th>
                                  <th className="px-4 py-3">Late Penalty</th>
                                  <th className="px-4 py-3">Damage Cost</th>
                                  <th className="px-4 py-3">Lost Cost</th>
                                  <th className="px-4 py-3">Total Due</th>
                                  <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {feeCollection.pending_dues.map((due: any, idx: number) => {
                                  const matchingLoan = issuedRecords.find((r) => r.id === due.id);
                                  return (
                                    <tr key={due.id} className="hover:bg-slate-50/50">
                                      <td className="px-4 py-3 text-slate-400 font-mono">{idx + 1}</td>
                                      <td className="px-4 py-3 font-bold text-slate-900">{toTitleCase(due.borrower_name)}</td>
                                      <td className="px-4 py-3 text-slate-600 font-mono">
                                        {due.borrower_gr ? `GR: ${due.borrower_gr}` : ""} {due.borrower_class ? `(${due.borrower_class})` : ""}
                                      </td>
                                      <td className="px-4 py-3 font-semibold text-slate-800">{due.book_title}</td>
                                      <td className="px-4 py-3 text-slate-500">
                                        {due.return_date ? new Date(due.return_date).toLocaleDateString() : "—"}
                                      </td>
                                      <td className="px-4 py-3 font-mono text-slate-700">₹{Number(due.late_fees || 0).toFixed(2)}</td>
                                      <td className="px-4 py-3 font-mono text-amber-700">₹{Number(due.damage_fees || 0).toFixed(2)}</td>
                                      <td className="px-4 py-3 font-mono text-rose-700">₹{Number(due.lost_fees || 0).toFixed(2)}</td>
                                      <td className="px-4 py-3 font-mono font-bold text-rose-600">
                                        <span className="px-2 py-0.5 rounded bg-rose-50 border border-rose-200">
                                          ₹{Number(due.fine_remaining || due.total_fine || 0).toFixed(2)}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-right">
                                        <Button
                                          size="sm"
                                          onClick={() => {
                                            const rec = matchingLoan || due;
                                            handleOpenPayFine(rec);
                                          }}
                                          className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1"
                                        >
                                          <CreditCard className="h-3 w-3" /> Collect Fine
                                        </Button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Mobile Non-Scrolling Card List View (Zero Horizontal Scroll) */}
                          <div className="divide-y divide-slate-100 block md:hidden p-3 space-y-3">
                            {feeCollection.pending_dues.map((due: any, idx: number) => {
                              const matchingLoan = issuedRecords.find((r) => r.id === due.id);
                              return (
                                <div key={due.id} className="p-3.5 bg-white border border-slate-200/80 rounded-xl space-y-2 shadow-2xs">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-slate-400 font-mono text-xs">#{idx + 1}</span>
                                        <span className="font-bold text-slate-900 text-sm truncate">{toTitleCase(due.borrower_name)}</span>
                                      </div>
                                      <div className="text-[11px] text-slate-500 font-mono">
                                        {due.borrower_gr ? `GR: ${due.borrower_gr}` : ""} {due.borrower_class ? `(${due.borrower_class})` : ""}
                                      </div>
                                    </div>
                                    <span className="shrink-0 px-2 py-0.5 rounded-md text-xs font-bold font-mono bg-rose-50 text-rose-700 border border-rose-200">
                                      ₹{Number(due.fine_remaining || due.total_fine || 0).toFixed(2)}
                                    </span>
                                  </div>

                                  <div className="text-xs text-slate-700 font-medium">
                                    <span className="text-slate-400 text-[10px] block">Book Title:</span>
                                    {due.book_title}
                                  </div>

                                  <div className="grid grid-cols-3 gap-1.5 text-center bg-slate-50/80 rounded-lg p-2 border border-slate-100 text-[11px]">
                                    <div>
                                      <span className="text-slate-400 text-[10px] block">Late</span>
                                      <span className="font-mono text-slate-700">₹{Number(due.late_fees || 0).toFixed(0)}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 text-[10px] block">Damage</span>
                                      <span className="font-mono text-amber-700">₹{Number(due.damage_fees || 0).toFixed(0)}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 text-[10px] block">Lost</span>
                                      <span className="font-mono text-rose-700">₹{Number(due.lost_fees || 0).toFixed(0)}</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between text-xs pt-1">
                                    <span className="text-slate-400 text-[11px]">
                                      Return: {due.return_date ? new Date(due.return_date).toLocaleDateString() : "—"}
                                    </span>
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        const rec = matchingLoan || due;
                                        handleOpenPayFine(rec);
                                      }}
                                      className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1 rounded-lg"
                                    >
                                      <CreditCard className="h-3 w-3" /> Collect Fine
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* TABLE 2: Physical Damage & Lost Cost Audit */}
                  {feeReportSubView === "damage" && (
                    <div>
                      {(!feeCollection?.damage_records || feeCollection.damage_records.length === 0) ? (
                        <div className="text-center p-10">
                          <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                          <p className="text-sm font-bold text-slate-800 mt-2">Zero Damaged or Lost Book Records!</p>
                          <p className="text-xs text-slate-400 mt-0.5">All returned inventory books are in good condition.</p>
                        </div>
                      ) : (
                        <>
                          {/* Desktop Full Data Table */}
                          <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b text-[11px]">
                                <tr>
                                  <th className="px-4 py-3">#</th>
                                  <th className="px-4 py-3">Book Title</th>
                                  <th className="px-4 py-3">Accession No</th>
                                  <th className="px-4 py-3">Borrower</th>
                                  <th className="px-4 py-3">Condition on Return</th>
                                  <th className="px-4 py-3">Damage Cost (₹)</th>
                                  <th className="px-4 py-3">Lost Cost (₹)</th>
                                  <th className="px-4 py-3">Total Penalty (₹)</th>
                                  <th className="px-4 py-3">Payment Status</th>
                                  <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {feeCollection.damage_records.map((rec: any, idx: number) => {
                                  const matchingLoan = issuedRecords.find((r) => r.id === rec.id);
                                  return (
                                    <tr key={rec.id} className="hover:bg-slate-50/50">
                                      <td className="px-4 py-3 text-slate-400 font-mono">{idx + 1}</td>
                                      <td className="px-4 py-3 font-semibold text-slate-900">{rec.book_title}</td>
                                      <td className="px-4 py-3 font-mono text-slate-600">{rec.accession_no || "—"}</td>
                                      <td className="px-4 py-3 text-slate-700 font-medium">
                                        {toTitleCase(rec.borrower_name)} {rec.borrower_gr ? `(GR: ${rec.borrower_gr})` : ""}
                                      </td>
                                      <td className="px-4 py-3">
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                            rec.condition === "LOST"
                                              ? "bg-rose-50 text-rose-700 border-rose-200"
                                              : "bg-amber-50 text-amber-700 border-amber-200"
                                          }`}
                                        >
                                          {rec.condition}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 font-mono font-bold text-amber-700">
                                        {Number(rec.damage_fees || 0) > 0 ? `₹${Number(rec.damage_fees).toFixed(2)}` : "—"}
                                      </td>
                                      <td className="px-4 py-3 font-mono font-bold text-rose-700">
                                        {Number(rec.lost_fees || 0) > 0 ? `₹${Number(rec.lost_fees).toFixed(2)}` : "—"}
                                      </td>
                                      <td className="px-4 py-3 font-mono font-black text-slate-900">
                                        ₹{Number(rec.total_fine || 0).toFixed(2)}
                                      </td>
                                      <td className="px-4 py-3">
                                        {rec.is_fine_paid ? (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            Paid ({rec.payment_method || "Settled"})
                                          </span>
                                        ) : (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                            Due (Pending)
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-right">
                                        {!rec.is_fine_paid ? (
                                          <Button
                                            size="sm"
                                            onClick={() => {
                                              const l = matchingLoan || rec;
                                              handleOpenPayFine(l);
                                            }}
                                            className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1"
                                          >
                                            <CreditCard className="h-3 w-3" /> Collect
                                          </Button>
                                        ) : (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              const l = matchingLoan || rec;
                                              setReceiptModal({
                                                detail: "Library Book Damage / Fine Receipt",
                                                receipt_no: l.payment_receipt_no || `LIB-RCP-${l.id}`,
                                                amount_paid: String(l.fine_paid_amount || l.total_fine),
                                                remaining_due: "0.00",
                                                is_fine_paid: true,
                                                record: l,
                                              });
                                            }}
                                            className="h-7 text-xs border-slate-200 text-slate-700 font-semibold"
                                          >
                                            Receipt
                                          </Button>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Mobile Non-Scrolling Card List View (Zero Horizontal Scroll) */}
                          <div className="divide-y divide-slate-100 block md:hidden p-3 space-y-3">
                            {feeCollection.damage_records.map((rec: any, idx: number) => {
                              const matchingLoan = issuedRecords.find((r) => r.id === rec.id);
                              return (
                                <div key={rec.id} className="p-3.5 bg-white border border-slate-200/80 rounded-xl space-y-2 shadow-2xs">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <span className="font-bold text-slate-900 text-sm block truncate">{rec.book_title}</span>
                                      <span className="text-[11px] text-slate-500 font-mono">Acc: {rec.accession_no || "—"}</span>
                                    </div>
                                    <span
                                      className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                        rec.condition === "LOST"
                                          ? "bg-rose-50 text-rose-700 border-rose-200"
                                          : "bg-amber-50 text-amber-700 border-amber-200"
                                      }`}
                                    >
                                      {rec.condition}
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between text-xs text-slate-600">
                                    <div>
                                      Borrower: <span className="font-medium text-slate-800">{toTitleCase(rec.borrower_name)}</span>
                                    </div>
                                    <div className="font-mono font-bold text-slate-900">
                                      Total: ₹{Number(rec.total_fine || 0).toFixed(2)}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                                    <div>
                                      {rec.is_fine_paid ? (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                          Paid ({rec.payment_method || "Settled"})
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                          Due (Pending)
                                        </span>
                                      )}
                                    </div>
                                    {!rec.is_fine_paid ? (
                                      <Button
                                        size="sm"
                                        onClick={() => {
                                          const l = matchingLoan || rec;
                                          handleOpenPayFine(l);
                                        }}
                                        className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1 rounded-lg"
                                      >
                                        <CreditCard className="h-3 w-3" /> Collect
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          const l = matchingLoan || rec;
                                          setReceiptModal({
                                            detail: "Library Book Damage / Fine Receipt",
                                            receipt_no: l.payment_receipt_no || `LIB-RCP-${l.id}`,
                                            amount_paid: String(l.fine_paid_amount || l.total_fine),
                                            remaining_due: "0.00",
                                            is_fine_paid: true,
                                            record: l,
                                          });
                                        }}
                                        className="h-7 text-xs border-slate-200 text-slate-700 font-semibold rounded-lg"
                                      >
                                        Receipt
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* TABLE 3: Monthly Breakdown & Revenue Trends */}
                  {feeReportSubView === "collected" && (
                    <div>
                      {(!feeCollection?.monthly_breakdown || feeCollection.monthly_breakdown.length === 0) ? (
                        <p className="text-xs text-slate-400 py-10 text-center">No fee breakdown records recorded yet.</p>
                      ) : (
                        <>
                          {/* Desktop Full Data Table */}
                          <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b text-[11px]">
                                <tr>
                                  <th className="px-4 py-3">Month</th>
                                  <th className="px-4 py-3">Fined Returns Count</th>
                                  <th className="px-4 py-3">Damage Fees Collected (₹)</th>
                                  <th className="px-4 py-3">Late Penalties Collected (₹)</th>
                                  <th className="px-4 py-3 text-right font-bold">Total Revenue (₹)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-medium">
                                {feeCollection.monthly_breakdown.map((row: any, i: number) => (
                                  <tr key={i} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3 font-semibold text-slate-900">{row.month}</td>
                                    <td className="px-4 py-3 text-slate-600">{row.fined_returns || row.late_returns} returns</td>
                                    <td className="px-4 py-3 text-amber-700 font-mono">₹{Number(row.damage_fees || 0).toFixed(2)}</td>
                                    <td className="px-4 py-3 text-indigo-700 font-mono">₹{Number(row.late_fees || 0).toFixed(2)}</td>
                                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700 text-sm">₹{row.total_fees}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Mobile Non-Scrolling Card List View (Zero Horizontal Scroll) */}
                          <div className="divide-y divide-slate-100 block md:hidden p-3 space-y-2.5">
                            {feeCollection.monthly_breakdown.map((row: any, i: number) => (
                              <div key={i} className="p-3 bg-white border border-slate-200/80 rounded-xl space-y-1.5 shadow-2xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-900 text-sm">{row.month}</span>
                                  <span className="font-mono font-bold text-emerald-700 text-sm">₹{row.total_fees}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                  <span>{row.fined_returns || row.late_returns} returns settled</span>
                                  <div className="font-mono text-[11px] text-slate-600">
                                    Late: ₹{Number(row.late_fees || 0).toFixed(0)} • Damage: ₹{Number(row.damage_fees || 0).toFixed(0)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MASTERS SETUP */}
        {activeTab === "masters" && (
          <div className="space-y-4">
            {/* Sub-Tabs: Categories vs Authors vs Racks */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setMasterSubTab("categories");
                  setMastersSearch("");
                  setMastersPage(1);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                  masterSubTab === "categories"
                    ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20"
                    : "bg-white hover:bg-slate-50 border border-slate-200 text-slate-700"
                }`}
              >
                Categories ({categories.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setMasterSubTab("authors");
                  setMastersSearch("");
                  setMastersPage(1);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                  masterSubTab === "authors"
                    ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20"
                    : "bg-white hover:bg-slate-50 border border-slate-200 text-slate-700"
                }`}
              >
                Authors ({authors.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setMasterSubTab("racks");
                  setMastersSearch("");
                  setMastersPage(1);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                  masterSubTab === "racks"
                    ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20"
                    : "bg-white hover:bg-slate-50 border border-slate-200 text-slate-700"
                }`}
              >
                Racks & Shelves ({racks.length} Racks)
              </button>
            </div>

            {/* UNIFIED SUPERADMIN TABLE CARD */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              {/* Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 p-4 sm:p-5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 shadow-2xs shrink-0">
                      {masterSubTab === "categories" && <Layers className="h-4 w-4" />}
                      {masterSubTab === "authors" && <Users className="h-4 w-4" />}
                      {masterSubTab === "racks" && <MapPin className="h-4 w-4" />}
                    </span>
                    <h3 className="text-base font-bold text-slate-900">
                      {masterSubTab === "categories" && "Book Categories Master"}
                      {masterSubTab === "authors" && "Book Authors Master"}
                      {masterSubTab === "racks" && "Racks & Shelves Master"}
                    </h3>
                    <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200/60 shrink-0">
                      {masterSubTab === "categories" && `${filteredCategories.length} Categories`}
                      {masterSubTab === "authors" && `${filteredAuthors.length} Authors`}
                      {masterSubTab === "racks" && `${filteredRacks.length} Racks`}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {masterSubTab === "categories" && "Define book genres and classification codes"}
                    {masterSubTab === "authors" && "Manage author profiles, biographies and publication credits"}
                    {masterSubTab === "racks" && "Configure physical racks, aisles and shelf locations for books"}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (masterSubTab === "categories") openAddMasterModal("category");
                      else if (masterSubTab === "authors") openAddMasterModal("author");
                      else if (masterSubTab === "racks") openAddMasterModal("rack");
                    }}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add New {masterSubTab === "racks" ? "Rack" : masterSubTab === "categories" ? "Category" : "Author"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={loadAllData}
                    disabled={loading}
                    className="shrink-0 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-indigo-600 hover:text-indigo-600 transition-colors shadow-2xs cursor-pointer"
                    title="Reload data"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>

              {/* Filter and Search Bar Directly on Top of Table Data */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/50 p-4">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={mastersSearch}
                    onChange={(e) => {
                      setMastersSearch(e.target.value);
                      setMastersPage(1);
                    }}
                    placeholder={`Search ${masterSubTab === "racks" ? "racks by name or code" : masterSubTab === "categories" ? "categories by name or code" : "authors by name"}…`}
                    className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/10 shadow-2xs"
                  />
                </div>

                {/* Dropdown Filters */}
                <div className="flex items-center gap-2">
                  <select
                    value={mastersPageSize}
                    onChange={(e) => {
                      setMastersPageSize(Number(e.target.value));
                      setMastersPage(1);
                    }}
                    className="hidden md:block rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-indigo-600 focus:outline-none shadow-2xs"
                  >
                    <option value={5}>5 per page</option>
                    <option value={10}>10 per page</option>
                    <option value={20}>20 per page</option>
                    <option value={50}>50 per page</option>
                  </select>
                  <MobileSelectTrigger
                    valueLabel={`${mastersPageSize} per page`}
                    onClick={() =>
                      setActiveSelectDrawer({
                        title: "Rows Per Page",
                        subtitle: `Choose number of ${masterSubTab} to display per page`,
                        options: [
                          { label: "5 per page", value: 5 },
                          { label: "10 per page", value: 10 },
                          { label: "20 per page", value: 20 },
                          { label: "50 per page", value: 50 },
                        ],
                        selectedValue: mastersPageSize,
                        onSelect: (val) => {
                          setMastersPageSize(Number(val));
                          setMastersPage(1);
                        },
                      })
                    }
                  />
                </div>
              </div>

              {/* Sub-tab 1: Categories Table */}
              {masterSubTab === "categories" && (
                <>
                {filteredCategories.length === 0 ? (
                  <div className="text-center py-12 bg-white">
                    <Layers className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <h3 className="text-base font-bold text-slate-800">No categories found</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      {mastersSearch ? `No categories match "${mastersSearch}".` : "Define book categories to classify your library collection."}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => openAddMasterModal("category")}
                      className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Category
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Desktop Full Table (Single Row, Separate Columns) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-500">
                            <th className="py-3.5 px-3 text-center w-12">#</th>
                            <th className="py-3.5 px-4">Category Name</th>
                            <th className="py-3.5 px-4">Code</th>
                            <th className="py-3.5 px-4 text-center">Books Count</th>
                            <th className="py-3.5 px-4">Description</th>
                            <th className="py-3.5 px-4 text-center">Status</th>
                            <th className="py-3.5 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {paginatedCategories.map((c, idx) => {
                            const count = categoryCounts[toTitleCase(c.name)] || 0;
                            const isActive = c.is_active !== false;
                            return (
                              <tr key={c.id} className="hover:bg-slate-50/70 transition-colors group">
                                <td className="py-3.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                                  {(mastersPage - 1) * mastersPageSize + idx + 1}
                                </td>
                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <div className="h-7 w-7 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                      <Layers className="h-3.5 w-3.5" />
                                    </div>
                                    <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                      {toTitleCase(c.name)}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-600">
                                  {c.code || "—"}
                                </td>
                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCategoryFilter(toTitleCase(c.name));
                                      setActiveTab("catalog");
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60 transition-colors"
                                    title="View matching books in catalog"
                                  >
                                    <BookOpen className="h-3 w-3" />
                                    <span>{count} {count === 1 ? "Book" : "Books"}</span>
                                  </button>
                                </td>
                                <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate" title={c.description || ""}>
                                  {c.description || "—"}
                                </td>
                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                  <span
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                                      isActive
                                        ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                                        : "bg-amber-50 border border-amber-200 text-amber-700"
                                    }`}
                                  >
                                    {isActive ? "Active" : "Deactivated"}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleToggleActiveMaster("category", c.id, c.name, isActive)}
                                      className={`h-7 w-7 p-0 rounded-lg ${
                                        isActive
                                          ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                          : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                      }`}
                                      title={isActive ? "Deactivate category" : "Activate category"}
                                    >
                                      <Power className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => openEditMasterModal("category", c)}
                                      className="h-7 w-7 p-0 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                      title="Edit Category"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeleteMaster("category", c.id, c.name, count)}
                                      className={`h-7 w-7 p-0 rounded-lg ${
                                        count > 0
                                          ? "text-slate-300 hover:text-amber-600 hover:bg-amber-50 cursor-pointer"
                                          : "text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                                      }`}
                                      title={count > 0 ? `Contains ${count} book(s). Cannot be deleted. Deactivate instead.` : "Delete Category"}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Single Row Compact View (Tap to Open Bottom Sheet) */}
                    <div className="divide-y divide-slate-100 block md:hidden">
                      {paginatedCategories.map((c) => {
                        const count = categoryCounts[toTitleCase(c.name)] || 0;
                        const isActive = c.is_active !== false;
                        return (
                          <div
                            key={c.id}
                            onClick={() => setSelectedMobileMaster({ type: "category", data: c, count })}
                            className="p-3.5 bg-white hover:bg-slate-50 active:bg-slate-100 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                <Layers className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 text-sm truncate">{toTitleCase(c.name)}</p>
                                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                                  {c.code ? `Code: ${c.code} • ` : ""}{count} {count === 1 ? "Book" : "Books"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                  isActive
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}
                              >
                                {isActive ? "Active" : "Inactive"}
                              </span>
                              <ChevronRight className="h-4 w-4 text-slate-300" />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Superadmin Style Bottom Pagination */}
                    <TablePagination
                      currentPage={mastersPage}
                      totalItems={filteredCategories.length}
                      pageSize={mastersPageSize}
                      onPageChange={setMastersPage}
                      onPageSizeChange={setMastersPageSize}
                      itemLabel="categories"
                    />
                  </>
                )}
              </>
            )}

            {/* Sub-tab 2: Authors Table */}
            {masterSubTab === "authors" && (
              <>
                {filteredAuthors.length === 0 ? (
                  <div className="text-center py-12 bg-white">
                    <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <h3 className="text-base font-bold text-slate-800">No authors found</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      {mastersSearch ? `No authors match "${mastersSearch}".` : "Add author profiles to maintain catalog references."}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => openAddMasterModal("author")}
                      className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Author
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Desktop Full Table (Single Row, Separate Columns) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-500">
                            <th className="py-3.5 px-3 text-center w-12">#</th>
                            <th className="py-3.5 px-4">Author Name</th>
                            <th className="py-3.5 px-4">Code / Ref</th>
                            <th className="py-3.5 px-4 text-center">Books Count</th>
                            <th className="py-3.5 px-4">Biography / Notes</th>
                            <th className="py-3.5 px-4 text-center">Status</th>
                            <th className="py-3.5 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {paginatedAuthors.map((a, idx) => {
                            const count = authorCounts[toTitleCase(a.name)] || 0;
                            const isActive = a.is_active !== false;
                            return (
                              <tr key={a.id} className="hover:bg-slate-50/70 transition-colors group">
                                <td className="py-3.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                                  {(mastersPage - 1) * mastersPageSize + idx + 1}
                                </td>
                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <div className="h-7 w-7 rounded-lg bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                                      <User className="h-3.5 w-3.5" />
                                    </div>
                                    <span className="font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                                      {toTitleCase(a.name)}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-600">
                                  {a.code || "—"}
                                </td>
                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAuthorFilter(toTitleCase(a.name));
                                      setActiveTab("catalog");
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/60 transition-colors"
                                    title="View books by this author in catalog"
                                  >
                                    <User className="h-3 w-3" />
                                    <span>{count} {count === 1 ? "Book" : "Books"}</span>
                                  </button>
                                </td>
                                <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate" title={a.biography || ""}>
                                  {a.biography || "—"}
                                </td>
                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                  <span
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                                      isActive
                                        ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                                        : "bg-amber-50 border border-amber-200 text-amber-700"
                                    }`}
                                  >
                                    {isActive ? "Active" : "Deactivated"}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleToggleActiveMaster("author", a.id, a.name, isActive)}
                                      className={`h-7 w-7 p-0 rounded-lg ${
                                        isActive
                                          ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                          : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                      }`}
                                      title={isActive ? "Deactivate author" : "Activate author"}
                                    >
                                      <Power className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => openEditMasterModal("author", a)}
                                      className="h-7 w-7 p-0 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
                                      title="Edit Author"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeleteMaster("author", a.id, a.name, count)}
                                      className={`h-7 w-7 p-0 rounded-lg ${
                                        count > 0
                                          ? "text-slate-300 hover:text-amber-600 hover:bg-amber-50 cursor-pointer"
                                          : "text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                                      }`}
                                      title={count > 0 ? `Associated with ${count} book(s). Cannot be deleted. Deactivate instead.` : "Delete Author"}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Single Row Compact View (Tap to Open Bottom Sheet) */}
                    <div className="divide-y divide-slate-100 block md:hidden">
                      {paginatedAuthors.map((a) => {
                        const count = authorCounts[toTitleCase(a.name)] || 0;
                        const isActive = a.is_active !== false;
                        return (
                          <div
                            key={a.id}
                            onClick={() => setSelectedMobileMaster({ type: "author", data: a, count })}
                            className="p-3.5 bg-white hover:bg-slate-50 active:bg-slate-100 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-9 w-9 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                                <User className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 text-sm truncate">{toTitleCase(a.name)}</p>
                                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                                  {a.code ? `Ref: ${a.code} • ` : ""}{count} {count === 1 ? "Book" : "Books"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                  isActive
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}
                              >
                                {isActive ? "Active" : "Inactive"}
                              </span>
                              <ChevronRight className="h-4 w-4 text-slate-300" />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Superadmin Style Bottom Pagination */}
                    <TablePagination
                      currentPage={mastersPage}
                      totalItems={filteredAuthors.length}
                      pageSize={mastersPageSize}
                      onPageChange={setMastersPage}
                      onPageSizeChange={setMastersPageSize}
                      itemLabel="authors"
                    />
                  </>
                )}
              </>
            )}

            {/* Sub-tab 3: Racks & Shelves Table */}
            {masterSubTab === "racks" && (
              <>
                {filteredRacks.length === 0 ? (
                  <div className="text-center py-12 bg-white">
                    <MapPin className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <h3 className="text-base font-bold text-slate-800">No physical racks found</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      {mastersSearch ? `No racks match "${mastersSearch}".` : "Define your library racks to organize book shelving and physical copies."}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => openAddMasterModal("rack")}
                      className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add First Rack
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Desktop Full Table (Single Row, Separate Columns) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-500">
                            <th className="py-3.5 px-3 text-center w-12">#</th>
                            <th className="py-3.5 px-4">Rack Code</th>
                            <th className="py-3.5 px-4">Rack Name</th>
                            <th className="py-3.5 px-4">Configured Shelves</th>
                            <th className="py-3.5 px-4 text-center">Books Stored</th>
                            <th className="py-3.5 px-4 text-center">Status</th>
                            <th className="py-3.5 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {paginatedRacks.map((r, idx) => {
                            const rackShelves = shelves.filter((s) => s.rack === r.id);
                            const rackBooks = books.filter((b) => b.rack === r.id || b.rack_code === r.rack_code);
                            const totalRackData = rackShelves.length + rackBooks.length;
                            const isRackActive = r.is_active !== false;
                            return (
                              <tr key={r.id} className="hover:bg-slate-50/70 transition-colors group">
                                <td className="py-3.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                                  {(mastersPage - 1) * mastersPageSize + idx + 1}
                                </td>
                                <td className="py-3.5 px-4 whitespace-nowrap font-mono">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                                    <MapPin className="h-3 w-3 text-amber-600" />
                                    {r.rack_code}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 whitespace-nowrap font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                  {r.rack_name}
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="flex flex-wrap items-center gap-1.5 max-w-md">
                                    {rackShelves.length === 0 ? (
                                      <span className="text-slate-400 text-[11px] italic">No shelves added</span>
                                    ) : (
                                      rackShelves.map((s) => (
                                        <span
                                          key={s.id}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-medium"
                                        >
                                          <span className="font-mono font-bold">{s.shelf_code}</span>
                                          <span className="text-slate-400">({s.shelf_name})</span>
                                        </span>
                                      ))
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => openAddMasterModal("shelf", r.id)}
                                      className="h-6 px-1.5 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 rounded-md"
                                      title="Add shelf to this rack"
                                    >
                                      <Plus className="h-3 w-3 mr-0.5" /> + Shelf
                                    </Button>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                    {rackBooks.length} {rackBooks.length === 1 ? "Book" : "Books"}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                  <span
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                                      isRackActive
                                        ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                                        : "bg-amber-50 border border-amber-200 text-amber-700"
                                    }`}
                                  >
                                    {isRackActive ? "Active" : "Deactivated"}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleToggleActiveMaster("rack", r.id, r.rack_name, isRackActive)}
                                      className={`h-7 w-7 p-0 rounded-lg ${
                                        isRackActive ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                      }`}
                                      title={isRackActive ? "Deactivate rack" : "Activate rack"}
                                    >
                                      <Power className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => openEditMasterModal("rack", r)}
                                      className="h-7 w-7 p-0 text-slate-400 hover:text-indigo-600 rounded-lg"
                                      title="Edit rack"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        handleDeleteMaster(
                                          "rack",
                                          r.id,
                                          `${r.rack_code} — ${r.rack_name}`,
                                          totalRackData
                                        )
                                      }
                                      className={`h-7 w-7 p-0 rounded-lg ${
                                        totalRackData > 0
                                          ? "text-slate-300 hover:text-amber-600 hover:bg-amber-50 cursor-pointer"
                                          : "text-slate-400 hover:text-rose-600 rounded-lg"
                                      }`}
                                      title={
                                        totalRackData > 0
                                          ? `Contains ${rackShelves.length} shelves and ${rackBooks.length} books. Cannot be deleted. Deactivate instead.`
                                          : "Delete rack"
                                      }
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Single Row Compact View (Tap to Open Bottom Sheet) */}
                    <div className="divide-y divide-slate-100 block md:hidden">
                      {paginatedRacks.map((r) => {
                        const rackShelves = shelves.filter((s) => s.rack === r.id);
                        const rackBooks = books.filter((b) => b.rack === r.id || b.rack_code === r.rack_code);
                        const isRackActive = r.is_active !== false;
                        return (
                          <div
                            key={r.id}
                            onClick={() =>
                              setSelectedMobileMaster({
                                type: "rack",
                                data: r,
                                shelves: rackShelves,
                                booksCount: rackBooks.length,
                              })
                            }
                            className="p-3.5 bg-white hover:bg-slate-50 active:bg-slate-100 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center shrink-0">
                                <MapPin className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 text-sm truncate">{r.rack_name}</p>
                                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                                  Rack {r.rack_code} • {rackShelves.length} Shelves • {rackBooks.length} Books
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                  isRackActive
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}
                              >
                                {isRackActive ? "Active" : "Inactive"}
                              </span>
                              <ChevronRight className="h-4 w-4 text-slate-300" />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Superadmin Style Bottom Pagination */}
                    <TablePagination
                      currentPage={mastersPage}
                      totalItems={filteredRacks.length}
                      pageSize={mastersPageSize}
                      onPageChange={setMastersPage}
                      onPageSizeChange={setMastersPageSize}
                      itemLabel="racks"
                    />
                  </>
                )}
              </>
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

        {/* TAB 6: HISTORY (SUPERADMIN UNIFIED TABLE CARD) */}
        {activeTab === "history" && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            {/* Header Bar */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50/80 p-4 sm:p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 shadow-2xs shrink-0">
                    <Clock className="h-4 w-4" />
                  </span>
                  <h3 className="text-base font-bold text-slate-900">Completed Circulation History</h3>
                  <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200/60 shrink-0">
                    {filteredHistoryLoans.length} {filteredHistoryLoans.length === 1 ? "Record" : "Records"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Historical archive of returned, damaged, or lost books with settled fines and receipts
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={loadAllData}
                disabled={loading}
                className="shrink-0 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-indigo-600 hover:text-indigo-600 transition-colors shadow-2xs cursor-pointer"
                title="Reload history"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {/* Filter and Search Bar Directly on Top of Table Data */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/50 p-4">
              {/* Search */}
              <div className="relative min-w-[260px] flex-1 sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => {
                    setHistorySearch(e.target.value);
                    setHistoryPage(1);
                  }}
                  placeholder="Search borrower, book title, accession no, receipt…"
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/10 shadow-2xs"
                />
              </div>

              {/* Dropdown Filters */}
              <div className="grid grid-cols-2 gap-2 w-full md:flex md:w-auto md:items-center">
                {/* Status Filter */}
                <select
                  value={historyStatusFilter}
                  onChange={(e) => {
                    setHistoryStatusFilter(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="hidden md:block rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-indigo-600 focus:outline-none shadow-2xs"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="RETURNED">Returned</option>
                  <option value="DAMAGED">Damaged</option>
                  <option value="LOST">Lost</option>
                </select>
                <MobileSelectTrigger
                  label="Status"
                  valueLabel={
                    historyStatusFilter === "ALL"
                      ? "All Statuses"
                      : historyStatusFilter === "RETURNED"
                      ? "Returned"
                      : historyStatusFilter === "DAMAGED"
                      ? "Damaged"
                      : historyStatusFilter === "LOST"
                      ? "Lost"
                      : historyStatusFilter
                  }
                  onClick={() =>
                    setActiveSelectDrawer({
                      title: "History Status",
                      subtitle: "Filter historical circulation by return status",
                      options: [
                        { label: "All Statuses", value: "ALL" },
                        { label: "Returned", value: "RETURNED" },
                        { label: "Damaged", value: "DAMAGED" },
                        { label: "Lost", value: "LOST" },
                      ],
                      selectedValue: historyStatusFilter,
                      onSelect: (val) => {
                        setHistoryStatusFilter(val);
                        setHistoryPage(1);
                      },
                    })
                  }
                />

                {/* Payment Type Filter */}
                <select
                  value={historyPaymentTypeFilter}
                  onChange={(e) => {
                    setHistoryPaymentTypeFilter(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="hidden md:block rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-indigo-600 focus:outline-none shadow-2xs"
                >
                  <option value="ALL">All Payments</option>
                  <option value="CASH">Cash Counter</option>
                  <option value="ONLINE">Online / UPI</option>
                  <option value="UNPAID">Unpaid Dues</option>
                  <option value="NO_FINE">No Fine</option>
                </select>
                <MobileSelectTrigger
                  label="Payment"
                  valueLabel={
                    historyPaymentTypeFilter === "ALL"
                      ? "All Payments"
                      : historyPaymentTypeFilter === "CASH"
                      ? "Cash Counter"
                      : historyPaymentTypeFilter === "ONLINE"
                      ? "Online / UPI"
                      : historyPaymentTypeFilter === "UNPAID"
                      ? "Unpaid Dues"
                      : historyPaymentTypeFilter === "NO_FINE"
                      ? "No Fine"
                      : historyPaymentTypeFilter
                  }
                  onClick={() =>
                    setActiveSelectDrawer({
                      title: "Payment Type",
                      subtitle: "Filter past transactions by fine settlement",
                      options: [
                        { label: "All Payments", value: "ALL" },
                        { label: "Cash Counter", value: "CASH" },
                        { label: "Online / UPI", value: "ONLINE" },
                        { label: "Unpaid Dues", value: "UNPAID" },
                        { label: "No Fine", value: "NO_FINE" },
                      ],
                      selectedValue: historyPaymentTypeFilter,
                      onSelect: (val) => {
                        setHistoryPaymentTypeFilter(val);
                        setHistoryPage(1);
                      },
                    })
                  }
                />

                {/* Category Filter */}
                <select
                  value={historyCategoryFilter}
                  onChange={(e) => {
                    setHistoryCategoryFilter(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="hidden md:block rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-indigo-600 focus:outline-none shadow-2xs max-w-[160px] truncate"
                >
                  <option value="ALL">All Categories</option>
                  {categoryNames.filter((c) => c !== "ALL").map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <MobileSelectTrigger
                  label="Category"
                  valueLabel={historyCategoryFilter === "ALL" ? "All Categories" : historyCategoryFilter}
                  onClick={() =>
                    setActiveSelectDrawer({
                      title: "Book Category",
                      subtitle: "Filter circulation history by category",
                      options: [
                        { label: "All Categories", value: "ALL" },
                        ...categoryNames
                          .filter((c) => c !== "ALL")
                          .map((c) => ({ label: c, value: c })),
                      ],
                      selectedValue: historyCategoryFilter,
                      onSelect: (val) => {
                        setHistoryCategoryFilter(val);
                        setHistoryPage(1);
                      },
                    })
                  }
                />

                {/* Page Size */}
                <select
                  value={historyPageSize}
                  onChange={(e) => {
                    setHistoryPageSize(Number(e.target.value));
                    setHistoryPage(1);
                  }}
                  className="hidden md:block rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-indigo-600 focus:outline-none shadow-2xs"
                >
                  <option value={5}>5 per page</option>
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                </select>
                <MobileSelectTrigger
                  valueLabel={`${historyPageSize} per page`}
                  onClick={() =>
                    setActiveSelectDrawer({
                      title: "Rows Per Page",
                      subtitle: "Choose number of history rows to display per page",
                      options: [
                        { label: "5 per page", value: 5 },
                        { label: "10 per page", value: 10 },
                        { label: "20 per page", value: 20 },
                        { label: "50 per page", value: 50 },
                      ],
                      selectedValue: historyPageSize,
                      onSelect: (val) => {
                        setHistoryPageSize(Number(val));
                        setHistoryPage(1);
                      },
                    })
                  }
                />
              </div>
            </div>

            {historyLoans.length === 0 ? (
              <div className="text-center p-12">
                <img
                  src="/images/empty-folder.png"
                  alt="No history"
                  className="mx-auto mb-3 h-24 w-24 object-contain"
                />
                <p className="text-sm font-semibold text-slate-700">No circulation history yet</p>
                <p className="text-xs text-slate-400 mt-1">Returned books and past loan activities will be listed here.</p>
              </div>
            ) : filteredHistoryLoans.length === 0 ? (
              <div className="text-center p-12">
                <img
                  src="/images/empty-folder.png"
                  alt="No history found"
                  className="mx-auto mb-3 h-24 w-24 object-contain"
                />
                <p className="text-sm font-semibold text-slate-800">No history records match the selected filters</p>
                <p className="text-xs text-slate-400 mt-1">Try clearing or changing your search criteria.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setHistorySearch("");
                    setHistoryBookFilter("ALL");
                    setHistoryCategoryFilter("ALL");
                    setHistoryStatusFilter("ALL");
                    setHistoryPaymentTypeFilter("ALL");
                  }}
                  className="mt-3 text-xs"
                >
                  Reset All Filters
                </Button>
              </div>
            ) : (
              <div className="overflow-hidden">
                {/* Desktop History Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50/90 text-slate-600 text-[11px] font-black uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3.5 px-3 text-center w-12">#</th>
                        <th className="px-4 py-3.5 whitespace-nowrap">Book Title</th>
                        <th className="px-4 py-3.5 whitespace-nowrap">Category</th>
                        <th className="px-4 py-3.5 whitespace-nowrap">Accession No</th>
                        <th className="px-4 py-3.5 whitespace-nowrap">Borrower Name</th>
                        <th className="px-4 py-3.5 whitespace-nowrap">Borrower ID / GR</th>
                        <th className="px-4 py-3.5 whitespace-nowrap">Issue Date</th>
                        <th className="px-4 py-3.5 whitespace-nowrap">Return Date</th>
                        <th className="px-4 py-3.5 whitespace-nowrap">Condition / Status</th>
                        <th className="px-4 py-3.5 whitespace-nowrap">Damage &amp; Late Fee</th>
                        <th className="px-4 py-3.5 whitespace-nowrap">Payment Mode</th>
                        <th className="px-4 py-3.5 whitespace-nowrap">Remarks</th>
                        <th className="px-4 py-3.5 whitespace-nowrap text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {paginatedHistoryLoans.map((item, idx) => {
                        const totalFine = Number(item.total_fine || item.late_fees || 0);
                        const paidFine = Number(item.fine_paid_amount || 0);
                        const dueFine = Math.max(0, totalFine - paidFine);

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                              {(historyPage - 1) * historyPageSize + idx + 1}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                  <BookOpen className="h-3.5 w-3.5" />
                                </div>
                                <span className="font-bold text-slate-900 text-sm">{toTitleCase(item.book_title)}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                {toTitleCase(item.book_category) || "General"}
                              </span>
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
                            <td className="px-4 py-3.5 whitespace-nowrap font-semibold text-slate-800">
                              {toTitleCase(item.staff_name || item.student_name || "Unknown")}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                                {item.staff ? `Staff #${item.staff}` : `GR: ${item.student_gr_no || "N/A"}`}
                              </span>
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
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-900 text-xs">Total: ₹{totalFine}</span>
                                    {item.is_fine_paid || dueFine <= 0 ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                                        <CheckCircle2 className="h-2.5 w-2.5" /> Paid
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200 px-1.5 py-0.5 rounded-full">
                                        Due: ₹{dueFine}
                                      </span>
                                    )}
                                  </div>
                                  {Number(item.damage_fees || 0) > 0 && (
                                    <span className="text-[10px] text-amber-700 font-bold block">
                                      Damage: ₹{item.damage_fees}
                                    </span>
                                  )}
                                  {Number(item.late_fees || 0) > 0 && (
                                    <span className="text-[10px] text-slate-500 font-medium block">
                                      Late: ₹{item.late_fees}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 font-mono text-xs bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                  ₹0 (No Fine)
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              {totalFine > 0 ? (
                                (item.payment_method || "").toLowerCase() === "cash" ? (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                                    <DollarSign className="h-3.5 w-3.5 text-emerald-600" /> Cash
                                  </span>
                                ) : ["online", "upi", "card"].includes((item.payment_method || "").toLowerCase()) ? (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
                                    <CreditCard className="h-3.5 w-3.5 text-indigo-600" /> Online
                                  </span>
                                ) : dueFine > 0 ? (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                    <Clock className="h-3.5 w-3.5 text-rose-500" /> Pending (Due)
                                  </span>
                                ) : (
                                  <span className="text-slate-500 text-xs font-semibold">
                                    {item.payment_method || "Settled"}
                                  </span>
                                )
                              ) : (
                                <span className="text-slate-400 text-xs">—</span>
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

                {/* Mobile Single Row View */}
                <div className="divide-y divide-slate-100 block md:hidden">
                  {paginatedHistoryLoans.map((item) => {
                    const totalFine = Number(item.total_fine || item.late_fees || 0);
                    const paidFine = Number(item.fine_paid_amount || 0);
                    const dueFine = Math.max(0, totalFine - paidFine);

                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedMobileHistory(item)}
                        className="p-3.5 bg-white hover:bg-slate-50 active:bg-slate-100 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-slate-900 text-sm truncate block">
                            {toTitleCase(item.book_title)}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                            <span>{toTitleCase(item.staff_name || item.student_name || "Unknown")}</span>
                            <span>•</span>
                            <span className="font-mono text-[11px]">{item.accession_no || "—"}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.status === "RETURNED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : item.status === "LOST"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {item.status}
                          </span>
                          {dueFine > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                              ₹{dueFine}
                            </span>
                          )}
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Superadmin Style Bottom Pagination */}
                <TablePagination
                  currentPage={historyPage}
                  totalItems={filteredHistoryLoans.length}
                  pageSize={historyPageSize}
                  onPageChange={setHistoryPage}
                  onPageSizeChange={setHistoryPageSize}
                  itemLabel="circulation records"
                />
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* MODAL: ADD / EDIT BOOK */}
      {showAddBookModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 overflow-hidden animate-in fade-in duration-150">
          <div className="bg-white rounded-none sm:rounded-3xl max-w-3xl lg:max-w-4xl w-full h-[100dvh] sm:h-auto sm:max-h-[92vh] flex flex-col border-0 sm:border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Fixed Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 shrink-0 bg-gradient-to-r from-slate-50 via-white to-blue-50/20">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => setShowAddBookModal(false)}
                  className="sm:hidden p-1.5 -ml-1 text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                  title="Back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="space-y-0.5 sm:space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="h-8 w-8 rounded-xl bg-blue-50 border border-blue-100 text-[#2563EB] flex items-center justify-center shrink-0">
                      <BookOpen className="h-4 w-4" />
                    </span>
                    <h2 className="text-base sm:text-xl font-bold text-slate-900 truncate">
                      {editingBook ? "Edit Book Master" : "Add New Book Master"}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 hidden sm:block pl-10">
                    Configure book catalogue details, storage rack locations, and generate unique physical copy barcodes.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddBookModal(false)}
                className="hidden sm:flex text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form with Scrollable Content Body */}
            <form noValidate onSubmit={handleSaveBook} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                {Object.keys(bookFormErrors).length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span className="font-semibold">Please correct the highlighted mandatory fields marked in red below.</span>
                  </div>
                )}

                {/* 1. Full-width Book Title */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-800">
                    Book Title <span className="text-rose-500">*</span>
                  </Label>
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
                    className={`h-10 text-sm rounded-xl transition-colors ${
                      bookFormErrors.title
                        ? "border-rose-500 bg-rose-50/20 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20"
                        : "border-slate-200"
                    }`}
                  />
                  {bookFormErrors.title && (
                    <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {bookFormErrors.title}
                    </p>
                  )}
                </div>

                {/* 2. Two-column layout: Author & Category / Subject */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-800">
                      Author <span className="text-rose-500">*</span>
                    </Label>
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
                      className={`h-10 text-sm rounded-xl transition-colors ${
                        bookFormErrors.author
                          ? "border-rose-500 bg-rose-50/20 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20"
                          : "border-slate-200"
                      }`}
                    />
                    {bookFormErrors.author && (
                      <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {bookFormErrors.author}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-800">
                      Category / Subject <span className="text-rose-500">*</span>
                    </Label>
                    <CategoryCombobox
                      value={bookForm.category}
                      onChange={(catName, catRefId) => {
                        setBookForm((prev) => ({
                          ...prev,
                          category: catName,
                          category_ref: catRefId ? String(catRefId) : "",
                        }));
                        if (bookFormErrors.category) {
                          setBookFormErrors((prev) => ({ ...prev, category: "" }));
                        }
                      }}
                      categories={categories}
                      allBookCategoryNames={categoryNames}
                      error={bookFormErrors.category}
                    />
                    {bookFormErrors.category && (
                      <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {bookFormErrors.category}
                      </p>
                    )}
                  </div>
                </div>

                {/* 3. Two-column layout: ISBN & Book Price */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-800">
                        ISBN (International Standard Book No)
                      </Label>
                      {bookForm.isbn?.trim() && !bookFormErrors.isbn && (
                        <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                          <Check className="h-3 w-3" /> Unique &amp; Available
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        value={bookForm.isbn}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBookForm((prev) => ({ ...prev, isbn: val }));
                          const errorMsg = checkIsbnDuplicate(val, editingBook?.id);
                          setBookFormErrors((prev) => {
                            const next = { ...prev };
                            if (errorMsg) {
                              next.isbn = errorMsg;
                            } else {
                              delete next.isbn;
                            }
                            return next;
                          });
                        }}
                        onBlur={() => {
                          if (bookForm.isbn) {
                            const errorMsg = checkIsbnDuplicate(bookForm.isbn, editingBook?.id);
                            if (errorMsg) {
                              setBookFormErrors((prev) => ({ ...prev, isbn: errorMsg }));
                            }
                          }
                        }}
                        placeholder="e.g. 978-3-16-148410-0"
                        className={`h-10 text-sm rounded-xl transition-all ${
                          bookFormErrors.isbn
                            ? "border-rose-500 bg-rose-50/30 text-rose-900 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20 pr-9"
                            : "border-slate-200 focus:border-indigo-500"
                        }`}
                      />
                      {bookFormErrors.isbn && (
                        <AlertCircle className="absolute right-3 top-3 h-4 w-4 text-rose-500 pointer-events-none" />
                      )}
                    </div>
                    {bookFormErrors.isbn && (
                      <p className="text-xs font-semibold text-rose-600 mt-1 flex items-start gap-1">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-rose-600" />
                        <span>{bookFormErrors.isbn}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-800">Book Price (₹)</Label>
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
                      className={`h-10 text-sm rounded-xl transition-colors ${
                        bookFormErrors.price
                          ? "border-rose-500 bg-rose-50/20 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20"
                          : "border-slate-200"
                      }`}
                    />
                    {bookFormErrors.price && (
                      <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {bookFormErrors.price}
                      </p>
                    )}
                  </div>
                </div>

                {/* 4. Two-column layout: Rack Location & Shelf Location with side-by-side Add buttons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Rack Location with Side-by-side Add Button */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-800">
                      Rack Location <span className="text-rose-500">*</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      {/* Desktop native select */}
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
                                ? shelves.some(
                                    (s) => String(s.rack) === String(newRack) && String(s.id) === String(prev.shelf)
                                  )
                                : false;
                            return {
                              ...prev,
                              rack: newRack,
                              shelf: isCurrentShelfInNewRack ? prev.shelf : "",
                            };
                          });
                        }}
                        className={`hidden md:flex flex-1 min-w-0 h-10 rounded-xl border px-3 text-sm transition-colors bg-white shadow-2xs ${
                          bookFormErrors.rack
                            ? "border-rose-500 bg-rose-50/20 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20"
                            : "border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        }`}
                      >
                        <option value="">{racks.length === 0 ? "-- No Racks Configured --" : "-- Select Rack --"}</option>
                        {racks
                          .filter((r) => r.is_active !== false || String(r.id) === String(bookForm.rack))
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.rack_code} - {r.rack_name} {r.is_active === false ? " (Deactivated)" : ""}
                            </option>
                          ))}
                      </select>

                      {/* Mobile Trigger opening Bottom Drawer */}
                      <MobileSelectTrigger
                        className={`flex-1 min-w-0 h-10 md:hidden ${
                          bookFormErrors.rack ? "border-rose-500 bg-rose-50/20" : ""
                        }`}
                        valueLabel={
                          bookForm.rack
                            ? (() => {
                                const found = racks.find((r) => String(r.id) === String(bookForm.rack));
                                return found ? `${found.rack_code} - ${found.rack_name}` : "-- Select Rack --";
                              })()
                            : racks.length === 0
                            ? "-- No Racks Configured --"
                            : "-- Select Rack --"
                        }
                        onClick={() =>
                          setActiveSelectDrawer({
                            title: "Select Rack Location",
                            subtitle: "Choose rack to place this book",
                            options: [
                              { label: "-- Select Rack --", value: "" },
                              ...racks
                                .filter((r) => r.is_active !== false || String(r.id) === String(bookForm.rack))
                                .map((r) => ({
                                  label: `${r.rack_code} - ${r.rack_name}${r.is_active === false ? " (Deactivated)" : ""}`,
                                  value: String(r.id),
                                })),
                            ],
                            selectedValue: String(bookForm.rack || ""),
                            onSelect: (val) => {
                              const newRack = String(val);
                              if (bookFormErrors.rack) {
                                setBookFormErrors((prev) => ({ ...prev, rack: "" }));
                              }
                              setBookForm((prev) => {
                                const isCurrentShelfInNewRack =
                                  newRack && prev.shelf
                                    ? shelves.some(
                                        (s) => String(s.rack) === String(newRack) && String(s.id) === String(prev.shelf)
                                      )
                                    : false;
                                return {
                                  ...prev,
                                  rack: newRack,
                                  shelf: isCurrentShelfInNewRack ? prev.shelf : "",
                                };
                              });
                            },
                          })
                        }
                      />
                      <Button
                        type="button"
                        onClick={() => openAddMasterModal("rack")}
                        className="h-10 px-3.5 shrink-0 bg-blue-50 hover:bg-blue-100 text-[#2563EB] border border-blue-200/80 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shadow-2xs transition-all cursor-pointer"
                        title="Add a new rack"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>+ Add Rack</span>
                      </Button>
                    </div>
                    {bookFormErrors.rack && (
                      <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {bookFormErrors.rack}
                      </p>
                    )}
                    {racks.length === 0 && !bookFormErrors.rack && (
                      <p className="text-[11px] font-medium text-amber-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" /> No library racks configured. Click &ldquo;+ Add Rack&rdquo; to set up your first rack.
                      </p>
                    )}
                  </div>

                  {/* Shelf Location with Side-by-side Add Button */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-800">
                      Shelf Location <span className="text-rose-500">*</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      {/* Desktop native select */}
                      <select
                        value={bookForm.shelf}
                        onChange={(e) => {
                          setBookForm({ ...bookForm, shelf: e.target.value });
                          if (bookFormErrors.shelf) {
                            setBookFormErrors((prev) => ({ ...prev, shelf: "" }));
                          }
                        }}
                        disabled={!bookForm.rack}
                        className={`hidden md:flex flex-1 min-w-0 h-10 rounded-xl border px-3 text-sm transition-colors bg-white shadow-2xs disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${
                          bookFormErrors.shelf
                            ? "border-rose-500 bg-rose-50/20 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20"
                            : "border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        }`}
                      >
                        {!bookForm.rack ? (
                          <option value="">-- Select Rack First --</option>
                        ) : (
                          <>
                            <option value="">
                              {shelves.filter((s) => String(s.rack) === String(bookForm.rack)).length === 0
                                ? "-- No Shelves in this Rack --"
                                : "-- Select Shelf --"}
                            </option>
                            {shelves
                              .filter(
                                (s) =>
                                  String(s.rack) === String(bookForm.rack) &&
                                  (s.is_active !== false || String(s.id) === String(bookForm.shelf))
                              )
                              .map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.shelf_code} ({s.shelf_name}) {s.is_active === false ? " (Deactivated)" : ""}
                                </option>
                              ))}
                          </>
                        )}
                      </select>

                      {/* Mobile Trigger opening Bottom Drawer */}
                      <MobileSelectTrigger
                        className={`flex-1 min-w-0 h-10 md:hidden ${
                          bookFormErrors.shelf ? "border-rose-500 bg-rose-50/20" : ""
                        } ${!bookForm.rack ? "opacity-60" : ""}`}
                        valueLabel={
                          !bookForm.rack
                            ? "-- Select Rack First --"
                            : bookForm.shelf
                            ? (() => {
                                const found = shelves.find((s) => String(s.id) === String(bookForm.shelf));
                                return found ? `${found.shelf_code} (${found.shelf_name})` : "-- Select Shelf --";
                              })()
                            : shelves.filter((s) => String(s.rack) === String(bookForm.rack)).length === 0
                            ? "-- No Shelves in this Rack --"
                            : "-- Select Shelf --"
                        }
                        onClick={() => {
                          if (!bookForm.rack) {
                            showToast("error", "Please select a rack location first.");
                            return;
                          }
                          const rackShelves = shelves.filter(
                            (s) =>
                              String(s.rack) === String(bookForm.rack) &&
                              (s.is_active !== false || String(s.id) === String(bookForm.shelf))
                          );
                          setActiveSelectDrawer({
                            title: "Select Shelf Location",
                            subtitle: "Choose shelf for book placement",
                            options: [
                              { label: "-- Select Shelf --", value: "" },
                              ...rackShelves.map((s) => ({
                                label: `${s.shelf_code} (${s.shelf_name})${s.is_active === false ? " (Deactivated)" : ""}`,
                                value: String(s.id),
                              })),
                            ],
                            selectedValue: String(bookForm.shelf || ""),
                            onSelect: (val) => {
                              setBookForm((prev) => ({ ...prev, shelf: String(val) }));
                              if (bookFormErrors.shelf) {
                                setBookFormErrors((prev) => ({ ...prev, shelf: "" }));
                              }
                            },
                          });
                        }}
                      />
                      <Button
                        type="button"
                        disabled={!bookForm.rack}
                        onClick={() => openAddMasterModal("shelf", Number(bookForm.rack))}
                        className="h-10 px-3.5 shrink-0 bg-blue-50 hover:bg-blue-100 text-[#2563EB] border border-blue-200/80 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shadow-2xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        title={!bookForm.rack ? "Select a rack first" : "Add a new shelf to the selected rack"}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>+ Add Shelf</span>
                      </Button>
                    </div>
                    {bookFormErrors.shelf && (
                      <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {bookFormErrors.shelf}
                      </p>
                    )}
                    {bookForm.rack &&
                      shelves.filter((s) => String(s.rack) === String(bookForm.rack)).length === 0 &&
                      !bookFormErrors.shelf && (
                        <p className="text-[11px] font-medium text-amber-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> Selected rack has no shelves yet. Click &ldquo;+ Add Shelf&rdquo; to add one.
                        </p>
                      )}
                  </div>
                </div>

                {/* 5. Two-column layout: Total Physical Copies & Edition/Year */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-800">
                      Total Physical Copies <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={500}
                      value={bookForm.total_copies}
                      onChange={(e) => {
                        setBookForm({ ...bookForm, total_copies: Number(e.target.value) });
                        if (bookFormErrors.total_copies) {
                          setBookFormErrors((prev) => ({ ...prev, total_copies: "" }));
                        }
                      }}
                      className={`h-10 text-sm rounded-xl transition-colors ${
                        bookFormErrors.total_copies
                          ? "border-rose-500 bg-rose-50/20 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20"
                          : "border-slate-200"
                      }`}
                    />
                    {bookFormErrors.total_copies ? (
                      <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {bookFormErrors.total_copies}
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400">
                        Generates unique sequential SBIN barcodes for each physical copy automatically.
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-800">Edition / Year (Optional)</Label>
                    <Input
                      value={bookForm.edition}
                      onChange={(e) => setBookForm({ ...bookForm, edition: e.target.value })}
                      onBlur={(e) => {
                        if (e.target.value.trim()) {
                          setBookForm((prev) => ({ ...prev, edition: toTitleCase(prev.edition) }));
                        }
                      }}
                      placeholder="e.g. 2nd Revised Edition 2024"
                      className="h-10 text-sm rounded-xl border-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Fixed Distinct Footer Area */}
              <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/90 flex items-center justify-end gap-2.5 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddBookModal(false)}
                  className="h-10 px-4 rounded-xl border-slate-200 text-slate-700 font-semibold hover:bg-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading}
                  className="h-10 px-6 rounded-xl font-bold bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-blue-800 text-white shadow-xs transition-all gap-1.5 cursor-pointer"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingBook ? "Update Book" : "Create Book & Generate Barcodes"}</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ISSUE BOOK */}
      {/* MODAL: ISSUE BOOK */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-none sm:rounded-2xl p-4 sm:p-6 max-w-2xl w-full h-[100dvh] sm:h-auto sm:max-h-[92vh] space-y-4 border-0 sm:border border-slate-200 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowIssueModal(false);
                    setSelectedStudentIds([]);
                  }}
                  className="sm:hidden p-1.5 -ml-1 text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                  title="Back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 truncate">
                    <BookOpen className="h-5 w-5 text-[#2563EB] shrink-0" />
                    Issue Book to Borrower
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
                    Lend physical copies to students or staff. Select multiple students at once if stock allows!
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowIssueModal(false);
                  setSelectedStudentIds([]);
                }}
                className="hidden sm:flex text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Direct Inline Error Alert */}
            {(issueErrors.general || issueErrors.non_field_errors || issueErrors.student || issueErrors.book || issueErrors.due_date) && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold">Issue Request Notice:</span>
                  <p>{issueErrors.general || issueErrors.non_field_errors || issueErrors.student || issueErrors.book || issueErrors.due_date}</p>
                </div>
              </div>
            )}

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
                    className="hidden md:block w-full h-10 rounded-xl border border-slate-200 px-3 text-xs sm:text-sm font-semibold bg-white text-slate-700 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors shadow-2xs"
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
                  <MobileSelectTrigger
                    className="w-full h-10 md:hidden"
                    label="Category"
                    valueLabel={issueCategoryFilter === "ALL" ? "All Categories" : issueCategoryFilter}
                    onClick={() =>
                      setActiveSelectDrawer({
                        title: "Book Category",
                        subtitle: "Filter available books by category",
                        options: [
                          { label: "All Categories", value: "ALL" },
                          ...categoryNames
                            .filter((c) => c !== "ALL")
                            .map((c) => ({ label: c, value: c })),
                        ],
                        selectedValue: issueCategoryFilter,
                        onSelect: (val) => {
                          const newCat = String(val);
                          setIssueCategoryFilter(newCat);
                          if (
                            selectedIssueBook &&
                            newCat !== "ALL" &&
                            toTitleCase(selectedIssueBook.category) !== newCat
                          ) {
                            setIssueForm((prev) => ({ ...prev, book: "" }));
                            setSelectedStudentIds([]);
                          }
                        },
                      })
                    }
                  />
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
                    className="hidden md:block h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-medium bg-white"
                  >
                    <option value="student">Student</option>
                    <option value="staff">Staff / Faculty</option>
                  </select>
                  <MobileSelectTrigger
                    className="w-full h-10 md:hidden"
                    label="Borrower Type"
                    valueLabel={borrowerType === "student" ? "Student" : "Staff / Faculty"}
                    onClick={() =>
                      setActiveSelectDrawer({
                        title: "Borrower Type",
                        subtitle: "Select who is borrowing the book",
                        options: [
                          { label: "Student", value: "student" },
                          { label: "Staff / Faculty", value: "staff" },
                        ],
                        selectedValue: borrowerType,
                        onSelect: (val) => {
                          setBorrowerType(val as "student" | "staff");
                          setIssueForm({ ...issueForm, student: "" });
                          setSelectedStudentIds([]);
                          setStudentSearchQuery("");
                          setStaffSearchQuery("");
                          setIsStudentDropdownOpen(false);
                          setIsStaffDropdownOpen(false);
                          if (issueErrors.student) setIssueErrors((prev) => ({ ...prev, student: "" }));
                        },
                      })
                    }
                  />
                </div>

                {borrowerType === "student" ? (
                  <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80">
                    {/* Header with Stock Counter */}
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-[#2563EB]" />
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
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2563EB] text-white text-xs font-semibold shadow-2xs animate-in zoom-in-95 duration-150"
                              >
                                <span>
                                  {stud.name} {stud.surname || ""}
                                </span>
                                <span className="text-[10px] text-blue-200 font-normal">
                                  ({stud.school_class_name || "Class"} {stud.division || ""})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedStudentIds((prev) => prev.filter((id) => id !== sId))}
                                  className="ml-1 hover:bg-white/20 rounded p-0.5 text-white transition-colors cursor-pointer"
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
                          className="hidden md:block w-full h-9 rounded-xl border border-slate-200 px-2.5 text-xs font-medium bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                        >
                          <option value="">-- All Classes ({availableClasses.length}) --</option>
                          {availableClasses.map((cls) => (
                            <option key={cls} value={cls}>
                              Class: {cls}
                            </option>
                          ))}
                        </select>
                        <MobileSelectTrigger
                          className="w-full h-9 md:hidden"
                          label="Class"
                          valueLabel={issueClassFilter ? `Class: ${issueClassFilter}` : "All Classes"}
                          onClick={() =>
                            setActiveSelectDrawer({
                              title: "Filter by Class",
                              subtitle: "Select class to filter students",
                              options: [
                                { label: "All Classes", value: "" },
                                ...availableClasses.map((cls) => ({ label: `Class: ${cls}`, value: cls })),
                              ],
                              selectedValue: issueClassFilter,
                              onSelect: (val) => {
                                setIssueClassFilter(String(val));
                                setIssueDivisionFilter("");
                              },
                            })
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-700">
                          Filter Division {issueClassFilter ? `(${issueClassFilter})` : ""}
                        </Label>
                        <select
                          value={issueDivisionFilter}
                          onChange={(e) => setIssueDivisionFilter(e.target.value)}
                          disabled={!issueClassFilter}
                          className={`hidden md:block w-full h-9 rounded-xl border px-2.5 text-xs font-medium transition-colors ${
                            !issueClassFilter
                              ? "bg-slate-100/70 border-slate-200 text-slate-400 cursor-not-allowed"
                              : "bg-white border-slate-200 text-slate-700 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
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
                        <MobileSelectTrigger
                          className={`w-full h-9 md:hidden ${!issueClassFilter ? "opacity-60" : ""}`}
                          label="Div"
                          valueLabel={
                            !issueClassFilter
                              ? "Select Class"
                              : issueDivisionFilter
                              ? `Div: ${issueDivisionFilter}`
                              : "All Divisions"
                          }
                          onClick={() => {
                            if (!issueClassFilter) {
                              showToast("error", "Please select a class first.");
                              return;
                            }
                            setActiveSelectDrawer({
                              title: `Divisions in Class ${issueClassFilter}`,
                              subtitle: "Select division to filter students",
                              options: [
                                { label: "All Divisions", value: "" },
                                ...availableDivisions.map((div) => ({ label: `Division ${div}`, value: div })),
                              ],
                              selectedValue: issueDivisionFilter,
                              onSelect: (val) => setIssueDivisionFilter(String(val)),
                            });
                          }}
                        />
                      </div>
                    </div>

                    {/* Student Direct Search Box */}
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-blue-500" />
                      <input
                        type="text"
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        placeholder="Search student by name, GR No, or Roll No..."
                        className="w-full pl-8 pr-7 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 bg-white"
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
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold cursor-pointer"
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

      {/* MODAL: RETURN BOOK WITH COMPREHENSIVE FINANCIAL CALCULATION */}
      {showReturnModal && (() => {
        const dueDateObj = showReturnModal.due_date ? new Date(showReturnModal.due_date) : new Date();
        const todayObj = new Date();
        const dDue = new Date(dueDateObj.getFullYear(), dueDateObj.getMonth(), dueDateObj.getDate());
        const dToday = new Date(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate());
        const graceDays = librarySettings?.grace_period_days ?? 0;
        const perDayRate = Number(librarySettings?.fine_per_day ?? 2);
        const msDiff = dToday.getTime() - dDue.getTime();
        const rawDaysDiff = Math.round(msDiff / (1000 * 60 * 60 * 24));
        const daysOverdue = Math.max(0, rawDaysDiff - graceDays);
        const calculatedLateFee = daysOverdue > 0 ? daysOverdue * perDayRate : 0;
        const assessedDamage = (returnForm.condition === "MINOR_DAMAGE" || returnForm.condition === "MAJOR_DAMAGE")
          ? Number(returnForm.damage_fee || 0)
          : 0;
        const assessedLost = returnForm.condition === "LOST"
          ? Number(returnForm.lost_fee || 0)
          : 0;
        const totalReturnFine = calculatedLateFee + assessedDamage + assessedLost;

        return (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-none sm:rounded-3xl p-4 sm:p-6 max-w-lg w-full h-[100dvh] sm:h-auto sm:my-auto space-y-4 border-0 sm:border border-slate-200 shadow-2xl overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => setShowReturnModal(null)}
                    className="sm:hidden p-1.5 -ml-1 text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                    title="Back"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">Return &amp; Book Inspection</h2>
                    <p className="text-xs text-slate-500 hidden sm:block">Counter verification, overdue analysis &amp; penalty settlement</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReturnModal(null)}
                  className="hidden sm:flex text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Direct Inline Error Alert */}
              {returnError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold">Return Processing Notice:</span>
                    <p>{returnError}</p>
                  </div>
                </div>
              )}

              {/* Borrower & Book Information Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 text-sm">{showReturnModal.book_title}</span>
                  <span className="font-mono text-[11px] font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200">
                    {showReturnModal.accession_no || `BC-${showReturnModal.book}`}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 pt-1 border-t border-slate-200/60">
                  <div className="font-semibold text-slate-800">
                    Borrower: <span className="text-indigo-600 font-bold">{toTitleCase(showReturnModal.staff_name || showReturnModal.student_name)}</span>
                  </div>
                  {(showReturnModal.student_gr_no || showReturnModal.staff) && (
                    <span className="font-mono text-slate-500 text-[11px]">
                      {showReturnModal.staff ? `Staff #${showReturnModal.staff}` : `GR: ${showReturnModal.student_gr_no}`}
                    </span>
                  )}
                  {showReturnModal.student_class && (
                    <span className="text-slate-500 text-[11px]">
                      • Class {showReturnModal.student_class} {showReturnModal.student_division ? `(${showReturnModal.student_division})` : ""}
                    </span>
                  )}
                </div>
              </div>

              {/* Dates & Overdue Timing Assessment Banner */}
              <div className="p-3.5 rounded-2xl border transition-all space-y-2.5 bg-white shadow-2xs">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Issued On</div>
                    <div className="font-mono font-semibold text-slate-700 mt-0.5">
                      {showReturnModal.book_issued_date ? new Date(showReturnModal.book_issued_date).toLocaleDateString() : "—"}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Due Date</div>
                    <div className="font-mono font-bold text-indigo-700 mt-0.5">
                      {new Date(showReturnModal.due_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Returned</div>
                    <div className="font-mono font-bold text-slate-900 mt-0.5">
                      Today ({todayObj.toLocaleDateString()})
                    </div>
                  </div>
                </div>

                {/* Overdue Timing Notice */}
                {daysOverdue > 0 ? (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Clock className="h-4 w-4 text-rose-600 shrink-0" />
                      <span>+{daysOverdue} Days Overdue</span>
                    </div>
                    <div className="font-mono font-black text-rose-700 text-sm">
                      Late Fine: ₹{calculatedLateFee.toFixed(2)}
                    </div>
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold">Returned On Time / Within Grace Period • Zero Late Fee</span>
                  </div>
                )}
              </div>

              {/* Physical Condition Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">Book Physical Condition on Return *</Label>
                <select
                  value={returnForm.condition}
                  onChange={(e) => {
                    const cond = e.target.value;
                    setReturnForm((prev) => ({
                      ...prev,
                      condition: cond,
                      damage_fee: cond === "MINOR_DAMAGE" || cond === "MAJOR_DAMAGE"
                        ? (Number(prev.damage_fee) > 0 ? prev.damage_fee : Number(librarySettings?.damage_penalty || 50))
                        : 0,
                      lost_fee: cond === "LOST"
                        ? (Number(prev.lost_fee) > 0 ? prev.lost_fee : Number(librarySettings?.lost_penalty || 100))
                        : 0,
                    }));
                  }}
                  className="hidden md:block w-full h-10 rounded-xl border border-slate-200 px-3 text-xs sm:text-sm font-semibold bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs"
                >
                  <option value="GOOD">Good Condition (No Physical Damage)</option>
                  <option value="MINOR_DAMAGE">Minor Damage (Torn pages / marked / cover bent)</option>
                  <option value="MAJOR_DAMAGE">Major Damage (Water damaged / spine broken / unusable)</option>
                  <option value="LOST">Lost Book (Unreturned copy declared lost)</option>
                </select>
                <MobileSelectTrigger
                  className="w-full h-10 md:hidden"
                  label="Condition"
                  valueLabel={
                    returnForm.condition === "GOOD"
                      ? "Good Condition (No Damage)"
                      : returnForm.condition === "MINOR_DAMAGE"
                      ? "Minor Damage (Torn/marked)"
                      : returnForm.condition === "MAJOR_DAMAGE"
                      ? "Major Damage (Unusable)"
                      : returnForm.condition === "LOST"
                      ? "Lost Book"
                      : "Select Condition"
                  }
                  onClick={() =>
                    setActiveSelectDrawer({
                      title: "Physical Book Condition",
                      subtitle: "Select physical state of returned book",
                      options: [
                        { label: "Good Condition (No Physical Damage)", value: "GOOD" },
                        { label: "Minor Damage (Torn pages / marked / cover bent)", value: "MINOR_DAMAGE" },
                        { label: "Major Damage (Water damaged / spine broken / unusable)", value: "MAJOR_DAMAGE" },
                        { label: "Lost Book (Unreturned copy declared lost)", value: "LOST" },
                      ],
                      selectedValue: returnForm.condition,
                      onSelect: (val) => {
                        const cond = String(val);
                        setReturnForm((prev) => ({
                          ...prev,
                          condition: cond,
                          damage_fee: cond === "MINOR_DAMAGE" || cond === "MAJOR_DAMAGE"
                            ? (Number(prev.damage_fee) > 0 ? prev.damage_fee : Number(librarySettings?.damage_penalty || 50))
                            : 0,
                          lost_fee: cond === "LOST"
                            ? (Number(prev.lost_fee) > 0 ? prev.lost_fee : Number(librarySettings?.lost_penalty || 100))
                            : 0,
                        }));
                      },
                    })
                  }
                />
              </div>

              {/* Condition Specific Damage / Lost Fee Inputs */}
              {(returnForm.condition === "MINOR_DAMAGE" || returnForm.condition === "MAJOR_DAMAGE") && (
                <div className="space-y-2 p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-amber-950">Assessed Physical Damage Cost (₹)</Label>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                      Standard: ₹{librarySettings?.damage_penalty || 50}
                    </span>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    value={returnForm.damage_fee}
                    onChange={(e) => setReturnForm({ ...returnForm, damage_fee: Number(e.target.value) })}
                    className="bg-white border-amber-300 font-bold text-slate-900"
                    placeholder="Enter assessed damage amount in ₹"
                  />
                </div>
              )}

              {returnForm.condition === "LOST" && (
                <div className="space-y-2 p-3.5 bg-rose-50/70 rounded-2xl border border-rose-200">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-rose-950">Lost Book Replacement Penalty (₹)</Label>
                    <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-300">
                      Standard: ₹{librarySettings?.lost_penalty || 100}
                    </span>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    value={returnForm.lost_fee}
                    onChange={(e) => setReturnForm({ ...returnForm, lost_fee: Number(e.target.value) })}
                    className="bg-white border-rose-300 font-bold text-slate-900"
                    placeholder="Enter replacement fee in ₹"
                  />
                </div>
              )}

              {/* Itemized Financial Assessment Ledger */}
              <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-200/80 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-indigo-950 uppercase tracking-wider">
                  <span>Return Financial Ledger</span>
                  <span className="text-[10px] font-mono lowercase text-indigo-600">rate: ₹{perDayRate}/day</span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Overdue Delay Penalty ({daysOverdue} days):</span>
                    <span className="font-mono font-bold text-slate-900">₹{calculatedLateFee.toFixed(2)}</span>
                  </div>
                  {assessedDamage > 0 && (
                    <div className="flex items-center justify-between text-amber-800">
                      <span>Condition Damage Cost:</span>
                      <span className="font-mono font-bold">₹{assessedDamage.toFixed(2)}</span>
                    </div>
                  )}
                  {assessedLost > 0 && (
                    <div className="flex items-center justify-between text-rose-800">
                      <span>Lost Book Replacement Fee:</span>
                      <span className="font-mono font-bold">₹{assessedLost.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-indigo-200/80 flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-900">Total Assessed Return Penalty:</span>
                    <span className="font-mono font-black text-indigo-700 text-base">₹{totalReturnFine.toFixed(2)}</span>
                  </div>
                </div>

                {/* Instant Fine Collection or Mark as Pending Due */}
                {totalReturnFine > 0 ? (
                  <div className="pt-3 border-t border-indigo-200/60 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={returnForm.pay_now}
                          onChange={(e) => setReturnForm({ ...returnForm, pay_now: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Collect Fine Now at Counter (Instant Settlement)</span>
                      </label>
                      {!returnForm.pay_now && (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-300">
                          Due (Unpaid)
                        </span>
                      )}
                    </div>

                    {returnForm.pay_now ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setReturnForm({ ...returnForm, payment_method: "Cash" })}
                            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all shadow-2xs ${
                              returnForm.payment_method === "Cash"
                                ? "bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-500/20"
                                : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40"
                            }`}
                          >
                            <DollarSign className="h-4 w-4" /> Cash Counter
                          </button>
                          <button
                            type="button"
                            onClick={() => setReturnForm({ ...returnForm, payment_method: "Online" })}
                            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all shadow-2xs ${
                              returnForm.payment_method === "Online"
                                ? "bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-500/20"
                                : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40"
                            }`}
                          >
                            <CreditCard className="h-4 w-4" /> Online / UPI
                          </button>
                        </div>
                        <p className="text-[11px] text-emerald-800 font-medium">
                          Collect ₹{totalReturnFine.toFixed(2)} via {returnForm.payment_method}. Official receipt will be generated automatically.
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-rose-700 font-medium">
                        ₹{totalReturnFine.toFixed(2)} will be recorded as Outstanding Due under borrower's account.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="pt-2 border-t border-indigo-200/60 text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Book returned in good standing with zero financial liability.
                  </div>
                )}
              </div>

              {/* Remarks */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Inspector Remarks (Optional)</Label>
                <Input
                  value={returnForm.remarks}
                  onChange={(e) => setReturnForm({ ...returnForm, remarks: e.target.value })}
                  placeholder="e.g. Returned on time, pages verified"
                  className="bg-white text-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowReturnModal(null)}
                  disabled={actionLoading}
                  className="text-xs rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleFinalizeReturn}
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl px-4 shadow-sm"
                >
                  {actionLoading ? "Processing Return..." : (totalReturnFine > 0 && returnForm.pay_now ? `Collect ₹${totalReturnFine.toFixed(2)} & Complete Return` : "Complete Return")}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: BOOK COPIES & BARCODES */}
      <ManageCopiesModal
        isOpen={!!showCopiesModal}
        onClose={() => setShowCopiesModal(null)}
        book={showCopiesModal}
        copies={bookCopiesList}
        racks={racks}
        shelves={shelves}
        actionLoading={actionLoading}
        onGenerateCopies={async (count, rackId, shelfId) => {
          if (!showCopiesModal) return;
          setActionLoading(true);
          try {
            await generateBookCopies({
              book_id: showCopiesModal.id,
              count: Number(count),
              rack_id: rackId ? Number(rackId) : null,
              shelf_id: shelfId ? Number(shelfId) : null,
            });
            showToast("success", `${count} physical copy barcode(s) generated!`);
            const updatedCopies = await getBookCopies(showCopiesModal.id);
            setBookCopiesList(updatedCopies);
            await loadAllData();
          } catch (err: any) {
            showToast("error", err.message || "Failed to generate copies.");
          } finally {
            setActionLoading(false);
          }
        }}
        onChangeStatus={handleChangeCopyStatus}
        onTransferClick={(copy) => {
          setTransferCopyModal(copy);
          setTransferForm({
            rack_id: copy.rack ? String(copy.rack) : "",
            shelf_id: copy.shelf ? String(copy.shelf) : "",
          });
        }}
        onDisposeClick={handleDisposeCopy}
        onPrintSticker={(copy) => {
          setPrintStickerModal({
            isOpen: true,
            copy,
            book: showCopiesModal,
          });
        }}
        onPrintAllBarcodes={(b, cps) => {
          setPrintStickerModal({
            isOpen: true,
            book: b,
            allCopies: cps,
          });
        }}
      />

      {/* MODAL: ADD MASTER */}
      {showMasterModal && (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-none sm:rounded-2xl p-4 sm:p-6 max-w-sm w-full h-[100dvh] sm:h-auto space-y-4 border-0 sm:border border-slate-200 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => setShowMasterModal(null)}
                  className="sm:hidden p-1.5 -ml-1 text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                  title="Back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <h2 className="text-base font-bold text-slate-900 capitalize truncate">
                  {editingMaster ? "Edit" : "Add New"}{" "}
                  {showMasterModal === "rack" ? "Library Rack(s)" : showMasterModal === "shelf" ? "Rack Shelf / Shelves" : showMasterModal}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowMasterModal(null)}
                className="hidden sm:flex text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
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
                    className={`hidden md:block w-full h-9 rounded-md border text-xs px-2 transition-colors ${
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
                  <MobileSelectTrigger
                    className={`w-full h-9 md:hidden ${masterErrors.extra ? "border-rose-500 bg-rose-50/20" : ""}`}
                    label="Rack"
                    valueLabel={
                      masterForm.extra
                        ? (() => {
                            const found = racks.find((r) => String(r.id) === String(masterForm.extra));
                            return found ? `${found.rack_code} - ${found.rack_name}` : "-- Choose Rack --";
                          })()
                        : "-- Choose Rack --"
                    }
                    onClick={() =>
                      setActiveSelectDrawer({
                        title: "Parent Rack",
                        subtitle: "Select rack for this shelf",
                        options: [
                          { label: "-- Choose Rack --", value: "" },
                          ...racks.map((r) => ({ label: `${r.rack_code} - ${r.rack_name}`, value: String(r.id) })),
                        ],
                        selectedValue: String(masterForm.extra || ""),
                        onSelect: (val) => {
                          setMasterForm((prev) => ({ ...prev, extra: String(val) }));
                          if (masterErrors.extra) setMasterErrors((prev) => ({ ...prev, extra: "" }));
                        },
                      })
                    }
                  />
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
                <Button type="submit" size="sm" disabled={actionLoading} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium cursor-pointer">
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
      {finePaymentModal && (() => {
        const modalLate = Number(finePaymentModal.late_fees || 0);
        const modalDamage = Number(finePaymentModal.damage_fees || 0);
        const modalLost = Number(finePaymentModal.lost_fees || 0);
        const modalExplicitTotal = Number(finePaymentModal.total_fine || 0);
        const modalTotal = modalExplicitTotal > 0 ? modalExplicitTotal : (modalLate + modalDamage + modalLost);
        const modalPaid = Number(finePaymentModal.fine_paid_amount || 0);
        const modalRemaining = finePaymentModal.fine_remaining !== undefined && finePaymentModal.fine_remaining !== null && Number(finePaymentModal.fine_remaining) > 0
          ? Number(finePaymentModal.fine_remaining)
          : Math.max(0, modalTotal - modalPaid);

        return (
          <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-none sm:rounded-3xl p-4 sm:p-7 max-w-lg w-full h-[100dvh] sm:h-auto sm:my-auto space-y-4 sm:space-y-5 border-0 sm:border border-slate-200 shadow-2xl relative overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 sm:pb-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => setFinePaymentModal(null)}
                    className="sm:hidden p-1.5 -ml-1 text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                    title="Back"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div className="h-9 sm:h-10 w-9 sm:w-10 rounded-2xl bg-blue-50 border border-blue-100 text-[#2563EB] flex items-center justify-center shadow-xs shrink-0">
                    <Receipt className="h-4 sm:h-5 w-4 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">Collect Library Fine</h2>
                    <p className="text-xs text-slate-500 hidden sm:block">Record counter payment, clear student dues & issue digital receipt</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFinePaymentModal(null)}
                  className="hidden sm:flex text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* INLINE ERROR BANNER IF ANY */}
              {finePaymentError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold">Payment Error:</span>
                    <p>{finePaymentError}</p>
                  </div>
                </div>
              )}

              {/* Borrower & Loan Details Card */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                      {(finePaymentModal.student_name || finePaymentModal.staff_name || "B").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        {toTitleCase(finePaymentModal.student_name || finePaymentModal.staff_name || "Borrower")}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {finePaymentModal.student_gr_no ? `GR No: ${finePaymentModal.student_gr_no}` : finePaymentModal.staff ? `Staff ID: ${finePaymentModal.staff}` : "Library Member"}
                        {finePaymentModal.student_class ? ` • ${finePaymentModal.student_class} ${finePaymentModal.student_division || ""}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                    finePaymentModal.condition_on_return === "LOST"
                      ? "bg-rose-100 text-rose-800 border border-rose-200"
                      : finePaymentModal.condition_on_return === "MAJOR_DAMAGE"
                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                      : "bg-blue-100 text-blue-800 border border-blue-200"
                  }`}>
                    {finePaymentModal.condition_on_return || finePaymentModal.status}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <BookOpen className="h-3.5 w-3.5 text-indigo-500" />
                    <span className="font-semibold text-slate-800">{finePaymentModal.book_title}</span>
                  </div>
                  {finePaymentModal.accession_no && (
                    <span className="font-mono text-[11px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      Acc: {finePaymentModal.accession_no}
                    </span>
                  )}
                </div>
              </div>

              {/* Itemized Assessment Breakdown Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Fine Assessment Breakdown</div>
                
                {modalLate > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Late Return Fee:</span>
                    <span className="font-mono font-bold text-slate-800">₹{modalLate.toFixed(2)}</span>
                  </div>
                )}
                {modalDamage > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Physical Damage Penalty:</span>
                    <span className="font-mono font-bold text-amber-800">₹{modalDamage.toFixed(2)}</span>
                  </div>
                )}
                {modalLost > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Lost Book Replacement Fee:</span>
                    <span className="font-mono font-bold text-rose-800">₹{modalLost.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600 border-t border-slate-200 pt-2 font-medium">
                  <span>Total Assessed Penalty:</span>
                  <span className="font-mono font-bold text-slate-900">₹{modalTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Previously Settled / Paid:</span>
                  <span className="font-mono font-bold">₹{modalPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center bg-rose-50 p-2.5 rounded-xl border border-rose-200 text-rose-800 font-bold mt-1">
                  <span className="text-xs">Outstanding Balance Due:</span>
                  <span className="font-mono text-base font-black">₹{modalRemaining.toFixed(2)}</span>
                </div>
              </div>

              <form noValidate onSubmit={handleSubmitPayFine} className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-800">Payment Collection Amount (₹) *</Label>
                    <button
                      type="button"
                      onClick={() => {
                        setFinePaymentForm({ ...finePaymentForm, amount: modalRemaining.toFixed(2) });
                        if (finePaymentError) setFinePaymentError("");
                      }}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      Fill Full Balance (₹{modalRemaining.toFixed(2)})
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="1"
                      max={modalRemaining}
                      value={finePaymentForm.amount}
                      onChange={(e) => {
                        setFinePaymentForm({ ...finePaymentForm, amount: e.target.value });
                        if (finePaymentError) setFinePaymentError("");
                      }}
                      className={`pl-8 h-11 text-base font-bold rounded-xl ${
                        finePaymentError
                          ? "border-rose-500 bg-rose-50/40 text-slate-900 focus-visible:ring-rose-200"
                          : "border-slate-200 bg-white"
                      }`}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">Supports partial settlement or full fee clearance.</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">Payment Collection Mode *</Label>
                  <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setFinePaymentForm({ ...finePaymentForm, payment_method: "Cash" })}
                      className={`flex items-center justify-center gap-2 py-3 px-3.5 rounded-2xl border text-xs font-bold transition-all ${
                        finePaymentForm.payment_method === "Cash"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/20"
                          : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50"
                      }`}
                    >
                      <DollarSign className="h-4 w-4" />
                      <span>Cash Counter</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFinePaymentForm({ ...finePaymentForm, payment_method: "Online" })}
                      className={`flex items-center justify-center gap-2 py-3 px-3.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                        finePaymentForm.payment_method === "Online"
                          ? "bg-[#2563EB] text-white border-[#2563EB] shadow-sm ring-2 ring-blue-500/20"
                          : "bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50"
                      }`}
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>Online / UPI</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200/80">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFinePaymentModal(null)}
                    className="rounded-xl px-4 text-xs font-bold h-10 text-slate-600 border-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={actionLoading || Number(finePaymentForm.amount) <= 0}
                    className="rounded-xl px-5 text-xs font-bold h-10 bg-[#2563EB] hover:bg-[#1D4ED8] text-white gap-2 shadow-xs cursor-pointer"
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
                    <span>Collect ₹{Number(finePaymentForm.amount || 0).toFixed(2)} & Print Receipt</span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL: PRINTABLE RECEIPT */}
      <LibraryFineReceiptModal
        isOpen={!!receiptModal}
        onClose={() => setReceiptModal(null)}
        receiptData={receiptModal}
      />

      {/* MODAL: TRANSFER PHYSICAL COPY */}
      {transferCopyModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-none sm:rounded-2xl p-4 sm:p-6 max-w-sm w-full h-[100dvh] sm:h-auto space-y-4 border-0 sm:border border-slate-200 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => setTransferCopyModal(null)}
                  className="sm:hidden p-1.5 -ml-1 text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                  title="Back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-slate-900 truncate">Transfer Book Copy</h2>
                  <p className="text-xs font-mono text-slate-500 truncate">Accession: {transferCopyModal.accession_no}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTransferCopyModal(null)}
                className="hidden sm:flex text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form noValidate onSubmit={handleTransferCopy} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Target Rack</Label>
                <select
                  value={transferForm.rack_id}
                  onChange={(e) => setTransferForm({ ...transferForm, rack_id: e.target.value, shelf_id: "" })}
                  className="hidden md:block w-full h-9 rounded-md border border-slate-200 text-xs px-2 bg-white"
                >
                  <option value="">-- No Rack --</option>
                  {racks
                    .filter((r) => r.is_active !== false || String(r.id) === String(transferForm.rack_id))
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.rack_code} — {r.rack_name} {r.is_active === false ? " (Deactivated)" : ""}
                      </option>
                    ))}
                </select>
                <MobileSelectTrigger
                  className="w-full h-9 md:hidden"
                  label="Rack"
                  valueLabel={
                    transferForm.rack_id
                      ? (() => {
                          const found = racks.find((r) => String(r.id) === String(transferForm.rack_id));
                          return found ? `${found.rack_code} — ${found.rack_name}` : "-- No Rack --";
                        })()
                      : "-- No Rack --"
                  }
                  onClick={() =>
                    setActiveSelectDrawer({
                      title: "Target Rack",
                      subtitle: "Select target rack location",
                      options: [
                        { label: "-- No Rack --", value: "" },
                        ...racks
                          .filter((r) => r.is_active !== false || String(r.id) === String(transferForm.rack_id))
                          .map((r) => ({
                            label: `${r.rack_code} — ${r.rack_name}${r.is_active === false ? " (Deactivated)" : ""}`,
                            value: String(r.id),
                          })),
                      ],
                      selectedValue: String(transferForm.rack_id || ""),
                      onSelect: (val) => setTransferForm({ ...transferForm, rack_id: String(val), shelf_id: "" }),
                    })
                  }
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Target Shelf</Label>
                <select
                  value={transferForm.shelf_id}
                  onChange={(e) => setTransferForm({ ...transferForm, shelf_id: e.target.value })}
                  disabled={!transferForm.rack_id}
                  className="hidden md:block w-full h-9 rounded-md border border-slate-200 text-xs px-2 bg-white disabled:bg-slate-50 disabled:text-slate-400"
                >
                  {!transferForm.rack_id ? (
                    <option value="">-- Select Rack First --</option>
                  ) : (
                    <>
                      <option value="">-- No Shelf --</option>
                      {shelves
                        .filter(
                          (s) =>
                            String(s.rack) === String(transferForm.rack_id) &&
                            (s.is_active !== false || String(s.id) === String(transferForm.shelf_id))
                        )
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.shelf_code} ({s.shelf_name}) {s.is_active === false ? " (Deactivated)" : ""}
                          </option>
                        ))}
                    </>
                  )}
                </select>
                <MobileSelectTrigger
                  className={`w-full h-9 md:hidden ${!transferForm.rack_id ? "opacity-60" : ""}`}
                  label="Shelf"
                  valueLabel={
                    !transferForm.rack_id
                      ? "-- Select Rack First --"
                      : transferForm.shelf_id
                      ? (() => {
                          const found = shelves.find((s) => String(s.id) === String(transferForm.shelf_id));
                          return found ? `${found.shelf_code} (${found.shelf_name})` : "-- No Shelf --";
                        })()
                      : "-- No Shelf --"
                  }
                  onClick={() => {
                    if (!transferForm.rack_id) {
                      showToast("error", "Please select a target rack first.");
                      return;
                    }
                    const rackShelves = shelves.filter(
                      (s) =>
                        String(s.rack) === String(transferForm.rack_id) &&
                        (s.is_active !== false || String(s.id) === String(transferForm.shelf_id))
                    );
                    setActiveSelectDrawer({
                      title: "Target Shelf",
                      subtitle: "Select shelf in target rack",
                      options: [
                        { label: "-- No Shelf --", value: "" },
                        ...rackShelves.map((s) => ({
                          label: `${s.shelf_code} (${s.shelf_name})${s.is_active === false ? " (Deactivated)" : ""}`,
                          value: String(s.id),
                        })),
                      ],
                      selectedValue: String(transferForm.shelf_id || ""),
                      onSelect: (val) => setTransferForm({ ...transferForm, shelf_id: String(val) }),
                    });
                  }}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setTransferCopyModal(null)} className="cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={actionLoading} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer">
                  Transfer Location
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REUSABLE CUSTOM DELETE CONFIRMATION MODAL */}
      <ConfirmDeleteModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        itemName={confirmModal.itemName}
        itemType={confirmModal.itemType}
        description={confirmModal.description}
        consequences={confirmModal.consequences}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        isDestructive={confirmModal.isDestructive}
      />

      {/* BARCODE STICKERS & LABELS PRINT MODAL */}
      <PrintBarcodeStickerModal
        isOpen={printStickerModal.isOpen}
        onClose={() => setPrintStickerModal((prev) => ({ ...prev, isOpen: false }))}
        copy={printStickerModal.copy}
        book={printStickerModal.book}
        allCopies={printStickerModal.allCopies}
      />

      {/* ================= MOBILE BOTTOM DRAWERS ================= */}
      {/* 1. Mobile Book Drawer */}
      <MobileBottomDrawer
        isOpen={!!selectedMobileBook}
        onClose={() => setSelectedMobileBook(null)}
        title={selectedMobileBook ? toTitleCase(selectedMobileBook.title) : ""}
        subtitle={selectedMobileBook?.subtitle ? toTitleCase(selectedMobileBook.subtitle) : undefined}
        badge={
          selectedMobileBook ? (
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-black ${
                selectedMobileBook.available_copies > 0
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              {selectedMobileBook.available_copies > 0
                ? `${selectedMobileBook.available_copies} / ${selectedMobileBook.total_copies} Available`
                : "Out of Stock"}
            </span>
          ) : undefined
        }
        actions={
          selectedMobileBook && (
            <div className="flex flex-col gap-2 w-full">
              {selectedMobileBook.available_copies > 0 && (
                <Button
                  onClick={() => {
                    const b = selectedMobileBook;
                    setSelectedMobileBook(null);
                    setIssueForm({
                      book: String(b.id),
                      book_copy: "",
                      student: "",
                      due_date: new Date(Date.now() + (settingsForm.issue_duration_days || 14) * 86400000)
                        .toISOString()
                        .split("T")[0],
                    });
                    setShowIssueModal(true);
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 rounded-xl gap-1.5"
                >
                  <ArrowRightLeft className="h-4 w-4" /> Issue This Book
                </Button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={async () => {
                    const b = selectedMobileBook;
                    setSelectedMobileBook(null);
                    setShowCopiesModal(b);
                    try {
                      const copies = await getBookCopies(b.id);
                      setBookCopiesList(copies);
                    } catch {
                      setBookCopiesList([]);
                    }
                  }}
                  className="text-xs h-9 font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-xl gap-1"
                >
                  <QrCode className="h-3.5 w-3.5" /> Copies ({selectedMobileBook.total_copies})
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    const b = selectedMobileBook;
                    setSelectedMobileBook(null);
                    try {
                      const copies = await getBookCopies(b.id);
                      setPrintStickerModal({
                        isOpen: true,
                        book: b,
                        allCopies: copies,
                      });
                    } catch {
                      setPrintStickerModal({
                        isOpen: true,
                        book: b,
                        allCopies: [],
                      });
                    }
                  }}
                  className="text-xs h-9 font-bold border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl gap-1"
                >
                  <Printer className="h-3.5 w-3.5" /> Stickers
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const b = selectedMobileBook;
                    setSelectedMobileBook(null);
                    setEditingBook(b);
                    setBookFormErrors({});
                    setBookForm({
                      title: toTitleCase(b.title),
                      subtitle: toTitleCase(b.subtitle || ""),
                      isbn: b.isbn || "",
                      author: toTitleCase(b.author),
                      category: toTitleCase(b.category),
                      category_ref: b.category_ref ? String(b.category_ref) : "",
                      author_ref: b.author_ref ? String(b.author_ref) : "",
                      rack: b.rack ? String(b.rack) : "",
                      shelf: b.shelf ? String(b.shelf) : "",
                      edition: toTitleCase(b.edition || ""),
                      publication_year: b.publication_year || new Date().getFullYear(),
                      language: b.language || "English",
                      pages: Number(b.pages) || 200,
                      price: Number(b.price) || 150,
                      total_copies: Number(b.total_copies) || 1,
                      description: b.description || "",
                    });
                    setShowAddBookModal(true);
                  }}
                  className="text-xs h-9 font-bold border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl gap-1"
                >
                  <Edit className="h-3.5 w-3.5" /> Edit Details
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const b = selectedMobileBook;
                    setSelectedMobileBook(null);
                    handleDeleteBook(b);
                  }}
                  className="text-xs h-9 font-bold border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </div>
          )
        }
      >
        {selectedMobileBook && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">Author</p>
                <p className="text-xs font-bold text-slate-900 mt-0.5">{toTitleCase(selectedMobileBook.author)}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">Category</p>
                <p className="text-xs font-bold text-indigo-700 mt-0.5">{toTitleCase(selectedMobileBook.category) || "General"}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">ISBN / Barcode</p>
                <p className="text-xs font-mono font-bold text-slate-800 mt-0.5">{selectedMobileBook.isbn || "—"}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">Price</p>
                <p className="text-xs font-bold text-slate-900 mt-0.5">₹{selectedMobileBook.price}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">Physical Rack</p>
                <p className="text-xs font-bold text-amber-800 mt-0.5">
                  {selectedMobileBook.rack_code ? `Rack ${selectedMobileBook.rack_code}` : "Unassigned"}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">Shelf Location</p>
                <p className="text-xs font-bold text-slate-700 mt-0.5">
                  {selectedMobileBook.shelf_code ? `Shelf ${selectedMobileBook.shelf_code}` : "Unassigned"}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">Edition / Year</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">
                  {selectedMobileBook.edition || "1st"} • {selectedMobileBook.publication_year || "—"}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">Language / Pages</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">
                  {selectedMobileBook.language || "English"} • {selectedMobileBook.pages || 0} pgs
                </p>
              </div>
            </div>
            {selectedMobileBook.description && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">Book Overview / Synopsis</p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{selectedMobileBook.description}</p>
              </div>
            )}
          </div>
        )}
      </MobileBottomDrawer>

      {/* 2. Mobile Loan Drawer */}
      <MobileBottomDrawer
        isOpen={!!selectedMobileLoan}
        onClose={() => setSelectedMobileLoan(null)}
        title={selectedMobileLoan ? toTitleCase(selectedMobileLoan.book_title) : ""}
        subtitle={selectedMobileLoan ? `Accession: ${selectedMobileLoan.accession_no || `BC-${selectedMobileLoan.book}`}` : undefined}
        badge={
          selectedMobileLoan ? (
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-black ${
                new Date(selectedMobileLoan.due_date) < new Date()
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : "bg-indigo-50 text-indigo-700 border border-indigo-200"
              }`}
            >
              {new Date(selectedMobileLoan.due_date) < new Date() ? "Overdue" : "Active Loan"}
            </span>
          ) : undefined
        }
        actions={
          selectedMobileLoan && (
            <div className="flex flex-col gap-2 w-full">
              <Button
                onClick={() => {
                  const loan = selectedMobileLoan;
                  setSelectedMobileLoan(null);
                  setShowReturnModal(loan);
                  setReturnForm({
                    condition: "GOOD",
                    remarks: "",
                    damage_fee: Number(librarySettings?.damage_penalty || 50),
                    lost_fee: Number(librarySettings?.lost_penalty || 100),
                    pay_now: true,
                    payment_method: "Cash",
                  });
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 rounded-xl gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" /> Return / Check-In Book
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const loan = selectedMobileLoan;
                    setSelectedMobileLoan(null);
                    handleRenewBook(loan.id);
                  }}
                  className="text-xs h-9 font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-xl gap-1"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Renew ({Math.max(0, (librarySettings?.max_renewal_count || 2) - (selectedMobileLoan.renewal_count || 0))} left)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const loan = selectedMobileLoan;
                    setSelectedMobileLoan(null);
                    handleMarkLost(loan.id, loan.book_title);
                  }}
                  className="text-xs h-9 font-bold border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Report Lost
                </Button>
              </div>
            </div>
          )
        }
      >
        {selectedMobileLoan && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">Borrower</p>
                <p className="text-xs font-bold text-slate-900 mt-0.5">
                  {toTitleCase(selectedMobileLoan.staff_name || selectedMobileLoan.student_name || "Unknown")}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  {selectedMobileLoan.staff ? `Staff #${selectedMobileLoan.staff}` : `GR: ${selectedMobileLoan.student_gr_no || "N/A"}`}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">Accession No</p>
                <p className="text-xs font-mono font-bold text-indigo-700 mt-0.5">
                  {selectedMobileLoan.accession_no || `BC-${selectedMobileLoan.book}`}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">Issued On</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">
                  {new Date(selectedMobileLoan.book_issued_date).toLocaleDateString("en-GB")}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">Due Date</p>
                <p className={`text-xs font-bold mt-0.5 ${new Date(selectedMobileLoan.due_date) < new Date() ? "text-rose-600" : "text-slate-800"}`}>
                  {new Date(selectedMobileLoan.due_date).toLocaleDateString("en-GB")}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">Total / Late Fine</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">
                  ₹{selectedMobileLoan.total_fine || selectedMobileLoan.late_fees || 0}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">Renewal Times</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">
                  {selectedMobileLoan.renewal_count || 0} / {librarySettings?.max_renewal_count || 2}
                </p>
              </div>
            </div>
          </div>
        )}
      </MobileBottomDrawer>

      {/* 3. Mobile History Drawer */}
      <MobileBottomDrawer
        isOpen={!!selectedMobileHistory}
        onClose={() => setSelectedMobileHistory(null)}
        title={selectedMobileHistory ? toTitleCase(selectedMobileHistory.book_title) : ""}
        subtitle={selectedMobileHistory ? `Accession: ${selectedMobileHistory.accession_no || `BC-${selectedMobileHistory.book}`}` : undefined}
        badge={
          selectedMobileHistory ? (
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-black ${
                selectedMobileHistory.status === "RETURNED"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : selectedMobileHistory.status === "LOST"
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              {selectedMobileHistory.condition_on_return || selectedMobileHistory.status}
            </span>
          ) : undefined
        }
        actions={
          selectedMobileHistory && (
            <div className="flex flex-col gap-2 w-full">
              {Math.max(0, Number(selectedMobileHistory.total_fine || selectedMobileHistory.late_fees || 0) - Number(selectedMobileHistory.fine_paid_amount || 0)) > 0 ? (
                <Button
                  onClick={() => {
                    const h = selectedMobileHistory;
                    setSelectedMobileHistory(null);
                    handleOpenPayFine(h);
                  }}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-10 rounded-xl gap-1.5"
                >
                  <DollarSign className="h-4 w-4" /> Collect Fine (₹{Math.max(0, Number(selectedMobileHistory.total_fine || selectedMobileHistory.late_fees || 0) - Number(selectedMobileHistory.fine_paid_amount || 0))})
                </Button>
              ) : selectedMobileHistory.is_fine_paid && selectedMobileHistory.payment_receipt_no ? (
                <Button
                  onClick={() => {
                    const h = selectedMobileHistory;
                    setSelectedMobileHistory(null);
                    setReceiptModal({
                      detail: "Paid",
                      receipt_no: h.payment_receipt_no || "",
                      amount_paid: String(h.fine_paid_amount || h.total_fine || 0),
                      remaining_due: "0.00",
                      is_fine_paid: true,
                      record: h,
                    });
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-10 rounded-xl gap-1.5"
                >
                  <Receipt className="h-4 w-4" /> View Payment Receipt
                </Button>
              ) : null}
            </div>
          )
        }
      >
        {selectedMobileHistory && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">Borrower</p>
                <p className="text-xs font-bold text-slate-900 mt-0.5">
                  {toTitleCase(selectedMobileHistory.staff_name || selectedMobileHistory.student_name || "Unknown")}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  {selectedMobileHistory.staff ? `Staff #${selectedMobileHistory.staff}` : `GR: ${selectedMobileHistory.student_gr_no || "N/A"}`}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">Condition on Return</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">
                  {selectedMobileHistory.condition_on_return || selectedMobileHistory.status}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">Issued On</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">
                  {selectedMobileHistory.book_issued_date ? new Date(selectedMobileHistory.book_issued_date).toLocaleDateString("en-GB") : "—"}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">Returned On</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">
                  {selectedMobileHistory.actual_return_date ? new Date(selectedMobileHistory.actual_return_date).toLocaleDateString("en-GB") : "Not Returned"}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">Total Fine</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">
                  ₹{Number(selectedMobileHistory.total_fine || selectedMobileHistory.late_fees || 0)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">Payment Status</p>
                <p className={`text-xs font-bold mt-0.5 ${selectedMobileHistory.is_fine_paid ? "text-emerald-600" : "text-amber-600"}`}>
                  {selectedMobileHistory.is_fine_paid ? `Paid (₹${selectedMobileHistory.fine_paid_amount || 0})` : "Unpaid / Exempt"}
                </p>
              </div>
            </div>
            {selectedMobileHistory.remarks && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">Staff Return Remarks</p>
                <p className="text-xs text-slate-600 mt-0.5">{selectedMobileHistory.remarks}</p>
              </div>
            )}
          </div>
        )}
      </MobileBottomDrawer>

      {/* 4. Mobile Reservation Drawer */}
      <MobileBottomDrawer
        isOpen={!!selectedMobileReservation}
        onClose={() => setSelectedMobileReservation(null)}
        title={selectedMobileReservation ? toTitleCase(selectedMobileReservation.book_title) : ""}
        subtitle={selectedMobileReservation ? `Student: ${selectedMobileReservation.student_name}` : undefined}
        badge={
          selectedMobileReservation ? (
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-black ${
                selectedMobileReservation.status === "AVAILABLE"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : selectedMobileReservation.status === "WAITING"
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              {selectedMobileReservation.status}
            </span>
          ) : undefined
        }
        actions={
          selectedMobileReservation && (
            <div className="flex flex-col gap-2 w-full">
              {selectedMobileReservation.status === "WAITING" && (
                <Button
                  onClick={() => {
                    const res = selectedMobileReservation;
                    setSelectedMobileReservation(null);
                    handleCancelReservation(res.id, res.book_title);
                  }}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-10 rounded-xl gap-1.5"
                >
                  <X className="h-4 w-4" /> Cancel Waitlist Reservation
                </Button>
              )}
            </div>
          )
        }
      >
        {selectedMobileReservation && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">Student GR / Adm No</p>
                <p className="text-xs font-mono font-bold text-slate-900 mt-0.5">{selectedMobileReservation.student_gr_no || "—"}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">Queue Status</p>
                <p className="text-xs font-bold text-indigo-700 mt-0.5">{selectedMobileReservation.status}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">Reserved Date</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">
                  {new Date(selectedMobileReservation.reservation_date).toLocaleDateString("en-GB")}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">Expiration Date</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">
                  {selectedMobileReservation.expiry_date ? new Date(selectedMobileReservation.expiry_date).toLocaleDateString("en-GB") : "—"}
                </p>
              </div>
            </div>
          </div>
        )}
      </MobileBottomDrawer>

      {/* 5. Mobile Clearance Drawer */}
      <MobileBottomDrawer
        isOpen={!!selectedMobileClearance}
        onClose={() => setSelectedMobileClearance(null)}
        title={selectedMobileClearance?.student_name || ""}
        subtitle={selectedMobileClearance ? `GR: ${selectedMobileClearance.gr_no || "—"}` : undefined}
        badge={
          <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-50 text-amber-700 border border-amber-200">
            Pending Clearance
          </span>
        }
        actions={
          selectedMobileClearance && (
            <div className="flex flex-col gap-2 w-full">
              <Button
                onClick={() => {
                  const st = selectedMobileClearance;
                  setSelectedMobileClearance(null);
                  handleSearchStudentClearance(st.student_id);
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 rounded-xl gap-1.5"
              >
                <ShieldCheck className="h-4 w-4" /> Open Student Clearance Dossier
              </Button>
            </div>
          )
        }
      >
        {selectedMobileClearance && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">Class & Division</p>
                <p className="text-xs font-bold text-slate-900 mt-0.5">{selectedMobileClearance.class_name || "—"}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">Overdue Books</p>
                <p className="text-xs font-bold text-rose-600 mt-0.5">{selectedMobileClearance.active_books_count || 0} book(s)</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 col-span-2">
                <p className="text-[10px] uppercase font-bold text-slate-400">Outstanding Fine Balance</p>
                <p className="text-sm font-black text-rose-600 mt-0.5">₹{selectedMobileClearance.pending_fine_total || 0}</p>
              </div>
            </div>
          </div>
        )}
      </MobileBottomDrawer>

      {/* 6. Mobile Master Drawer */}
      <MobileBottomDrawer
        isOpen={!!selectedMobileMaster}
        onClose={() => setSelectedMobileMaster(null)}
        title={
          selectedMobileMaster
            ? selectedMobileMaster.type === "rack"
              ? selectedMobileMaster.data.rack_name
              : toTitleCase(selectedMobileMaster.data.name)
            : ""
        }
        subtitle={
          selectedMobileMaster
            ? selectedMobileMaster.type === "rack"
              ? `Rack Code: ${selectedMobileMaster.data.rack_code}`
              : selectedMobileMaster.data.code
              ? `Code / Ref: ${selectedMobileMaster.data.code}`
              : undefined
            : undefined
        }
        badge={
          selectedMobileMaster ? (
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-black ${
                selectedMobileMaster.data.is_active !== false
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              {selectedMobileMaster.data.is_active !== false ? "Active" : "Deactivated"}
            </span>
          ) : undefined
        }
        actions={
          selectedMobileMaster && (
            <div className="flex flex-col gap-2 w-full">
              {selectedMobileMaster.type === "rack" && (
                <Button
                  onClick={() => {
                    const m = selectedMobileMaster;
                    setSelectedMobileMaster(null);
                    openAddMasterModal("shelf", m.data.id);
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 rounded-xl gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Add Shelf to This Rack
                </Button>
              )}
              {selectedMobileMaster.type !== "rack" && (
                <Button
                  onClick={() => {
                    const m = selectedMobileMaster;
                    setSelectedMobileMaster(null);
                    if (m.type === "category") setCategoryFilter(toTitleCase(m.data.name));
                    else if (m.type === "author") setAuthorFilter(toTitleCase(m.data.name));
                    setActiveTab("catalog");
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 rounded-xl gap-1.5"
                >
                  <BookOpen className="h-4 w-4" /> View Associated Books ({selectedMobileMaster.count || 0})
                </Button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const m = selectedMobileMaster;
                    setSelectedMobileMaster(null);
                    if (m.type === "category") openEditMasterModal("category", m.data);
                    else if (m.type === "author") openEditMasterModal("author", m.data);
                    else if (m.type === "rack") openEditMasterModal("rack", m.data);
                  }}
                  className="text-xs h-9 font-bold border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl gap-1"
                >
                  <Edit className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const m = selectedMobileMaster;
                    setSelectedMobileMaster(null);
                    const isActive = m.data.is_active !== false;
                    if (m.type === "category") handleToggleActiveMaster("category", m.data.id, m.data.name, isActive);
                    else if (m.type === "author") handleToggleActiveMaster("author", m.data.id, m.data.name, isActive);
                    else if (m.type === "rack") handleToggleActiveMaster("rack", m.data.id, m.data.rack_name, isActive);
                  }}
                  className="text-xs h-9 font-bold border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl gap-1"
                >
                  <Power className="h-3.5 w-3.5" /> {selectedMobileMaster.data.is_active !== false ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </div>
          )
        }
      >
        {selectedMobileMaster && (
          <div className="space-y-3">
            {selectedMobileMaster.type === "category" && (
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Total Books in Category</p>
                  <p className="text-sm font-bold text-indigo-700 mt-0.5">{selectedMobileMaster.count || 0} books</p>
                </div>
                {selectedMobileMaster.data.description && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Description</p>
                    <p className="text-xs text-slate-600 mt-0.5">{selectedMobileMaster.data.description}</p>
                  </div>
                )}
              </div>
            )}

            {selectedMobileMaster.type === "author" && (
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Catalogued Books</p>
                  <p className="text-sm font-bold text-purple-700 mt-0.5">{selectedMobileMaster.count || 0} books</p>
                </div>
                {selectedMobileMaster.data.biography && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Biography / Notes</p>
                    <p className="text-xs text-slate-600 mt-0.5">{selectedMobileMaster.data.biography}</p>
                  </div>
                )}
              </div>
            )}

            {selectedMobileMaster.type === "rack" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Shelves Count</p>
                    <p className="text-xs font-bold text-slate-900 mt-0.5">{selectedMobileMaster.shelves?.length || 0} shelves</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Books Stored</p>
                    <p className="text-xs font-bold text-slate-900 mt-0.5">{selectedMobileMaster.booksCount || 0} books</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Configured Shelves</p>
                  {(!selectedMobileMaster.shelves || selectedMobileMaster.shelves.length === 0) ? (
                    <p className="text-xs text-slate-400 italic">No shelves added yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedMobileMaster.shelves.map((s: any) => (
                        <span key={s.id} className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-xs font-mono font-bold text-slate-800">
                          {s.shelf_code} <span className="font-sans font-normal text-slate-400">({s.shelf_name})</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </MobileBottomDrawer>

      {/* Mobile Select Bottom Drawer */}
      {activeSelectDrawer && (
        <MobileSelectDrawer
          isOpen={!!activeSelectDrawer}
          onClose={() => setActiveSelectDrawer(null)}
          title={activeSelectDrawer.title}
          subtitle={activeSelectDrawer.subtitle}
          options={activeSelectDrawer.options}
          selectedValue={activeSelectDrawer.selectedValue}
          onSelect={(val) => {
            activeSelectDrawer.onSelect(val);
            setActiveSelectDrawer(null);
          }}
        />
      )}
    </div>
  );
}
