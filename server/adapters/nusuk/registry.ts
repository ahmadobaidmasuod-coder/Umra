export type TargetStrategy =
  | { by: "testId"; value: string }
  | { by: "label"; value: string }
  | { by: "role"; role: string; name: string }
  | { by: "css"; value: string };

export type SemanticTargetDefinition = { workflows: readonly string[]; strategies: readonly TargetStrategy[] };

export const NUSUK_TARGETS = {
  "program.nameArabic": { workflows: ["CREATE_UMRAH_PROGRAM"], strategies: [{ by: "testId", value: "program-name-ar" }, { by: "label", value: "اسم البرنامج" }, { by: "role", role: "textbox", name: "اسم البرنامج" }, { by: "css", value: "#programNameAr" }] },
  "program.nameEnglish": { workflows: ["CREATE_UMRAH_PROGRAM"], strategies: [{ by: "testId", value: "program-name-en" }, { by: "label", value: "Program name" }, { by: "css", value: "#programNameEn" }] },
  "program.submitButton": { workflows: ["CREATE_UMRAH_PROGRAM"], strategies: [{ by: "testId", value: "submit-program" }, { by: "role", role: "button", name: "إنشاء البرنامج" }, { by: "css", value: "button[type=submit]" }] },
  "program.searchResultByName": { workflows: ["CREATE_UMRAH_PROGRAM"], strategies: [{ by: "testId", value: "program-search-result" }, { by: "css", value: "[data-program-name]" }] },
  "host.idDocumentUpload": { workflows: ["CREATE_UMRAH_PROGRAM_WITH_HOST"], strategies: [{ by: "label", value: "هوية المضيف" }, { by: "css", value: "input[type=file][accept*='pdf']" }] },
} as const satisfies Record<string, SemanticTargetDefinition>;

export type RegisteredTargetKey = keyof typeof NUSUK_TARGETS;
