"use client";

import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? "⌘" : "Ctrl+";

type BlockStyle = "paragraph" | "h1" | "h2" | "h3";
const BLOCK_LABELS: Record<BlockStyle, string> = {
  paragraph: "Normal text",
  h1: "Heading 1",
  h2: "Heading 2",
  h3: "Heading 3",
};

function ToolButton({
  icon: Icon,
  label,
  shortcut,
  active,
  disabled,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            aria-pressed={active}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault() /* keep the editor's selection */}
            onClick={onClick}
            className={cn(active && "bg-primary/10 text-primary hover:bg-primary/15")}
          />
        }
      >
        <Icon />
      </TooltipTrigger>
      <TooltipContent>
        {label}
        {shortcut && <span className="ml-1.5 opacity-70">{shortcut}</span>}
      </TooltipContent>
    </Tooltip>
  );
}

export function Toolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      bulletList: e.isActive("bulletList"),
      orderedList: e.isActive("orderedList"),
      block: (e.isActive("heading", { level: 1 })
        ? "h1"
        : e.isActive("heading", { level: 2 })
          ? "h2"
          : e.isActive("heading", { level: 3 })
            ? "h3"
            : "paragraph") as BlockStyle,
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const setBlock = (v: BlockStyle) => {
    const chain = editor.chain().focus();
    if (v === "paragraph") chain.setParagraph().run();
    else chain.setHeading({ level: Number(v.slice(1)) as 1 | 2 | 3 }).run();
  };

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex items-center gap-0.5 overflow-x-auto rounded-lg border bg-background px-1.5 py-1 shadow-xs [scrollbar-width:thin]"
    >
      <ToolButton icon={Undo2} label="Undo" shortcut={`${mod}Z`} disabled={!s.canUndo} onClick={() => editor.chain().focus().undo().run()} />
      <ToolButton icon={Redo2} label="Redo" shortcut={isMac ? "⇧⌘Z" : "Ctrl+Y"} disabled={!s.canRedo} onClick={() => editor.chain().focus().redo().run()} />
      <Separator orientation="vertical" className="mx-1 h-5!" />

      <Select value={s.block} onValueChange={(v) => v && setBlock(v as BlockStyle)}>
        <SelectTrigger size="sm" className="w-36 shrink-0 border-transparent shadow-none" aria-label="Text style">
          <SelectValue>{(v: BlockStyle) => BLOCK_LABELS[v]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(BLOCK_LABELS) as BlockStyle[]).map((k) => (
            <SelectItem key={k} value={k}>
              <span
                className={cn(
                  k === "h1" && "text-lg font-bold",
                  k === "h2" && "text-base font-semibold",
                  k === "h3" && "font-semibold",
                )}
              >
                {BLOCK_LABELS[k]}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Separator orientation="vertical" className="mx-1 h-5!" />

      <ToolButton icon={Bold} label="Bold" shortcut={`${mod}B`} active={s.bold} onClick={() => editor.chain().focus().toggleBold().run()} />
      <ToolButton icon={Italic} label="Italic" shortcut={`${mod}I`} active={s.italic} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <ToolButton icon={Underline} label="Underline" shortcut={`${mod}U`} active={s.underline} onClick={() => editor.chain().focus().toggleUnderline().run()} />
      <ToolButton icon={Strikethrough} label="Strikethrough" shortcut={isMac ? "⇧⌘S" : "Ctrl+Shift+S"} active={s.strike} onClick={() => editor.chain().focus().toggleStrike().run()} />
      <Separator orientation="vertical" className="mx-1 h-5!" />

      <ToolButton icon={List} label="Bulleted list" shortcut={isMac ? "⇧⌘8" : "Ctrl+Shift+8"} active={s.bulletList} onClick={() => editor.chain().focus().toggleBulletList().run()} />
      <ToolButton icon={ListOrdered} label="Numbered list" shortcut={isMac ? "⇧⌘7" : "Ctrl+Shift+7"} active={s.orderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
    </div>
  );
}
