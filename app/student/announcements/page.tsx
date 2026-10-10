"use client";

import React from "react";
import { AnnouncementsHub } from "@/components/announcements/announcements-hub";

export default function StudentAnnouncementsPage() {
  return (
    <AnnouncementsHub
      roleTitle="Student"
      canCreate={false}
      accentColor="blue"
      pageTitle="Student Circulars & Notice Board"
      pageSubtitle="View official school notices, academic circulars, exam schedules, and holiday announcements."
    />
  );
}
