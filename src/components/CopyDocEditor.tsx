"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { HardBreak } from "@tiptap/extension-hard-break";

import type { CopyDocLink } from "@/lib/copyDoc";

export interface CopyDocEditorValue {
  html: string;
}

export interface CopyDocEditorChange {
  html: string;
  text: string;
  links: CopyDocLink[];
}

interface CopyDocEditorProps {
  value: CopyDocEditorValue;
  onChange: (value: CopyDocEditorChange) => void;
  disabled?: boolean;
}

function extractLinks(html: string): CopyDocLink[] {
  const links: CopyDocLink[] = [];
  if (typeof window === "undefined") {
    return links;
  }
  const container = document.createElement("div");
  container.innerHTML = html;
  container.querySelectorAll("a").forEach((anchor) => {
    const href = anchor.getAttribute("href")?.trim();
    if (!href) {
      return;
    }
    const label = anchor.textContent?.trim() ?? "";
    links.push({ href, label });
  });
  return links;
}

function buildExtensions() {
  return [
    StarterKit.configure({
      heading: false,
      paragraph: {
        HTMLAttributes: {
          class: "my-2",
        },
      },
    }),
    HardBreak,
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      HTMLAttributes: {
        rel: "noopener noreferrer",
        target: "_blank",
        class: "text-blue-600 underline hover:text-blue-800",
      },
    }),
    Placeholder.configure({
      placeholder: "Paste or type the approved copy, including CTA links.\n\nTips:\n• Use Shift+Enter for single line breaks\n• Press Enter for new paragraphs\n• Select text and click 'Add link' for CTA links",
    }),
  ];
}

export function CopyDocEditor({ value, onChange, disabled = false }: CopyDocEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [extensions] = useState(() => buildExtensions());
  const lastPropHtml = useRef(value.html);
  const applyLinkRef = useRef<(() => void) | null>(null);

  const editor = useEditor(
    {
      extensions,
      content: value.html || "<p></p>",
      editable: !disabled,
      immediatelyRender: false,
      editorProps: {
        handleKeyDown: (view, event) => {
          // Handle Ctrl+K for link shortcut
          if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
            event.preventDefault();
            applyLinkRef.current?.();
            return true;
          }
          return false;
        },
        handlePaste: (view, event) => {
          // Let TipTap handle paste events by default
          // Only intercept if we need special handling
          return false;
        },
      },
      onUpdate({ editor: instance }) {
        const html = instance.getHTML();
        const text = instance.getText();
        const links = extractLinks(html);
        onChangeRef.current({ html, text, links });
      },
    },
    [extensions, disabled],
  );

  useEffect(() => {
    if (!editor) {
      return;
    }
    if (disabled !== editor.isEditable) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  useEffect(() => {
    if (!editor) {
      return;
    }
    if (value.html === lastPropHtml.current) {
      return;
    }
    lastPropHtml.current = value.html;
    editor.commands.setContent(value.html || "<p></p>");
  }, [editor, value.html]);

  const applyLink = useCallback(() => {
    if (!editor) {
      return;
    }

    const previous = editor.getAttributes("link").href as string | undefined;

    // Create a simple prompt dialog
    const url = window.prompt(
      previous ? "Edit link URL:" : "Enter link URL:",
      previous ?? "https://"
    );

    if (url === null) {
      return; // User cancelled
    }

    if (url.trim() === "") {
      // Remove link if empty URL
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    // Set the link
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }, [editor]);

  const removeLink = useCallback(() => {
    if (!editor) {
      return;
    }
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
  }, [editor]);

  // Update the ref when editor changes
  useEffect(() => {
    applyLinkRef.current = applyLink;
  }, [applyLink]);

  const hasSelectionLink = editor?.isActive("link") ?? false;

  const controls = useMemo(() => {
    if (!editor) {
      return null;
    }
    return (
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2 text-xs">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`rounded border px-2 py-1 font-semibold ${editor.isActive("bold") ? "border-indigo-500 bg-indigo-50 text-indigo-600" : "border-slate-300 text-slate-600"}`}
        >
          Bold
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`rounded border px-2 py-1 font-semibold ${editor.isActive("italic") ? "border-indigo-500 bg-indigo-50 text-indigo-600" : "border-slate-300 text-slate-600"}`}
        >
          Italic
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setHardBreak().run()}
          className="rounded border px-2 py-1 font-semibold border-slate-300 text-slate-600 hover:bg-slate-100"
        >
          Line Break
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`rounded border px-2 py-1 font-semibold ${editor.isActive("bulletList") ? "border-indigo-500 bg-indigo-50 text-indigo-600" : "border-slate-300 text-slate-600"}`}
        >
          Bullets
        </button>
        <div className="ml-auto flex items-center gap-1 border-l pl-2">
          <button
            type="button"
            onClick={applyLink}
            className={`rounded px-2 py-1 text-xs font-semibold transition ${
              hasSelectionLink
                ? "border border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100"
                : "border border-slate-300 text-slate-600 hover:bg-slate-100"
            }`}
            title="Add link (Ctrl+K)"
          >
            🔗 {hasSelectionLink ? "Edit" : "Add"} link
          </button>
          {hasSelectionLink ? (
            <button
              type="button"
              onClick={removeLink}
              className="rounded border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
              title="Remove link"
            >
              ✕ Remove
            </button>
          ) : null}
        </div>
      </div>
    );
  }, [editor, applyLink, removeLink, hasSelectionLink]);

  return (
    <div className={`flex min-h-[300px] flex-col rounded-md border ${disabled ? "bg-slate-100" : "bg-white"} border-slate-300 shadow-sm`}>
      {controls}
      <div className="flex-1 overflow-y-auto px-4 py-3 text-sm">
        <EditorContent
          editor={editor}
          className="
            prose prose-sm max-w-none text-slate-800
            [&_.ProseMirror]:min-h-[250px]
            [&_.ProseMirror]:outline-none
            [&_.ProseMirror]:focus:outline-none
            [&_.ProseMirror_p]:my-2
            [&_.ProseMirror_p]:text-slate-800
            [&_.ProseMirror_p]:leading-relaxed
            [&_.ProseMirror_br]:my-1
            [&_a]:text-blue-600
            [&_a]:underline
            [&_a]:hover:text-blue-800
          "
        />
      </div>
    </div>
  );
}
