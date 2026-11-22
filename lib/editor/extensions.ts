import Highlight from "@tiptap/extension-highlight";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import TextAlign from "@tiptap/extension-text-align";
import { Color, FontSize, TextStyle } from "@tiptap/extension-text-style";
import StarterKit from "@tiptap/starter-kit";

/**
 * The document schema, shared by the browser editor and server-side import so
 * that imported content is always valid for the editor. All extensions are the
 * free, MIT-licensed official TipTap packages. (StarterKit v3 already includes
 * Underline, Link, Blockquote and HorizontalRule.)
 */
export function buildEditorExtensions({ editable = true }: { editable?: boolean } = {}) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      // Editors click to place the cursor; read-only viewers click to follow the link.
      link: { openOnClick: !editable, autolink: true, defaultProtocol: "https" },
    }),
    TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right", "justify"] }),
    Highlight.configure({ multicolor: false }),
    TextStyle,
    Color,
    FontSize,
    TaskList,
    TaskItem.configure({ nested: true }),
  ];
}

export const editorExtensions = buildEditorExtensions();
