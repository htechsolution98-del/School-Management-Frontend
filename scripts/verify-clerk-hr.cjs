const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

// Run pure validation without depending on a live school account or API.
const source = fs.readFileSync(path.join(__dirname, "../lib/clerk/hr-validation.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const validationModule = { exports: {} };
new Function("exports", "module", compiled)(validationModule.exports, validationModule);
const { parseDepartments, validateStaffRecord, normalizePhone } = validationModule.exports;
const today = new Date(2026, 9, 7);
const departments = [{ id: 1, name: "Science" }];
const valid = { name: "Neha Patel", email: "neha@school.edu", mobile: "98765 43210", category: "5", department: 1, address: "School Road", date_of_birth: "2008-10-07", salary: "99999999.99", is_active: true };
const check = (data, staff = [], editingId) => validateStaffRecord({ ...valid, ...data }, staff, departments, ["5"], editingId, today);

assert.deepEqual(parseDepartments(" Mathematics ,  Human   Resources ", departments).names, ["Mathematics", "Human Resources"]);
for (const input of ["", "Math,", "Math,,Arts", "Math, math", "science", "x".repeat(101)]) assert.ok(parseDepartments(input, departments).error, input);
assert.equal(parseDepartments("x".repeat(100), departments).error, "");
assert.equal(normalizePhone("(98765) 432-10"), "9876543210");
assert.deepEqual(check({}), {});
assert.ok(check({ date_of_birth: "2008-10-08" }).date_of_birth, "one day short of 18");
assert.ok(check({ date_of_birth: "2000-02-30" }).date_of_birth, "invalid calendar date");
assert.deepEqual(check({ date_of_birth: "2000-02-29" }), {});
for (const salary of ["", "-1", "1.234", "100000000", "Infinity", "1e5"]) assert.ok(check({ salary }).salary, salary);
assert.deepEqual(check({ salary: "0" }), {});
assert.ok(check({ email: "invalid" }).email);
assert.ok(check({ mobile: "123" }).mobile);
assert.ok(check({ name: "   " }).name);
assert.ok(check({ address: " " }).address);
assert.ok(check({ department: 99 }).department);
assert.ok(check({ category: "unknown" }).category);
const existing = [{ id: 9, email: "NEHA@school.edu", mobile: "9876543210" }];
assert.ok(check({}, existing).email);
assert.ok(check({}, existing).mobile);
assert.deepEqual(check({}, existing, 9), {}, "editing one's own email/mobile must remain valid");
console.log("Clerk HR validation: all checks passed.");
