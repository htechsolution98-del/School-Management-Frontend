import { API_BASE_URL, API_ENDPOINTS } from "@/lib/config";
import { fetchWithAuth, getAccessToken } from "@/lib/auth";
import { getErrorMessage, normalizeList } from "./helpers";
import type {
  AdmissionFormCreatePayload,
  AdmissionFormResponse,
} from "@/types/principal";

const FORMS_URL = `${API_BASE_URL}${API_ENDPOINTS.FORMS}`;

export interface PublishedFormItem {
  id: number;
  title: string;
  unique_link: string;
  form_link: string;
  api_form_link?: string;
  school_id?: number | null;
  school_name: string;
  school_slug?: string;
  academic_year?: string;
}

export interface PublishedFormLinkResponse {
  form_link: string;
  unique_link: string | null;
  school_name?: string;
  forms: PublishedFormItem[];
  count?: number;
}

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

export async function getAdmissionFormById(
  formId: number
): Promise<AdmissionFormResponse> {
  const response = await fetchWithAuth(`${FORMS_URL}${formId}/`);

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to fetch form details."));
  }

  return response.json();
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

export async function getPublishedFormLink(): Promise<PublishedFormLinkResponse> {
  try {
    const token = typeof window !== "undefined" ? getAccessToken() : null;
    const url = `${API_BASE_URL}${API_ENDPOINTS.FORM_LINK}`;
    const response = token
      ? await fetchWithAuth(url)
      : await fetch(url, { headers: { "Content-Type": "application/json" } });

    if (!response.ok) {
      return { form_link: "", unique_link: null, forms: [] };
    }

    const data = await response.json();
    const origin = typeof window !== "undefined" ? window.location.origin : "";

    const rawForms: PublishedFormItem[] = Array.isArray(data.forms) ? data.forms : [];
    const formattedForms: PublishedFormItem[] = rawForms.map((item) => {
      let resolvedLink = item.form_link || "";
      if (item.unique_link) {
        resolvedLink = origin ? `${origin}/form/${item.unique_link}` : `/form/${item.unique_link}`;
      }
      return {
        ...item,
        form_link: resolvedLink,
      };
    });

    let mainFormLink = data.form_link || "";
    if (data.unique_link) {
      mainFormLink = origin ? `${origin}/form/${data.unique_link}` : `/form/${data.unique_link}`;
    } else if (formattedForms.length > 0) {
      mainFormLink = formattedForms[0].form_link;
    }

    return {
      form_link: mainFormLink,
      unique_link: data.unique_link || (formattedForms[0]?.unique_link ?? null),
      school_name: data.school_name || formattedForms[0]?.school_name || "",
      forms: formattedForms,
      count: formattedForms.length,
    };
  } catch {
    return { form_link: "", unique_link: null, forms: [] };
  }
}
