"use client";

import React from "react";
import { AnnouncementsHub } from "@/components/announcements/announcements-hub";

export default function TeacherAnnouncementsPage() {
  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-28 lg:pb-8 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
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
