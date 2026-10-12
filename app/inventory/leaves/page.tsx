"use client";

import React from "react";
import { StaffLeavesDesk } from "@/components/leaves/StaffLeavesDesk";

export default function InventoryLeavesPage() {
  return (
    <StaffLeavesDesk
      roleTitle="Inventory Manager"
      subtitle="View your allocated stock & store staff leave quota, submit absence requests, and track approval."
    />
  );
}
