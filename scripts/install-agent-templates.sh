#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="${ROOT}/examples/agents"
TARGET="${PI_CODING_AGENT_DIR:-${HOME}/.pi/agent}/agents"
REPLACE=false

if [[ "${1:-}" == "--replace" ]]; then
  REPLACE=true
fi

mkdir -p "${TARGET}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="${TARGET}/.friday-backup-${STAMP}"
changed=0

for src in "${SOURCE}"/*.md; do
  name="$(basename "${src}")"
  dst="${TARGET}/${name}"
  if [[ -e "${dst}" && "${REPLACE}" != "true" ]]; then
    echo "KEEP existing ${dst}"
    continue
  fi
  if [[ -e "${dst}" ]]; then
    mkdir -p "${BACKUP}"
    cp "${dst}" "${BACKUP}/${name}"
    echo "BACKUP ${dst} -> ${BACKUP}/${name}"
  fi
  cp "${src}" "${dst}"
  echo "INSTALL ${dst}"
  changed=$((changed + 1))
done

echo "Installed/replaced ${changed} agent template(s)."
echo "Restart Pi after changing agent definitions."
