import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/config";
import type {
  AcademicYear,
  ApiResponse,
  CreateMonthlyFeePayload,
  CreateSingleFeePayload,
  DiscountPayload,
  FeeWiseClass,
  Student,
  StudentFee,
  StudentFeePayload,
  StudentForFee,
  CollectFeePayload,
} from "@/types/fees";

export async function fetchStudents(): Promise<ApiResponse<Student[]>> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/studentget/`);
    if (!response.ok) throw new Error("Failed to fetch students");
    return { data: await response.json(), error: null, success: true };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Failed to fetch students", success: false };
  }
}

export async function fetchAcademicYearsForFee(): Promise<ApiResponse<AcademicYear[]>> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/academic-year/`);
    if (!response.ok) throw new Error("Failed to fetch academic years");
    const data = await response.json();
    return { data: Array.isArray(data) ? data : data.results ?? data.data ?? [], error: null, success: true };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Failed to fetch academic years", success: false };
  }
}

export async function fetchFeeWiseClassesForFee(): Promise<ApiResponse<FeeWiseClass[]>> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.FEE_WISE_CLASS}`);
    if (!response.ok) throw new Error("Failed to fetch fee structures");
    const data = await response.json();
    return { data: Array.isArray(data) ? data : data.results ?? data.data ?? [], error: null, success: true };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Failed to fetch fee structures", success: false };
  }
}

export async function fetchStudentFees(params?: {
  class_name?: string;
  billing_period?: string;
  search?: string;
  page?: number;
  student?: number;
}): Promise<ApiResponse<{ results: StudentFee[]; count: number }>> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.class_name) queryParams.append("class_name", params.class_name);
    if (params?.billing_period) queryParams.append("billing_period", params.billing_period);
    if (params?.search) queryParams.append("search", params.search);
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.student) queryParams.append("student", params.student.toString());
    const response = await fetchWithAuth(`${API_BASE_URL}/student-fee/${queryParams.toString() ? `?${queryParams.toString()}` : ""}`);
    if (!response.ok) throw new Error("Failed to fetch student fees");
    const data = await response.json();
    if (Array.isArray(data)) return { data: { results: data, count: data.length }, error: null, success: true };
    return { data: { results: data.results ?? data.data ?? [], count: data.count ?? data.total ?? 0 }, error: null, success: true };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Failed to fetch student fees", success: false };
  }
}

export async function fetchStudentLedgerSchedule(
  studentId: number,
  academicYearId: number
): Promise<ApiResponse<StudentFee[]>> {
  try {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/student-ledger/schedule/?student=${studentId}&academic_year=${academicYearId}`
    );
    if (!response.ok) throw new Error("Failed to fetch ledger schedule");
    const data = await response.json();
    return { data, error: null, success: true };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to fetch ledger schedule",
      success: false,
    };
  }
}

export async function generateSingleVirtualFee(payload: {
  student: number;
  academic_year: number;
  fee_wise_class: number;
  billing_period: string;
  due_date?: string;
}): Promise<ApiResponse<StudentFee>> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/student-ledger/generate-fee/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to generate fee");
    }
    const data = await response.json();
    return { data, error: null, success: true };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to generate fee",
      success: false,
    };
  }
}

export async function createMonthlyStudentFee(payload: CreateMonthlyFeePayload): Promise<ApiResponse<StudentFee>> {
  return createStudentFeeResponse({
    ...payload,
    due_date: payload.due_date ?? "",
  });
}

export async function createSingleStudentFee(payload: CreateSingleFeePayload): Promise<ApiResponse<StudentFee>> {
  return createStudentFeeResponse({
    ...payload,
    due_date: payload.due_date ?? "",
    billing_period: "",
  });
}

async function createStudentFeeResponse(payload: StudentFeePayload): Promise<ApiResponse<StudentFee>> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/student-fee/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      // Try to extract a useful error message from DRF errors
      let errorMessage = "Failed to create fee";
      if (errorData && typeof errorData === "object") {
         const firstKey = Object.keys(errorData)[0];
         if (firstKey) {
            const val = errorData[firstKey];
            errorMessage = Array.isArray(val) ? val[0] : (typeof val === "string" ? val : errorMessage);
            if (firstKey !== "non_field_errors") {
                errorMessage = `${firstKey}: ${errorMessage}`;
            }
         }
      }
      throw new Error(errorMessage);
    }
    return { data: await response.json(), error: null, success: true };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Failed to create fee", success: false };
  }
}

export async function addDiscountToStudentFee(
  feeId: number,
  payload: DiscountPayload
): Promise<ApiResponse<StudentFee>> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/student-fee/${feeId}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("Failed to apply discount");
    return { data: await response.json(), error: null, success: true };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Failed to add discount", success: false };
  }
}

export async function deleteStudentFee(feeId: number): Promise<ApiResponse<null>> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/student-fee/${feeId}/`, { method: "DELETE" });
    if (!response.ok) throw new Error("Failed to delete fee");
    return { data: null, error: null, success: true };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Failed to delete fee", success: false };
  }
}

export async function createStudentFee(payload: StudentFeePayload): Promise<StudentFee> {
  const response = await fetchWithAuth(`${API_BASE_URL}/student-fee/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.detail || data?.message || "Failed to create student fee.");
  return data;
}

export async function collectStudentFeePayment(payload: CollectFeePayload): Promise<ApiResponse<any>> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/student-fee-payment/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      let errorMessage = "Failed to collect fee";
      if (errorData && typeof errorData === "object") {
         const firstKey = Object.keys(errorData)[0];
         if (firstKey) {
            const val = errorData[firstKey];
            errorMessage = Array.isArray(val) ? val[0] : (typeof val === "string" ? val : errorMessage);
            if (firstKey !== "non_field_errors") {
                errorMessage = `${firstKey}: ${errorMessage}`;
            }
         }
      }
      throw new Error(errorMessage);
    }
    return { data: await response.json(), error: null, success: true };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Failed to collect fee", success: false };
  }
}

export async function clearStudentFeePayment(paymentId: number): Promise<ApiResponse<any>> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/student-fee-payment/${paymentId}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_verified: true, is_bounced: false }),
    });
    if (!response.ok) throw new Error("Failed to clear cheque");
    return { data: await response.json(), error: null, success: true };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Failed to clear cheque", success: false };
  }
}

export async function bounceStudentFeePayment(paymentId: number): Promise<ApiResponse<any>> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/student-fee-payment/${paymentId}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_verified: false, is_bounced: true }),
    });
    if (!response.ok) throw new Error("Failed to bounce cheque");
    return { data: await response.json(), error: null, success: true };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Failed to bounce cheque", success: false };
  }
}

export async function addDiscount(studentFeeId: number, payload: DiscountPayload): Promise<StudentFee> {
  const response = await fetchWithAuth(`${API_BASE_URL}/student-fee/${studentFeeId}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.detail || data?.message || "Failed to apply discount.");
  return data;
}

export async function getStudentsByFeeWiseClass(
  _feeWiseClassId: number,
  schoolClassId: number
): Promise<StudentForFee[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/fee-wise-class/?school_class=${schoolClassId}`);
  if (!response.ok) throw new Error("Failed to fetch students.");
  const data = await response.json();
  return Array.isArray(data) ? data : data.results ?? data.data ?? [];
}

export async function bulkCreateStudentFees(
  records: StudentFeePayload[]
): Promise<{ success: StudentFee[]; failed: { index: number; error: string }[] }> {
  const success: StudentFee[] = [];
  const failed: { index: number; error: string }[] = [];
  for (let i = 0; i < records.length; i++) {
    try {
      success.push(await createStudentFee(records[i]));
    } catch (error) {
      failed.push({ index: i, error: error instanceof Error ? error.message : "Unknown error" });
    }
  }
  return { success, failed };
}
