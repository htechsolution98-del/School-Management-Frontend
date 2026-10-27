"use client";

import React from "react";
import { NotificationsHub } from "@/components/notifications/notifications-hub";

export default function PrincipalNotificationsPage() {
  return (
    <NotificationsHub
      roleTitle="Principal"
      pageTitle="Principal Command Center Notifications"
      pageSubtitle="Leave authorization alerts, exam notices, trustee directives, and staff communications."
    />
  );
}
