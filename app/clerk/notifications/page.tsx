"use client";

import React from "react";
import { NotificationsHub } from "@/components/notifications/notifications-hub";

export default function ClerkNotificationsPage() {
  return (
    <NotificationsHub
      roleTitle="Clerk"
      pageTitle="Office & Administrative Notifications"
      pageSubtitle="Student admission alerts, fee updates, leave approvals, and general school circulars."
    />
  );
}
