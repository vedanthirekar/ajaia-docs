/** Client-safe import limits (shared by the upload UI and the server converter). */
export const MAX_IMPORT_BYTES = 4 * 1024 * 1024;
export const SUPPORTED_EXTENSIONS = [".txt", ".md", ".docx"] as const;
export const SUPPORTED_LABEL = "Supported: .txt, .md, .docx (max 4 MB)";
