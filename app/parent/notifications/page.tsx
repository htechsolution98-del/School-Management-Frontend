"use client";

import React from "react";
import { NotificationsHub } from "@/components/notifications/notifications-hub";

export default function ParentNotificationsPage() {
  return (
    <NotificationsHub
      roleTitle="Parent"
      pageTitle="Parent Alerts & Notifications"
      pageSubtitle="Track real-time school announcements, attendance alerts, exam results, fee payments, and campus events for your child."
    />
  );
}

