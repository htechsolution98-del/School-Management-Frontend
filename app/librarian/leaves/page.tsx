"use client";

import React from "react";
import { StaffLeavesDesk } from "@/components/leaves/StaffLeavesDesk";

export default function LibrarianLeavesPage() {
  return (
    <StaffLeavesDesk
      roleTitle="Librarian"
      subtitle="View your allocated library staff leave quota, submit absence requests, and track leadership approval."
    />
  );
}
