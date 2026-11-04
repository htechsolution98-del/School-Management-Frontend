"use client";

import React from "react";
import { NotificationsHub } from "@/components/notifications/notifications-hub";

export default function StudentNotificationsPage() {
  return (
    <NotificationsHub
      roleTitle="Student"
      pageTitle="Student Alerts & Notifications"
      pageSubtitle="Stay updated on exam schedules, homework, attendance records, school circulars, and campus events."
    />
  );
}

