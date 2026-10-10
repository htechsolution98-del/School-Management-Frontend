"use client";

import React from "react";
import { EventsCalendarHub } from "@/components/events/events-calendar-hub";

export default function UserEventsPage() {
  return (
    <EventsCalendarHub
      roleTitle="Transport"
      canManage={false}
      pageTitle="School Calendar & Holidays"
      pageSubtitle="View school operational days, gazetted holidays, and special event schedules."
    />
  );
}
