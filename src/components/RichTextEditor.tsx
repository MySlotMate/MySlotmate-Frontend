"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useEditor,
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { Mark, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { ListItem } from "@tiptap/extension-list-item";
import Link from "@tiptap/extension-link";
import { Underline } from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";

/**
 * React NodeView that wraps an inline image with a bottom-right drag handle.
 * Dragging the handle resizes the image (width as a percentage of the editor
 * column so it stays responsive on small screens).
 */
function ResizableImageNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef<{
    startX: number;
    startWidthPct: number;
    parentWidth: number;
  } | null>(null);

  const src = node.attrs.src as string;
  const alt = (node.attrs.alt as string) ?? "";
  const widthAttr = (node.attrs.width as string | null) ?? null;

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const parent = wrapper.parentElement;
    if (!parent) return;
    const parentWidth = parent.getBoundingClientRect().width;
    const currentWidth = wrapper.getBoundingClientRect().width;
    const startWidthPct = (currentWidth / parentWidth) * 100;

    dragging.current = { startX: e.clientX, startWidthPct, parentWidth };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const onMouseMove = (e: MouseEvent) => {
    const d = dragging.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dxPct = (dx / d.parentWidth) * 100;
    const next = Math.max(10, Math.min(100, d.startWidthPct + dxPct));
    updateAttributes({ width: `${Math.round(next)}%` });
  };

  const onMouseUp = () => {
    dragging.current = null;
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  };

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      as="div"
      className="rt-image-wrapper"
      data-selected={selected ? "true" : undefined}
      style={{ width: widthAttr ?? undefined }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="rt-image rounded-lg" draggable={false} />
      {selected && (
        <span
          role="slider"
          aria-label="Resize image"
          aria-valuenow={0}
          aria-valuemin={0}
          aria-valuemax={100}
          onMouseDown={onMouseDown}
          className="rt-image-handle"
        />
      )}
    </NodeViewWrapper>
  );
}

// Image extension with a `width` attribute and a custom React node view so the
// host can drag the bottom-right handle to resize. The width is stored as a
// percent string in inline style so it survives serialization to HTML.
const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => {
          const style = el.getAttribute("style") ?? "";
          const m = /width:\s*([^;]+)/i.exec(style);
          return m ? m[1]!.trim() : el.getAttribute("width");
        },
        renderHTML: (attrs: { width?: string | null }) =>
          attrs.width ? { style: `width: ${attrs.width}` } : {},
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageNodeView);
  },
});

// Allow headings (and any other block) inside list items so toggling a heading
// on a bullet/numbered item keeps the marker instead of promoting the content
// out of the list.
const RichListItem = ListItem.extend({ content: "block+" });

/**
 * HeadingStyle — an inline mark that styles only the selected text
 * (not the whole block). Renders as <span class="rt-h1|rt-h2|rt-h3">.
 *
 * Block-level <h1>/<h2>/<h3> tags by spec wrap a full line; this mark lets the
 * host highlight a single word at heading size without affecting the rest of
 * the line.
 */
type HeadingLevel = 1 | 2 | 3;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    headingStyle: {
      toggleHeadingStyle: (level: HeadingLevel) => ReturnType;
      unsetHeadingStyle: () => ReturnType;
    };
  }
}

const HeadingStyle = Mark.create({
  name: "headingStyle",
  inclusive: false,
  addAttributes() {
    return {
      level: {
        default: 1,
        parseHTML: (el) => {
          const cls = el.getAttribute("class") ?? "";
          if (cls.includes("rt-h1")) return 1;
          if (cls.includes("rt-h2")) return 2;
          if (cls.includes("rt-h3")) return 3;
          return 1;
        },
        renderHTML: (attrs) => ({
          class: `rt-h${attrs.level as number}`,
        }),
      },
    };
  },
  parseHTML() {
    return [
      { tag: "span.rt-h1" },
      { tag: "span.rt-h2" },
      { tag: "span.rt-h3" },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },
  addCommands() {
    return {
      toggleHeadingStyle:
        (level: HeadingLevel) =>
        ({ commands, editor }) => {
          // If the same level is already active, clear it; otherwise replace.
          if (editor.isActive("headingStyle", { level })) {
            return commands.unsetMark("headingStyle");
          }
          return commands.setMark("headingStyle", { level });
        },
      unsetHeadingStyle:
        () =>
        ({ commands }) =>
          commands.unsetMark("headingStyle"),
    };
  },
});
import {
  FiBold,
  FiItalic,
  FiUnderline,
  FiLink,
  FiList,
  FiX,
  FiImage,
} from "react-icons/fi";
import { LuListOrdered, LuHeading1, LuHeading2, LuHeading3 } from "react-icons/lu";

export interface RichTextEditorProps {
  /** HTML content. Empty string when the editor is blank. */
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Caps the plain-text length; useful for matching existing maxLength inputs. */
  maxLength?: number;
  /** Show a red border (for validation states). */
  error?: boolean;
  /** Tailwind classes for the outer wrapper. */
  className?: string;
  /** Disable interaction (e.g. while submitting). */
  disabled?: boolean;
  /** Called with the plain-text length on every change. */
  onLengthChange?: (length: number) => void;
  /**
   * When provided, an "image" button appears in the toolbar. The callback is
   * responsible for picking + uploading the image and returning its public URL
   * (or null on cancel). The editor then inserts it inline.
   *
   * Intentionally opt-in so non-blog forms don't expose image insertion.
   */
  onRequestImage?: () => Promise<string | null>;
}

/**
 * Reusable rich text editor built on TipTap.
 *
 * Outputs HTML via `onChange`. When the editor is empty it emits the empty
 * string (not `<p></p>`), so form validation like `!value.trim()` keeps working.
 *
 * Supports: headings (H1-H3), bold, italic, underline, bullet / ordered lists,
 * links, and text color. No image support (per design requirements).
 */
const TEXT_COLORS = [
  { label: "Default", value: "" },
  { label: "Slate", value: "#16304c" },
  { label: "Blue", value: "#0e8ae0" },
  { label: "Emerald", value: "#059669" },
  { label: "Amber", value: "#d97706" },
  { label: "Red", value: "#dc2626" },
  { label: "Purple", value: "#7c3aed" },
];

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  maxLength,
  error,
  className = "",
  disabled,
  onLengthChange,
  onRequestImage,
}: RichTextEditorProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // Disable StarterKit's default list-item so we can substitute the
        // schema-extended version below.
        listItem: false,
        // We bring our own Link extension so it can be configured (target, rel).
        link: false,
      }),
      RichListItem,
      HeadingStyle,
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer nofollow",
          class: "text-[#0e8ae0] underline",
        },
      }),
      TextStyle,
      Color,
      Placeholder.configure({
        placeholder: placeholder ?? "Write something…",
      }),
      ...(onRequestImage
        ? [
            ResizableImage.configure({
              inline: false,
              allowBase64: false,
              HTMLAttributes: {
                class: "rt-image rounded-lg",
              },
            }),
          ]
        : []),
    ],
    content: value,
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        // Scoped rich-text styles defined in globals.css.
        class: "rich-text-content min-h-[140px] px-4 py-3 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.isEmpty ? "" : editor.getHTML();
      const textLen = editor.getText().length;

      // Enforce maxLength on plain-text length without re-rendering.
      if (maxLength && textLen > maxLength) {
        // Roll back to the previous content silently.
        // (rare path; mostly hit on paste of large blocks)
        editor.commands.setContent(value || "", { emitUpdate: false });
        return;
      }

      onChange(html);
      onLengthChange?.(textLen);
    },
  });

  // Keep the editor in sync when the form is reset / loaded from API.
  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? "" : editor.getHTML();
    if (current !== value) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  const setColor = useCallback(
    (color: string) => {
      if (!editor) return;
      if (color === "") {
        editor.chain().focus().unsetColor().run();
      } else {
        editor.chain().focus().setColor(color).run();
      }
      setShowColorPicker(false);
    },
    [editor],
  );

  const applyLink = useCallback(() => {
    if (!editor) return;
    const url = linkUrl.trim();
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: normalized })
        .run();
    }
    setShowLinkInput(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  if (!editor) {
    return (
      <div
        className={`min-h-[180px] rounded-lg border border-gray-200 bg-gray-50 ${className}`}
      />
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-lg border transition focus-within:ring-2 focus-within:ring-[#0094CA] ${
        error ? "border-red-500 bg-red-50" : "border-gray-200 bg-white"
      } ${disabled ? "opacity-60" : ""} ${className}`}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-100 bg-gray-50 px-2 py-1.5">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeadingStyle(1).run()}
          active={editor.isActive("headingStyle", { level: 1 })}
          label="Heading 1 (selection)"
        >
          <LuHeading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeadingStyle(2).run()}
          active={editor.isActive("headingStyle", { level: 2 })}
          label="Heading 2 (selection)"
        >
          <LuHeading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeadingStyle(3).run()}
          active={editor.isActive("headingStyle", { level: 3 })}
          label="Heading 3 (selection)"
        >
          <LuHeading3 className="h-4 w-4" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          label="Bold"
        >
          <FiBold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          label="Italic"
        >
          <FiItalic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          label="Underline"
        >
          <FiUnderline className="h-4 w-4" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          label="Bullet list"
        >
          <FiList className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          label="Numbered list"
        >
          <LuListOrdered className="h-4 w-4" />
        </ToolbarButton>

        <Divider />

        <div className="relative">
          <ToolbarButton
            onClick={() => {
              const existing = editor.getAttributes("link").href as
                | string
                | undefined;
              setLinkUrl(existing ?? "");
              setShowLinkInput((v) => !v);
              setShowColorPicker(false);
            }}
            active={editor.isActive("link")}
            label="Link"
          >
            <FiLink className="h-4 w-4" />
          </ToolbarButton>
          {showLinkInput && (
            <div className="absolute top-9 left-0 z-20 flex w-72 items-center gap-1 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
              <input
                type="text"
                autoFocus
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyLink()}
                placeholder="https://example.com"
                className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-[#0094CA]"
              />
              <button
                type="button"
                onClick={applyLink}
                className="rounded-md bg-[#0094CA] px-2 py-1 text-xs font-semibold text-white hover:bg-[#007ba8]"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLinkInput(false);
                  setLinkUrl("");
                }}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
              >
                <FiX className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {onRequestImage && (
          <ToolbarButton
            onClick={async () => {
              setShowLinkInput(false);
              setShowColorPicker(false);
              try {
                const url = await onRequestImage();
                if (url) {
                  editor.chain().focus().setImage({ src: url }).run();
                }
              } catch {
                /* swallow — caller already toasted */
              }
            }}
            label="Insert image"
          >
            <FiImage className="h-4 w-4" />
          </ToolbarButton>
        )}

        <div className="relative">
          <ToolbarButton
            onClick={() => {
              setShowColorPicker((v) => !v);
              setShowLinkInput(false);
            }}
            active={showColorPicker}
            label="Text color"
          >
            <span
              className="h-4 w-4 rounded-sm border border-gray-300"
              style={{
                backgroundColor:
                  (editor.getAttributes("textStyle").color as string) ??
                  "#16304c",
              }}
            />
          </ToolbarButton>
          {showColorPicker && (
            <div className="absolute top-9 left-0 z-20 flex flex-nowrap items-center gap-1 rounded-lg border border-gray-200 bg-white p-1.5 shadow-lg">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => setColor(c.value)}
                  title={c.label}
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-gray-200 transition hover:scale-125"
                  style={{
                    backgroundColor: c.value || "transparent",
                  }}
                >
                  {!c.value && (
                    <FiX className="h-2.5 w-2.5 text-gray-400" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor body */}
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-7 w-7 items-center justify-center rounded-md transition ${
        active
          ? "bg-[#0094CA]/10 text-[#0094CA]"
          : "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-gray-200" />;
}

/**
 * Render saved rich-text HTML safely.
 *
 * Use this anywhere user-authored description HTML needs to be displayed.
 * Sanitizes via DOMPurify so no script/iframe/event-handler injections survive.
 */
export function RichTextView({
  html,
  className = "",
}: {
  html: string;
  className?: string;
}) {
  const [clean, setClean] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    // Lazy-load DOMPurify so server bundles stay slim.
    void (async () => {
      const mod = (await import("isomorphic-dompurify")).default;
      const sanitized = mod.sanitize(html ?? "", {
        ALLOWED_TAGS: [
          "p",
          "br",
          "strong",
          "em",
          "u",
          "h1",
          "h2",
          "h3",
          "ul",
          "ol",
          "li",
          "a",
          "span",
          "img",
          "figure",
          "figcaption",
        ],
        ALLOWED_ATTR: [
          "href",
          "target",
          "rel",
          "style",
          "class",
          "src",
          "alt",
          "title",
          "width",
          "height",
          "loading",
        ],
      });
      if (!cancelled) setClean(sanitized);
    })();
    return () => {
      cancelled = true;
    };
  }, [html]);

  return (
    <div
      className={`rich-text-content ${className}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
