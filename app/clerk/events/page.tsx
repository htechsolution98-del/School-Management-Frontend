"use client";

import React from "react";
import { EventsCalendarHub } from "@/components/events/events-calendar-hub";

export default function ClerkEventsPage() {
  return (
    <EventsCalendarHub
      roleTitle="Clerk / Administration"
      canManage={true}
      pageTitle="School Calendar & Holiday Management"
      pageSubtitle="Manage the academic calendar, gazetted holidays, school celebrations, and exam schedules."
    />
  );
}
