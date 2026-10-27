"use client";

import React from "react";
import { NotificationsHub } from "@/components/notifications/notifications-hub";

export default function InventoryNotificationsPage() {
  return (
    <NotificationsHub
      roleTitle="Inventory"
      pageTitle="Inventory Notifications & Alerts"
      pageSubtitle="Track stock requests, approvals, salary dispatches, and campus announcements."
    />
  );
}
