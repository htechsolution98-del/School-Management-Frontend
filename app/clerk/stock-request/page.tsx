"use client";

import StaffRequisitionView from "@/components/inventory/requisition-form";

export default function ClerkStockRequestPage() {
  return (
    <StaffRequisitionView
      roleTitle="Clerk"
      title="Office & Administrative Stock Requisition"
      description="Request office supplies, registers, paper reams, certificates, and stationery items from store manager."
    />
  );
}
