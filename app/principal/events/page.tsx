"use client";

import React from "react";
import { EventsCalendarHub } from "@/components/events/events-calendar-hub";

export default function PrincipalEventsPage() {
  return (
    <EventsCalendarHub
      roleTitle="Principal"
      canManage={true}
      pageTitle="Academic & School Events Calendar"
      pageSubtitle="Schedule, organize, and broadcast official school events, public holidays, examination timetables, and PTMs."
    />
  );
}
