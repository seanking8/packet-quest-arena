#!/usr/bin/env bash
#
# Run every automated test suite in the project: backend (JUnit), frontend
# (Vitest) and the Python simulator (pytest). Exits non-zero if any suite fails.
#
# Usage:  ./scripts/test-all.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Pick an available Python interpreter.
PY="python3"
command -v "$PY" >/dev/null 2>&1 || PY="python"

echo "==> Backend tests (mvn test)"
( cd backend && mvn -q test )

echo "==> Frontend tests (vitest)"
( cd frontend && npm test --silent )

echo "==> Simulator tests (pytest)"
"$PY" -m pytest simulator/tests -q

echo "==> All test suites passed."
