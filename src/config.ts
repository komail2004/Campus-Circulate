// Classroom presentation: local browser simulation by default.
// Firebase implementation is preserved and can be enabled later, once secured and tested,
// by setting VITE_DEMO_MODE=false at build time.
export const localMode = import.meta.env.VITE_DEMO_MODE !== "false";
