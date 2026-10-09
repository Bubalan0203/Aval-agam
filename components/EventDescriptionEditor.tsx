"use client";
import { useEffect, useState } from "react";
import { Extension } from "@tiptap/core";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { BackgroundColor, Color, FontFamily, FontSize, TextStyle } from "@tiptap/extension-text-style";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import TextAlign from "@tiptap/extension-text-align";
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Baseline, Bold, Code, Eraser, Highlighter, IndentDecrease, IndentIncrease, Italic,
  Link2, Link2Off, List, ListChecks, ListOrdered, Minus, Plus, Quote, Redo2, SeparatorHorizontal, Strikethrough, Underline, Undo2, type LucideIcon,
} from "lucide-react";
import { descriptionHtml, sanitizeDescription, type DescriptionFormat } from "@/lib/event-content";

const SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 48];
const FONTS = [["Poppins", "Poppins"], ["Playfair Display", "Playfair Display"], ["Georgia", "Georgia"], ["Arial", "Arial"], ["monospace", "Monospace"]] as const;
const SPACING = ["1", "1.15", "1.5", "2"];
const BLOCKS = ["paragraph", "heading"];

declare module "@tiptap/core" {
  interface Commands<ReturnType> { lineSpacing: { setLineSpacing: (value: string | null) => ReturnType } }
}

/** Google Docs-style line spacing on whole paragraphs and headings. */
const LineSpacing = Extension.create({
  name: "lineSpacing",
  addGlobalAttributes() {
    return [{ types: BLOCKS, attributes: { lineHeight: {
      default: null,
      parseHTML: el => el.style.lineHeight || null,
      renderHTML: attrs => attrs.lineHeight ? { style: `line-height: ${attrs.lineHeight}` } : {},
    } } }];
  },
  addCommands() {
    return { setLineSpacing: value => ({ commands }) => BLOCKS.every(t => commands.updateAttributes(t, { lineHeight: value })) };
  },
});

function stepSize(editor: Editor, dir: 1 | -1) {
  const now = parseInt(editor.getAttributes("textStyle").fontSize || "16", 10);
  const next = dir > 0 ? SIZES.find(s => s > now) : [...SIZES].reverse().find(s => s < now);
  if (next) editor.chain().focus().setFontSize(`${next}px`).run();
}

/** Docs keyboard shortcuts on top of TipTap's built-ins (Cmd+B/I/U, Cmd+Shift+7/8/9, Cmd+Shift+L/E/R/J, Cmd+Z). */
const DocsShortcuts = Extension.create({
  name: "docsShortcuts",
  addKeyboardShortcuts() {
    return {
      "Mod-Shift-.": () => { stepSize(this.editor, 1); return true; },
      "Mod-Shift-,": () => { stepSize(this.editor, -1); return true; },
      "Mod-]": () => this.editor.commands.sinkListItem(this.editor.isActive("taskItem") ? "taskItem" : "listItem"),
      "Mod-[": () => this.editor.commands.liftListItem(this.editor.isActive("taskItem") ? "taskItem" : "listItem"),
      "Mod-Alt-0": () => this.editor.commands.setParagraph(),
      "Mod-\\": () => this.editor.chain().unsetAllMarks().clearNodes().run(),
    };
  },
});

export function EventDescriptionEditor({ value, format = "html", onChange }: { value: string; format?: DescriptionFormat; onChange: (html: string) => void }) {
  const [linkUrl, setLinkUrl] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkError, setLinkError] = useState("");
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: { openOnClick: false, protocols: ["mailto"], HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" } } }),
      TextStyle, Color, BackgroundColor, FontFamily, FontSize,
      TaskList, TaskItem.configure({ nested: true }),
      TextAlign.configure({ types: BLOCKS }),
      LineSpacing, DocsShortcuts,
    ],
    content: descriptionHtml(value, format),
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "event-rich-text event-description-input", role: "textbox", "aria-label": "Event description", "aria-multiline": "true" },
      handleKeyDown: (_view, e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openLink(); return true; }
        return false;
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });
  useEditorState({ editor, selector: ({ editor }) => editor ? editor.state : null });

  useEffect(() => {
    if (editor && sanitizeDescription(editor.getHTML()) !== descriptionHtml(value, format)) editor.commands.setContent(descriptionHtml(value, format), { emitUpdate: false });
  }, [editor, value, format]);

  function openLink() {
    if (!editor) return;
    setLinkUrl(editor.getAttributes("link").href || ""); setLinkError(""); setLinkOpen(true);
  }

  if (!editor) return <p style={{ padding: "16px" }}>Loading description editor…</p>;
  const ch = () => editor.chain().focus();
  type Tool = { label: string; Icon: LucideIcon; active?: boolean; disabled?: boolean; run: () => void };
  const listType = editor.isActive("taskItem") ? "taskItem" : "listItem";
  const inList = editor.isActive("listItem") || editor.isActive("taskItem");
  const groups: Tool[][] = [
    [
      { label: "Bold (⌘B)", Icon: Bold, active: editor.isActive("bold"), run: () => ch().toggleBold().run() },
      { label: "Italic (⌘I)", Icon: Italic, active: editor.isActive("italic"), run: () => ch().toggleItalic().run() },
      { label: "Underline (⌘U)", Icon: Underline, active: editor.isActive("underline"), run: () => ch().toggleUnderline().run() },
      { label: "Strikethrough (⌘⇧X)", Icon: Strikethrough, active: editor.isActive("strike"), run: () => ch().toggleStrike().run() },
    ],
    [
      { label: "Insert link (⌘K)", Icon: Link2, active: editor.isActive("link"), run: openLink },
      { label: "Remove link", Icon: Link2Off, disabled: !editor.isActive("link"), run: () => ch().extendMarkRange("link").unsetLink().run() },
    ],
    (["left", "center", "right", "justify"] as const).map(align => ({
      label: `Align ${align} (⌘⇧${{ left: "L", center: "E", right: "R", justify: "J" }[align]})`, Icon: { left: AlignLeft, center: AlignCenter, right: AlignRight, justify: AlignJustify }[align],
      active: editor.isActive({ textAlign: align }), run: () => ch().setTextAlign(align).run(),
    })),
    [
      { label: "Checklist (⌘⇧9)", Icon: ListChecks, active: editor.isActive("taskList"), run: () => ch().toggleTaskList().run() },
      { label: "Bulleted list (⌘⇧8)", Icon: List, active: editor.isActive("bulletList"), run: () => ch().toggleBulletList().run() },
      { label: "Numbered list (⌘⇧7)", Icon: ListOrdered, active: editor.isActive("orderedList"), run: () => ch().toggleOrderedList().run() },
      { label: "Decrease indent (⌘[)", Icon: IndentDecrease, disabled: !inList, run: () => ch().liftListItem(listType).run() },
      { label: "Increase indent (⌘])", Icon: IndentIncrease, disabled: !inList || !editor.can().sinkListItem(listType), run: () => ch().sinkListItem(listType).run() },
    ],
    [
      { label: "Quote", Icon: Quote, active: editor.isActive("blockquote"), run: () => ch().toggleBlockquote().run() },
      { label: "Code", Icon: Code, active: editor.isActive("code"), run: () => ch().toggleCode().run() },
      { label: "Divider line", Icon: SeparatorHorizontal, run: () => ch().setHorizontalRule().run() },
      { label: "Clear formatting (⌘\\)", Icon: Eraser, run: () => ch().unsetAllMarks().clearNodes().run() },
    ],
  ];
  const text = editor.getText();
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const ts = editor.getAttributes("textStyle");
  const color = ts.color || "#2F3328";
  const highlight = ts.backgroundColor || "#FFF3B0";
  const size = parseInt(ts.fontSize || "16", 10);
  const font = (ts.fontFamily || "Poppins").replace(/["']/g, "");
  const block = BLOCKS.find(t => editor.isActive(t));
  const spacing = block ? editor.getAttributes(block).lineHeight || "" : "";
  const style = editor.isActive("heading", { level: 2 }) ? "2" : editor.isActive("heading", { level: 3 }) ? "3" : editor.isActive("heading", { level: 4 }) ? "4" : "paragraph";
  const applyLink = () => {
    try { const url = new URL(linkUrl.trim()); if (!["http:", "https:", "mailto:"].includes(url.protocol)) throw new Error(); ch().extendMarkRange("link").setLink({ href: url.href }).run(); setLinkOpen(false); }
    catch { setLinkError("Enter a valid https://, http:// or mailto: link."); }
  };
  const btn = (t: Tool) => <button key={t.label} type="button" title={t.label} aria-label={t.label} aria-pressed={!!t.active} disabled={t.disabled} onMouseDown={e => e.preventDefault()} onClick={t.run}><t.Icon size={16} /></button>;
  const sep = <span className="tb-sep" aria-hidden />;

  return (
    <div className="event-description-editor">
      <div role="toolbar" aria-label="Description formatting" className="event-editor-toolbar">
        {btn({ label: "Undo (⌘Z)", Icon: Undo2, disabled: !editor.can().undo(), run: () => ch().undo().run() })}
        {btn({ label: "Redo (⌘⇧Z)", Icon: Redo2, disabled: !editor.can().redo(), run: () => ch().redo().run() })}
        {sep}
        <select aria-label="Text style" title="Text style (⌘⌥0–4)" value={style} onChange={e => e.target.value === "paragraph" ? ch().setParagraph().run() : ch().setHeading({ level: Number(e.target.value) as 2 | 3 | 4 }).run()}>
          <option value="paragraph">Normal text</option><option value="2">Heading 1</option><option value="3">Heading 2</option><option value="4">Heading 3</option>
        </select>
        {sep}
        <select aria-label="Font" title="Font" value={font} onChange={e => e.target.value === "Poppins" ? ch().unsetFontFamily().run() : ch().setFontFamily(e.target.value).run()} style={{ fontFamily: font, width: 150 }}>
          {FONTS.map(([v, l]) => <option key={v} value={v} style={{ fontFamily: v }}>{l}</option>)}
        </select>
        {sep}
        <span className="tb-size">
          {btn({ label: "Decrease font size (⌘⇧,)", Icon: Minus, disabled: size <= SIZES[0], run: () => stepSize(editor, -1) })}
          <select aria-label="Font size" title="Font size" value={SIZES.includes(size) ? String(size) : "16"} onChange={e => ch().setFontSize(`${e.target.value}px`).run()}>
            {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {btn({ label: "Increase font size (⌘⇧.)", Icon: Plus, disabled: size >= SIZES[SIZES.length - 1], run: () => stepSize(editor, 1) })}
        </span>
        {sep}
        {groups[0].map(btn)}
        <label className="tb-color" title="Text colour"><Baseline size={16} /><i style={{ background: color }} /><input type="color" aria-label="Text colour" value={color} onChange={e => ch().setColor(e.target.value).run()} /></label>
        <label className="tb-color" title="Highlight colour"><Highlighter size={16} /><i style={{ background: ts.backgroundColor || "transparent", outline: ts.backgroundColor ? "none" : "1px solid #D0D5DD" }} /><input type="color" aria-label="Highlight colour" value={highlight} onChange={e => ch().setBackgroundColor(e.target.value).run()} /></label>
        {groups.slice(1).map((g, i) => <span key={i} style={{ display: "contents" }}>{sep}{g.map(btn)}{i === 1 && <select aria-label="Line spacing" title="Line & paragraph spacing" value={spacing} onChange={e => ch().setLineSpacing(e.target.value || null).run()} style={{ width: 92, marginLeft: 2 }}>
          <option value="">Spacing</option>{SPACING.map(v => <option key={v} value={v}>{v === "1" ? "Single" : v === "2" ? "Double" : v}</option>)}
        </select>}</span>)}
      </div>
      {linkOpen && <div className="event-editor-link">
        <Link2 size={16} color="#0F332B" />
        <input autoFocus aria-label="Link URL" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); applyLink(); } if (e.key === "Escape") { setLinkOpen(false); editor.commands.focus(); } }} placeholder="Paste a link — https://… or mailto:…" />
        <button type="button" className="primary" onClick={applyLink}>Apply</button>
        <button type="button" onClick={() => setLinkOpen(false)}>Cancel</button>
        {linkError && <p role="alert">{linkError}</p>}
      </div>}
      <EditorContent editor={editor} />
      <div className="event-editor-footer">
        <span>Looks exactly like this on the event page · Shift+Enter for a line break</span>
        <span>{words} word{words === 1 ? "" : "s"} · ~{Math.max(1, Math.round(words / 200))} min read</span>
      </div>
    </div>
  );
}
