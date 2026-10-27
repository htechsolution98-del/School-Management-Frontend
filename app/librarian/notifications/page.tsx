"use client";

import React from "react";
import { NotificationsHub } from "@/components/notifications/notifications-hub";

export default function LibrarianNotificationsPage() {
  return (
    <NotificationsHub
      roleTitle="Librarian"
      pageTitle="Notifications"
      pageSubtitle="Official school circulars, leave approvals, salary updates, and alerts."
    />
  );
}
