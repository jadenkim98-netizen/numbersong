#!/bin/bash
# Numbersong unit tests for the pure modules (src/theory.mjs, src/pitch.mjs), via
# Node's built-in test runner — no npm install, no package.json, matching the
# project's deliberately-toolchain-free rule (same spirit as build.sh using npx).
set -e
cd "$(dirname "$0")"
node --test test/*.test.mjs
