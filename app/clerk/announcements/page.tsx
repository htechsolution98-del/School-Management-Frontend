"use client";

import React from "react";
import { AnnouncementsHub } from "@/components/announcements/announcements-hub";

export default function ClerkAnnouncementsPage() {
  return (
    <AnnouncementsHub
      roleTitle="Clerk"
      canCreate={true}
      accentColor="purple"
      pageTitle="Administrative Notices & Circulars"
      pageSubtitle="Create and manage school circulars, office notices, and holiday announcements."
    />
  );
}
