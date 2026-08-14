import sys

filepath = r"c:\Users\mahil\Downloads\School Management\School-Management-Frontend\School-Management-Frontend\app\teacher\exams\page.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Insert import if missing
import_str = 'import { getClasses } from "@/lib/class";'
if "import { toHTMLDate, toApiDate }" not in content:
    content = content.replace(
        import_str, 
        import_str + '\nimport { toHTMLDate, toApiDate } from "@/lib/dateUtils";'
    )

content = content.replace(
    """                    value={formData.exam_date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, exam_date: e.target.value }))}""",
    """                    value={toHTMLDate(formData.exam_date)}
                    onChange={(e) => setFormData((prev) => ({ ...prev, exam_date: toApiDate(e.target.value) }))}"""
)

# Replace min
content = content.replace(
    "min={getTomorrowDateString()}",
    "min={getTomorrowDateString()} // getTomorrowDateString outputs YYYY-MM-DD which is correct for HTML min attribute"
)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
