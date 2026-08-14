import sys

filepath = r"c:\Users\mahil\Downloads\School Management\School-Management-Frontend\School-Management-Frontend\app\fees\Genrate-Fees\page.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Insert import if missing
import_str = 'import { generateFee, generateFeeForClass, getFees } from "@/lib/fees";'
if "import { toHTMLDate, toApiDate }" not in content:
    content = content.replace(
        import_str, 
        import_str + '\nimport { toHTMLDate, toApiDate } from "@/lib/dateUtils";'
    )

content = content.replace(
    """            value={form.due_date}
            onChange={(e) => update("due_date", e.target.value)}""",
    """            value={toHTMLDate(form.due_date)}
            onChange={(e) => update("due_date", toApiDate(e.target.value))}"""
)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
