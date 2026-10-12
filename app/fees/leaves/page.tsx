"use client";

import React from "react";
import { StaffLeavesDesk } from "@/components/leaves/StaffLeavesDesk";

export default function FeesManagementLeavesPage() {
  return (
    <StaffLeavesDesk
      roleTitle="Fees Management"
      subtitle="View your allocated accounts staff leave quota, submit absence requests, and track approval."
    />
  );
}
