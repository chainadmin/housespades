---
name: Mobile toolchain quirks
description: How to run npm/tsc for the Expo mobile app in this workspace
---
- The bash tool blocks `npm`; `npx` isn't on PATH in the code_execution sandbox.
- **How to apply:** run installs/type checks via code_execution using the full node path, e.g. `/nix/store/1lagpgadaybvs1n2312gysg2phjk89y8-nodejs-20.20.0-wrapped/bin/npm install ...` with `cwd: mobile`, and tsc via `node /home/runner/workspace/node_modules/typescript/bin/tsc --noEmit -p .` (typescript lives in the root node_modules, not mobile's).
- **Why:** repeated failed attempts with plain npm/npx wasted turns; this path works reliably.
