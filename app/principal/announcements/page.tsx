"use client";

import React from "react";
import { AnnouncementsHub } from "@/components/announcements/announcements-hub";

export default function PrincipalAnnouncementsPage() {
  return (
    <AnnouncementsHub
      roleTitle="Principal"
      canCreate={true}
      accentColor="indigo"
      pageTitle="School Announcements & Broadcast Center"
      pageSubtitle="Broadcast administrative notices, circulars, and alerts to staff, students, and parents."
    />
  );
}
