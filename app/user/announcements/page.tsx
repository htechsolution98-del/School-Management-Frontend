"use client";

import React from "react";
import { AnnouncementsHub } from "@/components/announcements/announcements-hub";

export default function UserAnnouncementsPage() {
  return (
    <AnnouncementsHub
      roleTitle="Applicant"
      canCreate={false}
      accentColor="blue"
      pageTitle="School Notices & Announcements"
      pageSubtitle="View official admission notices, orientation schedules, and school circulars."
    />
  );
}
