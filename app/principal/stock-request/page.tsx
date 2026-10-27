"use client";

import StaffRequisitionView from "@/components/inventory/requisition-form";

export default function PrincipalStockRequestPage() {
  return (
    <StaffRequisitionView
      roleTitle="Principal"
      title="Principal Office Stock Requisition"
      description="Request administrative consumables, stationery, official registers, and institutional supplies from store manager."
    />
  );
}
