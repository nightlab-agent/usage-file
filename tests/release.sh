#!/bin/sh
# Release gate: the manifest and module validate, and the tests pass.
# Exit non-zero on either. Run from the repo root: sh tests/release.sh
set -e
cd "$(dirname "$0")/.."
claude plugin validate . 
claude plugin test .
echo "release gate: validate and test passed"
