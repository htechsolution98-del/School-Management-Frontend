"use client";

import StaffRequisitionView from "@/components/inventory/requisition-form";

export default function VicePrincipalStockRequestPage() {
  return (
    <StaffRequisitionView
      roleTitle="Vice Principal"
      title="Vice Principal Office Stock Requisition"
      description="Request academic administration consumables, stationery, meeting supplies, and institutional items from store manager."
    />
  );
}
