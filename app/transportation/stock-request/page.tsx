"use client";

import StaffRequisitionView from "@/components/inventory/requisition-form";

export default function TransportationStockRequestPage() {
  return (
    <StaffRequisitionView
      roleTitle="Transportation"
      title="Fleet & Transportation Stock Requisition"
      description="Request vehicle logbooks, maintenance stationery, first-aid box refills, emergency kit supplies, and driver route sheets from store manager."
    />
  );
}
