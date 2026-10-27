"use client";

import React from "react";
import { NotificationsHub } from "@/components/notifications/notifications-hub";

export default function GlobalNotificationsPage() {
  return (
    <div className="p-4 sm:p-6 md:p-8">
      <NotificationsHub />
    </div>
  );
}
