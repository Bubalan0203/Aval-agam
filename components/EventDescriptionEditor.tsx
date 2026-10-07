"use client";
import { useEffect, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
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
  const tools = [
    { label: "Bold", active: editor.isActive("bold"), run: () => editor.chain().focus().toggleBold().run() },
    { label: "Italic", active: editor.isActive("italic"), run: () => editor.chain().focus().toggleItalic().run() },
    { label: "Underline", active: editor.isActive("underline"), run: () => editor.chain().focus().toggleUnderline().run() },
    { label: "Strike", active: editor.isActive("strike"), run: () => editor.chain().focus().toggleStrike().run() },
    { label: "Bullets", active: editor.isActive("bulletList"), run: () => editor.chain().focus().toggleBulletList().run() },
    { label: "Numbered list", active: editor.isActive("orderedList"), run: () => editor.chain().focus().toggleOrderedList().run() },
    { label: "Quote", active: editor.isActive("blockquote"), run: () => editor.chain().focus().toggleBlockquote().run() },
    { label: "Code", active: editor.isActive("code"), run: () => editor.chain().focus().toggleCode().run() },
    { label: "Code block", active: editor.isActive("codeBlock"), run: () => editor.chain().focus().toggleCodeBlock().run() },
    { label: "Link", active: editor.isActive("link"), run: () => { setLinkUrl(editor.getAttributes("link").href || ""); setLinkError(""); setLinkOpen(true); } },
    { label: "Unlink", active: false, run: () => editor.chain().focus().extendMarkRange("link").unsetLink().run() },
    { label: "Undo", active: false, disabled: !editor.can().undo(), run: () => editor.chain().focus().undo().run() },
    { label: "Redo", active: false, disabled: !editor.can().redo(), run: () => editor.chain().focus().redo().run() },
    { label: "Clear formatting", active: false, run: () => editor.chain().focus().unsetAllMarks().clearNodes().run() },
  ];
  return (
    <div className="event-description-editor">
      <div role="toolbar" aria-label="Description formatting" className="event-editor-toolbar">
        <select aria-label="Text style" value={editor.isActive("heading", { level: 2 }) ? "2" : editor.isActive("heading", { level: 3 }) ? "3" : editor.isActive("heading", { level: 4 }) ? "4" : "paragraph"} onChange={(e) => e.target.value === "paragraph" ? editor.chain().focus().setParagraph().run() : editor.chain().focus().setHeading({ level: Number(e.target.value) as 2 | 3 | 4 }).run()}>
          <option value="paragraph">Paragraph</option><option value="2">Heading 1</option><option value="3">Heading 2</option><option value="4">Heading 3</option>
        </select>
        <select aria-label="Font family" value={editor.getAttributes("textStyle").fontFamily || "Poppins"} onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}>{["Poppins", "Arial", "Georgia", "monospace"].map((font) => <option key={font}>{font}</option>)}</select>
        <select aria-label="Font size" value={editor.getAttributes("textStyle").fontSize || "16px"} onChange={(e) => editor.chain().focus().setFontSize(e.target.value).run()}>{[12, 14, 16, 18, 20, 24, 28, 32, 36, 48].map((size) => <option key={size} value={`${size}px`}>{size}px</option>)}</select>
        {tools.map((tool) => <button key={tool.label} type="button" aria-pressed={tool.active} disabled={tool.disabled} onMouseDown={(e) => e.preventDefault()} onClick={tool.run}>{tool.label}</button>)}
        {(["left", "center", "right", "justify"] as const).map((align) => <button key={align} type="button" aria-label={`Align ${align}`} aria-pressed={editor.isActive({ textAlign: align })} onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().setTextAlign(align).run()}>{align}</button>)}
        <label>Color <input type="color" aria-label="Text color" value={editor.getAttributes("textStyle").color || "#2f3328"} onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} /></label>
      </div>
      {linkOpen && <div className="event-editor-link">
        <label>Link URL <input aria-label="Description link URL" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://… or mailto:…" /></label>
        <button type="button" onClick={() => {
          try { const url = new URL(linkUrl.trim()); if (!["http:", "https:", "mailto:"].includes(url.protocol)) throw new Error(); editor.chain().focus().extendMarkRange("link").setLink({ href: url.href }).run(); setLinkOpen(false); }
          catch { setLinkError("Enter a valid https://, http:// or mailto: link."); }
        }}>Apply link</button>
        <button type="button" onClick={() => setLinkOpen(false)}>Cancel</button>
        {linkError && <p role="alert">{linkError}</p>}
      </div>}
      <EditorContent editor={editor} />
      <p style={{ padding: "8px 12px", fontSize: "12px", color: "#666" }}>Select text to format it or add a link. Use Enter for a paragraph and Shift+Enter for a line break.</p>
    </div>
  );
}
