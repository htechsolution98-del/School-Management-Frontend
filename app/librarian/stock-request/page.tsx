"use client";

import StaffRequisitionView from "@/components/inventory/requisition-form";

export default function LibrarianStockRequestPage() {
  return (
    <StaffRequisitionView
      roleTitle="Librarian"
      title="Library Supplies & Consumables Requisition"
      description="Request library cataloging labels, book covers, barcodes, stationery, and reading room consumables from store manager."
    />
  );
}
