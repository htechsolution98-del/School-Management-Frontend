"use client";

import React from "react";
import { NotificationsHub } from "@/components/notifications/notifications-hub";

export default function FeesNotificationsPage() {
  return (
    <NotificationsHub
      roleTitle="Fees Desk"
      pageTitle="Fees Notifications & Alerts"
      pageSubtitle="Track fee collection alerts, salary updates, leave sanctions, and campus announcements."
    />
  );
}
