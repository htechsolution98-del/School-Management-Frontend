import axios from "axios";
import { toast } from "sonner";
import { API_BASE_URL, getAuthToken, showApiError, showSuccess, showWarning } from "./inventory-client";

export const ID_CARD_BASE_URL = `${API_BASE_URL}/id-cards`;

export const idCardApi = axios.create({
  baseURL: ID_CARD_BASE_URL,
  withCredentials: true,
});

idCardApi.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (typeof window !== "undefined") {
    const schoolId = localStorage.getItem("school_id") || localStorage.getItem("school");
    if (schoolId) {
      config.headers["X-School-ID"] = schoolId;
    }
  }
  return config;
});

export { showApiError, showSuccess, showWarning };
