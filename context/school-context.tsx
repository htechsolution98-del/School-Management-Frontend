"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getCurrentUserProfile } from "@/lib/current-user";

export interface SchoolContextType {
  schoolName: string | null;
  schoolShortName: string | null;
  schoolFullName: string | null;
  schoolLogo: string | null;
  updateSchoolInfo: (info: {
    school_full_name?: string | null;
    school_short_name?: string | null;
    main_logo_url?: string | null;
  }) => void;
  refreshProfile: () => Promise<void>;
}

export const SCHOOL_PROFILE_UPDATED_EVENT = "school-profile-updated";

const SchoolContext = createContext<SchoolContextType>({
  schoolName: null,
  schoolShortName: null,
  schoolFullName: null,
  schoolLogo: null,
  updateSchoolInfo: () => {},
  refreshProfile: async () => {},
});

export function SchoolProvider({ children }: { children: React.ReactNode }) {
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [schoolShortName, setSchoolShortName] = useState<string | null>(null);
  const [schoolFullName, setSchoolFullName] = useState<string | null>(null);
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    try {
      const data = await getCurrentUserProfile();
      const shortName = data?.short_display_name || data?.school_short_name || data?.school?.short_name || null;
      const fullName = data?.school_full_name || data?.school?.full_name || data?.school?.name || null;
      if (shortName) setSchoolShortName(shortName);
      if (fullName) setSchoolFullName(fullName);
      if (shortName || fullName) {
        setSchoolName(shortName || fullName);
      }
      const resolvedLogo = data?.school?.logo || data?.avatar || null;
      if (resolvedLogo) {
        setSchoolLogo(resolvedLogo);
      }
    } catch {
      // Ignore background refresh errors
    }
  }, []);

  // Sync state from localStorage on mount and load fresh profile in background
  useEffect(() => {
    try {
      const storedShortName = localStorage.getItem("school_short_name");
      const storedFullName = localStorage.getItem("school_full_name");
      const storedName = localStorage.getItem("school_name");
      const storedLogo = localStorage.getItem("school_logo");

      if (storedShortName) setSchoolShortName(storedShortName);
      if (storedFullName) setSchoolFullName(storedFullName);
      if (storedShortName || storedName || storedFullName) {
        setSchoolName(storedShortName || storedFullName || storedName);
      }
      if (storedLogo) setSchoolLogo(storedLogo);
    } catch {
      // Ignore localStorage availability issues in restricted environments
    }

    refreshProfile();
  }, [refreshProfile]);

  const updateSchoolInfo = useCallback(
    (info: {
      school_full_name?: string | null;
      school_short_name?: string | null;
      main_logo_url?: string | null;
    }) => {
      const shortName = info.school_short_name?.trim() || "";
      const fullName = info.school_full_name?.trim() || "";
      const logo = info.main_logo_url || "";
      const displayName = shortName || fullName;

      // 1. Immediately update localStorage for instant persistence across tabs/reloads
      try {
        if (fullName) localStorage.setItem("school_full_name", fullName);
        if (shortName) localStorage.setItem("school_short_name", shortName);
        if (displayName) localStorage.setItem("school_name", displayName);
        if (logo) localStorage.setItem("school_logo", logo);
      } catch {
        // Ignore localStorage error
      }

      // 2. Immediately update state
      if (shortName) setSchoolShortName(shortName);
      if (fullName) setSchoolFullName(fullName);
      if (displayName) setSchoolName(displayName);
      if (logo) setSchoolLogo(logo);

      // 3. Dispatch global browser events for instant cross-component synchronization
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(SCHOOL_PROFILE_UPDATED_EVENT, {
            detail: {
              school_full_name: fullName,
              school_short_name: shortName,
              displayName,
              main_logo_url: logo,
            },
          })
        );
      }
    },
    []
  );

  // Listen for storage events and custom events
  useEffect(() => {
    const handleCustomEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const detail = customEvent.detail;
      if (!detail) return;
      if (detail.school_short_name) setSchoolShortName(detail.school_short_name);
      if (detail.school_full_name) setSchoolFullName(detail.school_full_name);
      if (detail.displayName || detail.school_short_name || detail.school_full_name) {
        setSchoolName(detail.displayName || detail.school_short_name || detail.school_full_name);
      }
      if (detail.main_logo_url) setSchoolLogo(detail.main_logo_url);
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === "school_name" && e.newValue) setSchoolName(e.newValue);
      if (e.key === "school_short_name" && e.newValue) setSchoolShortName(e.newValue);
      if (e.key === "school_full_name" && e.newValue) setSchoolFullName(e.newValue);
      if (e.key === "school_logo" && e.newValue) setSchoolLogo(e.newValue);
    };

    window.addEventListener(SCHOOL_PROFILE_UPDATED_EVENT, handleCustomEvent);
    window.addEventListener("storage", handleStorageEvent);

    return () => {
      window.removeEventListener(SCHOOL_PROFILE_UPDATED_EVENT, handleCustomEvent);
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, []);

  return (
    <SchoolContext.Provider
      value={{
        schoolName,
        schoolShortName,
        schoolFullName,
        schoolLogo,
        updateSchoolInfo,
        refreshProfile,
      }}
    >
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchool() {
  return useContext(SchoolContext);
}
