"use client";

import React from "react";
import { AnnouncementsHub } from "@/components/announcements/announcements-hub";

export default function UserAnnouncementsPage() {
  return (
    <AnnouncementsHub
      roleTitle="Transport & Portal"
      canCreate={false}
      accentColor="blue"
      pageTitle="General Notices & Updates"
      pageSubtitle="View school announcements, alerts, and circulars."
    />
  );
}
