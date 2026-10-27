"use client";

import React from "react";
import { NotificationsHub } from "@/components/notifications/notifications-hub";

export default function TeacherNotificationsPage() {
  return (
    <NotificationsHub
      roleTitle="Teacher"
      pageTitle="Teacher Alerts & Notifications"
      pageSubtitle="Track leave request decisions, timetable adjustments, payroll receipts, and institutional circulars."
    />
  );
}
