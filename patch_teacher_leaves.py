import sys

filepath = r"c:\Users\mahil\Downloads\School Management\School-Management-Frontend\School-Management-Frontend\app\teacher\leaves\page.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Insert import
import_str = 'import { createLeaveRequest, deleteLeaveRequest, getLeaveBalances, getMyLeaveRequests, updateLeaveRequest } from "@/lib/leave";'
if "import { toHTMLDate, toApiDate }" not in content:
    content = content.replace(
        import_str, 
        import_str + '\nimport { toHTMLDate, toApiDate } from "@/lib/dateUtils";'
    )

# Fix formData date inputs
content = content.replace(
    """                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}""",
    """                  value={toHTMLDate(startDate)}
                  onChange={(e) => setStartDate(toApiDate(e.target.value))}"""
)

# Fix editFormData date inputs
content = content.replace(
    """                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}""",
    """                  value={toHTMLDate(endDate)}
                  onChange={(e) => setEndDate(toApiDate(e.target.value))}"""
)

# Fix getTomorrowDateString
# getTomorrowDateString() might be outputting YYYY-MM-DD.
# if min={getTomorrowDateString()} is passed, it needs to be YYYY-MM-DD because the input type="date" expects YYYY-MM-DD for min/max
# Wait, if min expects YYYY-MM-DD, then min={getTomorrowDateString()} is correct as long as getTomorrowDateString outputs YYYY-MM-DD.
# But what about min={startDate || getTomorrowDateString()} ?
# If startDate is DD-MM-YYYY, min={toHTMLDate(startDate) || getTomorrowDateString()} !
content = content.replace(
    "min={startDate || getTomorrowDateString()}",
    "min={toHTMLDate(startDate) || getTomorrowDateString()}"
)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
