import { API_BASE_URL } from "@/lib/config";
import { fetchWithAuth } from "@/lib/auth";
import type {
  StudentAttendanceListResponse,
  StudentAttendancePayload,
} from "@/types/teacher";

// ─── GET /get/attendance/students/ ────────────────────────────────────────────

export async function getStudentsForAttendance(
  divisionId?: number | string
): Promise<StudentAttendanceListResponse> {
  let url = `${API_BASE_URL}/get/attendance/students/`;
  if (divisionId) {
    url += `?division_id=${divisionId}`;
  }
  const response = await fetchWithAuth(url);

  const data = await response.json();

  // Handle "not assigned as class teacher" case
  if (!response.ok || data?.success === false) {
    throw new Error(
      data?.message || "Failed to fetch students for attendance."
    );
  }

  return data;
}

// ─── POST /student-attendance/ ────────────────────────────────────────────────

export async function submitStudentAttendance(
  records: StudentAttendancePayload[]
): Promise<void> {
  const url = `${API_BASE_URL}/student-attendance/`;

  const promises = records.map((record) =>
    fetchWithAuth(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    })
  );

  const responses = await Promise.all(promises);

  for (const res of responses) {
    if (!res.ok) {
      let message = "Failed to submit student attendance.";
      try {
        const err = await res.json();
        message = err?.detail || err?.message || message;
      } catch { }
      throw new Error(message);
    }
  }
}

// ─── GET /student-attendance/ — retrieve marked student attendance records ────

export interface StudentAttendanceQueryParams {
  date?: string;
  start_date?: string;
  end_date?: string;
  division_id?: number | string;
  student_id?: number | string;
  status?: "present" | "absent" | "all";
  gender?: "male" | "female" | "all";
  search?: string;
}

export async function getStudentAttendanceRecords(
  params?: StudentAttendanceQueryParams
): Promise<any[]> {
  const query = new URLSearchParams();
  if (params?.date) query.set("date", params.date);
  if (params?.start_date) query.set("start_date", params.start_date);
  if (params?.end_date) query.set("end_date", params.end_date);
  if (params?.division_id) query.set("division_id", String(params.division_id));
  if (params?.student_id) query.set("student_id", String(params.student_id));
  if (params?.status && params.status !== "all") query.set("status", params.status);
  if (params?.gender && params.gender !== "all") query.set("gender", params.gender);
  if (params?.search) query.set("search", params.search);

  const qs = query.toString();
  const url = `${API_BASE_URL}/student-attendance/${qs ? `?${qs}` : ""}`;
  const response = await fetchWithAuth(url);

  if (!response.ok) {
    throw new Error("Failed to fetch student attendance records.");
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data.results ?? data.data ?? [];
}

// ─── POST /student-attendance/ (Single student edit/update) ────────────────────

export async function updateSingleStudentAttendance(
  studentId: number | string,
  is_present: boolean,
  is_absent: boolean,
  reason?: string,
  attendance_date?: string
): Promise<any> {
  const url = `${API_BASE_URL}/student-attendance/`;
  const body: any = {
    student: Number(studentId),
    is_present,
    is_absent,
  };
  if (reason) body.reason = reason;
  if (attendance_date) body.attendance_date = attendance_date;

  const res = await fetchWithAuth(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let message = "Failed to update student attendance.";
    try {
      const err = await res.json();
      message = err?.detail || err?.message || message;
    } catch {}
    throw new Error(message);
  }

  return await res.json();
}

