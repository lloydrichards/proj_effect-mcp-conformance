import { fileURLToPath } from "node:url";

// src/ and dist/ are both three levels below the workspace root.
export const repository = fileURLToPath(new URL("../../..", import.meta.url));
