"use client";

import React from "react";
import { EventsCalendarHub } from "@/components/events/events-calendar-hub";

export default function StudentEventsPage() {
  return (
    <EventsCalendarHub
      roleTitle="Student"
      canManage={false}
      pageTitle="School Calendar & Holidays"
      pageSubtitle="Check upcoming school holidays, exam schedules, sports days, and cultural celebrations."
    />
  );
}
