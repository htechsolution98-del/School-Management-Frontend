"use client";

import React from "react";
import { EventsCalendarHub } from "@/components/events/events-calendar-hub";

export default function ParentEventsPage() {
  return (
    <EventsCalendarHub
      roleTitle="Parent"
      canManage={false}
      pageTitle="School Calendar & Important Dates"
      pageSubtitle="Stay informed on school vacations, PTM dates, annual events, and academic exams."
    />
  );
}
