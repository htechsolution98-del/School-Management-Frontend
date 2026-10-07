import ast
import importlib.util
from pathlib import Path
from types import SimpleNamespace
from datetime import date
import unittest

backend = Path(__file__).resolve().parents[2] / "School-Management-Backend" / "sms_app"
spec = importlib.util.spec_from_file_location("admission_validation", backend / "admission_validation.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class AdmissionValidationTests(unittest.TestCase):
    def check(self, label, value, kind="text", required=True, mapping="", options=None):
        field = SimpleNamespace(label=label, field_type=kind, is_required=required, map_to_student_field=mapping, options=options)
        return module.validate_admission_value(field, value, today=date(2026, 10, 7))

    def test_required_and_optional(self):
        self.assertTrue(self.check("Name", " ")[1])
        self.assertEqual(self.check("Name", "", required=False)[1], "")
        self.assertTrue(self.check("Consent", "false", kind="checkbox")[1])
        self.assertEqual(self.check("Consent", "false", kind="checkbox", required=False), ("false", ""))

    def test_phone_email_ids(self):
        self.assertEqual(self.check("Mobile", "+91 98765 43210"), ("9876543210", ""))
        self.assertTrue(self.check("Mobile", "1234567890")[1])
        self.assertTrue(self.check("Email", "a@b", kind="email")[1])
        self.assertEqual(self.check("Email", "PARENT@EXAMPLE.COM", kind="email"), ("parent@example.com", ""))
        self.assertTrue(self.check("Aadhaar", "123")[1])
        self.assertEqual(self.check("Aadhaar", "1234 5678 9012"), ("123456789012", ""))
        self.assertTrue(self.check("PIN code", "012345")[1])

    def test_dates_and_numbers(self):
        self.assertEqual(self.check("DOB", "29/02/2024", kind="date"), ("2024-02-29", ""))
        self.assertTrue(self.check("DOB", "31/02/2024", kind="date")[1])
        self.assertTrue(self.check("DOB", "29/02/2025", kind="date")[1])
        self.assertTrue(self.check("DOB", "07/10/2026", kind="date")[1])
        self.assertEqual(self.check("Admission date", "01/01/2027", kind="date")[1], "")
        for value in ("NaN", "Infinity", "-1", "1e10000"):
            self.assertTrue(self.check("Income", value, kind="number")[1])

    def test_names_choices(self):
        self.assertEqual(self.check("Student name", "આયુષ પટેલ", mapping="name")[1], "")
        self.assertTrue(self.check("Student name", "Student 123", mapping="name")[1])
        self.assertTrue(self.check("Gender", "X", kind="radio", options=[{"label": "Female", "value": "F"}])[1])

    def test_uploads(self):
        self.assertEqual(module.validate_admission_upload(SimpleNamespace(name="proof.pdf", content_type="application/pdf", size=3145728)), "")
        for file in (SimpleNamespace(name="malware.exe", content_type="", size=10), SimpleNamespace(name="photo.jpg", content_type="image/jpeg", size=1048577), SimpleNamespace(name="empty.pdf", content_type="application/pdf", size=0)):
            self.assertTrue(module.validate_admission_upload(file))

    def test_backend_syntax_and_submission_fields(self):
        for file in ("student_views.py", "student_serializers.py", "admission_validation.py"):
            tree = ast.parse((backend / file).read_text(encoding="utf-8"))
            if file == "student_serializers.py":
                serializer = next(node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == "AdmissionSubmissionSerializer")
                meta = next(node for node in serializer.body if isinstance(node, ast.ClassDef) and node.name == "Meta")
                fields = next(node.value for node in meta.body if isinstance(node, ast.Assign) and any(isinstance(target, ast.Name) and target.id == "fields" for target in node.targets))
                values = ast.literal_eval(fields)
                self.assertIn("created_at", values)
                self.assertIn("is_rte", values)


if __name__ == "__main__":
    unittest.main()
