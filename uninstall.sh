#!/usr/bin/env bash
set -euo pipefail
PI_DIR="${PI_CODING_AGENT_DIR:-${HOME}/.pi/agent}"
TARGET_DIR="${PI_DIR}/local-packages/friday-pi-orchestrator"

if command -v pi >/dev/null 2>&1; then
  pi remove "${TARGET_DIR}" || true
fi
rm -rf "${TARGET_DIR}"

echo "Removed Friday Pi Orchestrator package files."
echo "Project .pi-work directories were intentionally preserved."
echo "Agent templates installed separately under ${PI_DIR}/agents are not removed automatically."
