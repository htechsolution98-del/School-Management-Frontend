import os

file_path = "app/fees/student-ledger/page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Find the start of the default export
split_str = "export default function"
idx = content.find(split_str)
if idx != -1:
    header = content[:idx]
else:
    header = content

# Make sure ReceiptModal is imported
if "ReceiptModal" not in header:
    header = header.replace('import React, { useState, useEffect, useCallback } from "react";', 'import React, { useState, useEffect, useCallback } from "react";\nimport ReceiptModal from "./ReceiptModal";')

ledger_code = """export default function StudentLedgerPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState("");
  const [selectedLedgerStudent, setSelectedLedgerStudent] = useState<Student | null>(null);
  const [ledgerFees, setLedgerFees] = useState<StudentFee[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [showLedgerDropdown, setShowLedgerDropdown] = useState(false);
  const [activeAcademicYearId, setActiveAcademicYearId] = useState<number | null>(null);

  // Modals
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [isCollectFeeModalOpen, setIsCollectFeeModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState<StudentFee | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  // Receipt Search
  const [receiptSearchQuery, setReceiptSearchQuery] = useState("");
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [searchedReceiptNumber, setSearchedReceiptNumber] = useState<string | null>(null);

  useEffect(() => {
    async function loadStudentsAndYears() {
      const [studentsRes, yearsRes] = await Promise.all([
        fetchStudents(),
        fetchAcademicYearsForFee()
      ]);
      if (studentsRes.success && studentsRes.data) setStudents(studentsRes.data);
      if (yearsRes.success && yearsRes.data) {
        const activeYear = yearsRes.data.find(y => y.is_active || y.status === "Active") || yearsRes.data[0];
        if (activeYear) setActiveAcademicYearId(activeYear.id);
      }
    }
    loadStudentsAndYears();
  }, []);

  const loadLedgerData = useCallback(async () => {
    if (!selectedLedgerStudent || !activeAcademicYearId) {
      setLedgerFees([]);
      return;
    }
    setLedgerLoading(true);
    try {
      const { fetchStudentLedgerSchedule } = await import("@/lib/fees/fee-generation");
      const res = await fetchStudentLedgerSchedule(selectedLedgerStudent.id, activeAcademicYearId);
      if (res.success && res.data) {
        setLedgerFees(res.data);
      }
    } catch {
      // silently fail
    } finally {
      setLedgerLoading(false);
    }
  }, [selectedLedgerStudent, activeAcademicYearId]);

  useEffect(() => {
    loadLedgerData();
  }, [loadLedgerData]);

  const handleDiscount = (fee: StudentFee) => {
    setSelectedFee(fee);
    setDiscountModalOpen(true);
    setOpenMenuId(null);
  };
  
  const handleCollect = async (fee: StudentFee) => {
    setOpenMenuId(null);
    if (fee.is_virtual) {
      if (!activeAcademicYearId || !selectedLedgerStudent) return;
      setLedgerLoading(true);
      try {
        const { generateSingleVirtualFee } = await import("@/lib/fees/fee-generation");
        const res = await generateSingleVirtualFee({
          student: selectedLedgerStudent.id,
          academic_year: activeAcademicYearId,
          fee_wise_class: fee.fee_wise_class,
          billing_period: fee.billing_period,
          due_date: fee.due_date,
        });
        if (res.success && res.data) {
          setSelectedFee(res.data);
          setIsCollectFeeModalOpen(true);
          loadLedgerData();
        } else {
          alert("Failed to generate fee for collection.");
        }
      } catch (err) {
        alert("An error occurred while generating fee.");
      } finally {
        setLedgerLoading(false);
      }
    } else {
      setSelectedFee(fee);
      setIsCollectFeeModalOpen(true);
    }
  };

  const handleView = (fee: StudentFee) => {
    setSelectedFee(fee);
    setViewModalOpen(true);
    setOpenMenuId(null);
  };

  const studentLedgerView = (
    <div className="p-5">
      {/* Search Box */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 max-w-4xl mx-auto">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search student by name to view complete fee ledger..."
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm font-medium"
            value={ledgerSearchQuery}
            onChange={(e) => {
              setLedgerSearchQuery(e.target.value);
              setShowLedgerDropdown(true);
              if (!e.target.value) {
                setSelectedLedgerStudent(null);
              }
            }}
            onFocus={() => setShowLedgerDropdown(true)}
          />
          {showLedgerDropdown && ledgerSearchQuery && (
            <div className="absolute top-full mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-xl z-30 max-h-72 overflow-y-auto">
              {students
                .filter((s) => {
                  const fName = s.name === "null" ? "" : s.name;
                  const lName = s.surname === "null" ? "" : s.surname;
                  const fullName = [fName, lName].filter(Boolean).join(" ").toLowerCase();
                  return fullName.includes(ledgerSearchQuery.toLowerCase());
                })
                .map((s) => {
                  const fName = s.name === "null" ? "" : s.name;
                  const lName = s.surname === "null" ? "" : s.surname;
                  const fullName = [fName, lName].filter(Boolean).join(" ");
                  return (
                    <button
                      key={s.id}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50/50 border-b border-gray-50 last:border-0 flex items-center gap-3 transition-colors"
                      onClick={() => {
                        setSelectedLedgerStudent(s);
                        setLedgerSearchQuery(fullName);
                        setShowLedgerDropdown(false);
                      }}
                    >
                      <StudentAvatar name={fullName} />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{fullName}</p>
                        <p className="text-xs text-gray-500">ID#{String(s.id).padStart(3, '0')} • {s.class_name?.replace(/_/g, " ")}</p>
                      </div>
                    </button>
                  );
                })}
              {students.filter((s) => {
                  const fName = s.name === "null" ? "" : s.name;
                  const lName = s.surname === "null" ? "" : s.surname;
                  return [fName, lName].filter(Boolean).join(" ").toLowerCase().includes(ledgerSearchQuery.toLowerCase());
              }).length === 0 && (
                <div className="p-8 text-center flex flex-col items-center">
                   <UserX size={24} className="text-gray-300 mb-2" />
                   <p className="text-sm font-medium text-gray-600">No students found</p>
                   <p className="text-xs text-gray-400">Try a different name</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Receipt Search Box */}
        <div className="relative w-full sm:w-64 shrink-0">
          <input
            type="text"
            placeholder="Find Receipt No..."
            className="w-full pl-4 pr-10 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
            value={receiptSearchQuery}
            onChange={(e) => setReceiptSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && receiptSearchQuery.trim()) {
                setSearchedReceiptNumber(receiptSearchQuery.trim());
                setIsReceiptModalOpen(true);
              }
            }}
          />
          <button 
            onClick={() => {
              if (receiptSearchQuery.trim()) {
                setSearchedReceiptNumber(receiptSearchQuery.trim());
                setIsReceiptModalOpen(true);
              }
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Search size={14} />
          </button>
        </div>
      </div>

      {/* Dashboard Cards & Table */}
      {selectedLedgerStudent && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
           {/* Summary Cards */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
             <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 rounded-2xl border border-blue-100">
               <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white"><IndianRupee size={16} /></div>
                  <p className="text-sm font-medium text-blue-900">Total Payable</p>
               </div>
               <p className="text-2xl font-bold text-blue-950">₹{ledgerFees.reduce((sum, f) => sum + parseFloat(f.payable_amount || "0"), 0).toLocaleString("en-IN")}</p>
             </div>
             <div className="bg-gradient-to-br from-green-50 to-green-100/50 p-4 rounded-2xl border border-green-100">
               <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white"><CheckCircle2 size={16} /></div>
                  <p className="text-sm font-medium text-green-900">Total Paid</p>
               </div>
               <p className="text-2xl font-bold text-green-950">₹{ledgerFees.reduce((sum, f) => sum + parseFloat(f.paid_amount || "0"), 0).toLocaleString("en-IN")}</p>
             </div>
             <div className="bg-gradient-to-br from-red-50 to-red-100/50 p-4 rounded-2xl border border-red-100">
               <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white"><AlertCircle size={16} /></div>
                  <p className="text-sm font-medium text-red-900">Total Balance</p>
               </div>
               <p className="text-2xl font-bold text-red-950">₹{ledgerFees.reduce((sum, f) => sum + parseFloat(f.balance_amount || "0"), 0).toLocaleString("en-IN")}</p>
             </div>
           </div>

           {/* Ledger Table */}
           <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
             <div className="bg-gray-50 px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Fee Records for Academic Year</h3>
                <span className="text-xs font-medium bg-white px-2 py-1 rounded-md border border-gray-200 shadow-sm text-gray-600">
                  {ledgerFees.length} Records
                </span>
             </div>
             {ledgerLoading ? (
               <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-blue-500" /></div>
             ) : ledgerFees.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Filter size={32} className="mb-2 opacity-50" />
                  <p className="text-sm font-medium">No fees found for this student.</p>
               </div>
             ) : (
               <div className="overflow-x-auto pb-24">
                 <table className="w-full">
                   <thead>
                     <tr className="bg-gray-50/50 border-b border-gray-100">
                       {["Type", "Month/Due", "Amount", "Discount", "Payable", "Paid", "Balance", "Status", "Action"].map(h => (
                         <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                       ))}
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                     {ledgerFees.map(fee => (
                       <tr key={fee.id} className="hover:bg-gray-50/50 transition-colors group">
                         <td className="px-4 py-3">
                           <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider border border-blue-100">
                             {fee.feetype_name}
                           </span>
                         </td>
                         <td className="px-4 py-3">
                           {fee.billing_period ? (
                             <p className="text-sm font-medium text-gray-900">{formatBillingPeriod(fee.billing_period)}</p>
                           ) : (
                             <p className="text-sm text-gray-600">Due: {fee.due_date ? new Date(fee.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "N/A"}</p>
                           )}
                         </td>
                         <td className="px-4 py-3 text-sm font-semibold text-gray-900">₹{parseFloat(fee.amount).toLocaleString("en-IN")}</td>
                         <td className="px-4 py-3 text-sm font-semibold text-green-600">{parseFloat(fee.discount_amount ?? "0") > 0 ? `₹${parseFloat(fee.discount_amount ?? "0").toLocaleString("en-IN")}` : <span className="text-gray-400 font-normal">₹0.00</span>}</td>
                         <td className="px-4 py-3 text-sm font-bold text-gray-900">₹{parseFloat(fee.payable_amount).toLocaleString("en-IN")}</td>
                         <td className="px-4 py-3 text-sm font-medium text-green-600">₹{parseFloat(fee.paid_amount || "0").toLocaleString("en-IN")}</td>
                         <td className="px-4 py-3 text-sm font-bold text-red-600">₹{parseFloat(fee.balance_amount || "0").toLocaleString("en-IN")}</td>
                         <td className="px-4 py-3"><StatusBadge status={fee.status as any} /></td>
                         <td className="px-4 py-3">
                           <div className="flex items-center gap-1">
                             {!fee.is_virtual && <button onClick={() => handleView(fee)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-700"><Eye size={15} /></button>}
                             <button onClick={() => handleCollect(fee)} className="p-1.5 hover:bg-green-50 rounded-lg transition-colors text-gray-400 hover:text-green-600"><IndianRupee size={15} /></button>
                             {!fee.is_virtual && <button onClick={() => handleDiscount(fee)} className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors text-gray-400 hover:text-blue-600"><Percent size={15} /></button>}
                             {!fee.is_virtual && (
                               <div className="relative">
                                 <button onClick={() => setOpenMenuId(openMenuId === fee.id ? null : fee.id)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-700"><MoreVertical size={15} /></button>
                                 {openMenuId === fee.id && (
                                   <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-lg z-20 w-36 py-1">
                                     <button onClick={() => handleView(fee)} className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Eye size={14} /> View</button>
                                     <button onClick={() => handleCollect(fee)} className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"><IndianRupee size={14} /> Collect</button>
                                     <button onClick={() => handleDiscount(fee)} className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Percent size={14} /> Discount</button>
                                     <hr className="my-1 border-gray-100" />
                                     <button onClick={async () => {
                                       await deleteStudentFee(fee.id);
                                       setLedgerFees((prev) => prev.filter((f) => f.id !== fee.id));
                                       setOpenMenuId(null);
                                     }} className="w-full px-3 py-2 text-sm text-left text-red-600 hover:bg-red-50 flex items-center gap-2"><X size={14} /> Delete</button>
                                   </div>
                                 )}
                               </div>
                             )}
                           </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             )}
           </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Student Ledger</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              View and manage complete fee history for any student
            </p>
          </div>
        </div>
        {studentLedgerView}
      </div>

      <DiscountModal
        isOpen={discountModalOpen}
        onClose={() => setDiscountModalOpen(false)}
        fee={selectedFee}
        onSuccess={() => { loadLedgerData(); }}
      />
      <ViewFeeModal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        fee={selectedFee}
        onSuccess={() => { loadLedgerData(); }}
      />
      <CollectFeeModal
        isOpen={isCollectFeeModalOpen}
        onClose={() => {
          setIsCollectFeeModalOpen(false);
          setSelectedFee(null);
        }}
        fee={selectedFee}
        onSuccess={() => { loadLedgerData(); }}
      />
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setSearchedReceiptNumber(null);
        }}
        receiptNumber={searchedReceiptNumber}
      />
    </div>
  );
}
"""

with open(file_path, "w", encoding="utf-8") as f:
    f.write(header + "\n" + ledger_code)
