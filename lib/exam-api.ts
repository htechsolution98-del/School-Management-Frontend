import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  let cleanEndpoint = endpoint;
  if (API_BASE_URL.endsWith("/api") && cleanEndpoint.startsWith("/api/")) {
    cleanEndpoint = cleanEndpoint.substring(4);
  }
  const url = cleanEndpoint.startsWith("http") ? cleanEndpoint : `${API_BASE_URL}${cleanEndpoint}`;
  const res = await fetchWithAuth(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error || errData?.detail || errData?.message || "API request failed");
  }
  return await res.json();
}

export interface ResultWeightageComponent {
  id?: number;
  name: string;
  component_type: "EXAM" | "ATTENDANCE" | "TEACHER_ASSESSMENT" | "CUSTOM";
  weightage_percentage: number;
  sequence: number;
}

export interface ResultWeightageConfig {
  id: number;
  school: number;
  academic_year: number;
  academic_year_name: string;
  school_class?: number | null;
  school_class_name?: string | null;
  title: string;
  status: "DRAFT" | "ACTIVE" | "LOCKED";
  is_active: boolean;
  is_locked: boolean;
  components: ResultWeightageComponent[];
  total_weightage: number;
  total_percentage?: number;
}

export interface ExamRoom {
  id: number;
  room_number: string;
  building_block?: string;
  capacity: number;
  is_active: boolean;
}

export interface ExamTerm {
  id: number;
  academic_year: number;
  academic_year_name?: string;
  name: string;
  code?: string;
  max_marks: number;
  passing_marks: number;
  instructions?: string;
}

export interface ExamFull {
  id: number;
  academic_year?: number;
  exam_term?: number;
  term_name?: string;
  title: string;
  description?: string;
  subject?: number;
  subject_name?: string;
  class_group: number;
  class_name?: string;
  division?: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  room?: number;
  room_number?: string;
  max_marks: number;
  passing_marks: number;
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "COMPLETED" | "VERIFIED";
}

export interface SeatingRecord {
  id: number;
  exam: number;
  exam_title: string;
  class_name: string;
  division: string;
  subject_name: string;
  student: number;
  student_name: string;
  roll_no: string;
  gr_no: string;
  room: number;
  room_number: string;
  seat_number: string;
  is_published: boolean;
  created_at: string;
}

export interface FinalStudentResult {
  id: number;
  academic_year: number;
  academic_year_name?: string;
  student: number;
  student_name: string;
  roll_no?: string;
  gr_no?: string;
  school_class: number;
  class_name?: string;
  division?: string;
  component_breakdown: {
    components: Array<{
      name: string;
      type: string;
      weightage_pct: number;
      score_pct: number;
      contribution_pct: number;
      details: string;
    }>;
    final_percentage: number;
  };
  total_percentage: number;
  percentage?: number;
  total_marks_obtained?: number;
  total_max_marks?: number;
  grade: string;
  status: "NOT_READY" | "PROCESSING" | "READY_FOR_REVIEW" | "APPROVED" | "PUBLISHED";
  is_published: boolean;
  published_at?: string;
}

// APIs
export async function getWeightageConfigs(academicYearId?: number, schoolClassId?: number | string | null): Promise<ResultWeightageConfig[]> {
  const queryParts: string[] = [];
  if (academicYearId) queryParts.push(`academic_year=${academicYearId}`);
  if (schoolClassId !== undefined && schoolClassId !== null) {
    queryParts.push(`school_class=${schoolClassId}`);
  }
  const query = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
  const res = await apiFetch(`/api/result-weightage/${query}`);
  if (Array.isArray(res)) return res;
  return res?.results || [];
}

export async function createWeightageConfig(academicYearId: number, schoolClassId?: number | null, title?: string): Promise<ResultWeightageConfig> {
  return await apiFetch("/api/result-weightage/", {
    method: "POST",
    body: JSON.stringify({
      academic_year: academicYearId,
      school_class: schoolClassId || null,
      title: title || (schoolClassId ? "Class-Specific Weightage" : "Academic Year Weightage"),
    }),
  });
}

export async function saveWeightageComponents(configId: number, components: ResultWeightageComponent[]) {
  return await apiFetch(`/api/result-weightage/${configId}/save-components/`, {
    method: "POST",
    body: JSON.stringify({ components }),
  });
}

export async function toggleWeightageLock(configId: number) {
  return await apiFetch(`/api/result-weightage/${configId}/toggle-lock/`, {
    method: "POST",
  });
}

export async function getExamRooms(): Promise<ExamRoom[]> {
  const res = await apiFetch("/api/exam-rooms/");
  if (Array.isArray(res)) return res;
  return res?.results || [];
}

export async function createExamRoom(data: Partial<ExamRoom>): Promise<ExamRoom> {
  return await apiFetch("/api/exam-rooms/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateExamRoom(id: number, data: Partial<ExamRoom>): Promise<ExamRoom> {
  return await apiFetch(`/api/exam-rooms/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteExamRoom(id: number): Promise<void> {
  return await apiFetch(`/api/exam-rooms/${id}/`, {
    method: "DELETE",
  });
}

export async function getExamTerms(academicYearId?: number): Promise<ExamTerm[]> {
  const query = academicYearId ? `?academic_year=${academicYearId}` : "";
  const res = await apiFetch(`/api/exam-terms/${query}`);
  if (Array.isArray(res)) return res;
  return res?.results || [];
}

export async function createExamTerm(data: Partial<ExamTerm>): Promise<ExamTerm> {
  return await apiFetch("/api/exam-terms/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getExamsFull(params?: { academic_year?: number; class_group?: number; division?: string }): Promise<ExamFull[]> {
  const queryParts: string[] = [];
  if (params?.academic_year) queryParts.push(`academic_year=${params.academic_year}`);
  if (params?.class_group) queryParts.push(`class_group=${params.class_group}`);
  if (params?.division) queryParts.push(`division=${params.division}`);

  const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
  const res = await apiFetch(`/api/exam-full/${queryString}`);
  if (Array.isArray(res)) return res;
  return res?.results || [];
}

export async function createExamFull(data: Partial<ExamFull>): Promise<ExamFull> {
  return await apiFetch("/api/exam-full/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateExamFull(id: number, data: Partial<ExamFull>): Promise<ExamFull> {
  return await apiFetch(`/api/exam-full/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteExamFull(id: number): Promise<void> {
  return await apiFetch(`/api/exam-full/${id}/`, {
    method: "DELETE",
  });
}

export async function autoGenerateSeating(examId: number) {
  return await apiFetch("/api/seating-allocation/auto-generate/", {
    method: "POST",
    body: JSON.stringify({ exam_id: examId }),
  });
}

export async function getSeatingAllocations(params: {
  examId?: number;
  academicYearId?: number;
  title?: string;
  classId?: number | string;
  division?: string;
}): Promise<SeatingRecord[]> {
  const queryParams = new URLSearchParams();
  if (params.examId) queryParams.append("exam", String(params.examId));
  if (params.academicYearId) queryParams.append("academic_year", String(params.academicYearId));
  if (params.title) queryParams.append("title", params.title);
  if (params.classId && String(params.classId).toUpperCase() !== "ALL") queryParams.append("school_class", String(params.classId));
  if (params.division && params.division.toUpperCase() !== "ALL") queryParams.append("division", params.division);

  const res = await apiFetch(`/api/seating-allocation/?${queryParams.toString()}`);
  if (Array.isArray(res)) return res;
  return res?.results || [];
}

export async function bulkAutoGenerateSeating(
  academicYearId: number,
  title: string,
  strategy?: string,
  classId?: number | string,
  division?: string
): Promise<{ message: string; allocated_count: number }> {
  return await apiFetch("/api/seating-allocation/bulk-auto-generate/", {
    method: "POST",
    body: JSON.stringify({
      academic_year: academicYearId,
      title,
      strategy: strategy || "ROLL_NO",
      ...(classId && String(classId).toUpperCase() !== "ALL" ? { class_id: classId } : {}),
      ...(division && division.toUpperCase() !== "ALL" ? { division } : {}),
    }),
  });
}

export async function updateSeatingAllocation(
  id: number,
  data: { seat_number?: string; room?: number }
): Promise<SeatingRecord> {
  return await apiFetch(`/api/seating-allocation/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function calculateResults(academicYearId: number, classId: number, division?: string) {
  return await apiFetch("/api/result-process/", {
    method: "POST",
    body: JSON.stringify({
      academic_year: academicYearId,
      school_class: classId,
      division: division !== "ALL" ? division : undefined,
    }),
  });
}

export async function publishResults(academicYearId: number, classId: number, division?: string, action: "PUBLISH" | "UNPUBLISH" = "PUBLISH") {
  const response = await apiFetch("/api/result-publish/", {
    method: "POST",
    body: JSON.stringify({
      academic_year: academicYearId,
      school_class: classId,
      division: division,
      action: action
    })
  });
  return response;
}

export async function getFinalResults(academicYearId: number, classId: number, division?: string): Promise<FinalStudentResult[]> {
  let url = `/api/result-publish/?academic_year=${academicYearId}&school_class=${classId}`;
  if (division && division !== "ALL") {
    url += `&division=${encodeURIComponent(division)}`;
  }
  const response = await apiFetch(url);
  return Array.isArray(response) ? response : response?.results || [];
}

export interface ResultDashboardSummary {
  academic_year_id: number | null;
  academic_year_name: string;
  weightage: {
    is_configured: boolean;
    status: "DRAFT" | "ACTIVE" | "LOCKED";
    total_weightage: number;
    is_active: boolean;
    components: Array<{
      name: string;
      type: string;
      weightage: number;
    }>;
  };
  terms: Array<{
    term_id: number;
    term_name: string;
    exams_count: number;
    is_scheduled: boolean;
    marks_percentage: number;
    verification_percentage: number;
    status: string;
  }>;
  attendance: {
    is_available: boolean;
    total_logs: number;
    status: string;
  };
  teacher_assessment: {
    total_students: number;
    assessed_students: number;
    percentage: number;
    status: string;
  };
  overall_readiness: {
    is_ready: boolean;
    status: string;
    blockers: string[];
    warnings: string[];
    total_students?: number;
  };
  counts: {
    total_exams: number;
    scheduled_exams: number;
    completed_exams: number;
    ready_count: number;
    approved_count: number;
    published_count: number;
    total_students: number;
  };
}

export async function getResultDashboardSummary(academicYearId?: number): Promise<ResultDashboardSummary> {
  const query = academicYearId ? `?academic_year=${academicYearId}` : "";
  return await apiFetch(`/api/result-dashboard-summary/${query}`);
}

export async function getResultReadiness(params: { academic_year: number; school_class?: number; division?: string }) {
  const queryParts: string[] = [`academic_year=${params.academic_year}`];
  if (params.school_class) queryParts.push(`school_class=${params.school_class}`);
  if (params.division && params.division !== "ALL") queryParts.push(`division=${encodeURIComponent(params.division)}`);
  return await apiFetch(`/api/result-readiness/?${queryParts.join("&")}`);
}

export interface MarksOverviewRow {
  exam_id: number;
  term_name: string;
  class_id: number;
  class_name: string;
  division: string;
  subject_id: number;
  subject_name: string;
  max_marks: number;
  passing_marks: number;
  total_students: number;
  entered_count: number;
  submitted_count: number;
  absent_count: number;
  completion_percentage: number;
  verification_status: "PENDING" | "VERIFIED" | "SENT_BACK";
  is_verified: boolean;
  exam_date: string;
  time: string;
  status: string;
}

export async function getMarksOverview(params?: { academic_year?: number; school_class?: number; exam_term?: number }): Promise<{ exams: MarksOverviewRow[]; total_count: number }> {
  const queryParts: string[] = [];
  if (params?.academic_year) queryParts.push(`academic_year=${params.academic_year}`);
  if (params?.school_class) queryParts.push(`school_class=${params.school_class}`);
  if (params?.exam_term) queryParts.push(`exam_term=${params.exam_term}`);
  const qs = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
  return await apiFetch(`/api/marks-overview/${qs}`);
}

export async function publishExamTimetable(params: { academic_year?: number; exam_term?: number; class_group?: number; division?: string; action?: "PUBLISH" | "DRAFT" }) {
  return await apiFetch("/api/exam-full/publish-timetable/", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function getExamTimetableGrid(params: { academic_year?: number; exam_term?: number; class_group?: number; division?: string }) {
  const queryParts: string[] = [];
  if (params?.academic_year) queryParts.push(`academic_year=${params.academic_year}`);
  if (params?.exam_term) queryParts.push(`exam_term=${params.exam_term}`);
  if (params?.class_group) queryParts.push(`class_group=${params.class_group}`);
  if (params?.division && params.division !== "ALL") queryParts.push(`division=${encodeURIComponent(params.division)}`);
  const qs = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
  return await apiFetch(`/api/exam-full/timetable-grid/${qs}`);
}

export async function publishSeatingAllocations(params: { academic_year?: number; exam_id?: number; title?: string; action?: "PUBLISH" | "UNPUBLISH" }) {
  return await apiFetch("/api/seating-allocation/publish-all/", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function saveSubjectMarks(examId: number, marks: Array<{ student_id: number; marks_obtained: number | null; is_absent: boolean; remarks?: string; status?: string }>) {
  return await apiFetch("/api/subject-marks/bulk-save/", {
    method: "POST",
    body: JSON.stringify({ exam_id: examId, marks }),
  });
}

export async function getClassMarksGrid(params: { academic_year: number; school_class?: number; class_name?: string; exam_term?: number; division?: string }) {
  const queryParts: string[] = [`academic_year=${params.academic_year}`];
  if (params.school_class) queryParts.push(`school_class=${params.school_class}`);
  if (params.class_name) queryParts.push(`class_name=${encodeURIComponent(params.class_name)}`);
  if (params.exam_term) queryParts.push(`exam_term=${params.exam_term}`);
  if (params.division && params.division !== "ALL") queryParts.push(`division=${encodeURIComponent(params.division)}`);
  return await apiFetch(`/api/class-verification/marks-grid/?${queryParts.join("&")}`);
}

export async function verifyClassMarks(params: { academic_year: number; exam_term: number; school_class: number; division?: string; status: "VERIFIED" | "SENT_BACK"; remarks?: string }) {
  return await apiFetch("/api/class-verification/", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function saveTeacherAssessments(params: { academic_year: number; subject_id: number; school_class: number; scores: Array<{ student_id: number; score: number; max_score: number; remarks?: string }> }) {
  return await apiFetch("/api/teacher-assessment/bulk-save/", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function getStudentExamSchedule(studentId?: number) {
  const qs = studentId ? `?student_id=${studentId}` : "";
  return await apiFetch(`/api/student-exam-schedule/${qs}`);
}

export async function getStudentReportCard(params?: { student_id?: number; academic_year?: number }) {
  const queryParts: string[] = [];
  if (params?.student_id) queryParts.push(`student_id=${params.student_id}`);
  if (params?.academic_year) queryParts.push(`academic_year=${params.academic_year}`);
  const qs = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
  return await apiFetch(`/api/student-report-card/${qs}`);
}

