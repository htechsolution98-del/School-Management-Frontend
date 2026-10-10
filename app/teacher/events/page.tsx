"use client";

import React from "react";
import { EventsCalendarHub } from "@/components/events/events-calendar-hub";

export default function TeacherEventsPage() {
  return (
    <EventsCalendarHub
      roleTitle="Teacher"
      canManage={false}
      pageTitle="Academic Calendar & Event Schedule"
      pageSubtitle="View official school schedules, holidays, upcoming assessment dates, and parent-teacher meetings."
    />
  );
}
