"use client";

import { useState, type FormEvent } from "react";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Baseline,
  Bold,
  Highlighter,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Plus,
  SeparatorHorizontal,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  COLOR_PALETTE,
  DEFAULT_FONT_SIZE,
  FONT_SIZE_PRESETS,
  normalizeHexColor,
  parseFontSize,
  stepFontSize,
} from "@/lib/editor/formatting";
import { normalizeLinkUrl } from "@/lib/editor/links";
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

const ALIGNMENTS: { value: "left" | "center" | "right" | "justify"; icon: LucideIcon; label: string; shortcut: string }[] = [
  { value: "left", icon: AlignLeft, label: "Align left", shortcut: isMac ? "⇧⌘L" : "Ctrl+Shift+L" },
  { value: "center", icon: AlignCenter, label: "Align center", shortcut: isMac ? "⇧⌘E" : "Ctrl+Shift+E" },
  { value: "right", icon: AlignRight, label: "Align right", shortcut: isMac ? "⇧⌘R" : "Ctrl+Shift+R" },
  { value: "justify", icon: AlignJustify, label: "Justify", shortcut: isMac ? "⇧⌘J" : "Ctrl+Shift+J" },
];

const keepSelection = (e: React.MouseEvent) => e.preventDefault();

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
            onMouseDown={keepSelection}
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

const Divider = () => <Separator orientation="vertical" className="mx-1 h-5!" />;

function ColorPicker({ editor, current }: { editor: Editor; current: string | null }) {
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState("");
  const [hexError, setHexError] = useState(false);
  const currentHex = current ? normalizeHexColor(current) : null;

  const apply = (color: string | null) => {
    const chain = editor.chain().focus();
    if (color) chain.setColor(color).run();
    else chain.unsetColor().run();
    setOpen(false);
  };

  const applyHex = (e: FormEvent) => {
    e.preventDefault();
    const c = normalizeHexColor(hex);
    if (!c) {
      setHexError(true);
      return;
    }
    apply(c);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setHex(currentHex ?? "");
          setHexError(false);
        }
        setOpen(next);
      }}
    >
      <PopoverTrigger
        render={
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Text colour" title="Text colour" onMouseDown={keepSelection} />
        }
      >
        <span className="flex flex-col items-center">
          <Baseline className="size-4" />
          <span className="-mt-0.5 h-1 w-4 rounded-full border border-black/10" style={{ background: current ?? "currentColor" }} />
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-auto" align="start" initialFocus={false}>
        <button
          type="button"
          onMouseDown={keepSelection}
          onClick={() => apply(null)}
          className="flex items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs hover:bg-muted"
        >
          <span className="size-4 rounded-sm border bg-foreground" /> Default
        </button>
        <div className="grid grid-cols-8 gap-1" role="group" aria-label="Text colours">
          {COLOR_PALETTE.flat().map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              aria-label={`Colour ${c}`}
              aria-pressed={currentHex === c}
              onMouseDown={keepSelection}
              onClick={() => apply(c)}
              className={cn(
                "size-5 rounded-full border border-black/10 outline-none hover:scale-110 focus-visible:ring-3 focus-visible:ring-ring/50",
                currentHex === c && "ring-2 ring-primary ring-offset-1",
              )}
              style={{ background: c }}
            />
          ))}
        </div>
        <form onSubmit={applyHex} className="flex items-center gap-1.5 border-t pt-2.5" noValidate>
          <label className="relative size-7 shrink-0 cursor-pointer overflow-hidden rounded-md border" title="Pick any colour">
            <span className="sr-only">Pick a custom colour</span>
            <span className="absolute inset-0" style={{ background: normalizeHexColor(hex) ?? "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)" }} />
            <input
              type="color"
              className="absolute inset-0 cursor-pointer opacity-0"
              value={normalizeHexColor(hex) ?? "#000000"}
              onChange={(e) => {
                setHex(e.target.value);
                setHexError(false);
              }}
            />
          </label>
          <Input
            aria-label="Hex colour"
            placeholder="#1a73e8"
            value={hex}
            onChange={(e) => {
              setHex(e.target.value);
              setHexError(false);
            }}
            aria-invalid={hexError || undefined}
            className="h-7 w-24 font-mono text-xs"
          />
          <Button type="submit" size="sm">
            Apply
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function FontSizeControl({ editor, current }: { editor: Editor; current: number }) {
  const [draft, setDraft] = useState(String(current));
  const [shown, setShown] = useState(current);
  if (current !== shown) {
    // Follow the cursor: show the size at the current selection.
    setShown(current);
    setDraft(String(current));
  }

  const apply = (size: number) => {
    const chain = editor.chain().focus();
    if (size === DEFAULT_FONT_SIZE) chain.unsetFontSize().run();
    else chain.setFontSize(`${size}px`).run();
    setDraft(String(size));
  };

  return (
    <div className="flex shrink-0 items-center" role="group" aria-label="Font size">
      <ToolButton icon={Minus} label="Decrease font size" onClick={() => apply(stepFontSize(current, -1))} />
      <input
        aria-label="Font size"
        data-testid="font-size"
        inputMode="decimal"
        list="font-size-presets"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const n = parseFontSize(draft);
            if (n === null) setDraft(String(current));
            else apply(n);
          }
          if (e.key === "Escape") {
            setDraft(String(current));
            editor.commands.focus();
          }
        }}
        onBlur={() => {
          const n = parseFontSize(draft);
          if (n === null || n === current) setDraft(String(current));
          else apply(n);
        }}
        className="h-7 w-11 rounded-md border bg-background text-center text-sm tabular-nums outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
      />
      <datalist id="font-size-presets">
        {FONT_SIZE_PRESETS.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      <ToolButton icon={Plus} label="Increase font size" onClick={() => apply(stepFontSize(current, 1))} />
    </div>
  );
}

function LinkEditor({ editor, active }: { editor: Editor; active: boolean }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onOpenChange = (next: boolean) => {
    if (next) {
      setValue((editor.getAttributes("link").href as string | undefined) ?? "");
      setError(null);
    }
    setOpen(next);
  };

  const apply = (e: FormEvent) => {
    e.preventDefault();
    const r = normalizeLinkUrl(value);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    const { empty } = editor.state.selection;
    if (empty && !active) {
      // Nothing selected: insert the URL itself as linked text.
      editor
        .chain()
        .focus()
        .insertContent({ type: "text", text: value.trim(), marks: [{ type: "link", attrs: { href: r.href } }] })
        .run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: r.href }).run();
    }
    setOpen(false);
  };

  const remove = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Link"
            title="Link"
            aria-pressed={active}
            onMouseDown={keepSelection}
            className={cn(active && "bg-primary/10 text-primary hover:bg-primary/15")}
          />
        }
      >
        <Link2 />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <form onSubmit={apply} className="space-y-2" noValidate>
          <label htmlFor="link-url" className="text-xs font-medium text-muted-foreground">
            Link address
          </label>
          <Input
            id="link-url"
            autoFocus
            placeholder="example.com"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            aria-invalid={error ? true : undefined}
          />
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            {active && (
              <Button type="button" variant="ghost" size="sm" onClick={remove}>
                Remove
              </Button>
            )}
            <Button type="submit" size="sm">
              Apply
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
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
      highlight: e.isActive("highlight"),
      link: e.isActive("link"),
      bulletList: e.isActive("bulletList"),
      orderedList: e.isActive("orderedList"),
      blockquote: e.isActive("blockquote"),
      align: (["center", "right", "justify"] as const).find((a) => e.isActive({ textAlign: a })) ?? "left",
      color: (e.getAttributes("textStyle").color as string | undefined) ?? null,
      fontSize: parseFontSize((e.getAttributes("textStyle").fontSize as string | undefined) ?? "") ?? DEFAULT_FONT_SIZE,
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
      <Divider />

      <Select value={s.block} onValueChange={(v) => v && setBlock(v as BlockStyle)}>
        <SelectTrigger size="sm" className="w-34 shrink-0 border-transparent shadow-none" aria-label="Text style">
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

      <Divider />
      <FontSizeControl editor={editor} current={s.fontSize} />
      <Divider />

      <ToolButton icon={Bold} label="Bold" shortcut={`${mod}B`} active={s.bold} onClick={() => editor.chain().focus().toggleBold().run()} />
      <ToolButton icon={Italic} label="Italic" shortcut={`${mod}I`} active={s.italic} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <ToolButton icon={Underline} label="Underline" shortcut={`${mod}U`} active={s.underline} onClick={() => editor.chain().focus().toggleUnderline().run()} />
      <ToolButton icon={Strikethrough} label="Strikethrough" shortcut={isMac ? "⇧⌘S" : "Ctrl+Shift+S"} active={s.strike} onClick={() => editor.chain().focus().toggleStrike().run()} />
      <ColorPicker editor={editor} current={s.color} />
      <ToolButton icon={Highlighter} label="Highlight" shortcut={isMac ? "⇧⌘H" : "Ctrl+Shift+H"} active={s.highlight} onClick={() => editor.chain().focus().toggleHighlight().run()} />
      <LinkEditor editor={editor} active={s.link} />
      <Divider />

      {ALIGNMENTS.map((a) => (
        <ToolButton
          key={a.value}
          icon={a.icon}
          label={a.label}
          shortcut={a.shortcut}
          active={s.align === a.value}
          onClick={() => editor.chain().focus().setTextAlign(a.value).run()}
        />
      ))}
      <Divider />

      <ToolButton icon={List} label="Bulleted list" shortcut={isMac ? "⇧⌘8" : "Ctrl+Shift+8"} active={s.bulletList} onClick={() => editor.chain().focus().toggleBulletList().run()} />
      <ToolButton icon={ListOrdered} label="Numbered list" shortcut={isMac ? "⇧⌘7" : "Ctrl+Shift+7"} active={s.orderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
      <ToolButton icon={Quote} label="Quote" shortcut={isMac ? "⇧⌘B" : "Ctrl+Shift+B"} active={s.blockquote} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
      <ToolButton icon={SeparatorHorizontal} label="Divider line" onClick={() => editor.chain().focus().setHorizontalRule().run()} />
    </div>
  );
}
