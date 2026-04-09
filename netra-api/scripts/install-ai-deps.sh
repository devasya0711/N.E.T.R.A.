#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT_DIR="$(cd "${API_DIR}/.." && pwd)"
AI_DIR="${AI_DIR:-${ROOT_DIR}/NETRA-AI}"
REQ_FILE="${AI_REQUIREMENTS_FILE:-${AI_DIR}/requirements-server.txt}"

echo "[NETRA-AI] Preparing Python dependencies..."

if [[ ! -d "${AI_DIR}" ]]; then
  echo "[NETRA-AI] AI directory not found at ${AI_DIR}; skipping Python dependency install."
  exit 0
fi

if [[ ! -f "${REQ_FILE}" ]]; then
  echo "[NETRA-AI] Requirements file not found at ${REQ_FILE}; skipping Python dependency install."
  exit 0
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "[NETRA-AI] python3 is not available; skipping Python dependency install."
  exit 0
fi

echo "[NETRA-AI] Using requirements file: ${REQ_FILE}"
python3 -m pip install --upgrade pip setuptools wheel
python3 -m pip install --no-cache-dir -r "${REQ_FILE}"
echo "[NETRA-AI] Python dependencies installed."
