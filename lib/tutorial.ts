import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";

export interface TutorialStep {
  step: number;
  title: string;
  description: string;
  dummy_example?: string;
  reading_time?: string;
  checklist?: string[];
  options?: string[];
}

export interface TutorialDummyField {
  field: string;
  sample_value: string;
  instructions: string;
}

export interface PageTutorialData {
  id?: number;
  role: "CLERK" | "PRINCIPAL" | "TEACHER" | "TRUSTEE" | "FEES" | "INVENTORY" | "LIBRARIAN" | "SUPERADMIN" | "GLOBAL" | string;
  route_path: string;
  title: string;
  summary: string;
  steps: TutorialStep[];
  dummy_data: TutorialDummyField[];
  show_video?: boolean;
  video_url?: string;
  tips: string[];
  created_at?: string;
  updated_at?: string;
  updated_by_name?: string;
}

export interface RolePageRoute {
  title: string;
  href: string;
  category?: string;
  description: string;
}

/**
 * Standard normalized role names for tutorials
 */
export function normalizeTutorialRole(roleName?: string): string {
  if (!roleName) return "GLOBAL";
  const lower = roleName.toLowerCase().trim();
  if (lower.includes("clerk")) return "CLERK";
  if (lower.includes("principal")) return "PRINCIPAL";
  if (lower.includes("librar")) return "LIBRARIAN";
  if (lower.includes("teacher") || lower.includes("staff")) return "TEACHER";
  if (lower.includes("trustee")) return "TRUSTEE";
  if (lower.includes("fee") || lower.includes("accountant") || lower.includes("finance")) return "FEES";
  if (lower.includes("inventory")) return "INVENTORY";
  if (lower.includes("superadmin") || lower.includes("super_admin") || lower.includes("super admin")) return "SUPERADMIN";
  if (lower.includes("admin")) return "ADMIN";
  return "GLOBAL";
}

/**
 * Clean and normalize a path for tutorial matching
 */
export function normalizePath(path: string): string {
  if (!path) return "/";
  let clean = path.split("?")[0].split("#")[0].trim().replace(/\/+$/, "");
  if (!clean.startsWith("/")) clean = "/" + clean;
  return clean || "/";
}

/**
 * Complete list of all sidebar pages for all target roles
 */
export const ROLE_SIDEBAR_PAGES: Record<string, RolePageRoute[]> = {
  LIBRARIAN: [
    { title: "Dashboard", href: "/librarian", category: "General", description: "Library circulation overview, active loans, and overdue counts." },
    { title: "Library Management", href: "/librarian/library", category: "Circulation & Books", description: "Book catalog, issue/return circulation desk, barcode search, and fine collection." },
    { title: "My Attendance", href: "/librarian/attendance", category: "Self Service", description: "Daily check-in and check-out logs and monthly muster roll." },
    { title: "My Leaves", href: "/librarian/leaves", category: "Self Service", description: "Apply for leaves and track sanction status." },
    { title: "My Payslips", href: "/librarian/payslips", category: "Self Service", description: "Download monthly salary slips and tax deductions." },
    { title: "Announcements", href: "/librarian/announcements", category: "Communication", description: "School-wide circulars and departmental notifications." },
    { title: "Events & Holidays", href: "/librarian/events", category: "Communication", description: "Academic calendar, book exhibitions, and holidays." },
    { title: "Account Settings", href: "/librarian/settings", category: "Account", description: "Librarian profile credentials and password update." },
  ],
  TRUSTEE: [
    { title: "Dashboard & Governance", href: "/trustee", category: "General", description: "Trustee executive dashboard, staff strength, and payroll liabilities." },
    { title: "Staff Directory & Reports", href: "/trustee/staff-management", category: "Staff Management", description: "Comprehensive staff directory, employee profiles, and department allocations." },
    { title: "+ Add / Manage Staff", href: "/trustee/staff", category: "Staff Management", description: "Onboard new faculty, assign designations, and edit employee dossiers." },
    { title: "Departments", href: "/trustee/departments", category: "Staff Management", description: "Manage academic and administrative departments and HOD appointments." },
    { title: "Staff Active / Deactive", href: "/trustee/staff-status", category: "Staff Management", description: "Activate, suspend, or revoke staff software credentials." },
    { title: "Leave & Approvals", href: "/trustee/leave-requests", category: "Staff Management", description: "Review and approve senior faculty and principal leave applications." },
    { title: "Salary Components", href: "/trustee/salary-components", category: "Payroll", description: "Configure Basic Pay, DA, HRA, Provident Fund, and deduction slabs." },
    { title: "Staff Salary", href: "/trustee/staff-salary", category: "Payroll", description: "Assign individual CTC packages and salary structures per employee." },
    { title: "Generate Salary", href: "/trustee/generate-salary", category: "Payroll", description: "Process monthly payroll, compute leave deductions, and disburse NEFT." },
    { title: "Student Reports", href: "/trustee/student-report", category: "Reports & Audit", description: "Enrollment metrics, gender distribution, and retention analytics." },
    { title: "Inventory Stock", href: "/trustee/inventory-report", category: "Reports & Audit", description: "School store stock asset valuation and reorder threshold audit." },
    { title: "Library Stock", href: "/trustee/library-report", category: "Reports & Audit", description: "Library book asset valuation, circulation velocity, and fine records." },
    { title: "Subscription & Billing", href: "/trustee/subscription", category: "Finance", description: "School software SaaS plan, module licenses, and renewal invoices." },
    { title: "Announcements", href: "/trustee/announcements", category: "Communication", description: "Board circulars and official staff communications." },
    { title: "Events & Calendar", href: "/trustee/events", category: "Communication", description: "Board meetings, annual functions, and institutional calendar." },
    { title: "Activity Logs", href: "/trustee/activity-logs", category: "Audit & Security", description: "Immutable system audit trail of all staff logins and record modifications." },
    { title: "Support & Helpdesk", href: "/trustee/support", category: "Support", description: "Direct priority support channel with SaaS Super Admin." },
    { title: "Account Settings", href: "/trustee/settings", category: "Account", description: "Trustee profile, password, and two-factor authentication." },
  ],
  CLERK: [
    { title: "Dashboard", href: "/clerk", category: "General", description: "Clerk dashboard, quick statistics, and administrative overview." },
    { title: "Certificate Desk (LC/TC)", href: "/clerk/certificates", category: "Certificates & G.R.", description: "Generate, verify, and print Leaving & Transfer Certificates." },
    { title: "General Register (G.R. Book)", href: "/clerk/general-register", category: "Certificates & G.R.", description: "Digital G.R. master register and student history records." },
    { title: "Departments", href: "/clerk/departments", category: "HR Management", description: "Manage academic and administrative departments." },
    { title: "Staff Directory", href: "/clerk/staff", category: "HR Management", description: "Staff profiles, employee IDs, and designation records." },
    { title: "Admission Form", href: "/clerk/admission-form", category: "Admissions", description: "Dynamic online admission form builder and fields." },
    { title: "Manual Admission", href: "/clerk/manual-admission", category: "Admissions", description: "Direct offline student admission data entry." },
    { title: "Temp Users", href: "/clerk/temp-users", category: "Admissions", description: "Prospective applicants and registration tokens." },
    { title: "Student Directory", href: "/clerk/students", category: "Admissions", description: "Active student directory, filters, and records." },
    { title: "Categories Master", href: "/clerk/categories", category: "School Management", description: "Primary, Secondary, Higher Secondary sections." },
    { title: "Classes Configuration", href: "/clerk/classes", category: "School Management", description: "Standard grades and class levels." },
    { title: "Student Profiles", href: "/clerk/student-profiles", category: "School Management", description: "Comprehensive student biometric and parent information." },
    { title: "Divisions / Sections", href: "/clerk/divisions", category: "School Management", description: "Section setup (A, B, C) and classroom allocations." },
    { title: "Assign Division", href: "/clerk/assign-division", category: "School Management", description: "Allocate admitted students to specific divisions." },
    { title: "Assign Roll No.", href: "/clerk/assign-roll-no", category: "School Management", description: "Alphabetical or custom roll number generation." },
    { title: "Student Promotion", href: "/clerk/student-promotion", category: "School Management", description: "Promote students to next academic year classes." },
    { title: "Staff Attendance", href: "/clerk/staff-attendance", category: "Attendance Desk", description: "Monitor daily employee punch records and shift muster." },
    { title: "Attendance Exceptions", href: "/clerk/attendance-exceptions", category: "Attendance Desk", description: "Review punch regularization requests and missed punch justifications." },
    { title: "Absentee Calling Desk", href: "/clerk/absentee-desk", category: "Attendance Desk", description: "Daily parent calling desk for absent students." },
    { title: "Attendance Zone Settings", href: "/clerk/location-settings", category: "Attendance Desk", description: "Geofence radius and GPS coordinates for mobile attendance." },
    { title: "Subjects Master", href: "/clerk/subjects", category: "Curriculum", description: "Subject codes, types (Theory/Practical), and syllabi." },
    { title: "Syllabus Plan", href: "/clerk/syllabus", category: "Curriculum", description: "Curriculum topics, chapters, and term distributions." },
    { title: "Assign Teacher", href: "/clerk/assign-teacher", category: "Operations", description: "Link teachers to specific classes and subjects." },
    { title: "Teacher Workload", href: "/clerk/teacher-workload", category: "Operations", description: "Period allocations and weekly timetable workload." },
    { title: "Class Timetable", href: "/clerk/timetable", category: "Operations", description: "Weekly master timetable grid per class division." },
    { title: "Announcements", href: "/clerk/announcements", category: "Communication", description: "School-wide notices and circular broadcasts." },
    { title: "Events & Holidays", href: "/clerk/events", category: "Communication", description: "Institutional calendar, holidays, and celebrations." },
    { title: "Leave Requests", href: "/clerk/leave-requests", category: "Leaves", description: "Process and verify staff leave applications." },
    { title: "Leave Reports", href: "/clerk/leave-reports", category: "Leaves", description: "Staff monthly leave balance and deduction summaries." },
    { title: "My Leaves", href: "/clerk/leaves", category: "Leaves", description: "Apply personal leave requests and view balances." },
    { title: "My Attendance", href: "/clerk/my-attendance", category: "Attendance Desk", description: "View your personal check-in/out timestamps." },
    { title: "Leave Settings", href: "/clerk/leave-config", category: "Leaves", description: "Configure casual, medical, and earned leave quotas." },
    { title: "Account Settings", href: "/clerk/settings", category: "Account", description: "Clerk user profile and password change." },
  ],
  TEACHER: [
    { title: "Dashboard & Quick Actions", href: "/teacher", category: "General", description: "Daily overview, timetable, and attendance status." },
    { title: "Student Attendance", href: "/teacher/student-attendance", category: "Classroom", description: "Mark daily classroom attendance with roll-call toggles." },
    { title: "Study Materials", href: "/teacher/study-materials", category: "Academics", description: "Upload chapter PDFs, lesson notes, and study guides." },
    { title: "Homework & Assignments", href: "/teacher/Homework", category: "Academics", description: "Assign daily homework and track student submissions." },
    { title: "Marks Entry", href: "/teacher/marks", category: "Academics", description: "Enter student exam scores, unit test marks, and practicals." },
    { title: "Teacher Assessment", href: "/teacher/assessment", category: "Academics", description: "Grade student discipline, neatness, and extra-curriculars." },
    { title: "Class Verification", href: "/teacher/verify-marks", category: "Academics", description: "Class teacher verification of all subject marks entered." },
    { title: "Progress Reports", href: "/teacher/progress-reports", category: "Academics", description: "Personalized remarks and student term progress cards." },
    { title: "Announcements", href: "/teacher/announcements", category: "Communication", description: "View school notices and send class-specific circulars." },
    { title: "Events & Holidays", href: "/teacher/events", category: "Communication", description: "View upcoming school events, exams, and holidays." },
    { title: "Stock & Stationery", href: "/teacher/stock", category: "Resources", description: "Request classroom chalk, registers, and teaching supplies." },
    { title: "My Leaves", href: "/teacher/leaves", category: "Self Service", description: "Apply for casual, sick, or maternity leave." },
    { title: "My Payslips", href: "/teacher/payslips", category: "Self Service", description: "Download monthly payslips and deductions." },
    { title: "Attendance History", href: "/teacher/attendance", category: "Self Service", description: "Review your personal monthly check-in/out timestamps." },
    { title: "Exam Timetable", href: "/teacher/exams", category: "Examinations", description: "Assigned invigilation duties and exam schedule." },
    { title: "Account Settings", href: "/teacher/settings", category: "Account", description: "Update teacher profile, phone number, and password." },
  ],
  PRINCIPAL: [
    { title: "Dashboard", href: "/principal", category: "General", description: "Executive KPI dashboard, quick statistics, and alerts." },
    { title: "Staff Active / Deactive", href: "/principal/staff-status", category: "Governance", description: "Control staff account activation and employment status." },
    { title: "Academic Year", href: "/principal/academic-year", category: "Governance", description: "Manage active and archive historical academic sessions." },
    { title: "Result Dashboard", href: "/principal/result/dashboard", category: "Examinations & Results", description: "Analytics on pass percentages, toppers, and subject averages." },
    { title: "Result Weightage", href: "/principal/result/weightage", category: "Examinations & Results", description: "Configure exam grading schemas and internal/external weightage." },
    { title: "Exam Configuration", href: "/principal/result/exams", category: "Examinations & Results", description: "Set up terms, unit tests, and semester examinations." },
    { title: "Exam Schedule", href: "/principal/result/exams/schedule", category: "Examinations & Results", description: "Date sheet and examination dates planning." },
    { title: "Exam Timetable", href: "/principal/result/exams/timetable", category: "Examinations & Results", description: "Daily exam timing, room allocation, and supervisors." },
    { title: "Seating Arrangement", href: "/principal/result/seating", category: "Examinations & Results", description: "Automated exam hall seating plan and desk numbers." },
    { title: "Marks Overview", href: "/principal/result/marks/overview", category: "Marks Management", description: "Monitor marks submission progress across all teachers." },
    { title: "Marks Verification", href: "/principal/result/marks/verification", category: "Marks Management", description: "Audit entered student scores and request teacher corrections." },
    { title: "Teacher Assessment", href: "/principal/result/marks/assessment", category: "Marks Management", description: "Review co-curricular, behavior, and teacher feedback." },
    { title: "Result Preview", href: "/principal/result/processing/preview", category: "Result Processing", description: "Calculate ranks, CGPA, and preview consolidated gazette." },
    { title: "Marksheet Verification", href: "/principal/result/processing/verification", category: "Result Processing", description: "Verify printed marksheet templates before release." },
    { title: "Publish Results", href: "/principal/result/publish", category: "Result Processing", description: "Release digital report cards to students and parents." },
    { title: "Published Results Archive", href: "/principal/result/published", category: "Result Processing", description: "Archived report cards and historical batch results." },
    { title: "Announcements", href: "/principal/announcements", category: "Communication", description: "Broadcast official school notices and urgent alerts." },
    { title: "Events & Holidays", href: "/principal/events", category: "Communication", description: "Manage school calendar, annual functions, and vacations." },
    { title: "Activity Logs", href: "/principal/activity-logs", category: "Audit & Security", description: "Detailed audit trail of all staff logins and actions." },
    { title: "Staff Leave Requests", href: "/principal/leave-requests", category: "Staff Approvals", description: "Review and approve/reject staff leave applications." },
    { title: "Attendance Exceptions", href: "/principal/attendance-exceptions", category: "Staff Approvals", description: "Approve manual attendance regularizations and punch overrides." },
    { title: "Staff Attendance", href: "/principal/staff-attendance", category: "Staff Approvals", description: "Campus-wide employee muster roll and punctualities." },
    { title: "Support Helpdesk", href: "/principal/support", category: "Support", description: "Submit and track support tickets with SaaS Super Admin." },
    { title: "Account Settings", href: "/principal/settings", category: "Account", description: "Principal profile credentials and preferences." },
  ],
  FEES: [
    { title: "Dashboard", href: "/fees", category: "General", description: "Fee collections summary, outstanding dues, and counter metrics." },
    { title: "My Attendance", href: "/fees/attendance", category: "Self Service", description: "Daily accountant attendance check-in and records." },
    { title: "My Leaves", href: "/fees/leaves", category: "Self Service", description: "Accountant leave applications and balance." },
    { title: "My Payslips", href: "/fees/payslips", category: "Self Service", description: "Salary slips and deductions." },
    { title: "Academic Year", href: "/fees/academic-year", category: "Configuration", description: "Manage fee cycles for current and past academic sessions." },
    { title: "Fee Types", href: "/fees/fee-types", category: "Configuration", description: "Tuition, Laboratory, Transport, Computer, and Activity heads." },
    { title: "Fee Structure", href: "/fees/fee-structure", category: "Configuration", description: "Class-wise fee installment slabs and due dates." },
    { title: "Generate Fees", href: "/fees/Genrate-Fees", category: "Billing", description: "Generate batch fee demands and assign to enrolled students." },
    { title: "Student Ledger", href: "/fees/student-ledger", category: "Counter Desk", description: "Search student, record cash/UPI/cheque payments, and print receipts." },
    { title: "Announcements", href: "/fees/announcements", category: "Communication", description: "Fee reminders, bank holiday notices, and payment circulars." },
    { title: "Events & Due Dates", href: "/fees/events", category: "Communication", description: "Fee installment deadlines and term break calendar." },
    { title: "Account Settings", href: "/fees/settings", category: "Account", description: "Accountant user profile and password change." },
  ],
  INVENTORY: [
    { title: "Dashboard", href: "/inventory", category: "General", description: "Stock inventory summary, low-stock warnings, and metrics." },
    { title: "My Attendance", href: "/inventory/attendance", category: "Self Service", description: "Storekeeper daily attendance logs." },
    { title: "Categories & Variants", href: "/inventory/categories", category: "Catalog", description: "Item sizes (S, M, L, XL), colors, and category groupings." },
    { title: "Items Master", href: "/inventory/items", category: "Catalog", description: "Uniforms, notebooks, ties, belts, and stationeries catalog." },
    { title: "Pricing & Fee Mapping", href: "/inventory/pricing", category: "Pricing", description: "Set selling prices and map inventory items to student fee ledgers." },
    { title: "Purchases & Suppliers", href: "/inventory/purchases", category: "Procurement", description: "Supplier vendor records and purchase order stock entries." },
    { title: "Stock & Ledger", href: "/inventory/stock", category: "Stock Management", description: "Real-time stock ledger, physical audits, and stock adjustments." },
    { title: "Student Item Issues", href: "/inventory/issue", category: "Distribution", description: "Issue uniform kits and study materials to enrolled students." },
    { title: "Replacements & Returns", href: "/inventory/replacements", category: "Distribution", description: "Process size replacements, exchanges, and damaged returns." },
    { title: "Reports & Analytics", href: "/inventory/reports", category: "Reports", description: "Stock consumption, fast-moving items, and reorder reports." },
    { title: "My Leaves", href: "/inventory/leaves", category: "Self Service", description: "Leave applications and quotas." },
    { title: "My Payslips", href: "/inventory/payslips", category: "Self Service", description: "Monthly payslips." },
  ],
  SUPERADMIN: [
    { title: "Tutorial Studio", href: "/superadmin/tutorials", category: "Platform Tools", description: "Visual editor and guidance manager for role tutorials." },
  ],
};

/**
 * Pre-defined rich default guides with step-by-step and dummy data
 * specifically tailored for older or non-tech-savvy school staff.
 * EVERY route has concrete 1. 2. 3. steps with real-world examples!
 */
export const DEFAULT_TUTORIALS_MAP: Record<string, PageTutorialData> = {
  // ─── LIBRARIAN GUIDES ──────────────────────────────────────────────────────
  "/librarian": {
    role: "LIBRARIAN",
    route_path: "/librarian",
    title: "Library Control Center & Daily Circulation",
    summary: "Welcome to the Library Desk. Monitor today's book circulation, upcoming due dates, newly arrived book titles, and student borrower queues.",
    steps: [
      {
        step: 1,
        title: "Review Today's Circulation Summary",
        description: "Check the top metric cards to see total registered books, active student loans, and books due for return today.",
        dummy_example: "Stats: Total Books: 12,450 | Active Loans: 340 | Due Today: 18",
      },
      {
        step: 2,
        title: "Open the Quick Circulation Desk",
        description: "Click 'Issue / Return Book' to open the barcode reader desk and process borrower transactions immediately.",
        dummy_example: "Click 'Library Management' in the left menu to access full catalog search.",
      },
      {
        step: 3,
        title: "Check Overdue Book Alerts",
        description: "Review students and staff whose 14-day borrowing period has elapsed so you can notify them or assess late return fines.",
        dummy_example: "Overdue: 7 books overdue by more than 3 days.",
      },
    ],
    dummy_data: [
      { field: "Academic Year", sample_value: "2026-2027", instructions: "Active school session for borrower tracking." },
      { field: "Borrower Category", sample_value: "Student / Faculty", instructions: "Loan policies and max book quotas depend on borrower category." },
    ],
    tips: [
      "Use a USB or Bluetooth barcode scanner for rapid book check-outs without manual typing.",
      "Click the (i) button on any page to view instant guidance tailored to that screen.",
    ],
  },
  "/librarian/library": {
    role: "LIBRARIAN",
    route_path: "/librarian/library",
    title: "Library Catalog, Book Circulation & Fine Desk",
    summary: "Comprehensive library operations: search and catalog books, issue books to students/teachers, process returns, and collect overdue fines.",
    steps: [
      {
        step: 1,
        title: "Search Book Catalog or Scan Barcode",
        description: "Type the book title, author name, or scan the book's barcode directly using the top search box.",
        dummy_example: "Search 'Discovery of India' or scan barcode 'LIB-BK-0482'.",
      },
      {
        step: 2,
        title: "Issue Book to Student or Teacher",
        description: "Select the borrower by G.R. Number or Staff ID, choose the book copy, verify the 14-day due date, and click 'Issue Book'.",
        dummy_example: "Borrower: 'Sharma Aarav' (GR-2026-0145) -> Book: Copy #2 -> Due Date: 31/10/2026.",
      },
      {
        step: 3,
        title: "Process Returns & Overdue Fines",
        description: "When a book is brought back, scan its barcode to verify condition. If returned past the due date, calculate and collect the late fine.",
        dummy_example: "Returned 3 days late @ ₹5/day = Total Fine ₹15.00 -> Click 'Confirm Return'.",
      },
      {
        step: 4,
        title: "Add New Book Titles to Master Catalog",
        description: "Click '+ Add Book' to enter the title, ISBN, author, category, shelf rack number, and number of copies.",
        dummy_example: "Title: 'Wings of Fire' | ISBN: '978-81-7371-146-6' | Rack: 'Shelf B-3' | Copies: 5.",
      },
    ],
    dummy_data: [
      { field: "Book Title", sample_value: "Discovery of India", instructions: "Official title as printed on the book cover." },
      { field: "ISBN / Barcode", sample_value: "978-0143031031", instructions: "Unique 10 or 13-digit identifier." },
      { field: "Author", sample_value: "Jawaharlal Nehru", instructions: "Primary author or compiler name." },
      { field: "Rack / Shelf Location", sample_value: "Almirah C - Shelf 4", instructions: "Helps students locate the physical book." },
      { field: "Standard Loan Period", sample_value: "14 Days", instructions: "Allowed borrowing duration before fines apply." },
      { field: "Late Fine Rate", sample_value: "₹5.00 / day", instructions: "Configured in Library Settings." },
    ],
    tips: [
      "Always inspect physical books for torn or damaged pages before completing the return transaction.",
      "Students with unpaid overdue fines are highlighted in red and cannot borrow additional titles.",
    ],
  },
  "/librarian/attendance": {
    role: "LIBRARIAN",
    route_path: "/librarian/attendance",
    title: "Librarian Duty Attendance & Punch Logs",
    summary: "View daily duty check-in/out records, monthly working days, and submit punch regularizations.",
    steps: [
      {
        step: 1,
        title: "Check Today's Punch Timestamps",
        description: "Confirm your morning punch-in time and evening punch-out time recorded by the campus system.",
        dummy_example: "Morning In: 08:15 AM | Evening Out: 04:30 PM | Shift: Regular",
      },
      {
        step: 2,
        title: "Review Monthly Attendance Muster",
        description: "Inspect total present days, weekly offs, institutional holidays, and approved leaves for this month.",
        dummy_example: "Present: 22 Days | Holidays: 4 Days | Casual Leaves: 1 Day",
      },
      {
        step: 3,
        title: "Submit Attendance Regularization (If Missed Punch)",
        description: "If you forgot to punch out due to library stock audit, submit a regularization request for Principal approval.",
        dummy_example: "Date: 14/10/2026 | Reason: 'Late library stock checking with audit committee'.",
      },
    ],
    dummy_data: [
      { field: "Shift Timing", sample_value: "08:00 AM - 04:30 PM", instructions: "Designated library operating hours." },
      { field: "Regularization Reason", sample_value: "Biometric scanner power fault / Book fair duty", instructions: "Explain justification clearly." },
    ],
    tips: [
      "Always submit missed punch requests within 48 hours so monthly payroll calculations are not affected.",
    ],
  },
  "/librarian/leaves": {
    role: "LIBRARIAN",
    route_path: "/librarian/leaves",
    title: "Librarian Leave Application Desk",
    summary: "Check remaining leave balances, submit leave requests with substitute coverage, and track approval status.",
    steps: [
      {
        step: 1,
        title: "Check Available Leave Quotas",
        description: "Inspect remaining Casual Leave (CL), Sick Leave (SL), and Earned Leave (EL) balances before applying.",
        dummy_example: "Balances: CL: 5 Days | SL: 6 Days | EL: 10 Days",
      },
      {
        step: 2,
        title: "Submit New Leave Request",
        description: "Click 'Apply Leave', select dates, choose the leave category, and provide the substitute staff arrangement.",
        dummy_example: "Dates: 24/10/2026 to 25/10/2026 (2 Days) | Substitute: 'Mrs. Rekha Joshi (Clerk)'.",
      },
      {
        step: 3,
        title: "Track Approval from Principal",
        description: "Monitor whether your leave application has been approved, put on hold, or rejected with remarks.",
        dummy_example: "Status: 'Approved by Principal' on 20/10/2026.",
      },
    ],
    dummy_data: [
      { field: "Leave Type", sample_value: "Casual Leave (CL)", instructions: "Select from authorized institutional leave types." },
      { field: "Leave Reason", sample_value: "Family function / Urgent personal work", instructions: "Brief reason for absence." },
    ],
    tips: [
      "Ensure another staff member is briefed to handle emergency book returns while you are on leave.",
    ],
  },
  "/librarian/payslips": {
    role: "LIBRARIAN",
    route_path: "/librarian/payslips",
    title: "Librarian Monthly Payslips & Deductions",
    summary: "Access, view, and download official monthly salary payslips generated by the school payroll office.",
    steps: [
      {
        step: 1,
        title: "Select Month and Year",
        description: "Choose the target salary disbursement cycle from the month/year selector.",
        dummy_example: "Month: September 2026 | Session: 2026-2027",
      },
      {
        step: 2,
        title: "Inspect Earnings and Statutory Deductions",
        description: "Review Basic Pay, DA, HRA, Provident Fund (PF), Professional Tax (PT), and Net Payable Salary.",
        dummy_example: "Gross Pay: ₹38,000 | PF: ₹2,400 | PT: ₹200 | Net Disbursed: ₹35,400",
      },
      {
        step: 3,
        title: "Download or Print Official PDF Payslip",
        description: "Click 'Download Payslip' to obtain the signed and stamped digital copy for your personal records.",
        dummy_example: "Click 'Download PDF' -> Save 'Payslip_Sept_2026.pdf'.",
      },
    ],
    dummy_data: [
      { field: "Employee ID", sample_value: "EMP-LIB-0003", instructions: "Unique school employment identifier." },
      { field: "Bank Account", sample_value: "HDFC Bank - A/C ending in 4109", instructions: "Salary credit account." },
    ],
    tips: [
      "Payslips are published on the 1st of every month after Trustee payroll approval.",
    ],
  },
  "/librarian/announcements": {
    role: "LIBRARIAN",
    route_path: "/librarian/announcements",
    title: "Campus Circulars & Library Notices",
    summary: "Stay informed with institutional circulars, holiday notices, and administrative directives.",
    steps: [
      {
        step: 1,
        title: "Read School-Wide Circulars",
        description: "Check the announcement feed for circulars published by the Principal or School Management.",
        dummy_example: "Notice: 'Library Special Hours during Annual Examinations (8:00 AM - 6:00 PM)'.",
      },
      {
        step: 2,
        title: "Filter by Tag or Importance",
        description: "Use filter pills to quickly sort between Urgent Notices, Exam Circulars, and Holiday Alerts.",
        dummy_example: "Filter by 'Exams' to view exam week timetable updates.",
      },
    ],
    dummy_data: [
      { field: "Notice Category", sample_value: "Academic / Administrative", instructions: "Identifies circular audience." },
    ],
    tips: [
      "Pin critical circulars on the physical library bulletin board for visiting students.",
    ],
  },
  "/librarian/events": {
    role: "LIBRARIAN",
    route_path: "/librarian/events",
    title: "School Events, Exhibitions & Holiday Calendar",
    summary: "Plan library reading sessions, book exhibitions, and view official school vacation dates.",
    steps: [
      {
        step: 1,
        title: "Inspect Upcoming School Events",
        description: "View the monthly institutional calendar for upcoming cultural days, sports meets, and exams.",
        dummy_example: "Event: 'National Reading Day Book Fair' - 15th to 17th November 2026.",
      },
      {
        step: 2,
        title: "Check Official School Holidays",
        description: "Check scheduled dates when the school campus and library will remain closed.",
        dummy_example: "Holiday: 'Diwali Vacation' from 01/11/2026 to 10/11/2026.",
      },
    ],
    dummy_data: [
      { field: "Calendar Filter", sample_value: "Library Exhibitions / Academic Holidays", instructions: "Narrow down displayed calendar events." },
    ],
    tips: [
      "Extend book loan due dates that fall on official school vacation periods.",
    ],
  },
  "/librarian/settings": {
    role: "LIBRARIAN",
    route_path: "/librarian/settings",
    title: "Librarian Account Credentials & Security",
    summary: "Update your profile contact number, emergency contact, and reset your login password.",
    steps: [
      {
        step: 1,
        title: "Update Contact Details",
        description: "Ensure your mobile phone number and alternate email address are kept up to date for SMS alerts.",
        dummy_example: "Phone: '9820112233' | Email: 'librarian@school.edu.in'",
      },
      {
        step: 2,
        title: "Change Account Password",
        description: "Type your current password, enter your new strong password (min 8 chars), and confirm.",
        dummy_example: "Enter current password -> Enter new password -> Click 'Update Password'.",
      },
    ],
    dummy_data: [
      { field: "Password Requirement", sample_value: "Min 8 characters with numbers & symbols", instructions: "Ensure strong cybersecurity protection." },
    ],
    tips: [
      "Never share your library credentials with student assistants to preserve audit trail integrity.",
    ],
  },

  // ─── TRUSTEE GUIDES ────────────────────────────────────────────────────────
  "/trustee": {
    role: "TRUSTEE",
    route_path: "/trustee",
    title: "Trustee Management & Executive Governance",
    summary: "Executive institutional oversight: staff payroll structures, monthly salary disbursement, school subscription, and audit logs.",
    steps: [
      {
        step: 1,
        title: "Review Staff Strength & Payroll Overview",
        description: "Inspect total teaching and non-teaching staff headcount, monthly payroll liability, and disbursement status.",
        dummy_example: "Total Staff: 48 | Monthly Payroll: ₹14,80,000",
      },
      {
        step: 2,
        title: "Configure Salary Structures & Allowances",
        description: "Manage basic pay, DA, HRA, Provident Fund (PF), and deductions under 'Salary Components'.",
        dummy_example: "Basic: 50% | HRA: 20% | Special Allowance: 15%",
      },
      {
        step: 3,
        title: "Approve & Generate Monthly Payroll",
        description: "Run the monthly payroll generator, verify automated leave deductions, and generate printable salary payslips.",
        dummy_example: "Click 'Generate Salary' -> Select Month: October 2026.",
      },
    ],
    dummy_data: [
      { field: "Staff Employee ID", sample_value: "EMP-TC-0042", instructions: "Unique school employment identifier." },
      { field: "Net Payable Salary", sample_value: "₹38,500", instructions: "Gross earnings minus statutory deductions." },
    ],
    tips: [
      "Review the 'Activity Logs' periodically to monitor all administrative actions and security updates across the school.",
    ],
  },
  "/trustee/departments": {
    role: "TRUSTEE",
    route_path: "/trustee/departments",
    title: "Academic & Administrative Departments Setup",
    summary: "Configure school departments, assign departmental heads (HODs), and monitor faculty distribution.",
    steps: [
      {
        step: 1,
        title: "Inspect Existing Departments & Headcount",
        description: "View all academic disciplines (Science, Math, Languages) and administrative wings (Accounts, Library, Sports).",
        dummy_example: "Departments: Mathematics (8 staff), Science (11 staff), Accounts (3 staff).",
      },
      {
        step: 2,
        title: "Create a New Department",
        description: "Click '+ Add Department', provide the department title, internal department code, and appoint the Head of Department.",
        dummy_example: "Title: 'Robotics & Computer Science' | Code: 'DEPT-ROBOT' | HOD: 'Dr. Suresh Mehta'.",
      },
      {
        step: 3,
        title: "Reassign Department Head (HOD) or Edit Details",
        description: "Click 'Edit' on any department card to change the designated HOD or update departmental description.",
        dummy_example: "Select new HOD from dropdown -> Click 'Save Changes'.",
      },
    ],
    dummy_data: [
      { field: "Department Name", sample_value: "Department of Sciences & Technology", instructions: "Official departmental title." },
      { field: "Department Code", sample_value: "DEPT-SCI-01", instructions: "Unique uppercase alphanumeric code." },
      { field: "Head of Department (HOD)", sample_value: "Dr. Arvind Kulkarni", instructions: "Assigned senior faculty member." },
    ],
    tips: [
      "Staff members assigned to a department inherit departmental timetable allocations and workload quotas.",
    ],
  },
  "/trustee/staff-management": {
    role: "TRUSTEE",
    route_path: "/trustee/staff-management",
    title: "Staff Directory, Profiles & Faculty Reports",
    summary: "Review full employee profiles, qualification histories, CTC packages, and department assignments.",
    steps: [
      {
        step: 1,
        title: "Search Staff by Name or Employee ID",
        description: "Type an employee ID, full name, or filter by staff category (Teaching / Administrative / Support).",
        dummy_example: "Search 'EMP-TC-0012' or 'Pooja Sharma' or filter by 'Teaching Staff'.",
      },
      {
        step: 2,
        title: "Inspect Employment Profile Dossier",
        description: "Click on any staff member's row to view their date of joining, contact info, assigned classes, and salary structure.",
        dummy_example: "Click eye icon -> View Mrs. Sunita Deshmukh's qualifications and monthly pay.",
      },
      {
        step: 3,
        title: "Export Staff Register",
        description: "Click 'Export to Excel' to produce a complete institutional faculty report for board compliance audits.",
        dummy_example: "Click 'Export Excel' -> Saves complete faculty roster.",
      },
    ],
    dummy_data: [
      { field: "Employee ID", sample_value: "EMP-2026-0045", instructions: "Unique institutional employee code." },
      { field: "Designation", sample_value: "Senior Secondary Mathematics Teacher", instructions: "Official job title." },
      { field: "Date of Joining", sample_value: "01/06/2021", instructions: "Official appointment date." },
    ],
    tips: [
      "Keep emergency contact phone numbers verified for all campus staff members.",
    ],
  },
  "/trustee/staff": {
    role: "TRUSTEE",
    route_path: "/trustee/staff",
    title: "Add & Onboard New Staff Faculty",
    summary: "Enroll new teaching or administrative faculty members into the institutional directory with designated roles.",
    steps: [
      {
        step: 1,
        title: "Enter Personal Bio-Data & Contacts",
        description: "Fill full legal name, date of birth, personal mobile number, and official school email address.",
        dummy_example: "Name: 'Kulkarni Rajesh Anand' | DOB: '12/03/1985' | Mobile: '9822114477'.",
      },
      {
        step: 2,
        title: "Assign Category, Department & Designation",
        description: "Select whether the staff is Teaching, Clerk, Librarian, or Support, and allocate to their department.",
        dummy_example: "Category: 'Teacher' | Department: 'Mathematics' | Designation: 'TGT Math'.",
      },
      {
        step: 3,
        title: "Configure Initial Salary & Save",
        description: "Enter starting basic pay, select active status, and click 'Create Staff Record'. Login credentials are created.",
        dummy_example: "Basic Pay: ₹32,000 | Status: Active -> Click 'Save Staff Record'.",
      },
    ],
    dummy_data: [
      { field: "Staff Full Name", sample_value: "Kulkarni Rajesh Anand", instructions: "Format: Last Name First Name Middle Name" },
      { field: "Official Email", sample_value: "rajesh.kulkarni@school.edu.in", instructions: "Used for institutional software login." },
      { field: "Basic Pay", sample_value: "₹32,000.00", instructions: "Starting monthly basic component." },
    ],
    tips: [
      "New teachers automatically populate on the 'Assign Teacher' desk once their record is saved.",
    ],
  },
  "/trustee/staff-status": {
    role: "TRUSTEE",
    route_path: "/trustee/staff-status",
    title: "Staff Account Activation & Deactivation Control",
    summary: "Manage active login access, suspend accounts of departing staff, and review access audit logs.",
    steps: [
      {
        step: 1,
        title: "Filter by Status (Active / Inactive)",
        description: "Quickly view active faculty (48 members) or past relieved employees (5 members).",
        dummy_example: "Select filter: 'Active Staff' -> Shows all currently working staff.",
      },
      {
        step: 2,
        title: "Toggle Status for Departing Faculty",
        description: "Switch the status toggle from 'Active' to 'Inactive' to immediately revoke software login credentials.",
        dummy_example: "Toggle staff 'Sunil Verma' -> Confirm 'Deactivate Account'.",
      },
      {
        step: 3,
        title: "Record Official Reason for Separation",
        description: "Log whether separation was due to Resignation, Retirement, or Contract Expiry for permanent HR records.",
        dummy_example: "Reason: 'Relieved on Superannuation / Retirement on 31/03/2026'.",
      },
    ],
    dummy_data: [
      { field: "Separation Type", sample_value: "Resignation / Retirement / Termination", instructions: "Official reason for deactivation." },
      { field: "No Dues Clearance", sample_value: "Cleared by Library, Accounts, and Store", instructions: "Verify before revoking access." },
    ],
    tips: [
      "Deactivating an account immediately blocks mobile app and web access while preserving all historical marks and attendance records.",
    ],
  },
  "/trustee/leave-requests": {
    role: "TRUSTEE",
    route_path: "/trustee/leave-requests",
    title: "Executive Leave Approvals Desk",
    summary: "Review escalated leave applications for Principal, Vice-Principal, and senior administrative staff.",
    steps: [
      {
        step: 1,
        title: "Review Pending Executive Leaves",
        description: "Inspect applications submitted by school leadership requiring Board of Trustees sanction.",
        dummy_example: "Application: Principal Dr. Mehta requesting 4 days Earned Leave for family event.",
      },
      {
        step: 2,
        title: "Verify Reliever / Acting Principal Arrangement",
        description: "Check which senior faculty member has been appointed acting charge during the absence.",
        dummy_example: "Acting In-charge: Vice-Principal Mrs. Rao.",
      },
      {
        step: 3,
        title: "Sanction or Reject with Remarks",
        description: "Click 'Approve' to sanction leave with pay, or add remarks explaining modification.",
        dummy_example: "Click 'Approve' -> Sanction notification delivered to applicant.",
      },
    ],
    dummy_data: [
      { field: "Sanction Authority", sample_value: "Board of Trustees / Managing Director", instructions: "Final approval authority." },
      { field: "Decision Remarks", sample_value: "Approved as per institutional service rules", instructions: "Logged to audit trail." },
    ],
    tips: [
      "Approved leaves automatically flow into the monthly payroll engine to calculate paid vs unpaid leave days.",
    ],
  },
  "/trustee/salary-components": {
    role: "TRUSTEE",
    route_path: "/trustee/salary-components",
    title: "Salary Components & Allowance Rules",
    summary: "Configure Basic Pay, DA, HRA, Provident Fund, and deduction slabs for the school payroll engine.",
    steps: [
      {
        step: 1,
        title: "Inspect Standard Salary Components",
        description: "Review earnings (Basic Pay, DA, HRA, Conveyance) and statutory deductions (PF, Professional Tax, TDS).",
        dummy_example: "Components: Basic Pay (50%), HRA (20%), PF Deduction (12%).",
      },
      {
        step: 2,
        title: "Add or Modify Component Formula",
        description: "Click '+ Add Component' to create a percentage-based or flat amount allowance or deduction.",
        dummy_example: "Name: 'Dearness Allowance (DA)' | Type: Earning | Formula: '30% of Basic Pay'.",
      },
      {
        step: 3,
        title: "Save Payroll Master Slabs",
        description: "Click 'Save Components' to apply changes to all future monthly payroll computations.",
        dummy_example: "Click 'Save' -> Success toast confirms updated calculation rules.",
      },
    ],
    dummy_data: [
      { field: "Component Name", sample_value: "House Rent Allowance (HRA)", instructions: "Display title on salary slips." },
      { field: "Calculation Type", sample_value: "Percentage of Basic (20%)", instructions: "Can be flat amount or % of basic." },
      { field: "Statutory Taxable", sample_value: "Yes / Subject to IT Section 10(13A)", instructions: "Tax treatment for payroll." },
    ],
    tips: [
      "Provident Fund (PF) is capped at statutory threshold limits as per government guidelines.",
    ],
  },
  "/trustee/staff-salary": {
    role: "TRUSTEE",
    route_path: "/trustee/staff-salary",
    title: "Individual Staff Salary Structure Assignment",
    summary: "Assign customized CTC breakdowns and component values to specific teaching and non-teaching employees.",
    steps: [
      {
        step: 1,
        title: "Select Staff Employee",
        description: "Search the staff member by name or employee ID to open their individual salary card.",
        dummy_example: "Search 'EMP-TC-0012' - Mr. Anand Kulkarni (Senior Math Faculty).",
      },
      {
        step: 2,
        title: "Configure Monthly Earnings & Deductions",
        description: "Fill the agreed Basic Pay, DA, HRA, and any special leadership allowances.",
        dummy_example: "Basic: ₹30,000 | DA: ₹9,000 | HRA: ₹6,000 | Special Allowance: ₹5,000 | Total CTC: ₹50,000/mo.",
      },
      {
        step: 3,
        title: "Lock and Save Structure",
        description: "Click 'Save Salary Structure' to lock the formula for automated monthly payroll processing.",
        dummy_example: "Click 'Save Structure' -> Monthly net pay will compute automatically.",
      },
    ],
    dummy_data: [
      { field: "Monthly Gross CTC", sample_value: "₹45,000.00", instructions: "Total monthly earnings before deductions." },
      { field: "PF Applicable", sample_value: "Yes (12% employee contribution)", instructions: "Statutory provident fund deduction." },
    ],
    tips: [
      "Salary structures can be updated annually during staff appraisal cycles.",
    ],
  },
  "/trustee/generate-salary": {
    role: "TRUSTEE",
    route_path: "/trustee/generate-salary",
    title: "Monthly Institutional Payroll Processing",
    summary: "Run monthly batch payroll, auto-calculate attendance and leave deductions, and generate bank disbursement sheets.",
    steps: [
      {
        step: 1,
        title: "Select Payroll Month and Academic Year",
        description: "Choose the target disbursement month (e.g. October 2026) and active academic session.",
        dummy_example: "Month: 'October 2026' | Session: '2026-2027'.",
      },
      {
        step: 2,
        title: "Run Automated Payroll Computation",
        description: "Click 'Compute Payroll' -> The engine checks monthly attendance, subtracts unpaid leave days, and computes net pay.",
        dummy_example: "System processes 48 staff records in 3 seconds -> Total Net: ₹16,55,000.",
      },
      {
        step: 3,
        title: "Verify Summary & Disburse",
        description: "Inspect the final summary table. Click 'Finalize & Generate Payslips' to publish slips and export NEFT bank sheet.",
        dummy_example: "Click 'Export Bank Transfer Sheet' (Excel format for corporate net banking upload).",
      },
    ],
    dummy_data: [
      { field: "Payroll Batch ID", sample_value: "PAY-2026-10", instructions: "Generated unique reference code." },
      { field: "Total Staff Count", sample_value: "48 Employees (36 Teaching, 12 Non-Teaching)", instructions: "Headcount included in this payroll run." },
      { field: "Disbursement Mode", sample_value: "Direct Bank NEFT / RTGS", instructions: "Bank payment mode." },
    ],
    tips: [
      "Always ensure all staff attendance regularizations and leaves are approved before finalizing payroll.",
    ],
  },
  "/trustee/student-report": {
    role: "TRUSTEE",
    route_path: "/trustee/student-report",
    title: "Student Enrollment & Demographic Analytics",
    summary: "School-wide enrollment statistics, division strength, gender ratio, RTE student quota, and annual retention.",
    steps: [
      {
        step: 1,
        title: "Review Total Campus Strength",
        description: "Inspect total registered students across Pre-Primary, Primary, Middle, and Secondary sections.",
        dummy_example: "Total Enrolled: 1,280 Students (Boys: 680, Girls: 600) | Capacity: 85.3%.",
      },
      {
        step: 2,
        title: "Filter by Section or Academic Division",
        description: "Analyze class-wise student strength to detect overcrowded classrooms or vacant admission seats.",
        dummy_example: "Class 10th: 120 students across 3 divisions (A: 40, B: 40, C: 40).",
      },
      {
        step: 3,
        title: "Export Board Analytics Report",
        description: "Click 'Export to PDF/Excel' for the Board of Trustees quarterly institutional review meeting.",
        dummy_example: "Click 'Export Excel' -> Download consolidated demographic sheet.",
      },
    ],
    dummy_data: [
      { field: "RTE Quota Ratio", sample_value: "25% Government RTE seats filled", instructions: "Right to Education statutory tracking." },
      { field: "Retention Rate", sample_value: "97.4% year-over-year retention", instructions: "Annual re-enrollment indicator." },
    ],
    tips: [
      "Use this report during annual budget planning to estimate student fee revenues for the upcoming session.",
    ],
  },
  "/trustee/inventory-report": {
    role: "TRUSTEE",
    route_path: "/trustee/inventory-report",
    title: "School Store & Uniform Asset Valuation",
    summary: "Audit uniform inventory, books, school store merchandise valuation, purchase costs, and store ledger balance.",
    steps: [
      {
        step: 1,
        title: "Check Total Stock Asset Valuation",
        description: "View the total financial value of school uniforms, books, stationery, and laboratory supplies in stock.",
        dummy_example: "Total Inventory Value: ₹6,80,000 across 42 active SKUs.",
      },
      {
        step: 2,
        title: "Review Low Stock & Fast-Moving Items",
        description: "Inspect items nearing minimum reorder thresholds to approve vendor purchase orders in advance.",
        dummy_example: "Low Stock Alert: Regular School Shirt (Size 32) has only 6 pieces remaining.",
      },
      {
        step: 3,
        title: "Audit Distribution & Wastage Losses",
        description: "Review damaged or exchanged items written off during the semester.",
        dummy_example: "Exchanges: 14 uniforms replaced for size adjustment | Damaged: 2 written off.",
      },
    ],
    dummy_data: [
      { field: "Stock Valuation Mode", sample_value: "FIFO (First In First Out) Cost Valuation", instructions: "Accounting valuation standard." },
    ],
    tips: [
      "Schedule physical stock audits at the end of each academic term.",
    ],
  },
  "/trustee/library-report": {
    role: "TRUSTEE",
    route_path: "/trustee/library-report",
    title: "Library Book Assets & Circulation Velocity",
    summary: "Institutional library valuation, active borrowing velocity, lost/damaged replacements, and fine receipts.",
    steps: [
      {
        step: 1,
        title: "Inspect Total Book Asset Value",
        description: "Review the cumulative procurement value of all cataloged volumes, reference encyclopedias, and journals.",
        dummy_example: "Total Titles: 4,500 | Total Physical Copies: 14,200 | Asset Value: ₹28,40,000.",
      },
      {
        step: 2,
        title: "Review Circulation Velocity & Top Borrowers",
        description: "Analyze which classes and subjects have the highest reading engagement.",
        dummy_example: "Top Borrowing Class: 9th Standard (84 books read this month).",
      },
      {
        step: 3,
        title: "Inspect Overdue Fine Collections",
        description: "Review total late return penalty fines collected and credited to the school library fund.",
        dummy_example: "Fines Collected This Term: ₹14,250 credited to Library Book Development Fund.",
      },
    ],
    dummy_data: [
      { field: "Asset Depreciation", sample_value: "Standard 10% annual book wear & tear", instructions: "Annual balance sheet depreciation." },
    ],
    tips: [
      "Identify high-demand textbook titles to approve bulk library acquisitions before the new session begins.",
    ],
  },
  "/trustee/subscription": {
    role: "TRUSTEE",
    route_path: "/trustee/subscription",
    title: "School SaaS Software Subscription & Modules",
    summary: "Monitor active ERP modules, student capacity licenses, renewal schedules, and tax invoices.",
    steps: [
      {
        step: 1,
        title: "View Active Plan & Student Quota",
        description: "Confirm current subscription tier and licensed student enrollment ceiling.",
        dummy_example: "Plan: Enterprise Campus Tier | Capacity: Up to 2,500 Students (1,280 Used).",
      },
      {
        step: 2,
        title: "Check Active Modules & Add-Ons",
        description: "Verify that all 8 core modules (Clerk, Teacher, Principal, Fees, Inventory, Library, Trustee, Mobile App) are active.",
        dummy_example: "Status: All 8 modules active and licensed.",
      },
      {
        step: 3,
        title: "Download Tax Invoices for Audits",
        description: "Click 'Download GST Invoice' to obtain compliant invoices for school trust financial audits.",
        dummy_example: "Download Invoice #INV-2026-0042 (GST 18% Compliant).",
      },
    ],
    dummy_data: [
      { field: "License Expiry Date", sample_value: "31/12/2026", instructions: "Annual subscription renewal deadline." },
      { field: "School School ID", sample_value: "SCH-MUM-0024", instructions: "Unique institutional SaaS tenant key." },
    ],
    tips: [
      "Renew your subscription at least 30 days before expiry to ensure uninterrupted parent app access.",
    ],
  },
  "/trustee/activity-logs": {
    role: "TRUSTEE",
    route_path: "/trustee/activity-logs",
    title: "Institutional Security Audit Trail & Activity Logs",
    summary: "Immutable tamper-proof activity logs tracking every user login, fee alteration, marks update, and record deletion.",
    steps: [
      {
        step: 1,
        title: "Filter by Staff Member or Action Type",
        description: "Select an employee or choose an action category such as 'Fee Payment Modification', 'Marks Override', or 'User Login'.",
        dummy_example: "Filter by: 'Fee Alterations' or Staff: 'Clerk Ramesh'.",
      },
      {
        step: 2,
        title: "Inspect IP Address, Timestamp & Exact Changes",
        description: "View before-and-after values, network IP address, and browser agent string for complete accountability.",
        dummy_example: "14/10/2026 10:14 AM - Fee record REC-045 modified: Amount changed from ₹12,000 to ₹10,000 (Reason: Sibling concession).",
      },
      {
        step: 3,
        title: "Export Audit Dossier for Board Verification",
        description: "Click 'Export Audit Log' to download a secure CSV file for internal audit committee review.",
        dummy_example: "Click 'Export CSV' -> Saves complete audit trail.",
      },
    ],
    dummy_data: [
      { field: "Log Security Level", sample_value: "Immutable Append-Only Audit Database", instructions: "Cannot be modified or cleared by staff." },
    ],
    tips: [
      "Review fee modification logs monthly to ensure complete transparency in accounting operations.",
    ],
  },
  "/trustee/announcements": {
    role: "TRUSTEE",
    route_path: "/trustee/announcements",
    title: "Board Circulars & Official Communications",
    summary: "Broadcast official policies, board resolutions, and holiday circulars to faculty and school management.",
    steps: [
      {
        step: 1,
        title: "Create Board Announcement",
        description: "Click '+ New Announcement', write the circular subject, body text, and select audience (All Staff / Teachers Only).",
        dummy_example: "Title: 'Annual Faculty Bonus & Festival Vacation Schedule' | Target: All Staff.",
      },
      {
        step: 2,
        title: "Attach Official Board Circular PDF",
        description: "Upload signed PDF document from Board of Trustees for institutional record.",
        dummy_example: "Attach: 'Board_Resolution_Oct_2026.pdf'.",
      },
      {
        step: 3,
        title: "Publish Circular",
        description: "Click 'Publish' to immediately notify staff dashboards and mobile apps.",
        dummy_example: "Click 'Publish' -> Push notification delivered to 48 staff members.",
      },
    ],
    dummy_data: [
      { field: "Circular Number", sample_value: "CIR-TRUST-2026-08", instructions: "Official board reference code." },
    ],
    tips: [
      "Announcements published by Trustees carry a distinct 'Board Resolution' badge.",
    ],
  },
  "/trustee/events": {
    role: "TRUSTEE",
    route_path: "/trustee/events",
    title: "Trustee Meetings, AGM & School Calendar",
    summary: "Schedule governing body meetings, Annual General Meetings (AGM), inspections, and foundation day functions.",
    steps: [
      {
        step: 1,
        title: "Schedule Board of Trustees Meeting",
        description: "Click '+ Add Event', enter meeting title, agenda, conference hall or Zoom link, and date/time.",
        dummy_example: "Event: 'Q3 Board of Trustees Review Meeting' | Date: 28/10/2026 at 03:00 PM.",
      },
      {
        step: 2,
        title: "Invite Board Members & Principal",
        description: "Select required attendees to dispatch calendar invites and reminder notifications.",
        dummy_example: "Invitees: All Trustees + Principal Dr. Mehta.",
      },
    ],
    dummy_data: [
      { field: "Meeting Venue", sample_value: "Board Room / Executive Conference Hall", instructions: "Physical room or online link." },
    ],
    tips: [
      "Attach meeting agendas in advance so trustees can review financial statements beforehand.",
    ],
  },
  "/trustee/support": {
    role: "TRUSTEE",
    route_path: "/trustee/support",
    title: "Trustee Priority Support Helpdesk",
    summary: "Direct executive support channel with SaaS Super Admin for customizations, data exports, and urgent queries.",
    steps: [
      {
        step: 1,
        title: "Open Priority Support Ticket",
        description: "Click '+ New Ticket', select category (Billing, Custom Feature, Data Migration), and describe request.",
        dummy_example: "Category: 'Custom Accounting Export' | Subject: 'Request for custom Tally ERP export format'.",
      },
      {
        step: 2,
        title: "Track SLA & Technical Resolution",
        description: "Monitor ticket progress with guaranteed 4-hour executive SLA turnaround.",
        dummy_example: "Status: 'In Progress by Senior Solutions Engineer'.",
      },
    ],
    dummy_data: [
      { field: "Priority Level", sample_value: "High / Critical Executive SLA", instructions: "Handled by senior engineering team." },
    ],
    tips: [
      "Include sample export templates or screenshots when requesting custom reports to speed up delivery.",
    ],
  },
  "/trustee/settings": {
    role: "TRUSTEE",
    route_path: "/trustee/settings",
    title: "Trustee Security Credentials & 2FA Settings",
    summary: "Manage executive account profile, update mobile verification numbers, and enforce Two-Factor Authentication.",
    steps: [
      {
        step: 1,
        title: "Update Executive Profile Information",
        description: "Keep phone and emergency contact details current for critical notifications.",
        dummy_example: "Phone: '9822119900' | Email: 'trustee@schooltrust.org'.",
      },
      {
        step: 2,
        title: "Update Password & Security Key",
        description: "Change password regularly to maintain executive security compliance.",
        dummy_example: "Enter current password -> Enter new 12-char passphrase -> Confirm.",
      },
    ],
    dummy_data: [
      { field: "Two-Factor Authentication", sample_value: "Enabled (SMS OTP / Authenticator App)", instructions: "Recommended for all trustee accounts." },
    ],
    tips: [
      "Enable Two-Factor Authentication (2FA) to protect sensitive payroll and audit data.",
    ],
  },

  // ─── CLERK GUIDES ──────────────────────────────────────────────────────────
  "/clerk": {
    role: "CLERK",
    route_path: "/clerk",
    title: "Clerk Workspace Overview",
    summary: "Welcome to the Clerk Control Center. From here you can oversee student admissions, issue certificates, manage daily attendance calling, and handle administrative desks.",
    steps: [
      {
        step: 1,
        title: "Check Today's Summary & Quick Stats",
        description: "View total registered students, pending admissions, and staff attendance on duty at the top dashboard cards.",
        dummy_example: "Stats: Total Students: 450 | Pending Approvals: 5",
      },
      {
        step: 2,
        title: "Access Daily Administrative Desks",
        description: "Use the quick action buttons to immediately open the Absentee Calling Desk or Issue Student Certificates.",
        dummy_example: "Click 'Absentee Desk' to view students absent today.",
      },
      {
        step: 3,
        title: "Navigate Using the Left Sidebar",
        description: "Every module (Admissions, Classes, Subjects, Timetable) is conveniently organized in the left sidebar menu.",
        dummy_example: "Click 'Admissions' > 'Student Directory' to browse records.",
      },
    ],
    dummy_data: [
      { field: "Academic Year", sample_value: "2026-2027", instructions: "Ensure the active academic year is selected before performing student promotions." },
      { field: "Search Filter", sample_value: "Class 8 - Div A", instructions: "Use the dropdown filters to quickly narrow down student lists." },
    ],
    tips: [
      "Click the info (i) button on ANY page to see instant instructions and sample dummy values for that specific screen.",
      "If you make a mistake while entering data, you can edit or cancel before final submission.",
    ],
  },
  "/clerk/students": {
    role: "CLERK",
    route_path: "/clerk/students",
    title: "Student Directory & Records Guide",
    summary: "Search, filter, view, and update comprehensive student enrollment records and bio-data.",
    steps: [
      {
        step: 1,
        title: "Filter by Class and Division",
        description: "Select the Class (e.g. Class 10) and Division (e.g. Div A) from the top dropdowns to display the list of students.",
        dummy_example: "Select Class: 'Class 9' | Division: 'B'",
      },
      {
        step: 2,
        title: "Search by Student Name or G.R. Number",
        description: "Type the student's name, G.R. Number, or Roll Number into the search bar to locate their record in real time.",
        dummy_example: "Type 'Aarav' or G.R. 'GR-2024-0012'",
      },
      {
        step: 3,
        title: "View or Edit Profile",
        description: "Click the 'View Profile' or 'Edit' button next to any student to view their full details, parent contacts, or update information.",
        dummy_example: "Click the eye icon to view full profile card.",
      },
    ],
    dummy_data: [
      { field: "G.R. Number", sample_value: "GR-2026-0145", instructions: "Unique General Register number assigned at admission." },
      { field: "Student Full Name", sample_value: "Sharma Aarav Manoj", instructions: "Format: Last Name First Name Father's Name" },
      { field: "Date of Birth", sample_value: "14/05/2012", instructions: "DD/MM/YYYY format as on birth certificate." },
      { field: "Parent Phone", sample_value: "9876543210", instructions: "10-digit mobile number for SMS notifications." },
    ],
    tips: [
      "You can export the entire student list to Excel/PDF using the Export button on the top right.",
      "Always verify the student's G.R. Number before printing official transfer certificates.",
    ],
  },
  "/clerk/certificates": {
    role: "CLERK",
    route_path: "/clerk/certificates",
    title: "Leaving / Transfer Certificate (LC/TC) Desk",
    summary: "Generate, verify, and print official Leaving Certificates (LC) and Transfer Certificates (TC) for departing students.",
    show_video: true,
    video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    steps: [
      {
        step: 1,
        title: "Search Student Record",
        description: "Enter the G.R. Number or student name to find the student's academic background and school history.",
        reading_time: "1 min read",
        dummy_example: 'Search "GR-2024-089" or "Pooja Patel"',
      },
      {
        step: 2,
        title: "Verify Leaving Details & Conduct",
        description: "Check the student's leaving details, conduct, and required information before generating the certificate.",
        reading_time: "2 min read",
        checklist: [
          "Verify last attending class and leaving date.",
          "Check conduct and remarks.",
          "Ensure applicable dues are cleared.",
          "Review the student's academic records.",
        ],
      },
      {
        step: 3,
        title: "Generate and Print Certificate",
        description: "Generate the appropriate certificate, verify the details, and print the official document.",
        reading_time: "1 min read",
        options: [
          "Generate Leaving Certificate (LC)",
          "Generate Transfer Certificate (TC)",
          "Preview before printing",
          "Download PDF when supported",
        ],
      },
    ],
    dummy_data: [
      { field: "G.R. Number", sample_value: "GR-2024-089", instructions: "Unique General Register identification number." },
      { field: "Student Name", sample_value: "Pooja Patel", instructions: "Full student name as recorded in G.R. Register." },
      { field: "Reason for Leaving", sample_value: "Completed Secondary Schooling / Parent Transfer", instructions: "Select official reason from dropdown or type custom note." },
      { field: "Progress & Conduct", sample_value: "Good / Satisfactory", instructions: "Remarks will appear on the final printed LC." },
      { field: "Date of Leaving", sample_value: "31/03/2026", instructions: "Last official school attendance date." },
    ],
    tips: [
      "Ensure all outstanding library books and fees are cleared before issuing the Leaving Certificate.",
      "A digital copy of every generated certificate is permanently archived in the General Register.",
      "Preview the certificate on screen to check student spelling before final printing.",
    ],
  },
  "/clerk/general-register": {
    role: "CLERK",
    route_path: "/clerk/general-register",
    title: "General Register (G.R. Book) Master Archive",
    summary: "Official government-mandated student permanent record register spanning all historical batches.",
    steps: [
      {
        step: 1,
        title: "Search G.R. Ledger by Number or Year",
        description: "Enter the sequential G.R. number (e.g. 1042) or filter by admission batch year.",
        dummy_example: "Search G.R. '1042' or Batch '2022-2023'.",
      },
      {
        step: 2,
        title: "Inspect Official Student Entry Details",
        description: "Verify religion, caste, mother tongue, previous school attended, and date of admission.",
        dummy_example: "Entry: Aarav Sharma | Admitted: 15/06/2022 | Previous School: St. Xavier's.",
      },
      {
        step: 3,
        title: "Print Official G.R. Page Extract",
        description: "Click 'Print Extract' when parents request a certified extract for passport or government verification.",
        dummy_example: "Click 'Print G.R. Extract' -> Generates formatted stampable sheet.",
      },
    ],
    dummy_data: [
      { field: "G.R. Number", sample_value: "1042", instructions: "Sequential permanent register entry number." },
      { field: "Mother Tongue", sample_value: "Marathi / Hindi / English", instructions: "Required for government education department returns." },
    ],
    tips: [
      "The General Register is the permanent legal archive of the institution and should never be deleted.",
    ],
  },
  "/clerk/departments": {
    role: "CLERK",
    route_path: "/clerk/departments",
    title: "School Departments Directory",
    summary: "Manage academic and administrative departments and view assigned staff faculty.",
    steps: [
      {
        step: 1,
        title: "Review Department List",
        description: "Inspect departments, total active staff in each department, and appointed Department Heads (HODs).",
        dummy_example: "Science Department: 11 Teachers | HOD: Dr. Arvind Kulkarni.",
      },
      {
        step: 2,
        title: "Add or Edit Department",
        description: "Click '+ Add Department', fill name, code, and select HOD from the staff directory.",
        dummy_example: "Title: 'Languages & Literature' | Code: 'DEPT-LANG' | HOD: 'Mrs. Rekha Joshi'.",
      },
    ],
    dummy_data: [
      { field: "Department Name", sample_value: "Department of Mathematics", instructions: "Official departmental title." },
      { field: "Department Code", sample_value: "DEPT-MATH-01", instructions: "Alphanumeric short code." },
    ],
    tips: [
      "Departments help organize class timetables and staff duty rosters cleanly.",
    ],
  },
  "/clerk/staff": {
    role: "CLERK",
    route_path: "/clerk/staff",
    title: "Staff & Faculty Directory",
    summary: "Browse faculty records, designation listings, emergency phone numbers, and employee profiles.",
    steps: [
      {
        step: 1,
        title: "Search Faculty Member",
        description: "Type staff name or employee ID to pull up their contact details and qualifications.",
        dummy_example: "Search 'EMP-TC-0042' or 'Pooja Sharma'.",
      },
      {
        step: 2,
        title: "View or Update Profile",
        description: "Click on staff card to inspect their assigned classes, teaching subjects, and contact information.",
        dummy_example: "Click 'View Details' -> View assigned Class 9-A & 10-B Math lectures.",
      },
    ],
    dummy_data: [
      { field: "Employee ID", sample_value: "EMP-2026-0042", instructions: "Unique school employment identifier." },
      { field: "Mobile Number", sample_value: "9820123456", instructions: "10-digit phone for emergency alerts." },
    ],
    tips: [
      "Keep faculty mobile numbers updated for urgent school announcements.",
    ],
  },
  "/clerk/admission-form": {
    role: "CLERK",
    route_path: "/clerk/admission-form",
    title: "Online Admission Form Builder",
    summary: "Customize inquiry form questions, toggle required documents, and publish the public admission link.",
    steps: [
      {
        step: 1,
        title: "Configure Required Student & Parent Fields",
        description: "Toggle fields like Aadhar Card Number, Blood Group, Father's Occupation, and Previous Schooling.",
        dummy_example: "Toggle 'Aadhar Card Number' -> Set as 'Mandatory Field'.",
      },
      {
        step: 2,
        title: "Set Active Academic Session & Application Fee",
        description: "Specify the session for intake and set the registration fee amount if applicable.",
        dummy_example: "Academic Year: '2026-2027' | Application Fee: ₹500.",
      },
      {
        step: 3,
        title: "Copy Public Link or Embed Code",
        description: "Copy the generated public form URL to share on the school website or social media.",
        dummy_example: "Click 'Copy Link' -> Share 'https://school.edu/admission/apply'.",
      },
    ],
    dummy_data: [
      { field: "Intake Session", sample_value: "2026-2027", instructions: "Admission year." },
      { field: "Application Fee", sample_value: "₹500.00", instructions: "Collected via online payment gateway." },
    ],
    tips: [
      "Test the public link in an incognito window before broadcasting to parents.",
    ],
  },
  "/clerk/manual-admission": {
    role: "CLERK",
    route_path: "/clerk/manual-admission",
    title: "Direct Offline Student Admission Desk",
    summary: "Admit students directly into the school register, allocate General Register numbers, and enroll into classes.",
    steps: [
      {
        step: 1,
        title: "Enter Student Personal Information",
        description: "Fill student's legal name, date of birth, gender, blood group, and mother tongue.",
        dummy_example: "Full Name: 'Deshmukh Aarav Sunil' | DOB: '15/06/2018' | Gender: 'Male'.",
      },
      {
        step: 2,
        title: "Enter Parent / Guardian Bio-Data",
        description: "Fill father and mother names, mobile numbers, occupation, and home address.",
        dummy_example: "Father: 'Sunil Deshmukh' | Phone: '9820112233' | Address: '402, Green Valley, Pune'.",
      },
      {
        step: 3,
        title: "Assign Class, Division & G.R. Number",
        description: "Select the class they are entering, allocate the next sequential G.R. number, and click 'Submit Admission'.",
        dummy_example: "Class: 'Class 1st - Div A' | G.R. No: 'GR-2026-0315' -> Click 'Admit Student'.",
      },
    ],
    dummy_data: [
      { field: "G.R. Number", sample_value: "GR-2026-0315", instructions: "Sequential registration number." },
      { field: "Student Name", sample_value: "Deshmukh Aarav Sunil", instructions: "Format: Surname First Name Middle Name" },
      { field: "Date of Birth", sample_value: "15/06/2018", instructions: "Verify against birth certificate." },
      { field: "Primary Contact", sample_value: "9820112233", instructions: "10-digit mobile number for SMS alerts." },
    ],
    tips: [
      "Double check spelling against the official municipal birth certificate before finalizing admission.",
    ],
  },
  "/clerk/temp-users": {
    role: "CLERK",
    route_path: "/clerk/temp-users",
    title: "Prospective Applicants & Inquiry Desk",
    summary: "Review online admission applications, check uploaded parent documents, and convert approved leads to students.",
    steps: [
      {
        step: 1,
        title: "Review Incoming Online Applications",
        description: "Inspect newly submitted applicant tokens, student names, and desired class grades.",
        dummy_example: "Applicant: 'Priya Joshi' applied for 'Class 5th' on 14/10/2026.",
      },
      {
        step: 2,
        title: "Verify Uploaded Birth Certificate & Marksheet",
        description: "Click 'View Documents' to preview uploaded parent PDFs or photos.",
        dummy_example: "Inspect Birth Certificate PDF -> Mark as 'Documents Verified'.",
      },
      {
        step: 3,
        title: "Approve and Convert to Admitted Student",
        description: "Click 'Accept Admission' to allocate a G.R. number and convert the applicant into an active enrolled student.",
        dummy_example: "Click 'Convert to Student' -> Assigns G.R. 'GR-2026-0316'.",
      },
    ],
    dummy_data: [
      { field: "Application Token", sample_value: "APP-2026-0491", instructions: "Unique online submission token." },
      { field: "Verification Status", sample_value: "Verified / Incomplete Documents", instructions: "Tracks documentation review." },
    ],
    tips: [
      "You can send an automated SMS request to parents if uploaded documents are blurry or incomplete.",
    ],
  },
  "/clerk/categories": {
    role: "CLERK",
    route_path: "/clerk/categories",
    title: "School Section Categories Master",
    summary: "Configure institutional sections: Pre-Primary, Primary, Middle School, Secondary, and Higher Secondary.",
    steps: [
      {
        step: 1,
        title: "Inspect Configured Sections",
        description: "Review school levels (e.g. Primary School covering Classes 1 to 5).",
        dummy_example: "Categories: Pre-Primary, Primary (1-5), Secondary (6-10).",
      },
      {
        step: 2,
        title: "Add New Educational Category",
        description: "Click '+ Add Category', provide name and internal code.",
        dummy_example: "Name: 'Junior College / Higher Secondary' | Code: 'HSC-SEC'.",
      },
    ],
    dummy_data: [
      { field: "Category Name", sample_value: "Primary Section (Grades 1-5)", instructions: "Displayed on student records." },
      { field: "Section Code", sample_value: "CAT-PRIM", instructions: "Unique system identifier." },
    ],
    tips: [
      "Categories allow grouping classes for different fee structures and exam grading rules.",
    ],
  },
  "/clerk/classes": {
    role: "CLERK",
    route_path: "/clerk/classes",
    title: "Classes & Standards Configuration",
    summary: "Set up grades (1st through 12th standard), specify numeric levels, and assign classroom locations.",
    steps: [
      {
        step: 1,
        title: "Inspect Active School Classes",
        description: "Review current standards (e.g. 1st Standard, 2nd Standard ... 10th Standard).",
        dummy_example: "Classes: 10 active classes configured for academic year 2026-2027.",
      },
      {
        step: 2,
        title: "Add New Class Level",
        description: "Click '+ Add Class' -> Enter class name, numeric standard, and educational section category.",
        dummy_example: "Class Name: '10th Standard' | Numeric Standard: '10' | Category: 'Secondary'.",
      },
      {
        step: 3,
        title: "Specify Seating Capacity & Room",
        description: "Set maximum student strength and default classroom wing.",
        dummy_example: "Room: 'Room 302 (Second Floor)' | Max Strength: 45 Students.",
      },
    ],
    dummy_data: [
      { field: "Class Name", sample_value: "10th Standard", instructions: "Display name on reports." },
      { field: "Numeric Standard", sample_value: "10", instructions: "Used for sorting grades sequentially." },
      { field: "Classroom Number", sample_value: "Room 304", instructions: "Physical room allocation." },
    ],
    tips: [
      "Numeric standard values ensure report cards and roll call registers sort grades in correct chronological order.",
    ],
  },
  "/clerk/student-profiles": {
    role: "CLERK",
    route_path: "/clerk/student-profiles",
    title: "Comprehensive Student Dossier & Biometrics",
    summary: "Detailed student profiles: medical allergies, blood group, parent Aadhar, and emergency contacts.",
    steps: [
      {
        step: 1,
        title: "Search Student Profile",
        description: "Enter G.R. Number or student name to pull up their complete bio-data dossier.",
        dummy_example: "Search 'GR-2026-0145' - Aarav Sharma.",
      },
      {
        step: 2,
        title: "Update Health or Parent Records",
        description: "Record blood group, emergency doctor contact, or updated residential address.",
        dummy_example: "Blood Group: 'O+' | Emergency Contact: '9820112233' (Father).",
      },
      {
        step: 3,
        title: "Print Digital Student ID Card",
        description: "Click 'Print ID Card' to produce a formatted photo ID card for the student.",
        dummy_example: "Click 'Print ID Card' -> Formatted student card layout.",
      },
    ],
    dummy_data: [
      { field: "Blood Group", sample_value: "O+ / B+ / A+", instructions: "Essential for campus medical room." },
      { field: "Emergency Contact", sample_value: "9820112233", instructions: "Immediate contact for medical emergency." },
    ],
    tips: [
      "Upload a clear 2x2 passport photograph with white background for best ID card print quality.",
    ],
  },
  "/clerk/divisions": {
    role: "CLERK",
    route_path: "/clerk/divisions",
    title: "Divisions & Sections Management",
    summary: "Configure sections (A, B, C) for each standard and assign dedicated class teachers.",
    steps: [
      {
        step: 1,
        title: "Select Class Standard",
        description: "Choose the target grade from the dropdown (e.g. 9th Standard).",
        dummy_example: "Select Class: '9th Standard'.",
      },
      {
        step: 2,
        title: "View or Create Section Division",
        description: "Inspect existing divisions (Div A, Div B) or click '+ Add Division' to create Div C.",
        dummy_example: "Division Name: 'Div C' | Section Letter: 'C'.",
      },
      {
        step: 3,
        title: "Appoint Assigned Class Teacher",
        description: "Assign the faculty member who will be responsible for morning attendance and report cards.",
        dummy_example: "Class Teacher: 'Mrs. Neha Kulkarni' -> Click 'Save Division'.",
      },
    ],
    dummy_data: [
      { field: "Division Name", sample_value: "Div A", instructions: "Section identifier." },
      { field: "Class Teacher", sample_value: "Mrs. Neha Kulkarni", instructions: "Primary classroom supervisor." },
    ],
    tips: [
      "Changing the class teacher automatically re-routes morning attendance notifications to the new faculty.",
    ],
  },
  "/clerk/assign-division": {
    role: "CLERK",
    route_path: "/clerk/assign-division",
    title: "Batch Student Division Allocation",
    summary: "Allocate admitted students to specific classroom divisions in bulk.",
    steps: [
      {
        step: 1,
        title: "Select Class Standard and Academic Year",
        description: "Choose the target grade to pull up all students awaiting section allocation.",
        dummy_example: "Class: 'Class 8th' | Session: '2026-2027'.",
      },
      {
        step: 2,
        title: "Select Students to Allocate",
        description: "Check the boxes next to students or use 'Select All' to allocate in batch.",
        dummy_example: "Selected: 25 students awaiting division assignment.",
      },
      {
        step: 3,
        title: "Assign Target Division & Confirm",
        description: "Select target division (e.g. Div B) and click 'Allocate Students'.",
        dummy_example: "Target: 'Div B' -> Click 'Assign Division'.",
      },
    ],
    dummy_data: [
      { field: "Target Division", sample_value: "Div A / Div B / Div C", instructions: "Target section." },
    ],
    tips: [
      "Maintain balanced student strengths across sections (e.g. 40 students per division).",
    ],
  },
  "/clerk/assign-roll-no": {
    role: "CLERK",
    route_path: "/clerk/assign-roll-no",
    title: "Roll Number Generation Desk",
    summary: "Assign sequential roll numbers alphabetically (A to Z) or by G.R. number across classes.",
    steps: [
      {
        step: 1,
        title: "Select Class and Division",
        description: "Choose the class roster you wish to re-index (e.g. Class 10th - Div A).",
        dummy_example: "Class: 'Class 10' | Division: 'A'.",
      },
      {
        step: 2,
        title: "Choose Roll Number Sorting Scheme",
        description: "Select 'Alphabetical by Student Full Name' or 'By Admission G.R. Number'.",
        dummy_example: "Selected scheme: 'Alphabetical (A to Z)'.",
      },
      {
        step: 3,
        title: "Preview & Save Roll Numbers",
        description: "Review the generated preview table and click 'Save & Apply Roll Numbers'.",
        dummy_example: "Preview: Roll 1: Aarav Sharma | Roll 2: Ananya Patel -> Click 'Confirm'.",
      },
    ],
    dummy_data: [
      { field: "Sorting Rule", sample_value: "Alphabetical by Surname (A to Z)", instructions: "Standard board examination convention." },
    ],
    tips: [
      "Generate roll numbers after admissions close so numbers remain sequential throughout the academic year.",
    ],
  },
  "/clerk/student-promotion": {
    role: "CLERK",
    route_path: "/clerk/student-promotion",
    title: "Annual Student Academic Promotion",
    summary: "Promote students to the next grade level at the end of the academic year.",
    steps: [
      {
        step: 1,
        title: "Select Source Class & Target Academic Year",
        description: "Choose the current grade (e.g. Class 9 - 2025-2026) and destination session (2026-2027).",
        dummy_example: "From: 'Class 9 (2025-26)' -> Promote To: 'Class 10 (2026-27)'.",
      },
      {
        step: 2,
        title: "Review Pass / Detain Status",
        description: "All passing students are pre-checked. Uncheck any student detained due to academic results.",
        dummy_example: "42 students passed -> Pre-checked for promotion to Class 10.",
      },
      {
        step: 3,
        title: "Run Promotion Batch",
        description: "Click 'Promote Selected Students' -> All promoted records migrate to the next academic session.",
        dummy_example: "Click 'Execute Promotion' -> Success message confirms 42 students promoted.",
      },
    ],
    dummy_data: [
      { field: "Next Academic Year", sample_value: "2026-2027", instructions: "Target academic session." },
      { field: "Promotion Status", sample_value: "Promoted to Standard 10th", instructions: "Recorded in student history." },
    ],
    tips: [
      "Graduating 10th standard students should be processed via the Certificate Desk rather than promotion.",
    ],
  },
  "/clerk/absentee-desk": {
    role: "CLERK",
    route_path: "/clerk/absentee-desk",
    title: "Absentee Calling Desk Guide",
    summary: "Daily workflow to monitor students absent today, call parents, and log absence reasons.",
    steps: [
      {
        step: 1,
        title: "Review Today's Absent List",
        description: "Once class teachers submit morning attendance, all absent students populate on this calling board automatically.",
        dummy_example: "List shows 12 absent students across all classes.",
      },
      {
        step: 2,
        title: "Call Parent / Guardian",
        description: "Click the Call button or dial the parent phone number displayed on the student card.",
        dummy_example: "Parent: Ramesh Patel (9820112233)",
      },
      {
        step: 3,
        title: "Log the Reason for Absence",
        description: "Select the reason (e.g. Sickness, Family Function, Uninformed) and save the status.",
        dummy_example: "Reason: 'Viral fever - 2 days rest advised by doctor.'",
      },
    ],
    dummy_data: [
      { field: "Absence Category", sample_value: "Medical / Sick Leave", instructions: "Categorize the reason so monthly health reports are accurate." },
      { field: "Call Status", sample_value: "Spoke with Mother / Call Connected", instructions: "Record if call was answered or line was busy." },
    ],
    tips: [
      "Automated SMS alerts can be sent to unanswered numbers with one click.",
    ],
  },
  "/clerk/staff-attendance": {
    role: "CLERK",
    route_path: "/clerk/staff-attendance",
    title: "Staff Daily Attendance Monitoring",
    summary: "Monitor real-time teacher and administrative staff check-ins, biometric punches, and punctuality.",
    steps: [
      {
        step: 1,
        title: "Check Today's Staff Muster Status",
        description: "Review total present, absent, on-duty, and late-coming staff members at morning assembly.",
        dummy_example: "Today: 44 Present | 2 on Approved Leave | 2 Late (>15 mins).",
      },
      {
        step: 2,
        title: "Filter by Department",
        description: "Filter between Teaching Faculty, Administration, Laboratory Staff, and Support Staff.",
        dummy_example: "Select 'Teaching Faculty' to verify that all morning lecture rooms have instructors.",
      },
      {
        step: 3,
        title: "Export Monthly Muster Roll",
        description: "Click 'Export Monthly Muster' to supply verified attendance data to the Trustee payroll desk.",
        dummy_example: "Click 'Export Excel' -> Saves complete monthly staff muster.",
      },
    ],
    dummy_data: [
      { field: "Attendance Threshold", sample_value: "Grace time: 15 minutes after 08:00 AM", instructions: "Late arrivals flagged after grace period." },
    ],
    tips: [
      "Late arrivals exceeding 3 instances per month trigger automated half-day leave calculations.",
    ],
  },
  "/clerk/attendance-exceptions": {
    role: "CLERK",
    route_path: "/clerk/attendance-exceptions",
    title: "Staff Attendance Exceptions & Regularization",
    summary: "Review regularization requests submitted by staff members for missed biometric punches.",
    steps: [
      {
        step: 1,
        title: "Review Submitted Regularization Requests",
        description: "Inspect requests submitted by teachers who missed morning punch-in due to bus duty or meetings.",
        dummy_example: "Teacher Sneha requested punch adjustment: 'Bus duty at north gate at 07:45 AM'.",
      },
      {
        step: 2,
        title: "Verify Proof & Gate Register",
        description: "Cross check with the physical security gate register or bus log sheet.",
        dummy_example: "Security log confirms arrival at 07:42 AM.",
      },
      {
        step: 3,
        title: "Forward to Principal for Approval",
        description: "Click 'Recommend Approval' to send the verified request to the Principal's approval queue.",
        dummy_example: "Click 'Forward to Principal' -> Moves to executive approval queue.",
      },
    ],
    dummy_data: [
      { field: "Regularization Reason", sample_value: "Official Outdoor Duty / Biometric Scanner Fault", instructions: "Justification provided by staff." },
    ],
    tips: [
      "Approved regularizations restore the punch timestamp so salary deductions are not applied.",
    ],
  },
  "/clerk/location-settings": {
    role: "CLERK",
    route_path: "/clerk/location-settings",
    title: "Attendance Geofence Zone Settings",
    summary: "Configure school campus GPS coordinates and mobile check-in radius for staff mobile apps.",
    steps: [
      {
        step: 1,
        title: "Set School Campus GPS Coordinates",
        description: "Enter campus Latitude and Longitude or click 'Detect Current Location' while standing on campus.",
        dummy_example: "Latitude: '19.0760' | Longitude: '72.8777'.",
      },
      {
        step: 2,
        title: "Define Allowed Geofence Radius",
        description: "Set the distance in meters within which teachers' mobile apps will allow attendance check-in.",
        dummy_example: "Radius: '150 Meters' (covers main school building and sports ground).",
      },
      {
        step: 3,
        title: "Save & Activate Geofence",
        description: "Click 'Save Zone Settings' to update the mobile attendance verification engine immediately.",
        dummy_example: "Click 'Save Zone' -> Staff cannot punch outside 150m radius.",
      },
    ],
    dummy_data: [
      { field: "Latitude", sample_value: "19.076090", instructions: "Precise campus decimal coordinate." },
      { field: "Longitude", sample_value: "72.877726", instructions: "Precise campus decimal coordinate." },
      { field: "Geofence Radius", sample_value: "150 Meters", instructions: "Allowed punch boundary around center." },
    ],
    tips: [
      "Keep the radius between 100m to 200m to allow for standard smartphone GPS drift.",
    ],
  },
  "/clerk/subjects": {
    role: "CLERK",
    route_path: "/clerk/subjects",
    title: "Master Curriculum Subjects Configuration",
    summary: "Define academic subjects, assign subject codes, specify theory vs practical hours, and map to grades.",
    steps: [
      {
        step: 1,
        title: "Inspect Active Subjects",
        description: "Review current curriculum subjects (Mathematics, General Science, English Literature, Social Sciences).",
        dummy_example: "Subjects: 14 subjects active for primary and secondary sections.",
      },
      {
        step: 2,
        title: "Add New Subject",
        description: "Click '+ Add Subject' -> Enter subject title, code, subject category (Core / Elective), and evaluation type.",
        dummy_example: "Title: 'Computer Applications' | Code: 'CS-101' | Type: 'Theory + Practical'.",
      },
      {
        step: 3,
        title: "Map to Applicable Classes",
        description: "Check the grades where this subject is taught (e.g. Classes 6th through 10th).",
        dummy_example: "Applicable: Classes 6, 7, 8, 9, 10 -> Click 'Save Subject'.",
      },
    ],
    dummy_data: [
      { field: "Subject Name", sample_value: "Mathematics & Geometry", instructions: "Official curriculum name." },
      { field: "Subject Code", sample_value: "MATH-SEC-01", instructions: "Unique syllabus code." },
      { field: "Subject Type", sample_value: "Core Subject (Theory)", instructions: "Core / Elective / Practical / Activity." },
    ],
    tips: [
      "Subject codes are used on examination marksheet prints and gazette reports.",
    ],
  },
  "/clerk/syllabus": {
    role: "CLERK",
    route_path: "/clerk/syllabus",
    title: "Syllabus Plan & Chapter Units",
    summary: "Plan chapter topics, allocate teaching periods, and track term-wise syllabus completion.",
    steps: [
      {
        step: 1,
        title: "Select Class and Subject",
        description: "Pick target class and subject (e.g. Class 10 - Science).",
        dummy_example: "Class: 'Class 10' | Subject: 'Science'.",
      },
      {
        step: 2,
        title: "Add Chapter Units & Target Lectures",
        description: "Enter chapter name, target lecture periods, and term distribution (Term 1 vs Term 2).",
        dummy_example: "Unit 1: 'Chemical Reactions and Equations' | Estimated Periods: 12 | Term: Term 1.",
      },
    ],
    dummy_data: [
      { field: "Unit Title", sample_value: "Periodic Classification of Elements", instructions: "Chapter title." },
      { field: "Estimated Hours", sample_value: "10 Teaching Periods", instructions: "Planned duration." },
    ],
    tips: [
      "Teachers can view this syllabus outline directly on their Teacher Workspace.",
    ],
  },
  "/clerk/assign-teacher": {
    role: "CLERK",
    route_path: "/clerk/assign-teacher",
    title: "Teacher Subject & Classroom Allocation",
    summary: "Link subject teachers to specific classroom divisions for timetable scheduling.",
    steps: [
      {
        step: 1,
        title: "Select Class and Division",
        description: "Choose the target division (e.g. Class 9 - Div A).",
        dummy_example: "Class: 'Class 9' | Division: 'A'.",
      },
      {
        step: 2,
        title: "Assign Teachers to Each Subject",
        description: "Assign faculty members from dropdowns for Math, English, Science, etc.",
        dummy_example: "Mathematics -> 'Mr. Anand Kulkarni' | Science -> 'Dr. Arvind Kulkarni'.",
      },
      {
        step: 3,
        title: "Save Teaching Allocations",
        description: "Click 'Save Allocations' to update teacher timetables and student classroom cards.",
        dummy_example: "Click 'Save Allocations' -> Success notification confirms assignment.",
      },
    ],
    dummy_data: [
      { field: "Subject Faculty", sample_value: "Mr. Anand Kulkarni", instructions: "Assigned teaching instructor." },
    ],
    tips: [
      "Teachers can only enter exam marks for classes and subjects officially assigned to them.",
    ],
  },
  "/clerk/teacher-workload": {
    role: "CLERK",
    route_path: "/clerk/teacher-workload",
    title: "Teacher Workload & Period Distribution",
    summary: "Analyze weekly teaching period counts, balance teacher schedules, and avoid overloading.",
    steps: [
      {
        step: 1,
        title: "Review Faculty Weekly Period Counts",
        description: "Inspect total teaching periods assigned per teacher per week (Standard: 28 to 32 periods/week).",
        dummy_example: "Mr. Kulkarni: 28 periods/week | Mrs. Joshi: 30 periods/week.",
      },
      {
        step: 2,
        title: "Detect Consecutive Lecture Overloads",
        description: "Ensure no faculty member has more than 3 consecutive heavy lectures without a break period.",
        dummy_example: "Check timetable matrix for continuous lecture conflicts.",
      },
    ],
    dummy_data: [
      { field: "Standard Workload", sample_value: "30 Periods / Week (6 periods / day)", instructions: "Standard board teacher workload norm." },
    ],
    tips: [
      "Keep at least one free period per day for every teacher for paper grading and lesson preparation.",
    ],
  },
  "/clerk/timetable": {
    role: "CLERK",
    route_path: "/clerk/timetable",
    title: "Master Weekly Classroom Timetable",
    summary: "Build and print weekly timetable schedules (Monday through Saturday) for each class division.",
    steps: [
      {
        step: 1,
        title: "Select Class and Division",
        description: "Choose the classroom schedule you wish to view or edit (e.g. Class 10 - Div A).",
        dummy_example: "Class: 'Class 10' | Division: 'A'.",
      },
      {
        step: 2,
        title: "Assign Subject and Teacher to Period Slots",
        description: "Click on any period slot (e.g. Monday Period 1 - 08:00 AM) to select Subject and Teacher.",
        dummy_example: "Monday Period 1: Mathematics (Mr. Kulkarni) | Period 2: English (Mrs. Rao).",
      },
      {
        step: 3,
        title: "Print or Export Timetable Grid",
        description: "Click 'Print Timetable' to produce the framed classroom schedule for display on the classroom noticeboard.",
        dummy_example: "Click 'Print' -> Clean A4 weekly schedule format.",
      },
    ],
    dummy_data: [
      { field: "Period Duration", sample_value: "45 Minutes per Period", instructions: "Standard school lecture duration." },
      { field: "Recess / Break", sample_value: "10:30 AM - 11:00 AM", instructions: "School lunch and recess slot." },
    ],
    tips: [
      "The system alerts you immediately if a teacher is accidentally scheduled in two different rooms at the same time.",
    ],
  },
  "/clerk/announcements": {
    role: "CLERK",
    route_path: "/clerk/announcements",
    title: "School Circulars & Parent Notice Board",
    summary: "Publish official school notices, bus route updates, and holiday circulars.",
    steps: [
      {
        step: 1,
        title: "Create Notice Circular",
        description: "Click '+ New Announcement', type subject title and detailed circular instructions.",
        dummy_example: "Title: 'School Uniform Inspection & Winter Jacket Guidelines'.",
      },
      {
        step: 2,
        title: "Select Target Audience",
        description: "Choose whether the circular is for All School, Specific Classes, or Staff Only.",
        dummy_example: "Target: 'All Students & Parents'.",
      },
      {
        step: 3,
        title: "Publish to Portal & Mobile Apps",
        description: "Click 'Publish' to dispatch immediate portal notices and mobile app notifications.",
        dummy_example: "Click 'Publish' -> Delivered to all active parent accounts.",
      },
    ],
    dummy_data: [
      { field: "Circular Category", sample_value: "General / Examination / Transportation", instructions: "Categorizes notice." },
    ],
    tips: [
      "Attach PDF circulars when publishing formal notices bearing the school principal's signature.",
    ],
  },
  "/clerk/events": {
    role: "CLERK",
    route_path: "/clerk/events",
    title: "School Calendar, Holidays & Function Dates",
    summary: "Maintain official school academic calendar, national holidays, exam weeks, and sports days.",
    steps: [
      {
        step: 1,
        title: "Review Upcoming Events Calendar",
        description: "Inspect scheduled institutional holidays, semester breaks, and annual celebrations.",
        dummy_example: "Event: 'Annual Sports Day' - 20th December 2026.",
      },
      {
        step: 2,
        title: "Add New School Holiday or Function",
        description: "Click '+ Add Event' -> Enter title, date range, and whether campus will be closed.",
        dummy_example: "Title: 'Independence Day Celebration' | Date: 15/08/2026 | Campus: Open (Flag Hoisting).",
      },
    ],
    dummy_data: [
      { field: "Holiday Type", sample_value: "National Holiday / Term Break / Function", instructions: "Identifies event type." },
    ],
    tips: [
      "Holidays entered here automatically populate into teacher and student calendars across the portal.",
    ],
  },
  "/clerk/leave-requests": {
    role: "CLERK",
    route_path: "/clerk/leave-requests",
    title: "Staff Leave Applications Processing Desk",
    summary: "Process leave applications from teachers and staff, verify substitute arrangements, and forward for approval.",
    steps: [
      {
        step: 1,
        title: "Review Submitted Staff Applications",
        description: "Inspect teacher leave requests, leave balances, and proposed substitute teacher coverage.",
        dummy_example: "Application: Mrs. Joshi requesting 2 days Sick Leave with medical prescription attached.",
      },
      {
        step: 2,
        title: "Verify Leave Balance & Substitute Cover",
        description: "Check remaining leave balances in the leave ledger.",
        dummy_example: "Casual Leave balance: 4 remaining | Substitute: Mr. Patel.",
      },
      {
        step: 3,
        title: "Process & Forward for Sanction",
        description: "Forward verified leave application to Principal with administrative clearance note.",
        dummy_example: "Click 'Forward to Principal' -> Moves to final executive approval.",
      },
    ],
    dummy_data: [
      { field: "Leave Category", sample_value: "Casual Leave (CL) / Sick Leave (SL)", instructions: "Classifies absence." },
    ],
    tips: [
      "Ensure substitute teacher assignments are confirmed before recommending leave approval.",
    ],
  },
  "/clerk/leave-reports": {
    role: "CLERK",
    route_path: "/clerk/leave-reports",
    title: "Staff Leave Balances & Annual Deduction Reports",
    summary: "Generate monthly and annual faculty leave deduction registers for payroll verification.",
    steps: [
      {
        step: 1,
        title: "Select Month and Academic Session",
        description: "Choose target month to audit leaves taken across all departments.",
        dummy_example: "Month: September 2026 | Session: 2026-2027.",
      },
      {
        step: 2,
        title: "Inspect Unpaid Leaves & Leave Balances",
        description: "Review staff who have exceeded their casual leave quotas and require Loss of Pay (LOP) deductions.",
        dummy_example: "Staff: 2 employees have 1 day LOP deduction.",
      },
      {
        step: 3,
        title: "Export Report for Trustee Payroll",
        description: "Click 'Export to Excel' to hand off verified leave figures to the salary generator.",
        dummy_example: "Click 'Export Excel' -> Saves monthly leave audit sheet.",
      },
    ],
    dummy_data: [
      { field: "Loss of Pay (LOP)", sample_value: "1 Day Unpaid Leave", instructions: "Deducted in payroll run." },
    ],
    tips: [
      "Cross-check leave reports with the biometric muster roll before payroll calculation.",
    ],
  },
  "/clerk/leaves": {
    role: "CLERK",
    route_path: "/clerk/leaves",
    title: "Clerk Personal Leave Requests",
    summary: "Submit your personal leave requests and check your remaining leave balances.",
    steps: [
      {
        step: 1,
        title: "Check Your Leave Balances",
        description: "Review your available Casual Leave (CL), Sick Leave (SL), and Earned Leave (EL) days.",
        dummy_example: "CL Remaining: 4 Days | SL Remaining: 5 Days.",
      },
      {
        step: 2,
        title: "Submit Leave Application",
        description: "Click 'Apply Leave', pick dates, provide brief reason, and specify covering clerk.",
        dummy_example: "Dates: 12/11/2026 to 13/11/2026 | Reason: 'Personal urgent work'.",
      },
      {
        step: 3,
        title: "Track Approval",
        description: "Check status of your application once reviewed by the Principal.",
        dummy_example: "Status: 'Approved by Principal' on 08/11/2026.",
      },
    ],
    dummy_data: [
      { field: "Leave Type", sample_value: "Casual Leave (CL)", instructions: "Select leave category." },
    ],
    tips: [
      "Submit leave applications at least 3 days in advance whenever possible.",
    ],
  },
  "/clerk/my-attendance": {
    role: "CLERK",
    route_path: "/clerk/my-attendance",
    title: "Clerk Personal Duty Attendance Logs",
    summary: "Check your personal daily check-in/out timestamps and monthly working hours.",
    steps: [
      {
        step: 1,
        title: "View Today's Punch Record",
        description: "Verify that your morning punch-in was recorded properly by the campus biometric/geofence scanner.",
        dummy_example: "In Time: 08:02 AM | Out Time: 04:35 PM | Status: Present.",
      },
      {
        step: 2,
        title: "Review Monthly Attendance Calendar",
        description: "Inspect total present days, holidays, and recorded timings for the month.",
        dummy_example: "Total Present: 22 Days | On Time Percentage: 95.5%.",
      },
    ],
    dummy_data: [
      { field: "Office Hours", sample_value: "08:00 AM - 04:30 PM", instructions: "Designated clerk working hours." },
    ],
    tips: [
      "If you forget to punch out due to late office duty, submit a regularization request on the same day.",
    ],
  },
  "/clerk/leave-config": {
    role: "CLERK",
    route_path: "/clerk/leave-config",
    title: "School Leave Quotas & Policy Rules Setup",
    summary: "Configure annual leave allowances: Casual Leave (CL), Sick Leave (SL), Maternity Leave, and rollover rules.",
    steps: [
      {
        step: 1,
        title: "Review Annual Leave Allocations",
        description: "Inspect standard quotas allocated to faculty per academic year.",
        dummy_example: "Annual Quotas: Casual Leave: 12 Days | Sick Leave: 10 Days | Earned Leave: 15 Days.",
      },
      {
        step: 2,
        title: "Configure Rollover & Encashment Rules",
        description: "Specify whether unused leaves expire at the end of the year or accumulate into earned leaves.",
        dummy_example: "Casual Leaves: Expire annually | Earned Leaves: Carry forward up to 60 days.",
      },
      {
        step: 3,
        title: "Save Policy Configuration",
        description: "Click 'Save Leave Settings' to apply policy to the automated leave balance engine.",
        dummy_example: "Click 'Save' -> Success toast confirms updated quota rules.",
      },
    ],
    dummy_data: [
      { field: "Casual Leave Quota", sample_value: "12 Days / Year", instructions: "Credited on 1st April annually." },
      { field: "Sick Leave Quota", sample_value: "10 Days / Year", instructions: "Medical certificate required for >2 days." },
    ],
    tips: [
      "Leave configuration changes apply to the upcoming academic session cycle.",
    ],
  },
  "/clerk/settings": {
    role: "CLERK",
    route_path: "/clerk/settings",
    title: "Clerk Account Credentials & Preferences",
    summary: "Update your staff profile details, phone number, and change your software login password.",
    steps: [
      {
        step: 1,
        title: "Update Contact Information",
        description: "Keep your mobile number and emergency contacts up to date.",
        dummy_example: "Phone: '9820123456' | Email: 'clerk@school.edu.in'.",
      },
      {
        step: 2,
        title: "Change Login Password",
        description: "Type current password, enter new secure password (min 8 characters), and confirm.",
        dummy_example: "Enter current password -> Enter new password -> Click 'Update Password'.",
      },
    ],
    dummy_data: [
      { field: "Password Policy", sample_value: "Min 8 chars, 1 uppercase, 1 digit", instructions: "Standard password requirement." },
    ],
    tips: [
      "Change your password every 90 days to protect student records and confidential school data.",
    ],
  },

  // ─── TEACHER GUIDES ────────────────────────────────────────────────────────
  "/teacher": {
    role: "TEACHER",
    route_path: "/teacher",
    title: "Teacher Workspace & Daily Routine",
    summary: "Quick access to take morning attendance, review today's timetable, upload homework, and enter exam marks.",
    steps: [
      {
        step: 1,
        title: "Take Today's Classroom Attendance",
        description: "Click on 'Take Attendance' or navigate to 'Student Attendance' to mark Present/Absent for your assigned class.",
        dummy_example: "Class 8-A: Mark all present, then toggle 2 absent students.",
      },
      {
        step: 2,
        title: "Review Today's Lecture Schedule",
        description: "Check your assigned lecture periods, subjects, and classroom timings on the schedule widget.",
        dummy_example: "Period 2 (09:45 AM): Mathematics - Class 9-B",
      },
      {
        step: 3,
        title: "Post Homework & Study Material",
        description: "Keep parents and students updated by posting today's assignments before leaving for the day.",
        dummy_example: "Homework: 'Solve Exercise 4.2 Questions 1 to 5.'",
      },
    ],
    dummy_data: [
      { field: "Class / Section", sample_value: "Class 8 - Div A", instructions: "Your designated class teacher room." },
      { field: "Subject", sample_value: "Science & Technology", instructions: "Assigned curriculum subject." },
    ],
    tips: [
      "Attendance should ideally be marked within the first 30 minutes of school starting.",
      "Use the (i) button anytime on marks, homework, or exam pages for step-by-step guidance.",
    ],
  },
  "/teacher/student-attendance": {
    role: "TEACHER",
    route_path: "/teacher/student-attendance",
    title: "Class Attendance Marking Guide",
    summary: "Mark and submit daily student attendance quickly with bulk toggle and roll-call modes.",
    steps: [
      {
        step: 1,
        title: "Select Date, Class & Division",
        description: "Choose today's date and your class. The complete student roster with roll numbers will load.",
        dummy_example: "Date: Today | Class: 7th | Division: A",
      },
      {
        step: 2,
        title: "Mark Absent Students",
        description: "All students are marked 'Present' by default. Simply tap on the student's name or toggle button to mark them 'Absent' or 'Late'.",
        dummy_example: "Tap Roll 14 (Rohan) -> Turns Red (Absent).",
      },
      {
        step: 3,
        title: "Click Submit Attendance",
        description: "Review total present/absent count and click 'Save Attendance'. The office calling desk is immediately notified.",
        dummy_example: "Total: 38 Present, 2 Absent -> Click 'Submit Attendance'.",
      },
    ],
    dummy_data: [
      { field: "Status Options", sample_value: "P (Present) / A (Absent) / L (Late) / HD (Half Day)", instructions: "Tap the status badge to cycle through statuses." },
      { field: "Remarks (Optional)", sample_value: "Left early for doctor appointment", instructions: "Add a note for special circumstances." },
    ],
    tips: [
      "Use 'Mark All Present' button at the top to reset the sheet quickly.",
      "Attendance can be edited later during the same school day if a student arrives late.",
    ],
  },
  "/teacher/study-materials": {
    role: "TEACHER",
    route_path: "/teacher/study-materials",
    title: "Study Materials & Notes Upload Guide",
    summary: "Upload chapter PDFs, revision notes, question banks, and reference guides for students.",
    steps: [
      {
        step: 1,
        title: "Select Class, Division & Subject",
        description: "Pick target class and subject (e.g. Class 10 - Mathematics).",
        dummy_example: "Class: 'Class 10-A' | Subject: 'Mathematics'.",
      },
      {
        step: 2,
        title: "Upload Document or PDF File",
        description: "Provide title, chapter description, and choose PDF/DOC file from your computer.",
        dummy_example: "Title: 'Chapter 5 Arithmetic Progressions Formulas' | File: 'Ch5_AP_Formulas.pdf'.",
      },
      {
        step: 3,
        title: "Publish to Student & Parent Portals",
        description: "Click 'Upload & Publish' to make the file immediately accessible to enrolled students.",
        dummy_example: "Click 'Publish' -> Document appears on student portal.",
      },
    ],
    dummy_data: [
      { field: "Material Title", sample_value: "Chapter 4 Quadratic Equations Summary", instructions: "Clear descriptive document title." },
      { field: "Allowed File Types", sample_value: "PDF, DOCX, PPTX, JPG (Max 25MB)", instructions: "Supported file formats." },
    ],
    tips: [
      "Name files clearly (e.g., 'Math_Ch4_Formulas.pdf') so students can identify them easily on mobile phones.",
    ],
  },
  "/teacher/Homework": {
    role: "TEACHER",
    route_path: "/teacher/Homework",
    title: "Homework & Daily Assignment Desk",
    summary: "Post daily homework, specify submission due dates, and track student completion.",
    steps: [
      {
        step: 1,
        title: "Select Class and Subject",
        description: "Choose class and subject for which homework is being assigned.",
        dummy_example: "Class: 'Class 8-B' | Subject: 'Science'.",
      },
      {
        step: 2,
        title: "Enter Assignment Details & Submission Deadline",
        description: "Write clear homework instructions, textbook page numbers, and pick the due date.",
        dummy_example: "Assignment: 'Solve Exercise 6.3 Questions 1 to 8 on notebook' | Due: 'Tomorrow (18/10/2026)'.",
      },
      {
        step: 3,
        title: "Review Student Submissions & Mark Checked",
        description: "Check the student submission list and mark students as 'Checked' or 'Pending'.",
        dummy_example: "Roll 1 to 35: Checked | Roll 36: Incomplete.",
      },
    ],
    dummy_data: [
      { field: "Homework Title", sample_value: "Exercise 6.3 Questions 1 to 8", instructions: "Textbook reference." },
      { field: "Due Date", sample_value: "Tomorrow (Next School Day)", instructions: "Submission deadline." },
    ],
    tips: [
      "Post homework before 2:00 PM so parents receive early mobile app alerts.",
    ],
  },
  "/teacher/marks": {
    role: "TEACHER",
    route_path: "/teacher/marks",
    title: "Exam Marks Entry Guide",
    summary: "Enter subject scores for unit tests, midterms, and semester finals with automatic total and grade calculations.",
    steps: [
      {
        step: 1,
        title: "Select Exam, Class & Subject",
        description: "Pick the Exam Term (e.g. Mid-Term 2026), your Class, and the Subject you teach.",
        dummy_example: "Exam: 'Term 1 Exam' | Class: '9-A' | Subject: 'English'",
      },
      {
        step: 2,
        title: "Enter Student Marks",
        description: "Type the marks scored by each student in the input boxes. You can press the 'Tab' or 'Enter' key to jump directly to the next student!",
        dummy_example: "Roll 1: 42 (out of 50) | Roll 2: 48 (out of 50)",
      },
      {
        step: 3,
        title: "Save Draft or Finalize",
        description: "Click 'Save Draft' to save your progress, or 'Submit for Verification' when all scores are entered.",
        dummy_example: "Click 'Save Draft' if you are still grading remaining papers.",
      },
    ],
    dummy_data: [
      { field: "Maximum Marks", sample_value: "50 or 100", instructions: "System prevents entering scores higher than max marks." },
      { field: "Absent Code", sample_value: "AB", instructions: "Type 'AB' if the student was absent for the exam." },
      { field: "Passing Score", sample_value: "35%", instructions: "Failing scores are highlighted in soft red for quick review." },
    ],
    tips: [
      "Keyboard shortcut: Use the Arrow Down or Enter key to quickly fill marks without using the mouse.",
      "Double check that no student box is left completely blank before submitting.",
    ],
  },
  "/teacher/assessment": {
    role: "TEACHER",
    route_path: "/teacher/assessment",
    title: "Student Behavioral & Co-Curricular Assessment",
    summary: "Grade student discipline, cleanliness, teamwork, and sports participation for term report cards.",
    steps: [
      {
        step: 1,
        title: "Select Class and Term",
        description: "Pick target class (e.g. Class 7-A) and assessment period (Term 1 Assessment).",
        dummy_example: "Class: 'Class 7-A' | Term: 'Term 1'.",
      },
      {
        step: 2,
        title: "Evaluate Behavioral Traits",
        description: "Assign grades (A+, A, B, C) for discipline, neatness, leadership, and team collaboration.",
        dummy_example: "Discipline: 'A+' | Neatness: 'A' | Sports: 'B+'.",
      },
      {
        step: 3,
        title: "Save Assessment Ratings",
        description: "Click 'Save Assessments' to incorporate evaluations into student report cards.",
        dummy_example: "Click 'Save' -> Co-curricular grades saved for 40 students.",
      },
    ],
    dummy_data: [
      { field: "Grading Scale", sample_value: "A+ (Outstanding), A (Very Good), B (Good), C (Fair)", instructions: "Standard behavioral grading scale." },
    ],
    tips: [
      "Provide balanced, constructive ratings that encourage students to improve their habits.",
    ],
  },
  "/teacher/verify-marks": {
    role: "TEACHER",
    route_path: "/teacher/verify-marks",
    title: "Class Teacher Marks Verification Matrix",
    summary: "Class teacher verification of all subject marks entered before result processing.",
    steps: [
      {
        step: 1,
        title: "Select Class Division and Exam Term",
        description: "Pick your assigned class (e.g. Class 10-A) and target exam term.",
        dummy_example: "Class: 'Class 10-A' | Exam: 'Mid-Term 2026'.",
      },
      {
        step: 2,
        title: "Inspect Consolidated Subject Scores",
        description: "Verify that all 6 subject teachers (Math, Science, English, etc.) have submitted complete marks.",
        dummy_example: "Matrix check: All 6 subjects marked 100% complete.",
      },
      {
        step: 3,
        title: "Sign Off and Forward to Principal",
        description: "Click 'Verify & Submit' to certify that all scores are verified and ready for rank computation.",
        dummy_example: "Click 'Verify' -> Moves to Principal Result Processing desk.",
      },
    ],
    dummy_data: [
      { field: "Submission Status", sample_value: "Complete (All 6 Subjects Ready)", instructions: "Ensures no blank subject papers." },
    ],
    tips: [
      "Contact any subject teacher directly if their marks column shows 'Draft' or 'Pending'.",
    ],
  },
  "/teacher/progress-reports": {
    role: "TEACHER",
    route_path: "/teacher/progress-reports",
    title: "Student Progress Reports & Teacher Remarks",
    summary: "Add personalized teacher remarks and observations to appear on final printed marksheets.",
    steps: [
      {
        step: 1,
        title: "Select Student from Roster",
        description: "Choose a student from your class roster (e.g. Roll 12 - Sneha Kulkarni).",
        dummy_example: "Select: 'Roll 12 - Sneha Kulkarni'.",
      },
      {
        step: 2,
        title: "Write Constructive Personalized Remark",
        description: "Type an encouraging remark highlighting academic strengths and growth areas.",
        dummy_example: "Remark: 'Excellent problem solving in Science. Encouraged to participate more actively in English debates.'",
      },
      {
        step: 3,
        title: "Save Remarks",
        description: "Click 'Save Remark' -> The remark will print on the student's terminal report card.",
        dummy_example: "Click 'Save Remark' -> Confirmed.",
      },
    ],
    dummy_data: [
      { field: "Sample Remark", sample_value: "Hardworking and disciplined student with keen curiosity.", instructions: "Printed on official marksheet." },
    ],
    tips: [
      "Keep remarks encouraging, professional, and specific to the student's individual learning progress.",
    ],
  },
  "/teacher/stock": {
    role: "TEACHER",
    route_path: "/teacher/stock",
    title: "Classroom Teaching Supplies Requisition",
    summary: "Request whiteboard markers, dusters, attendance registers, and laboratory supplies from the school store.",
    steps: [
      {
        step: 1,
        title: "Select Needed Teaching Supplies",
        description: "Pick items from the school store catalog (e.g. Whiteboard Markers, Chalk Box, Graph Sheets).",
        dummy_example: "Item: 'Whiteboard Marker (Black/Blue - Pack of 4)' | Qty: 2.",
      },
      {
        step: 2,
        title: "Submit Requisition Request",
        description: "Provide room number and submit request to the inventory storekeeper.",
        dummy_example: "Room: 'Room 204' | Note: 'Quarterly classroom restock' -> Click 'Submit'.",
      },
    ],
    dummy_data: [
      { field: "Item Requested", sample_value: "Whiteboard Markers / Chalk / Attendance Register", instructions: "Store catalog items." },
    ],
    tips: [
      "Store requests are fulfilled within 24 hours by the campus inventory desk.",
    ],
  },

  // ─── PRINCIPAL GUIDES ──────────────────────────────────────────────────────
  "/principal": {
    role: "PRINCIPAL",
    route_path: "/principal",
    title: "Principal Executive Dashboard",
    summary: "Complete institutional oversight: student enrollment trends, staff attendance, exam result processing, and approval queues.",
    steps: [
      {
        step: 1,
        title: "Review Institutional KPIs",
        description: "Check campus-wide attendance percentage, active staff count, pending leave requests, and recent notices.",
        dummy_example: "Student Attendance: 94.2% | Staff on Leave: 2",
      },
      {
        step: 2,
        title: "Approve Pending Requests",
        description: "Review staff leave applications and attendance override exceptions requiring your executive approval.",
        dummy_example: "Click 'Staff Leave' to review 3 pending teacher leaves.",
      },
      {
        step: 3,
        title: "Oversee Examination & Results",
        description: "Track marks submission progress across all classes and approve final result publication.",
        dummy_example: "Navigate to 'Result Processing' > 'Publish'.",
      },
    ],
    dummy_data: [
      { field: "Approval Status", sample_value: "Approved / Rejected / On Hold", instructions: "Principal's digital approval logs to the audit trail." },
    ],
    tips: [
      "Use the 'Announcements' module to broadcast emergency circulars or holiday notices to parents and teachers simultaneously.",
    ],
  },
  "/principal/result/dashboard": {
    role: "PRINCIPAL",
    route_path: "/principal/result/dashboard",
    title: "Examination Analytics & Performance Dashboard",
    summary: "Institutional pass percentages, subject averages, class toppers, and bell-curve grade distributions.",
    steps: [
      {
        step: 1,
        title: "Select Academic Year & Examination",
        description: "Choose session and examination term (e.g. Annual Final Examination 2026).",
        dummy_example: "Year: '2026-2027' | Exam: 'Annual Final Examination'.",
      },
      {
        step: 2,
        title: "Inspect Institutional Pass Percentage",
        description: "Review overall pass rates, grade distributions (A1, A2, B1...), and subject performance comparisons.",
        dummy_example: "Pass Rate: 98.4% | Class 10 Topper: 97.6% (Sneha Kulkarni).",
      },
      {
        step: 3,
        title: "Identify Low-Performing Subjects",
        description: "Detect subjects where averages fell below benchmark to plan teacher coaching workshops.",
        dummy_example: "Class 9 Physics average is 64% (target: 75%).",
      },
    ],
    dummy_data: [
      { field: "Institutional Benchmark", sample_value: "Minimum 75% subject average target", instructions: "Academic standard." },
    ],
    tips: [
      "Share top-performing teacher commendations during faculty review meetings.",
    ],
  },
  "/principal/result/processing/preview": {
    role: "PRINCIPAL",
    route_path: "/principal/result/processing/preview",
    title: "Result Processing & Marksheet Verification",
    summary: "Audit grade distributions, calculate class ranks, verify pass percentages, and generate report cards.",
    steps: [
      {
        step: 1,
        title: "Select Academic Year & Exam",
        description: "Choose the target examination term and class division to compute cumulative scores.",
        dummy_example: "Year: 2026-2027 | Exam: Annual Final | Class: 10th",
      },
      {
        step: 2,
        title: "Run Result Computation",
        description: "Click 'Process Results' to apply subject weightages, calculate CGPA/Percentages, and generate student rank orders.",
        dummy_example: "System computes 45 student marks in 2 seconds.",
      },
      {
        step: 3,
        title: "Inspect Marksheets & Publish",
        description: "Review sample report cards. Once satisfied, click 'Publish Results' to release digital report cards to parents.",
        dummy_example: "Click 'Publish' -> Report cards visible in Student/Parent Portal.",
      },
    ],
    dummy_data: [
      { field: "Grading Scale", sample_value: "A1 (91-100), A2 (81-90), B1 (71-80)...", instructions: "Standard board grading schema." },
      { field: "Grace Marks Policy", sample_value: "Max 5 marks for borderline subjects", instructions: "Configurable in Result Weightage settings." },
    ],
    tips: [
      "You can export the consolidated Gazette (Master Sheet) to Excel before publishing.",
    ],
  },
  "/principal/result/publish": {
    role: "PRINCIPAL",
    route_path: "/principal/result/publish",
    title: "Publish Examination Results to Portals",
    summary: "Authorize final release of digital marksheets to student and parent mobile apps.",
    steps: [
      {
        step: 1,
        title: "Select Verified Examination Batch",
        description: "Choose the class division and term verified in the preview desk.",
        dummy_example: "Exam: 'Class 10th Annual Results 2026'.",
      },
      {
        step: 2,
        title: "Check Verification Checklist",
        description: "Ensure all subject scores, class ranks, and teacher remarks are 100% verified.",
        dummy_example: "Checklist: 45 / 45 students verified.",
      },
      {
        step: 3,
        title: "Click 'Publish Results'",
        description: "Click 'Publish' -> Digital report cards become viewable on parent accounts immediately.",
        dummy_example: "Click 'Publish' -> Push notifications dispatched to parents.",
      },
    ],
    dummy_data: [
      { field: "Publish Timestamp", sample_value: "Real-time instant release", instructions: "Recorded in audit trail." },
    ],
    tips: [
      "Once published, any subsequent marks changes require formal Principal re-authorization.",
    ],
  },

  // ─── FEES MANAGEMENT GUIDES ────────────────────────────────────────────────
  "/fees": {
    role: "FEES",
    route_path: "/fees",
    title: "Fees Collection & Accounts Dashboard",
    summary: "Track school fee collections, outstanding dues, daily counter receipts, and fee structure configurations.",
    steps: [
      {
        step: 1,
        title: "Monitor Today's Collections",
        description: "View real-time cash, UPI/Online, and cheque payments collected at the fee counter today.",
        dummy_example: "Today's Collection: ₹1,45,000 across 28 transactions.",
      },
      {
        step: 2,
        title: "Collect Student Fee Payments",
        description: "Open the Student Ledger to search any student by G.R. Number and issue an instant digital fee receipt.",
        dummy_example: "Search 'GR-2025-091' -> Select Term 2 Tuition Fee -> Collect.",
      },
      {
        step: 3,
        title: "Send Dues Reminders",
        description: "Filter students with overdue installments and trigger WhatsApp/SMS fee reminders.",
        dummy_example: "Click 'Send Fee Reminder' for Class 7 students.",
      },
    ],
    dummy_data: [
      { field: "Payment Modes", sample_value: "Cash / UPI (QR Code) / Net Banking / Cheque", instructions: "Select the mode of payment received." },
      { field: "Receipt Number", sample_value: "REC-2026-00452", instructions: "Generated automatically in sequential order." },
    ],
    tips: [
      "Always print or download a double copy of the fee receipt (one for parent, one for school accounts).",
    ],
  },
  "/fees/student-ledger": {
    role: "FEES",
    route_path: "/fees/student-ledger",
    title: "Student Fee Ledger & Payment Counter",
    summary: "Look up student fee history, view installment breakdown, apply discounts, and record payments.",
    steps: [
      {
        step: 1,
        title: "Search Student by G.R. or Roll Number",
        description: "Type the G.R. Number, Name, or select Class/Division to open the student's fee card.",
        dummy_example: "Search 'Aarav Sharma' (GR: 2026-0145)",
      },
      {
        step: 2,
        title: "Select Installment or Fee Head",
        description: "Check the fee components being paid (e.g. Q1 Tuition Fee, Term Computer Fee, Bus Fee).",
        dummy_example: "Check: Q1 Tuition (₹12,000) + Term Activity (₹1,500) = Total ₹13,500",
      },
      {
        step: 3,
        title: "Record Payment & Print Receipt",
        description: "Enter amount received, choose payment mode (Cash/UPI/Cheque), and click 'Generate Receipt'.",
        dummy_example: "Paid: ₹13,500 via UPI -> Print thermal/A4 receipt.",
      },
    ],
    dummy_data: [
      { field: "Discount / Scholarship", sample_value: "10% Sibling Concession", instructions: "Apply authorized discount codes if applicable." },
      { field: "Cheque / Transaction Ref", sample_value: "UPI/TXN9812739128", instructions: "Enter UTR number or Cheque number." },
    ],
    tips: [
      "Partial payments are supported; remaining amount will stay marked as pending balance.",
    ],
  },
  "/fees/fee-structure": {
    role: "FEES",
    route_path: "/fees/fee-structure",
    title: "Fee Structure & Installment Slabs Setup",
    summary: "Configure grade-wise fee structures, installment due dates, and late payment fine policies.",
    steps: [
      {
        step: 1,
        title: "Select Academic Year & Class",
        description: "Choose target academic session and grade level (e.g. Class 10th Standard).",
        dummy_example: "Year: '2026-2027' | Class: '10th Standard'.",
      },
      {
        step: 2,
        title: "Configure Installment Slabs and Due Dates",
        description: "Define Term 1, Term 2, and Term 3 payment amounts and due dates.",
        dummy_example: "Term 1: ₹15,000 (Due July 15) | Term 2: ₹15,000 (Due Oct 15) | Term 3: ₹15,000 (Due Jan 15).",
      },
      {
        step: 3,
        title: "Set Late Fine Grace Period",
        description: "Specify grace days and daily late fine rate applied after due date.",
        dummy_example: "Grace Period: 7 Days | Late Fine: ₹20 / day.",
      },
    ],
    dummy_data: [
      { field: "Annual Total Fee", sample_value: "₹45,000.00", instructions: "Cumulative annual fee for this class." },
      { field: "Installment Count", sample_value: "3 Installments (Quarterly / Term-wise)", instructions: "Payment schedule options." },
    ],
    tips: [
      "Lock fee structures before generating fee invoices for admitted students.",
    ],
  },
  "/fees/Genrate-Fees": {
    role: "FEES",
    route_path: "/fees/Genrate-Fees",
    title: "Batch Fee Demand Invoicing Desk",
    summary: "Generate term fee invoices in batch and apply to student accounts.",
    steps: [
      {
        step: 1,
        title: "Select Session and Installment Term",
        description: "Choose active session and fee installment being demanded (e.g. Term 2 - Oct to Dec).",
        dummy_example: "Session: '2026-2027' | Term: 'Term 2 Tuition'.",
      },
      {
        step: 2,
        title: "Select Classes to Bill",
        description: "Choose 'All Classes' or pick specific grades.",
        dummy_example: "Selected: Classes 1st through 10th (850 enrolled students).",
      },
      {
        step: 3,
        title: "Generate Invoices",
        description: "Click 'Generate Fee Demands' -> Invoices populate on student ledgers and parent apps.",
        dummy_example: "Click 'Generate' -> 850 fee invoices generated.",
      },
    ],
    dummy_data: [
      { field: "Invoice Batch", sample_value: "FEE-DEMAND-2026-T2", instructions: "Billing cycle reference." },
    ],
    tips: [
      "Students with approved scholarships or RTE exemptions will automatically have their discounted dues computed.",
    ],
  },

  // ─── INVENTORY GUIDES ──────────────────────────────────────────────────────
  "/inventory": {
    role: "INVENTORY",
    route_path: "/inventory",
    title: "Inventory & Uniform Store Management",
    summary: "Manage school uniform stock, stationery, books, supplier purchase orders, and student distributions.",
    steps: [
      {
        step: 1,
        title: "Check Stock Levels & Low Stock Alerts",
        description: "Monitor available quantities of school uniforms, notebooks, and badges across sizes.",
        dummy_example: "Alert: Regular Shirt (Size 32) is low (only 4 left).",
      },
      {
        step: 2,
        title: "Issue Items to Students",
        description: "Navigate to 'Student Item Issues' to distribute assigned uniform kits or books to students.",
        dummy_example: "Issue Uniform Set A to Roll 12 Class 1.",
      },
      {
        step: 3,
        title: "Handle Size Replacements & Returns",
        description: "Process uniform size exchanges or defective item returns cleanly with updated inventory counts.",
        dummy_example: "Exchange Size 28 for Size 30 for Student Kavya.",
      },
    ],
    dummy_data: [
      { field: "Item SKU / Code", sample_value: "UNIF-SHIRT-M-32", instructions: "Item barcode or unique reference code." },
      { field: "Unit Price", sample_value: "₹450.00", instructions: "School store selling price." },
    ],
    tips: [
      "Perform a physical stock audit monthly and record adjustments via the 'Stock & Ledger' screen.",
    ],
  },
  "/inventory/issue": {
    role: "INVENTORY",
    route_path: "/inventory/issue",
    title: "Student Uniform & Book Distribution Counter",
    summary: "Distribute uniform sets, stationery packages, and study books to admitted students.",
    steps: [
      {
        step: 1,
        title: "Search Student by G.R. or Roll Number",
        description: "Enter G.R. number or student name to pull up their allocated uniform bundle.",
        dummy_example: "Search 'GR-2026-0098' - Aryan Shah (Class 5th).",
      },
      {
        step: 2,
        title: "Select Item Bundle or Specific Sizes",
        description: "Select uniform kit (Regular Shirt Size 30 + Shorts Size 28 + School Tie + Socks).",
        dummy_example: "Selected: Uniform Kit Standard 5th.",
      },
      {
        step: 3,
        title: "Confirm Distribution & Print Issue Slip",
        description: "Click 'Issue Items' -> Stock count decreases immediately and an issue gate pass is generated.",
        dummy_example: "Click 'Issue Items' -> Print distribution slip for parent signature.",
      },
    ],
    dummy_data: [
      { field: "Bundle Code", sample_value: "BNDL-CLASS5-MALE", instructions: "Pre-configured item set." },
    ],
    tips: [
      "Always have the parent sign the physical distribution slip before handing over clothing packages.",
    ],
  },
  "/inventory/replacements": {
    role: "INVENTORY",
    route_path: "/inventory/replacements",
    title: "Size Exchanges & Damaged Item Returns Desk",
    summary: "Process uniform size swaps, exchanges, and defective merchandise returns.",
    steps: [
      {
        step: 1,
        title: "Look Up Original Distribution Slip",
        description: "Scan distribution barcode or enter student G.R. number to find the issued item.",
        dummy_example: "Search 'GR-2026-0098' -> View issued Uniform Shirt Size 28.",
      },
      {
        step: 2,
        title: "Select Reason and Replacement Size",
        description: "Select 'Size Adjustment' and choose the new size (Size 30).",
        dummy_example: "Return: Shirt Size 28 (Good condition) -> Issue: Shirt Size 30.",
      },
      {
        step: 3,
        title: "Complete Exchange",
        description: "Click 'Process Exchange' -> Returned size is added back to stock and new size is deducted.",
        dummy_example: "Click 'Process Exchange' -> Inventory counts updated automatically.",
      },
    ],
    dummy_data: [
      { field: "Exchange Reason", sample_value: "Size Too Small / Factory Stitching Defect", instructions: "Reason for return." },
    ],
    tips: [
      "Only accept unwashed, unworn garments with original school tags attached for size replacements.",
    ],
  },
};

/**
 * Intelligent Fallback: Generates a contextual, realistic tutorial for ANY page
 * ensuring numbered steps (1., 2., 3.) and realistic examples matching the page name.
 */
export function getDefaultTutorial(role: string, pathname: string): PageTutorialData {
  const normRole = normalizeTutorialRole(role);
  const normPath = normalizePath(pathname);

  // 1. Direct exact match
  if (DEFAULT_TUTORIALS_MAP[normPath]) {
    return { ...DEFAULT_TUTORIALS_MAP[normPath] };
  }

  // 2. Strip numeric or UUID parameter (e.g. /clerk/students/45 -> /clerk/students)
  const strippedId = normPath.replace(/\/\d+$/, "").replace(/\/[0-9a-fA-F-]{36}$/, "");
  if (DEFAULT_TUTORIALS_MAP[strippedId]) {
    return { ...DEFAULT_TUTORIALS_MAP[strippedId] };
  }

  // 3. Match against parent path
  const parentPath = normPath.includes("/") ? normPath.substring(0, normPath.lastIndexOf("/")) : "";
  if (parentPath && DEFAULT_TUTORIALS_MAP[parentPath]) {
    return { ...DEFAULT_TUTORIALS_MAP[parentPath] };
  }

  // 4. Find matching route from ROLE_SIDEBAR_PAGES
  const roleRoutes = ROLE_SIDEBAR_PAGES[normRole] || [];
  const foundRoute = roleRoutes.find(
    (r) => normalizePath(r.href) === normPath || normPath.startsWith(normalizePath(r.href) + "/")
  );

  const pageTitle = foundRoute ? foundRoute.title : formatPageTitleFromPath(normPath);
  const pageCategory = foundRoute?.category || "Management Desk";
  const summary = foundRoute
    ? foundRoute.description
    : `Step-by-step instructions, sample dummy values, and best practices for managing ${pageTitle}.`;

  return {
    role: normRole,
    route_path: normPath,
    title: `${pageTitle} Guide`,
    summary: summary,
    show_video: false,
    video_url: "",
    steps: [
      {
        step: 1,
        title: `Search, Filter & Review ${pageTitle} Records`,
        description: `Use the top search bar, filters, or class dropdown to locate the specific ${pageTitle.toLowerCase()} record you want to inspect or manage.`,
        dummy_example: `Filter by active Academic Year '2026-2027' or search record by name/code.`,
      },
      {
        step: 2,
        title: `Perform Actions & Enter Form Details`,
        description: `Click '+ Add / Create' or edit an existing row. Fill all mandatory fields marked with an asterisk following standard formatting rules.`,
        dummy_example: `Fill required fields (e.g. Title, Category, Status) and review entries before submission.`,
      },
      {
        step: 3,
        title: `Save, Verify & Confirm Changes`,
        description: `Always click the primary 'Save', 'Submit', or 'Update' button. Look for the green success confirmation toast message.`,
        dummy_example: `Click 'Save Changes' -> Look for 'Operation Completed Successfully' confirmation toast.`,
      },
    ],
    dummy_data: [
      { field: "Academic Session", sample_value: "2026-2027", instructions: "Ensure active academic year is selected." },
      { field: "Sample Code / ID", sample_value: "REF-2026-0042", instructions: "Standard uppercase institutional reference." },
    ],
    tips: [
      "Use keyboard shortcuts (Tab / Enter) to navigate between form inputs rapidly.",
      "If you make an error, you can cancel or revert changes before saving.",
      "Click the (i) button anytime to view guidance tailored to the active screen.",
    ],
  };
}

/**
 * Format a human-readable title from path (e.g. /clerk/student-promotion -> Student Promotion)
 */
function formatPageTitleFromPath(path: string): string {
  const lastPart = path.split("/").filter(Boolean).pop() || "Workspace";
  return lastPart
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Fetch tutorial from Backend API by path and role
 */
export async function fetchTutorialByPath(
  path: string,
  role?: string
): Promise<PageTutorialData> {
  const normPath = normalizePath(path);
  const normRole = normalizeTutorialRole(role);

  try {
    const url = `${API_BASE_URL}/page-tutorials/by-path/?path=${encodeURIComponent(normPath)}&role=${encodeURIComponent(normRole)}`;
    const res = await fetchWithAuth(url, { cache: "no-store" });

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.steps) && data.steps.length > 0) {
        return {
          ...data,
          steps: data.steps,
          dummy_data: Array.isArray(data.dummy_data) ? data.dummy_data : [],
          tips: Array.isArray(data.tips) ? data.tips : [],
          show_video: typeof data.show_video === "boolean" ? data.show_video : Boolean(data.video_url),
        };
      }
    }
  } catch {
    // Silently fall back to default rich tutorial
  }

  return getDefaultTutorial(normRole, normPath);
}

/**
 * Super Admin: Fetch all saved custom tutorials with optional role filter
 */
export async function fetchAllTutorials(roleFilter?: string): Promise<PageTutorialData[]> {
  try {
    const query = roleFilter && roleFilter !== "ALL" ? `?role=${encodeURIComponent(roleFilter)}` : "";
    const url = `${API_BASE_URL}/page-tutorials/${query}`;
    const res = await fetchWithAuth(url, { cache: "no-store" });

    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.results || [];
      return list;
    }
  } catch (err) {
    console.error("Error fetching all tutorials:", err);
  }
  return [];
}

/**
 * Super Admin: Create or update tutorial
 */
export async function saveTutorial(data: Partial<PageTutorialData>): Promise<PageTutorialData> {
  const normPath = normalizePath(data.route_path || "/");
  const payload = {
    ...data,
    route_path: normPath,
    steps: data.steps || [],
    dummy_data: data.dummy_data || [],
    tips: data.tips || [],
    show_video: data.show_video !== false,
    video_url: data.video_url || "",
  };

  if (data.id) {
    // Update
    const res = await fetchWithAuth(`${API_BASE_URL}/page-tutorials/${data.id}/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || JSON.stringify(err) || "Failed to update tutorial");
    }
    return res.json();
  } else {
    // Create
    const res = await fetchWithAuth(`${API_BASE_URL}/page-tutorials/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || JSON.stringify(err) || "Failed to save tutorial");
    }
    return res.json();
  }
}

/**
 * Super Admin: Delete tutorial (reverts to default)
 */
export async function deleteTutorial(id: number): Promise<boolean> {
  try {
    const res = await fetchWithAuth(`${API_BASE_URL}/page-tutorials/${id}/`, {
      method: "DELETE",
    });
    return res.ok;
  } catch (err) {
    console.error("Error deleting tutorial:", err);
    return false;
  }
}
