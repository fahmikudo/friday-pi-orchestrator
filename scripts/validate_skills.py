#!/usr/bin/env python3
from pathlib import Path
import re
import sys
import yaml

root = Path(__file__).resolve().parents[1] / "skills"
errors = []
seen = {}
files = sorted(root.rglob("SKILL.md"))

if not files:
    errors.append("No SKILL.md files found")

required = [
    "## Purpose",
    "## Use When",
    "## Do Not Use When",
    "## Required Inputs",
    "## Operating Rules",
    "## Workflow",
    "## Required Evidence",
    "## Quality Gates",
    "## Output Contract",
    "## References",
]

for path in files:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        errors.append(f"{path}: missing YAML frontmatter")
        continue
    try:
        _, front, _ = text.split("---", 2)
        meta = yaml.safe_load(front) or {}
    except Exception as exc:
        errors.append(f"{path}: invalid YAML: {exc}")
        continue

    name = str(meta.get("name", "")).strip()
    desc = str(meta.get("description", "")).strip()
    if not name:
        errors.append(f"{path}: missing name")
        continue
    if not desc:
        errors.append(f"{path}: missing description")
    if name != path.parent.name:
        errors.append(f"{path}: name '{name}' does not match directory '{path.parent.name}'")
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", name):
        errors.append(f"{path}: invalid skill name '{name}'")
    if len(name) > 64:
        errors.append(f"{path}: name exceeds 64 chars")
    if len(desc) > 1024:
        errors.append(f"{path}: description exceeds 1024 chars")
    if name in seen:
        errors.append(f"duplicate skill name '{name}': {seen[name]} and {path}")
    seen[name] = path

    for heading in required:
        if heading not in text:
            errors.append(f"{path}: missing section {heading}")

if errors:
    print("FAILED")
    for error in errors:
        print(" -", error)
    sys.exit(1)

print(f"PASS: {len(files)} skills validated with YAML parsing")
for category in sorted({p.parent.parent.name for p in files}):
    count = sum(1 for p in files if p.parent.parent.name == category)
    print(f" - {category}: {count}")
