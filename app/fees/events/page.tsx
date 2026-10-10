"use client";

import React from "react";
import { EventsCalendarHub } from "@/components/events/events-calendar-hub";

export default function FeesEventsPage() {
  return (
    <EventsCalendarHub
      roleTitle="Accounts & Fees"
      canManage={false}
      pageTitle="Academic Calendar & Holidays"
      pageSubtitle="View school working days, holidays, fee due cycles, and vacation periods."
    />
  );
}
