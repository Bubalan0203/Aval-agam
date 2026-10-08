"use client";
import { useEffect, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Code, Eraser, Italic, Link2, Link2Off, List, ListOrdered, Quote, Redo2, Strikethrough, Underline, Undo2, Palette, type LucideIcon } from "lucide-react";
import { descriptionHtml, sanitizeDescription, type DescriptionFormat } from "@/lib/event-content";

export function EventDescriptionEditor({ value, format = "html", onChange }: { value: string; format?: DescriptionFormat; onChange: (html: string) => void }) {
  const [linkUrl, setLinkUrl] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkError, setLinkError] = useState("");
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: { openOnClick: false, protocols: ["mailto"], HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" } } }), TextStyleKit, TextAlign.configure({ types: ["heading", "paragraph"] })],
    content: descriptionHtml(value, format),
    immediatelyRender: false,
    editorProps: { attributes: { class: "event-rich-text event-description-input", role: "textbox", "aria-label": "Event description", "aria-multiline": "true" } },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });
  useEditorState({ editor, selector: ({ editor }) => editor ? editor.state : null });

  useEffect(() => {
    if (editor && sanitizeDescription(editor.getHTML()) !== descriptionHtml(value, format)) editor.commands.setContent(descriptionHtml(value, format), { emitUpdate: false });
  }, [editor, value, format]);

  if (!editor) return <p style={{ padding: "16px" }}>Loading description editor…</p>;
  type Tool = { label: string; Icon: LucideIcon; active?: boolean; disabled?: boolean; run: () => void };
  const groups: Tool[][] = [
    [
      { label: "Bold (Cmd+B)", Icon: Bold, active: editor.isActive("bold"), run: () => editor.chain().focus().toggleBold().run() },
      { label: "Italic (Cmd+I)", Icon: Italic, active: editor.isActive("italic"), run: () => editor.chain().focus().toggleItalic().run() },
      { label: "Underline (Cmd+U)", Icon: Underline, active: editor.isActive("underline"), run: () => editor.chain().focus().toggleUnderline().run() },
      { label: "Strikethrough", Icon: Strikethrough, active: editor.isActive("strike"), run: () => editor.chain().focus().toggleStrike().run() },
    ],
    [
      { label: "Bulleted list", Icon: List, active: editor.isActive("bulletList"), run: () => editor.chain().focus().toggleBulletList().run() },
      { label: "Numbered list", Icon: ListOrdered, active: editor.isActive("orderedList"), run: () => editor.chain().focus().toggleOrderedList().run() },
      { label: "Quote", Icon: Quote, active: editor.isActive("blockquote"), run: () => editor.chain().focus().toggleBlockquote().run() },
      { label: "Code", Icon: Code, active: editor.isActive("code"), run: () => editor.chain().focus().toggleCode().run() },
    ],
    (["left", "center", "right", "justify"] as const).map(align => ({
      label: `Align ${align}`, Icon: { left: AlignLeft, center: AlignCenter, right: AlignRight, justify: AlignJustify }[align],
      active: editor.isActive({ textAlign: align }), run: () => editor.chain().focus().setTextAlign(align).run(),
    })),
    [
      { label: "Add link", Icon: Link2, active: editor.isActive("link"), run: () => { setLinkUrl(editor.getAttributes("link").href || ""); setLinkError(""); setLinkOpen(true); } },
      { label: "Remove link", Icon: Link2Off, disabled: !editor.isActive("link"), run: () => editor.chain().focus().extendMarkRange("link").unsetLink().run() },
      { label: "Clear formatting", Icon: Eraser, run: () => editor.chain().focus().unsetAllMarks().clearNodes().run() },
    ],
    [
      { label: "Undo (Cmd+Z)", Icon: Undo2, disabled: !editor.can().undo(), run: () => editor.chain().focus().undo().run() },
      { label: "Redo (Cmd+Shift+Z)", Icon: Redo2, disabled: !editor.can().redo(), run: () => editor.chain().focus().redo().run() },
    ],
  ];
  const text = editor.getText();
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const color = editor.getAttributes("textStyle").color || "#101828";
  const applyLink = () => {
    try { const url = new URL(linkUrl.trim()); if (!["http:", "https:", "mailto:"].includes(url.protocol)) throw new Error(); editor.chain().focus().extendMarkRange("link").setLink({ href: url.href }).run(); setLinkOpen(false); }
    catch { setLinkError("Enter a valid https://, http:// or mailto: link."); }
  };
  return (
    <div className="event-description-editor">
      <div role="toolbar" aria-label="Description formatting" className="event-editor-toolbar">
        <select aria-label="Text style" value={editor.isActive("heading", { level: 2 }) ? "2" : editor.isActive("heading", { level: 3 }) ? "3" : editor.isActive("heading", { level: 4 }) ? "4" : "paragraph"} onChange={(e) => e.target.value === "paragraph" ? editor.chain().focus().setParagraph().run() : editor.chain().focus().setHeading({ level: Number(e.target.value) as 2 | 3 | 4 }).run()}>
          <option value="paragraph">Normal text</option><option value="2">Heading 1</option><option value="3">Heading 2</option><option value="4">Heading 3</option>
        </select>
        <select aria-label="Font size" value={editor.getAttributes("textStyle").fontSize || "16px"} onChange={(e) => editor.chain().focus().setFontSize(e.target.value).run()}>{[12, 14, 16, 18, 20, 24, 28, 32].map((size) => <option key={size} value={`${size}px`}>{size}</option>)}</select>
        {groups.map((g, i) => (
          <span key={i} style={{ display: "contents" }}>
            <span className="tb-sep" aria-hidden />
            {g.map(t => <button key={t.label} type="button" title={t.label} aria-label={t.label} aria-pressed={!!t.active} disabled={t.disabled} onMouseDown={(e) => e.preventDefault()} onClick={t.run}><t.Icon size={16} /></button>)}
          </span>
        ))}
        <span className="tb-sep" aria-hidden />
        <label className="tb-color" title="Text colour"><Palette size={16} /><i style={{ background: color }} /><input type="color" aria-label="Text colour" value={color} onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} /></label>
      </div>
      {linkOpen && <div className="event-editor-link">
        <Link2 size={16} color="#0F332B" />
        <input autoFocus aria-label="Link URL" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); applyLink(); } if (e.key === "Escape") setLinkOpen(false); }} placeholder="Paste a link — https://… or mailto:…" />
        <button type="button" className="primary" onClick={applyLink}>Apply</button>
        <button type="button" onClick={() => setLinkOpen(false)}>Cancel</button>
        {linkError && <p role="alert">{linkError}</p>}
      </div>}
      <EditorContent editor={editor} />
      <div className="event-editor-footer">
        <span>Select text to format it · Shift+Enter for a line break</span>
        <span>{words} word{words === 1 ? "" : "s"} · ~{Math.max(1, Math.round(words / 200))} min read</span>
      </div>
    </div>
  );
}
