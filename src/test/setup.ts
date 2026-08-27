import "@testing-library/jest-dom"
\nimport { webcrypto } from "node:crypto"\n\nObject.defineProperty(globalThis, "crypto", {\n  value: webcrypto,\n  configurable: true,\n})\n