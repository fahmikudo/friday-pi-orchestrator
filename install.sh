#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"
PI_DIR="${PI_CODING_AGENT_DIR:-${HOME}/.pi/agent}"
PACKAGE_DIR="${PI_DIR}/local-packages"
TARGET_DIR="${PACKAGE_DIR}/friday-pi-orchestrator"
OLD_TARGET="${PACKAGE_DIR}/pi-engineering-orchestrator"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="${PACKAGE_DIR}/.friday-backups/${STAMP}"

if [[ "${SOURCE_DIR}" == "${TARGET_DIR}" ]]; then
  echo "ERROR: Run install.sh from an extracted release or repository checkout, not the installed target."
  exit 1
fi

for cmd in pi node; do
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "ERROR: ${cmd} command was not found in PATH."
    exit 1
  fi
done

echo "Friday Pi Orchestrator v2.0.1"
echo "Build with structure. Finish with confidence. Feel like Friday."
echo
echo "Pre-install validation..."
(
  cd "${SOURCE_DIR}"
  node --test tests/*.test.mjs
  node --check extensions/core.js
  node --check extensions/store.js
  node --check extensions/backlog.js
  node --check extensions/format.js
  node --check extensions/backlog-format.js
  node --check extensions/runtime.js
  if command -v python3 >/dev/null 2>&1 && python3 -c 'import yaml' >/dev/null 2>&1; then
    python3 scripts/validate_skills.py
  else
    echo "WARNING: python3 + PyYAML not available; skipping optional YAML skill validator during install."
  fi
)

echo
echo "IMPORTANT: Fully quit other running Pi processes before using the newly installed runtime."
mkdir -p "${PACKAGE_DIR}" "${BACKUP_DIR}"

archive_target() {
  local path="$1"
  local label="$2"
  if [[ -e "${path}" ]]; then
    echo "Archiving ${label}: ${path}"
    pi remove "${path}" >/dev/null 2>&1 || true
    mv "${path}" "${BACKUP_DIR}/${label}"
  fi
}

archive_target "${OLD_TARGET}" "pi-engineering-orchestrator-v1"
archive_target "${TARGET_DIR}" "friday-pi-orchestrator-previous"

mkdir -p "${TARGET_DIR}"
cp -R "${SOURCE_DIR}/." "${TARGET_DIR}/"
rm -rf "${TARGET_DIR}/.git" "${TARGET_DIR}/node_modules" "${TARGET_DIR}"/*.zip 2>/dev/null || true
find "${TARGET_DIR}" -name '*.bak' -type f -delete 2>/dev/null || true

required=(
  "package.json"
  "extensions/index.ts"
  "extensions/core.js"
  "extensions/store.js"
  "extensions/backlog.js"
  "extensions/format.js"
  "extensions/backlog-format.js"
  "extensions/runtime.js"
  "README.md"
)
for file in "${required[@]}"; do
  if [[ ! -f "${TARGET_DIR}/${file}" ]]; then
    echo "ERROR: Missing installed runtime file: ${file}"
    exit 1
  fi
done

echo "Configuring packaged skill exposure..."
node "${TARGET_DIR}/scripts/configure-packaged-skills.mjs" "${TARGET_DIR}"
pi install "${TARGET_DIR}"

echo
echo "Installed Friday at: ${TARGET_DIR}"
if [[ -d "${BACKUP_DIR}" ]] && find "${BACKUP_DIR}" -mindepth 1 -maxdepth 1 | grep -q .; then
  echo "Previous package backup: ${BACKUP_DIR}"
fi

echo
echo "No project .pi-work state was deleted, renamed, or migrated."
echo
echo "Start a NEW Pi process in your project, then run:"
echo "  /orchestrator-doctor"
echo "  /status"
echo "  /skill-routing"
echo
echo "Existing v1.0.8 work:"
echo "  /work-resume W-..."
echo
echo "If the project uses backlog state:"
echo "  /backlog-reconcile"
echo "  /backlog"
echo
echo "Optional role-agent templates:"
echo "  ${TARGET_DIR}/scripts/install-agent-templates.sh"
