import { API_BASE_URL, API_ENDPOINTS } from "@/lib/config";
import { fetchWithAuth } from "@/lib/auth";
import { getErrorMessage, normalizeList } from "./helpers";
import type {
  AdmissionFormCreatePayload,
  AdmissionFormResponse,
} from "@/types/principal";

const FORMS_URL = `${API_BASE_URL}${API_ENDPOINTS.FORMS}`;

export async function getAdmissionForms(): Promise<AdmissionFormResponse[]> {
  const response = await fetchWithAuth(FORMS_URL);

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to fetch forms."));
  }

  return normalizeList<AdmissionFormResponse>(await response.json());
}

export async function createAdmissionForm(
  payload: AdmissionFormCreatePayload
): Promise<AdmissionFormResponse> {
  const response = await fetchWithAuth(FORMS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to create form."));
  }

  return response.json();
}

export async function toggleFormStatus(
  formId: number,
  is_active: boolean
): Promise<void> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}${API_ENDPOINTS.FORM_STATUS}${formId}/`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active }),
    }
  );

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to update form status."));
  }
}

export async function deleteAdmissionForm(formId: number): Promise<void> {
  const response = await fetchWithAuth(`${FORMS_URL}${formId}/`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to delete form."));
  }
}

export async function updateAdmissionForm(
  formId: number,
  payload: Partial<AdmissionFormCreatePayload>
): Promise<AdmissionFormResponse> {
  const response = await fetchWithAuth(`${FORMS_URL}${formId}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to update form."));
  }

  return response.json();
}

export async function getPublishedFormLink(): Promise<{ form_link: string }> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}${API_ENDPOINTS.FORM_LINK}`);

    if (!response.ok) {
      return { form_link: "" };
    }

    const data = await response.json();

    if (data.form_link && data.form_link.startsWith("/")) {
      const baseUrl = API_BASE_URL.endsWith("/")
        ? API_BASE_URL.slice(0, -1)
        : API_BASE_URL;
      data.form_link = `${baseUrl}${data.form_link}`;
    }

    return data;
  } catch (error) {
    return { form_link: "" };
  }
}
