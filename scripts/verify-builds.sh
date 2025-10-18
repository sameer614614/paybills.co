#!/usr/bin/env bash
set -euo pipefail

# Run production builds for every workspace so we can catch missing files or
# TypeScript errors before deploying. Each project is built in sequence to
# surface the exact failure.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

run_build() {
  local package_dir="$1"
  printf '\n› Building %s\n' "${package_dir}" >&2
  (
    cd "${ROOT_DIR}/${package_dir}" &&
      npm install &&
      { [ "${package_dir}" != "backend" ] || npx prisma generate; } &&
      npm run build
  )
}

run_build backend
run_build functions
run_build frontend
run_build admin
run_build agent

printf '\nAll builds completed successfully.\n' >&2
