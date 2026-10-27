"use client";

import StaffRequisitionView from "@/components/inventory/requisition-form";

export default function FeesStockRequestPage() {
  return (
    <StaffRequisitionView
      roleTitle="Fees Management"
      title="Fees Office Supplies Requisition"
      description="Request fee receipts stationery, printing paper, payment vouchers, receipt registers, and desk supplies from store manager."
    />
  );
}
