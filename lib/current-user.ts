import { API_BASE_URL, API_ENDPOINTS } from "./config";
import { fetchWithAuth, setRoleCookies } from "./auth";
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

  const profile = (await response.json()) as CurrentUserProfile;

  if (typeof window !== "undefined" && profile) {
    const rawRoles = profile.roles || (profile.role ? [profile.role] : []);
    const normalizedRoles = rawRoles.map((r) => String(r).toLowerCase().trim()).filter(Boolean);
    if (normalizedRoles.length > 0) {
      localStorage.setItem("roles", JSON.stringify(normalizedRoles));
      setRoleCookies(normalizedRoles);
    }
    const shortName = profile.short_display_name || profile.school_short_name || profile.school?.short_name;
    if (shortName) {
      localStorage.setItem("school_short_name", shortName);
    }
    const fullName = profile.school_full_name || profile.school?.full_name || profile.school?.name;
    if (fullName) {
      localStorage.setItem("school_full_name", fullName);
    }
    const displayName = shortName || fullName || profile.school?.name;
    if (displayName) {
      localStorage.setItem("school_name", displayName);
    }
    if (profile.id) {
      localStorage.setItem("user_id", String(profile.id));
    }
    if (profile.school?.id) {
      localStorage.setItem("school_id", String(profile.school.id));
    }
    if (profile.school?.slug) {
      localStorage.setItem("school_slug", profile.school.slug);
    }
    const logoUrl = profile.school?.logo || profile.avatar;
    if (logoUrl) {
      localStorage.setItem("school_logo", logoUrl);
    }
  }

  return profile;
}