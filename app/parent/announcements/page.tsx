"use client";

import React from "react";
import { AnnouncementsHub } from "@/components/announcements/announcements-hub";

export default function ParentAnnouncementsPage() {
  return (
    <AnnouncementsHub
      roleTitle="Parent"
      canCreate={false}
      accentColor="teal"
      pageTitle="Guardian & Parent Notice Board"
      pageSubtitle="View school circulars, event schedules, parent-teacher meeting notices, and holiday announcements."
    />
  );
}
