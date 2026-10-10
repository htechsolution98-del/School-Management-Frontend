"use client";

import React from "react";
import { AnnouncementsHub } from "@/components/announcements/announcements-hub";

export default function TrusteeAnnouncementsPage() {
  return (
    <AnnouncementsHub
      roleTitle="Trustee"
      canCreate={true}
      accentColor="emerald"
      pageTitle="Institutional Announcements & Board Notices"
      pageSubtitle="Broadcast management directives, institutional circulars, and notifications across all school panels."
    />
  );
}
