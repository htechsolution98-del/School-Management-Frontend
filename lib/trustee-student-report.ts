import { API_BASE_URL } from "@/lib/config";
import { fetchWithAuth } from "@/lib/auth";

export interface StudentReportRow {
  id: number; name: string; gr_no: string | null; roll_no: string | null; class_id: number | null; class_name: string;
  division: string; academic_year: string; is_active: boolean; is_rte: boolean; gender: string; category: string;
  student_status: string; leaving_date: string | null; date_of_birth: string | null; father_name: string | null; mother_name: string | null; mobile: string | null;
  admission_date: string | null; new_admission: boolean; present: number; absent: number; unmarked: number; attendance_percentage: number | null;
  payable: string; credited_paid: string; pending: string; govt_pending: string; overdue_due: string; student_collection: string; government_collection: string;
  exam_percentage: number | null; graded_results: number; final_percentage: number | null; final_grade: string | null; final_year: string | null;
}
export interface StrengthRow { id: string; class_id: number | null; class_name: string; division?: string; total: number; active: number; inactive: number; new_admissions: number; attendance_percentage: number | null; pending: string }
export interface ExamSummaryRow { id: number; title: string; subject: string | null; date: string; records: number; graded: number; passed: number; absent: number; average_percentage: number | null; pass_percentage: number | null }
export interface StudentResultRow { id: number; student_id: number; student_name: string; gr_no: string | null; exam: string; subject: string | null; date: string; marks_obtained: string | null; max_marks: string; percentage: number | null; outcome: string; grade: string; status: string; published: boolean }
export interface StudentFeeRow { id: number; student_id: number; fee_type: string; academic_year: string | null; due_date: string | null; status: string; payable: string; credited_paid: string; pending: string; govt_pending: string }
export interface AttendanceReportRow { date: string; present: number; absent: number; unmarked: number; percentage: number | null }
export interface StudentReport {
  school: string; generated_at: string; from_date: string | null; to_date: string;
  summary: Record<"total_students" | "active" | "inactive" | "new_admissions" | "transferred" | "dropouts" | "left_unspecified" | "rte_students" | "attendance_records" | "unmarked_attendance" | "students_without_attendance" | "published_final_students" | "gender_missing" | "category_missing", number> & { attendance_percentage: number | null; published_final_average: number | null; payable: string; credited_paid: string; pending: string; govt_pending: string; overdue_due: string; student_collection: string; government_collection: string };
  students: { count: number; page: number; page_size: number; results: StudentReportRow[] };
  class_strength: StrengthRow[]; division_strength: StrengthRow[];
  gender: { label: string; count: number }[]; categories: { label: string; count: number }[]; status: { label: string; count: number }[];
  enrollment_trends: { id: number; year: string; recorded_students: number }[]; admission_trends: { year: string; count: number }[];
  attendance: AttendanceReportRow[]; collections: { month: string; student_collection: string; government_collection: string }[];
  exams: ExamSummaryRow[]; result_records: StudentResultRow[]; result_record_count: number; fee_records: StudentFeeRow[]; notes: string[];
  options: { academic_years: { id: number; name: string }[]; classes: { id: number; name: string }[]; divisions: { SchoolClass_id: number; division: string | null }[] };
}
export async function getStudentReport(params: Record<string, string>, signal?: AbortSignal): Promise<StudentReport> {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== ""));
  const response = await fetchWithAuth(`${API_BASE_URL.replace(/\/$/, "")}/trustee/student-report/?${query}`, { cache: "no-store", signal });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = data?.detail || data?.non_field_errors?.[0] || (data && Object.values(data).flat().find(value => typeof value === "string"));
    throw new Error(typeof error === "string" ? error : "Unable to load student report.");
  }
  return data;
}
