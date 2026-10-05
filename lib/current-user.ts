import { API_BASE_URL, API_ENDPOINTS } from "./config";
import { fetchWithAuth } from "./auth";
import { apiValidationError } from "./api-errors";
import type { CurrentUserProfile } from "../types";

/**
 * GET /me/ — profile of the currently authenticated user.
 *
 * The backend resolves the user from the access token, so this is safe to call
 * from any role's layout and can only ever return the caller's own data.
 */
export async function getCurrentUserProfile(): Promise<CurrentUserProfile> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}${API_ENDPOINTS.CURRENT_USER}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw await apiValidationError(
      response,
      `Unable to load your profile (HTTP ${response.status}).`
    );
  }

  return response.json() as Promise<CurrentUserProfile>;
}