"use client";

import React from "react";
import { StaffAttendanceRegister } from "@/components/attendance/StaffAttendanceRegister";

export default function ClerkStaffAttendancePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <StaffAttendanceRegister
        roleTitle="Clerk"
        pageTitle="Staff Attendance Daily Roll Call"
      />
    </div>
  );
}
