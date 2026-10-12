"use client";

import React from "react";
import { StaffLeavesDesk } from "@/components/leaves/StaffLeavesDesk";

export default function PrincipalMyLeavesPage() {
  return (
    <StaffLeavesDesk
      roleTitle="Principal"
      subtitle="Submit personal leave requests to the Board of Trustees for review and track your approved balance."
    />
  );
}
