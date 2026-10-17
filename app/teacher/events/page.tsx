"use client";

import React from "react";
import { EventsCalendarHub } from "@/components/events/events-calendar-hub";

export default function TeacherEventsPage() {
  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-28 lg:pb-8 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
      <EventsCalendarHub
        roleTitle="Teacher"
        canManage={false}
        pageTitle="Academic Calendar & Event Schedule"
        pageSubtitle="View official school schedules, holidays, upcoming assessment dates, and parent-teacher meetings."
      />
    </div>
  );
}
