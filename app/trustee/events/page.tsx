"use client";

import React from "react";
import { EventsCalendarHub } from "@/components/events/events-calendar-hub";

export default function TrusteeEventsPage() {
  return (
    <EventsCalendarHub
      roleTitle="Trustee / Board"
      canManage={true}
      pageTitle="Institutional & Academic Calendar"
      pageSubtitle="Oversee school operations, annual functions, institutional holidays, and board meetings."
    />
  );
}
