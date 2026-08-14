export interface HomeworkItem {
  id: number;
  school: number;
  division: number;
  division_name: string;
  school_class_name: string;
  teacher: number;
  teacher_name: string;
  title: string;
  description: string;
  assigned_date: string;
  due_date: string;
  attachment: string | null;
  is_active: boolean;
  submission_count: number;
  created_at: string;
  updated_at: string;
}

export interface HomeworkSubmission {
  id: number;
  school: number;
  homework: number;
  homework_title: string;
  student: number;
  student_name: string;
  attachment: string | null;
  submitted_at: string;
  submission_date: string;
  status: "pending" | "submitted" | "late" | "checked";
  marks: number | null;
  teacher_remark: string | null;
  checked_by: number | null;
  checked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InitiatePaymentOptions {
  studentFeeId: number;
  partialAmount?: string;
  onSuccess: () => void;
  onFailure: (msg: string) => void;
}

export interface RazorpayCheckoutResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export type {
  FeeFilters,
  FeeStatus,
  FeeSummary,
  MyStudentFee,
  OfflinePaymentPayload,
  Payment,
  PaymentFilters,
  PaymentMode,
  RazorpayOrderResponse,
  RazorpayVerifyPayload,
  StudentFee,
} from "@/types/fees";

export interface StudentAttendanceRecord {
  id: number;
  is_present: boolean;
  is_absent: boolean;
  attendance_date: string;
  created_at: string;
  school: number;
  student: number;
  attendance_by: number;
}

// ─── Exam Timetable Types ─────────────────────────────────────────────────────

export interface StudentExam {
  id: number;
  title: string;
  description: string;
  subject: number | null;
  exam_date: string;
  start_time: string;
  end_time: string;
  class_group: number;
  class_group_name: string;
}

// ─── Exam Results & Rankings Types ────────────────────────────────────────────

export interface StudentResult {
  exam_title: string;
  subject: string;
  marks_obtained: string;
  max_marks: string;
  is_absent: boolean;
  grade: string;
  remarks: string;
}

export interface RankingEntry {
  rank: number;
  student: number;
  student_name: string;
  marks_obtained: number;
  max_marks: number;
  grade: string;
}

export interface ExamRankResponse {
  exam: number;
  ranking: RankingEntry[];
}

