import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";

export interface TutorialStep {
  step: number;
  title: string;
  description: string;
  dummy_example?: string;
}

export interface TutorialDummyField {
  field: string;
  sample_value: string;
  instructions: string;
}

export interface PageTutorialData {
  id?: number;
  role: "CLERK" | "PRINCIPAL" | "TEACHER" | "TRUSTEE" | "FEES" | "INVENTORY" | "GLOBAL" | string;
  route_path: string;
  title: string;
  summary: string;
  steps: TutorialStep[];
  dummy_data: TutorialDummyField[];
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

/**
 * Standard normalized role names for tutorials
 */
export function normalizeTutorialRole(roleName?: string): string {
  if (!roleName) return "GLOBAL";
  const lower = roleName.toLowerCase().trim();
  if (lower.includes("clerk")) return "CLERK";
  if (lower.includes("principal")) return "PRINCIPAL";
  if (lower.includes("teacher")) return "TEACHER";
  if (lower.includes("trustee")) return "TRUSTEE";
  if (lower.includes("fee") || lower.includes("accountant") || lower.includes("finance")) return "FEES";
  if (lower.includes("inventory")) return "INVENTORY";
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
 * Pre-defined rich default guides with step-by-step and dummy data
 * specifically tailored for older or non-tech-savvy school staff.
 */
export const DEFAULT_TUTORIALS_MAP: Record<string, PageTutorialData> = {
  // ─── CLERK DEFAULTS ────────────────────────────────────────────────────────
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
    steps: [
      {
        step: 1,
        title: "Search Student Record",
        description: "Enter the G.R. Number or student name to pull up their complete academic background and school history.",
        dummy_example: "Search 'GR-2024-089' or 'Pooja Patel'",
      },
      {
        step: 2,
        title: "Verify Leaving Details & Conduct",
        description: "Review date of leaving, reason for leaving, progress, and conduct remarks. Update any missing fields.",
        dummy_example: "Reason: 'Parent Relocation to Pune' | Conduct: 'Good'",
      },
      {
        step: 3,
        title: "Preview & Print Official Certificate",
        description: "Click 'Generate Certificate' to review the pre-formatted certificate. Click Print to produce the signed copy.",
        dummy_example: "Click 'Print Certificate' -> Select School Letterhead printer.",
      },
    ],
    dummy_data: [
      { field: "Reason for Leaving", sample_value: "Completed Secondary Schooling / Parent Transfer", instructions: "Select official reason from dropdown or type custom note." },
      { field: "Progress & Conduct", sample_value: "Good / Satisfactory", instructions: "Remarks will appear on the final printed LC." },
      { field: "Date of Leaving", sample_value: "31/03/2026", instructions: "Last official school attendance date." },
    ],
    tips: [
      "Ensure all outstanding library books and fees are cleared before issuing the Leaving Certificate.",
      "A digital copy is permanently archived in the General Register.",
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

  // ─── TEACHER DEFAULTS ──────────────────────────────────────────────────────
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

  // ─── PRINCIPAL DEFAULTS ────────────────────────────────────────────────────
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

  // ─── FEES MANAGEMENT DEFAULTS ──────────────────────────────────────────────
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

  // ─── INVENTORY DEFAULTS ────────────────────────────────────────────────────
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

  // ─── TRUSTEE DEFAULTS ──────────────────────────────────────────────────────
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
};

/**
 * Complete list of all sidebar pages for all 6 target roles
 */
export const ROLE_SIDEBAR_PAGES: Record<string, RolePageRoute[]> = {
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
    { title: "My Leaves", href: "/clerk/leaves", category: "Leaves", description: "Apply personal leave requests and view balances." },
    { title: "Leave Settings", href: "/clerk/leave-config", category: "Leaves", description: "Configure casual, medical, and earned leave quotas." },
    { title: "Account Settings", href: "/clerk/settings", category: "Account", description: "Clerk user profile and password change." },
  ],
  PRINCIPAL: [
    { title: "Dashboard", href: "/principal", category: "General", description: "Executive KPI dashboard, quick statistics, and alerts." },
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
    { title: "Support Helpdesk", href: "/principal/support", category: "Support", description: "Submit and track support tickets with SaaS Super Admin." },
    { title: "Account Settings", href: "/principal/settings", category: "Account", description: "Principal profile credentials and preferences." },
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
    { title: "Attendance History", href: "/teacher/attendance", category: "Self Service", description: "Review your personal monthly check-in/out timestamps." },
    { title: "Exam Timetable", href: "/teacher/exams", category: "Examinations", description: "Assigned invigilation duties and exam schedule." },
    { title: "Account Settings", href: "/teacher/settings", category: "Account", description: "Update teacher profile, phone number, and password." },
  ],
  TRUSTEE: [
    { title: "Staff Directory", href: "/trustee", category: "HR & Governance", description: "Staff strength, designations, and department overview." },
    { title: "Salary Components", href: "/trustee/salary-components", category: "Payroll", description: "Configure Basic Pay, DA, HRA, PF, and statutory deductions." },
    { title: "Staff Salary Structures", href: "/trustee/staff-salary", category: "Payroll", description: "Assign custom monthly pay structures per employee." },
    { title: "Generate Salary", href: "/trustee/generate-salary", category: "Payroll", description: "Process monthly payroll, auto-calculate leaves, and print slips." },
    { title: "Subscription & Billing", href: "/trustee/subscription", category: "Finance", description: "School software SaaS plan, module licenses, and invoices." },
    { title: "Announcements", href: "/trustee/announcements", category: "Communication", description: "Board circulars and official staff communications." },
    { title: "Events & Calendar", href: "/trustee/events", category: "Communication", description: "Institutional calendar, trustee meetings, and annual functions." },
    { title: "Activity Logs", href: "/trustee/activity-logs", category: "Audit", description: "System audit logs, fee modifications, and user logins." },
    { title: "Support Helpdesk", href: "/trustee/support", category: "Support", description: "Direct priority support channel with Super Admin." },
    { title: "Account Settings", href: "/trustee/settings", category: "Account", description: "Trustee profile and security settings." },
  ],
  FEES: [
    { title: "Dashboard", href: "/fees", category: "General", description: "Fee collections summary, outstanding dues, and counter metrics." },
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
    { title: "Items Master", href: "/inventory/items", category: "Catalog", description: "Uniforms, notebooks, ties, belts, and stationeries catalog." },
    { title: "Categories & Variants", href: "/inventory/categories", category: "Catalog", description: "Item sizes (S, M, L, XL), colors, and category groupings." },
    { title: "Pricing & Fee Mapping", href: "/inventory/pricing", category: "Pricing", description: "Set selling prices and map inventory items to student fee ledgers." },
    { title: "Purchases & Suppliers", href: "/inventory/purchases", category: "Procurement", description: "Supplier vendor records and purchase order stock entries." },
    { title: "Stock & Ledger", href: "/inventory/stock", category: "Stock Management", description: "Real-time stock ledger, physical audits, and stock adjustments." },
    { title: "Student Item Issues", href: "/inventory/issue", category: "Distribution", description: "Issue uniform kits and study materials to enrolled students." },
    { title: "Replacements & Returns", href: "/inventory/replacements", category: "Distribution", description: "Process size replacements, exchanges, and damaged returns." },
    { title: "Reports & Analytics", href: "/inventory/reports", category: "Reports", description: "Stock consumption, fast-moving items, and reorder reports." },
  ],
};

/**
 * Get fallback default tutorial if backend has no custom record
 */
export function getDefaultTutorial(role: string, pathname: string): PageTutorialData {
  const normRole = normalizeTutorialRole(role);
  const normPath = normalizePath(pathname);

  // Exact match
  if (DEFAULT_TUTORIALS_MAP[normPath]) {
    return { ...DEFAULT_TUTORIALS_MAP[normPath] };
  }

  // Find matching route from ROLE_SIDEBAR_PAGES
  const roleRoutes = ROLE_SIDEBAR_PAGES[normRole] || [];
  const foundRoute = roleRoutes.find(
    (r) => normalizePath(r.href) === normPath || normPath.startsWith(normalizePath(r.href) + "/")
  );

  const title = foundRoute ? `${foundRoute.title} Guide` : "Page Walkthrough & Guide";
  const summary = foundRoute
    ? foundRoute.description
    : "Step-by-step guidance and dummy data instructions for using this page effectively.";

  return {
    role: normRole,
    route_path: normPath,
    title: title,
    summary: summary,
    steps: [
      {
        step: 1,
        title: "Review Page Controls & Information",
        description: "Check the top filters, search bar, and main data table to locate the specific record you want to manage.",
        dummy_example: "Select Class/Category filter from top controls.",
      },
      {
        step: 2,
        title: "Perform Actions or Enter Data",
        description: "Fill required form fields, click action buttons, or update statuses following the highlighted instructions.",
        dummy_example: "Enter required details in the input fields.",
      },
      {
        step: 3,
        title: "Save & Confirm Changes",
        description: "Always click the primary 'Save', 'Submit', or 'Confirm' button at the bottom right to record your updates.",
        dummy_example: "Click 'Save Changes' -> Look for success toast message.",
      },
    ],
    dummy_data: [
      { field: "Sample Field", sample_value: "Example Value", instructions: "Enter formatted data according to the field requirement." },
    ],
    tips: [
      "Use keyboard shortcuts (Tab / Enter) to navigate between form fields quickly.",
      "If you need help or encounter an issue, contact the Super Admin via the Support Helpdesk.",
    ],
  };
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
      return {
        ...data,
        steps: Array.isArray(data.steps) ? data.steps : [],
        dummy_data: Array.isArray(data.dummy_data) ? data.dummy_data : [],
        tips: Array.isArray(data.tips) ? data.tips : [],
      };
    }
  } catch (err) {
    console.warn("Could not fetch tutorial from backend, using default fallback:", err);
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
    return res.ok || res.status === 204;
  } catch (err) {
    console.error("Error deleting tutorial:", err);
    return false;
  }
}
