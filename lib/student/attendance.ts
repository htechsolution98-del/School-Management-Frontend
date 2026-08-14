import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { getErrorMessage, normalizeList } from "./helpers";
import type { StudentAttendanceRecord } from "@/types/student";

export async function getStudentAttendance(): Promise<StudentAttendanceRecord[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/specific-student-attendance/`);

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to fetch attendance history.")
    );
  }

  return normalizeList<StudentAttendanceRecord>(await response.json());
}
