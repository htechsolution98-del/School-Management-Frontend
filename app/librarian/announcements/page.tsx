"use client";

import React from "react";
import { AnnouncementsHub } from "@/components/announcements/announcements-hub";

export default function LibrarianAnnouncementsPage() {
  return (
    <AnnouncementsHub
      roleTitle="Librarian"
      canCreate={true}
      accentColor="purple"
      pageTitle="Library Circulars & Notices"
      pageSubtitle="Broadcast book return deadlines, library schedule updates, and reading club notices."
    />
  );
}
