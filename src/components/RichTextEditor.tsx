"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link2,
  Table as TableIcon,
  Undo2,
  Redo2,
} from "lucide-react";
import { useEffect } from "react";

type Props = {
  initialHtml: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

const ALLOWED_LINK_PROTOCOL = /^(https?:\/\/|mailto:)/i;

export default function RichTextEditor({ initialHtml, onChange, placeholder }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // H1 is the section divider used by the docx parser; never inside section content.
        heading: { levels: [2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: "_blank", rel: "noopener" },
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initialHtml || "",
    editorProps: {
      transformPastedHTML(html) {
        // Downgrade any pasted H1 to H2.
        return html.replace(/<h1\b/gi, "<h2").replace(/<\/h1>/gi, "</h2>");
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Keep editor in sync if initialHtml changes from outside (e.g. after upload-parse).
  useEffect(() => {
    if (editor && initialHtml !== editor.getHTML()) {
      editor.commands.setContent(initialHtml || "", false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialHtml]);

  if (!editor) {
    return (
      <div className="border border-gray-200 rounded-md min-h-[400px] flex items-center justify-center text-gray-400 text-sm">
        Loading editor…
      </div>
    );
  }

  function btn(active: boolean, onClick: () => void, label: string, icon: React.ReactNode) {
    return (
      <button
        type="button"
        title={label}
        aria-label={label}
        onClick={onClick}
        className={`w-8 h-8 inline-flex items-center justify-center rounded text-sm font-medium ${
          active
            ? "bg-otm-light text-otm-navy"
            : "bg-white text-otm-gray hover:bg-gray-50"
        }`}
      >
        {icon}
      </button>
    );
  }

  return (
    <div className="border border-gray-200 rounded-md overflow-hidden">
      <div className="flex items-center gap-1 px-2 h-10 border-b border-gray-200 bg-gray-50">
        {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "Bold", <Bold size={14} />)}
        {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), "Italic", <Italic size={14} />)}
        {btn(editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run(), "Underline", <UnderlineIcon size={14} />)}
        <span className="w-px h-5 bg-gray-200 mx-1" />
        {btn(
          editor.isActive("heading", { level: 2 }),
          () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
          "Heading 2",
          <span className="text-[11px] font-bold">H2</span>
        )}
        {btn(
          editor.isActive("heading", { level: 3 }),
          () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
          "Heading 3",
          <span className="text-[11px] font-bold">H3</span>
        )}
        <span className="w-px h-5 bg-gray-200 mx-1" />
        {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), "Bullet list", <List size={14} />)}
        {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), "Numbered list", <ListOrdered size={14} />)}
        <span className="w-px h-5 bg-gray-200 mx-1" />
        {btn(
          editor.isActive("link"),
          () => {
            const prev = editor.getAttributes("link").href as string | undefined;
            const url = window.prompt("Link URL", prev || "https://");
            if (url === null) return;
            if (url === "") {
              editor.chain().focus().unsetLink().run();
              return;
            }
            if (!ALLOWED_LINK_PROTOCOL.test(url)) {
              window.alert("Link must start with http://, https://, or mailto:");
              return;
            }
            editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          },
          "Insert link",
          <Link2 size={14} />
        )}
        {btn(
          false,
          () =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
          "Insert table",
          <TableIcon size={14} />
        )}
        <span className="w-px h-5 bg-gray-200 mx-1" />
        {btn(false, () => editor.chain().focus().undo().run(), "Undo", <Undo2 size={14} />)}
        {btn(false, () => editor.chain().focus().redo().run(), "Redo", <Redo2 size={14} />)}
      </div>
      <EditorContent
        editor={editor}
        className="prose-otm min-h-[400px] max-h-[700px] overflow-y-auto px-6 py-4"
        data-placeholder={placeholder}
      />
    </div>
  );
}
