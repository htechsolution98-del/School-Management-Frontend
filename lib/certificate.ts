import { API_BASE_URL } from "./config";
import { fetchWithAuth } from "./auth";

export interface CertificateType {
  id: number;
  name: string;
}

export interface CertificateRequestItem {
  id: number;
  student?: number;
  student_name: string;
  student_gr_no?: string;
  student_class?: string;
  certificate_type: number | string;
  certificate_type_name?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  certificate_file?: string | null;
  certificate_number?: string | null;
  generated_data?: any;
  created_at: string;
}

export async function getCertificateTypes(): Promise<CertificateType[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}/certificate-types/`);
  if (!res.ok) {
    throw new Error("Failed to fetch certificate types.");
  }
  const data = await res.json();
  const list = Array.isArray(data) ? data : data.results ?? data.data ?? [];
  return list.map((item: any) => ({
    id: item.id,
    name: item.name,
  }));
}

export async function getMyCertificateRequests(studentId?: number): Promise<CertificateRequestItem[]> {
  const url = studentId
    ? `${API_BASE_URL}/request-certificate/?student=${studentId}`
    : `${API_BASE_URL}/request-certificate/`;
  const res = await fetchWithAuth(url);
  if (!res.ok) {
    throw new Error("Failed to fetch certificate requests.");
  }
  const data = await res.json();
  const list = Array.isArray(data) ? data : data.results ?? data.data ?? [];
  return list.map((item: any) => ({
    id: item.id,
    student: item.student,
    student_name: item.student_name || "Student",
    student_gr_no: item.student_gr_no || "",
    student_class: item.student_class || "",
    certificate_type: item.certificate_type,
    certificate_type_name: item.certificate_type_name || (typeof item.certificate_type === "string" ? item.certificate_type : "Certificate"),
    status: item.status || "PENDING",
    certificate_file: item.certificate_file || null,
    certificate_number: item.certificate_number || null,
    generated_data: item.generated_data || null,
    created_at: item.created_at || new Date().toISOString(),
  }));
}

export async function createCertificateRequest(
  certificateTypeId: number,
  studentId?: number
): Promise<CertificateRequestItem> {
  const payload: any = { certificate_type: certificateTypeId };
  if (studentId) {
    payload.student = studentId;
  }
  const res = await fetchWithAuth(`${API_BASE_URL}/request-certificate/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const msg =
      errorData.detail ||
      errorData.message ||
      (Array.isArray(errorData) ? errorData[0] : null) ||
      (typeof errorData === "object" ? Object.values(errorData)[0] : null) ||
      "Failed to submit certificate request.";
    throw new Error(Array.isArray(msg) ? msg[0] : String(msg));
  }
  return await res.json();
}

export async function getClerkCertificateRequests(status?: string): Promise<CertificateRequestItem[]> {
  const url = status
    ? `${API_BASE_URL}/certificate-requests/?status=${encodeURIComponent(status)}`
    : `${API_BASE_URL}/certificate-requests/`;
  const res = await fetchWithAuth(url);
  if (!res.ok) {
    throw new Error("Failed to fetch school certificate requests.");
  }
  const data = await res.json();
  const list = Array.isArray(data) ? data : data.results ?? data.data ?? [];
  return list.map((item: any) => ({
    id: item.id,
    student: item.student,
    student_name: item.student_name || "Student",
    student_gr_no: item.student_gr_no || "",
    student_class: item.student_class || "",
    certificate_type: item.certificate_type_id || item.certificate_type,
    certificate_type_name: item.certificate_type || "Certificate",
    status: item.status || "PENDING",
    certificate_file: item.certificate_file || null,
    certificate_number: item.certificate_number || null,
    generated_data: item.generated_data || null,
    created_at: item.created_at || new Date().toISOString(),
  }));
}

export async function approveCertificateRequest(
  requestId: number,
  file?: File | null,
  generatedData?: any,
  certificateNumber?: string
): Promise<any> {
  const fd = new FormData();
  fd.append("status", "APPROVED");
  if (file) {
    fd.append("file", file);
  }
  if (generatedData) {
    fd.append(
      "generated_data",
      typeof generatedData === "string" ? generatedData : JSON.stringify(generatedData)
    );
  }
  if (certificateNumber) {
    fd.append("certificate_number", certificateNumber);
  }
  const res = await fetchWithAuth(`${API_BASE_URL}/certificate-requests/${requestId}/`, {
    method: "PATCH",
    body: fd,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const msg = errorData.detail || errorData.message || "Failed to approve certificate.";
    throw new Error(String(msg));
  }
  return await res.json();
}

export async function rejectCertificateRequest(
  requestId: number
): Promise<any> {
  const fd = new FormData();
  fd.append("status", "REJECTED");
  const res = await fetchWithAuth(`${API_BASE_URL}/certificate-requests/${requestId}/`, {
    method: "PATCH",
    body: fd,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const msg = errorData.detail || errorData.message || "Failed to reject certificate.";
    throw new Error(String(msg));
  }
  return await res.json();
}
