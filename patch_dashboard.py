import sys

filepath = r"c:\Users\mahil\Downloads\School Management\School-Management-Frontend\School-Management-Frontend\app\principal\page.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Replace imports
import_str = 'import { fetchDashboardCount, type DashboardCount } from "@/lib/principal";'
new_imports = """import { fetchDashboardCount, type DashboardCount, getAllStudents, getAdmissionForms } from "@/lib/principal";
import { getStaffList, type Staff } from "@/lib/staff";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";"""
content = content.replace(import_str, new_imports)

# Add state and fetching logic inside PrincipalDashboard
state_str = """  const [data, setData] = useState<DashboardCount | null>(null);
  const [loading, setLoading] = useState(true);"""
new_state = """  const [data, setData] = useState<DashboardCount | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  const handleCardClick = async (label: string) => {
    setActiveModal(label);
    setModalLoading(true);
    try {
      if (label === "Total Students" && students.length === 0) {
        const res = await getAllStudents();
        setStudents(res);
      } else if (label === "Teaching Staff" && staff.length === 0) {
        const res = await getStaffList();
        setStaff(res.filter(s => s.category?.toUpperCase() !== "PRINCIPAL"));
      } else if (label === "Incomplete Admissions" && admissions.length === 0) {
        const res = await getAdmissionForms();
        setAdmissions(res.filter(a => a.status !== "completed"));
      }
    } catch (err) {
      console.error("Failed to load details", err);
    } finally {
      setModalLoading(false);
    }
  };
"""
content = content.replace(state_str, new_state)

# Make cards clickable
card_str = """            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm flex items-center gap-4\""""
new_card = """            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => stat.label !== "Active Forms" && handleCardClick(stat.label)}
              className={`rounded-2xl border border-gray-100 bg-white p-6 shadow-sm flex items-center gap-4 ${stat.label !== "Active Forms" ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}"""
content = content.replace(card_str, new_card)

# Add Modals
return_str = """      <div className="rounded-2xl border border-gray-100 bg-white p-8 sm:p-12 text-center shadow-sm">
        <h3 className="text-xl font-semibold text-gray-900">
          Welcome back, Principal!
        </h3>
        <p className="mt-2 text-gray-500 max-w-lg mx-auto">
          Use the side navigation to manage admission forms, view student
          records, and oversee staff activities. This dashboard will be
          populated with more metrics soon.
        </p>
      </div>
    </div>
  );
}"""
new_return = """      <div className="rounded-2xl border border-gray-100 bg-white p-8 sm:p-12 text-center shadow-sm">
        <h3 className="text-xl font-semibold text-gray-900">
          Welcome back, Principal!
        </h3>
        <p className="mt-2 text-gray-500 max-w-lg mx-auto">
          Use the side navigation to manage admission forms, view student
          records, and oversee staff activities. This dashboard will be
          populated with more metrics soon.
        </p>
      </div>

      <Dialog open={activeModal !== null} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{activeModal} Details</DialogTitle>
          </DialogHeader>
          {modalLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="mt-4">
              {activeModal === "Total Students" && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Contact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name} {s.surname}</TableCell>
                        <TableCell>{s.class_name}</TableCell>
                        <TableCell>{s.email || "N/A"}</TableCell>
                        <TableCell>{s.mobile || "N/A"}</TableCell>
                      </TableRow>
                    ))}
                    {students.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-gray-500 py-4">No students found.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              )}
              {activeModal === "Teaching Staff" && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Contact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staff.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>{s.category}</TableCell>
                        <TableCell>{s.email || "N/A"}</TableCell>
                        <TableCell>{s.mobile || "N/A"}</TableCell>
                      </TableRow>
                    ))}
                    {staff.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-gray-500 py-4">No staff found.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              )}
              {activeModal === "Incomplete Admissions" && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Class</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {admissions.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.student_name}</TableCell>
                        <TableCell><span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">{a.status}</span></TableCell>
                        <TableCell>{a.phone_number}</TableCell>
                        <TableCell>{a.standard_applying_for}</TableCell>
                      </TableRow>
                    ))}
                    {admissions.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-gray-500 py-4">No incomplete admissions.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}"""
content = content.replace(return_str, new_return)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
