import sys

filepath = r"c:\Users\mahil\Downloads\School Management\School-Management-Frontend\School-Management-Frontend\app\trustee\page.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Insert import
import_str = 'import { createStaff, getStaffCategories, getStaffList, updateStaff, deleteStaff } from "@/lib/staff";'
if "import { toHTMLDate, toApiDate }" not in content:
    content = content.replace(
        import_str, 
        import_str + '\nimport { toHTMLDate, toApiDate } from "@/lib/dateUtils";'
    )

# Fix formData date inputs
content = content.replace(
    """                  value={formData.date_of_birth}
                  onChange={handleInputChange("date_of_birth")}""",
    """                  value={toHTMLDate(formData.date_of_birth)}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: toApiDate(e.target.value) })}"""
)

# Fix editFormData date inputs
content = content.replace(
    """                  value={editFormData.date_of_birth}
                  onChange={(e) => setEditFormData({ ...editFormData, date_of_birth: e.target.value })}""",
    """                  value={toHTMLDate(editFormData.date_of_birth)}
                  onChange={(e) => setEditFormData({ ...editFormData, date_of_birth: toApiDate(e.target.value) })}"""
)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
