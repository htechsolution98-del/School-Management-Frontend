"use client";

import React from "react";
import { EventsCalendarHub } from "@/components/events/events-calendar-hub";

export default function LibrarianEventsPage() {
  return (
    <EventsCalendarHub
      roleTitle="Librarian"
      canManage={false}
      pageTitle="Library & School Events Calendar"
      pageSubtitle="View school holidays, examination timetables, book fairs, and institutional events."
    />
  );
}
