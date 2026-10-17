"use client";

import { UserSupportHub } from "@/components/support/user-support-hub";

export default function TeacherSupportPage() {
  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-28 lg:pb-8 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
      <UserSupportHub roleTitle="Teacher Support" />
    </div>
  );
}
