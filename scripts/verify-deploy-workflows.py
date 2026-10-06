"""Exercise deployment conflict recovery against disposable Git repositories."""
import os
from pathlib import Path
import re
import subprocess
import tempfile
import yaml

WORKSPACE = Path(__file__).resolve().parents[2]
BASH = Path("C:/Program Files/Git/bin/bash.exe")

def run(args, cwd=None, env=None):
    return subprocess.run(args, cwd=cwd, env=env, check=True, capture_output=True, text=True).stdout

def git(folder, *args):
    return run(["git", *args], cwd=folder)

def load_script(role):
    workflow = WORKSPACE / f"School-Management-{role.title()}/.github/workflows/main.yml"
    data = yaml.safe_load(workflow.read_text(encoding="utf-8"))
    for step in data["jobs"]["deploy"]["steps"]:
        if "run" in step:
            text = re.sub(r"\$\{\{.*?\}\}", "test", step["run"])
            subprocess.run([str(BASH), "-n"], input=text, text=True, check=True, capture_output=True)
    deploy = next(step["run"] for step in data["jobs"]["deploy"]["steps"] if step.get("name") == f"Deploy {role.title()}")
    lines = deploy.splitlines()
    start = next(i for i, line in enumerate(lines) if line.strip().startswith("cd --")) + 1
    stop = next(i for i, line in enumerate(lines) if "=== Restart Container" in line or "=== Install/Update Dependencies" in line)
    script = "set -e\n" + "\n".join(lines[start:stop])
    return re.sub(r"\$\{\{.*?\}\}", "stg", script)

with tempfile.TemporaryDirectory(prefix="sms-deploy-check-") as temporary:
    root = Path(temporary).resolve()
    assert root.is_relative_to(Path(tempfile.gettempdir()).resolve())
    for role in ("frontend", "backend"):
        script = load_script(role)
        case = root / role
        case.mkdir()
        remote, source, server = case / "remote.git", case / "source", case / "server"
        run(["git", "init", "--bare", str(remote)])
        run(["git", "init", "-b", "stg", str(source)])
        git(source, "config", "user.name", "Deploy Check")
        git(source, "config", "user.email", "deploy-check@example.invalid")
        (source / "keep.txt").write_text("initial\n")
        if role == "frontend":
            (source / "package-lock.json").write_text("repository lock v1\n")
        git(source, "add", ".")
        git(source, "commit", "-m", "Initial")
        git(source, "remote", "add", "origin", str(remote))
        git(source, "push", "-u", "origin", "stg")
        run(["git", "clone", "-b", "stg", str(remote), str(server)])
        filename = "package-lock.json" if role == "frontend" else "docker-compose.yml"
        original = "server custom file\n"
        (server / filename).write_text(original)
        if role == "frontend":
            git(server, "add", filename)
        (server / "keep.txt").write_text("unrelated server change\n")
        git(server, "add", "keep.txt")
        (source / filename).write_text("repository file v2\n")
        git(source, "add", filename)
        git(source, "commit", "-m", "Incoming deployment update")
        git(source, "push", "origin", "stg")
        backup = case / "backups"
        env = {**os.environ, "DEPLOY_BACKUP_ROOT": backup.as_posix()}
        run([str(BASH), "--noprofile", "--norc", "-c", script], cwd=server, env=env)
        assert (server / filename).read_text() == "repository file v2\n"
        assert (server / "keep.txt").read_text() == "unrelated server change\n"
        assert git(server, "diff", "--cached", "--name-only").strip() == "keep.txt"
        saved = list(backup.glob(f"*/{filename}"))
        assert len(saved) == 1 and saved[0].read_text() == original
        run([str(BASH), "--noprofile", "--norc", "-c", script], cwd=server, env=env)
        assert len(list(backup.iterdir())) == 1
        assert (server / "keep.txt").read_text() == "unrelated server change\n"
        if role == "backend":
            (server / filename).write_text("tracked server modification\n")
            (source / filename).write_text("repository file v3\n")
            git(source, "add", filename)
            git(source, "commit", "-m", "Next update")
            git(source, "push", "origin", "stg")
            failed = subprocess.run([str(BASH), "--noprofile", "--norc", "-c", script], cwd=server, env=env, capture_output=True)
            assert failed.returncode != 0
            assert (server / filename).read_text() == "tracked server modification\n"
        print(f"PASS {role}: conflict recovered, backup preserved, unrelated staged changes retained, repeat deploy safe")
print("PASS: both YAML files and every shell step passed syntax validation")
