"use client";

import StaffRequisitionView from "@/components/inventory/requisition-form";

export default function TeacherStockPage() {
  return (
    <StaffRequisitionView
      presentation="stock-dashboard"
      roleTitle="Teacher"
      title="Stock & Consumable Supplies Management"
      description="Monitor classroom supplies (chalk, dusters, notebooks, pens, markers) and request stock items."
    />
  );
}
