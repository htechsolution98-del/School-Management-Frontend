"use client";

import React from "react";
import { AnnouncementsHub } from "@/components/announcements/announcements-hub";

export default function TeacherAnnouncementsPage() {
  return (
    <div className="px-3.5 sm:px-6 pt-3.5 sm:pt-6 pb-16 lg:pb-8 max-w-7xl mx-auto w-full min-w-0">
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
