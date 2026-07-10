import { API_BASE_URL, API_ENDPOINTS } from "@/lib/config";
import { fetchWithAuth } from "@/lib/auth";
import type {
  TodayAttendance,
  AttendanceRecord,
} from "@/types/teacher";

// ─── Get today's attendance ───────────────────────────────────────────────────

export async function getTodayAttendance(): Promise<TodayAttendance | null> {
  const url = `${API_BASE_URL}${API_ENDPOINTS.ATTENDANCE_TODAY}`;
  const response = await fetchWithAuth(url);

  if (response.status === 404) {
    // No record yet — fresh day, not an error
    return null;
  }

  if (!response.ok) {
    let message = "Failed to fetch today's attendance.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch { }
    throw new Error(message);
  }

  return response.json();
}

// ─── Mark attendance (check-in OR check-out) ─────────────────────────────────

export async function markAttendance(payload: {
  latitude: number;
  longitude: number;
}): Promise<void> {
  const url = `${API_BASE_URL}/attendance/`;
  const response = await fetchWithAuth(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "Attendance action failed.";
    try {
      const err = await response.json();
      message =
        err?.non_field_errors?.[0] ||
        err?.detail ||
        err?.message ||
        message;
    } catch { }
    throw new Error(message);
  }
}

// ─── Get all attendance records (history) ────────────────────────────────────

export async function getAttendanceHistory(): Promise<AttendanceRecord[]> {
  const url = `${API_BASE_URL}/attendance/`;
  const response = await fetchWithAuth(url);

  if (!response.ok) {
    let message = "Failed to fetch attendance history.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch { }
    throw new Error(message);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : (data.results ?? data.data ?? []);
}

// ─── Face verification & enrollment ──────────────────────────────────────────

export async function checkFaceStatus(): Promise<{ enrolled: boolean }> {
  const url = `${API_BASE_URL}${API_ENDPOINTS.FACE_VERIFY}`;
  try {
    const response = await fetchWithAuth(url);
    if (!response.ok) {
      return { enrolled: false };
    }
    const data = await response.json();
    return { enrolled: data?.enrolled ?? data?.is_enrolled ?? false };
  } catch {
    return { enrolled: false };
  }
}

function dataURLtoFile(dataurl: string, filename: string): File {
  const arr = dataurl.split(",");
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

export async function verifyFace(imageBase64: string): Promise<any> {
  const url = `${API_BASE_URL}${API_ENDPOINTS.FACE_VERIFY}`;
  const file = dataURLtoFile(imageBase64, "face.png");
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetchWithAuth(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let message = "Face verification failed.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch { }
    throw new Error(message);
  }

  return response.json();
}

export async function enrollFace(imageBase64: string): Promise<{ success: boolean; message?: string }> {
  const url = `${API_BASE_URL}${API_ENDPOINTS.FACE_ENROLL}`;
  const file = dataURLtoFile(imageBase64, "face.png");
  const formData = new FormData();
  formData.append("face_image", file);

  const response = await fetchWithAuth(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let message = "Face enrollment failed.";
    try {
      const err = await response.json();
      message = err?.detail || err?.message || message;
    } catch { }
    throw new Error(message);
  }

  return response.json();
}
