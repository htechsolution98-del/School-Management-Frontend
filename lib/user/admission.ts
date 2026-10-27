import { API_BASE_URL, API_ENDPOINTS } from "../config"
import { fetchWithAuth } from "../auth"
import type { TempUser, SchoolClass } from "@/types/user"
import type { PublicAdmissionForm } from "@/types/principal"

export async function getPublicFormFields(): Promise<PublicAdmissionForm[]> {
  const url = `${API_BASE_URL}${API_ENDPOINTS.FIELDS}`
  const response = await fetchWithAuth(url) // Note: Public fetch

  if (!response.ok) {
    let message = "Failed to fetch form fields."
    try {
      const err = await response.json()
      message = err?.detail || err?.message || message
    } catch {
      // Ignore
    }
    throw new Error(message)
  }

  const data = await response.json()
  return data
}

export const getClasses = async (): Promise<SchoolClass[]> => {
  const response = await fetchWithAuth(
    `${API_BASE_URL}${API_ENDPOINTS.CLASSES}`
  )

  if (!response.ok) {
    throw new Error("Failed to fetch classes")
  }

  const data = await response.json()
  return Array.isArray(data) ? data : (data.results ?? [])
}

export async function getTempUsers(): Promise<TempUser[]> {
  const url = `${API_BASE_URL}${API_ENDPOINTS.GET_TEMP_USER_DATA}`

  const response = await fetchWithAuth(url)

  if (!response.ok) {
    throw new Error("Failed to fetch temp users")
  }

  const data = await response.json()

  return Array.isArray(data)
    ? data
    : (data.data ?? data.results ?? [])
}

export async function createSubmission(payload: any) {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/submissions/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  )

  if (!response.ok) {
    let message = "Failed to create submission"

    try {
      const err = await response.json()

      message =
        err?.detail ||
        err?.message ||
        JSON.stringify(err) ||
        message
    } catch {
      // ignore
    }

    throw new Error(message)
  }

  return response.json()
}

export async function updateSubmission(
  id: string,
  payload: any
) {
  const response = await fetchWithAuth(
    `${process.env.NEXT_PUBLIC_API_URL || API_BASE_URL}/submissions/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  )

  if (!response.ok) {
    let message = "Failed to update submission"

    try {
      const err = await response.json()

      message =
        err?.detail ||
        err?.message ||
        JSON.stringify(err) ||
        message
    } catch {
      // ignore
    }

    throw new Error(message)
  }

  return response.json()
}

export async function submitDocuments(payload: {
  admission_number: string
  documents: { document_field: number; file: File }[]
}): Promise<any> {
  const formData = new FormData()
  formData.append("admission_number", payload.admission_number)

  payload.documents.forEach((doc) => {
    formData.append("document_field", String(doc.document_field))
    formData.append("file", doc.file)
  })

  const response = await fetchWithAuth(
    `${API_BASE_URL}/documentsubmission/`,
    {
      method: "POST",
      body: formData,
    }
  )

  if (!response.ok) {
    let message = "Document submission failed"
    try {
      const err = await response.json()
      message = err?.detail || err?.message || message
    } catch { }
    throw new Error(message)
  }

  const data = await response.json()
  return Array.isArray(data) ? data[0] : data
}

export async function getAdmissionReceipt(admission_number: string) {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/admission-receipt/${admission_number}/`,
    { method: "GET" }
  )
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.error || "Failed to fetch receipt")
  }
  return data
}

export interface PublicCheckParentResponse {
  requires_otp: boolean;
  exists: boolean;
  message: string;
  otp?: string;
}

export interface VerifyParentOTPResponse {
  success: boolean;
  message: string;
  parent?: {
    id?: number;
    parent_user_id?: number;
    father_name?: string;
    mother_name?: string;
    surname?: string;
    guardian_name?: string;
    address?: string;
    city?: string;
    district?: string;
    state?: string;
    pincode?: string;
    email?: string;
    field_values?: Record<string, string>;
  };
  siblings?: {
    id: number;
    name: string;
    gr_no?: string;
    class_name?: string;
    admission_number?: string;
  }[];
}

export async function checkPublicParent(mobile_number: string): Promise<PublicCheckParentResponse> {
  const response = await fetchWithAuth(`${API_BASE_URL}/public-check-parent/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mobile_number }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || "Failed to check mobile number");
  }
  return data;
}

export async function verifyParentOTP(mobile_number: string, otp: string): Promise<VerifyParentOTPResponse> {
  const response = await fetchWithAuth(`${API_BASE_URL}/verify-parent-otp/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mobile_number, otp }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || "Invalid or expired OTP");
  }
  return data;
}

