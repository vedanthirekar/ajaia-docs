import StarterKit from "@tiptap/starter-kit";

/**
 * The document schema, shared by the browser editor and server-side import so
 * that imported content is always valid for the editor. (StarterKit v3 includes
 * Underline and Link.)
 */
export const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
  }),
];
