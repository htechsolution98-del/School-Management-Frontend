"use client";

import React from "react";
import { ActivityLogHub } from "@/components/activity-log/activity-log-hub";

export default function TrusteeActivityLogsPage() {
  return (
    <div className="p-6 md:p-8">
      <ActivityLogHub isSuperAdmin={false} roleTitle="Trustee" />
    </div>
  );
}
