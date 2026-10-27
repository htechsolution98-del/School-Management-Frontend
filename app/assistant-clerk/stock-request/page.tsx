"use client";

import StaffRequisitionView from "@/components/inventory/requisition-form";

export default function AssistantClerkStockRequestPage() {
  return (
    <StaffRequisitionView
      roleTitle="Assistant Clerk"
      title="Assistant Clerk Supplies Requisition"
      description="Request administrative forms, files, stationery, printer cartridges, and office consumables from store manager."
    />
  );
}
