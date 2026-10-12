"use client";

import React from "react";
import { AnnouncementsHub } from "@/components/announcements/announcements-hub";

export default function TeacherAnnouncementsPage() {
  return (
    <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto">
      <AnnouncementsHub
        roleTitle="Teacher"
        canCreate={true}
        accentColor="blue"
        pageTitle="Academic & Class Announcements"
        pageSubtitle="Broadcast assignments, study materials, class circulars, and updates directly to students, parents, and staff."
      />
    </div>
  );
}
