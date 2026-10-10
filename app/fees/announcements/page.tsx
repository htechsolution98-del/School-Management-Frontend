"use client";

import React from "react";
import { AnnouncementsHub } from "@/components/announcements/announcements-hub";

export default function FeesAnnouncementsPage() {
  return (
    <AnnouncementsHub
      roleTitle="Fees"
      canCreate={true}
      accentColor="amber"
      pageTitle="Fees & Accounts Announcements"
      pageSubtitle="Post fee submission deadlines, billing schedules, and payment counter circulars."
    />
  );
}
