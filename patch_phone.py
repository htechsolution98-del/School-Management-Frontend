import sys

filepath = r"c:\Users\mahil\Downloads\School Management\School-Management-Frontend\School-Management-Frontend\app\trustee\page.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("phone_number", "mobile")

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
