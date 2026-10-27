"use client";

import React from "react";
import { NotificationsHub } from "@/components/notifications/notifications-hub";

export default function TrusteeNotificationsPage() {
  return (
    <NotificationsHub
      roleTitle="Trustee"
      pageTitle="Trustee Board Notifications"
      pageSubtitle="Executive alerts, payroll disbursement status, institution events, and high-priority school communications."
    />
  );
}
