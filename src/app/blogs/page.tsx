"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  FiClock,
  FiEdit2,
  FiImage,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUpload,
  FiX,
  FiArrowUp,
  FiArrowDown,
  FiList,
} from "react-icons/fi";
import { LuArrowRight, LuCalendar, LuLoader2, LuUser } from "react-icons/lu";
import { toast } from "sonner";
import Breadcrumb from "~/components/Breadcrumb";
import * as components from "~/components";
import {
  useBlog,
  useCreateBlog,
  useDeleteBlog,
  useListBlogs,
  usePublishBlog,
  useUploadBlogCover,
  useUpdateBlog,
  useUploadFiles,
} from "~/hooks/useApi";
import type { BlogCreatePayload, BlogDTO } from "~/lib/api";
import { getStoredUserId, setStoredUserId } from "~/lib/auth-storage";
import { auth } from "~/utils/firebase";
import { env } from "~/env";

// Block types for rich content editor
type TextBlock = { id: string; type: "text"; content: string };
type ImageBlock = { id: string; type: "image"; url: string; caption: string };
type BlogBlock = TextBlock | ImageBlock;

type BlogFormState = {
  category: string;
  blocks: BlogBlock[];
  cover_image_url: string;
  coverImageFile: File | null;
  description: string;
  read_time_minutes: string;
  title: string;
};

const DEFAULT_FORM_STATE: BlogFormState = {
  category: "",
  blocks: [{ id: "1", type: "text", content: "" }],
  cover_image_url: "",
  coverImageFile: null,
  description: "",
  read_time_minutes: "5",
  title: "",
};

const FALLBACK_BLOG_IMAGE = "/assets/home/hiking.jpg";

// Helper functions for block management
function generateBlockId() {
  return Math.random().toString(36).substring(2, 11);
}

function blocksToContent(blocks: BlogBlock[]): string {
  return JSON.stringify(blocks);
}

function contentToBlocks(content: string | null | undefined): BlogBlock[] {
  if (!content?.trim()) return [{ id: generateBlockId(), type: "text", content: "" }];
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return parsed;
    }
  } catch {
    // If not JSON, treat as legacy plain text content
  }
  
  return [{ id: generateBlockId(), type: "text", content: content || "" }];
}

function formatBlogDate(dateString: string | null | undefined) {
  if (!dateString) return "Draft";

  return new Date(dateString).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getBlogValue(value: string | null | undefined, fallback = "") {
  return value?.trim() ?? fallback;
}

function isLikelyNetworkError(message: string) {
  const normalized = message.trim().toLowerCase();
  return (
    normalized.includes("network") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("load failed") ||
    normalized.includes("timeout") ||
    normalized.includes("socket") ||
    normalized === "error"
  );
}

function textBlockToSections(content: string) {
  return content
    .split(/\n\s*\n/g)
    .map((section) => section.trim())
    .filter(Boolean);
}

// Extract table of contents from blocks
type TOCItem = { id: string; level: number; text: string };

function extractTableOfContents(blocks: BlogBlock[]): TOCItem[] {
  const items: TOCItem[] = [];
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;

  blocks.forEach((block) => {
    if (block.type === "text") {
      let match;
      while ((match = headingRegex.exec(block.content)) !== null) {
        const level = (match[1] ?? "").length;
        const text = (match[2] ?? "").trim();
        if (level > 0 && text) {
          const id = `heading-${items.length}`;
          items.push({ id, level, text });
        }
      }
    }
  });

  return items;
}



function getBlogExcerpt(blog: BlogDTO) {
  const source = getBlogValue(blog.description) || getBlogValue(blog.content);
  if (source.length <= 140) return source;
  return `${source.slice(0, 137).trim()}...`;
}

function getCategoryColor(category: string | null | undefined) {
  const colors: Record<string, string> = {
    adventure: "bg-green-100 text-green-800",
    community: "bg-pink-100 text-pink-800",
    culinary: "bg-orange-100 text-orange-800",
    hosting: "bg-blue-100 text-blue-800",
    safety: "bg-red-100 text-red-800",
    wellness: "bg-emerald-100 text-emerald-800",
  };

  return colors[getBlogValue(category).toLowerCase()] ?? "bg-slate-100 text-slate-700";
}

function mapBlogToFormState(blog: BlogDTO): BlogFormState {
  return {
    category: getBlogValue(blog.category),
    blocks: contentToBlocks(blog.content),
    cover_image_url: blog.cover_image_url ?? "",
    coverImageFile: null,
    description: getBlogValue(blog.description),
    read_time_minutes: String(blog.read_time_minutes ?? 5),
    title: getBlogValue(blog.title),
  };
}

function BlockRenderer({ blocks, showHeadings = false }: { blocks: BlogBlock[]; showHeadings?: boolean }) {
  const headingSizes: Record<number, string> = {
    1: "text-3xl font-bold tracking-[-0.04em] text-[#16304c] sm:text-4xl",
    2: "text-2xl font-bold tracking-[-0.03em] text-[#16304c] sm:text-[2rem]",
    3: "text-xl font-bold text-[#1d3f60] sm:text-2xl",
    4: "text-lg font-bold text-[#1d3f60]",
    5: "text-base font-bold text-[#1d3f60]",
    6: "text-sm font-bold uppercase tracking-[0.08em] text-[#4a6a86]",
  };

  const headingTags = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;
  let headingCounter = 0;

  return (
    <div className="space-y-10">
      {blocks.map((block) => {
        if (block.type === "text") {
          const sections = textBlockToSections(block.content);
          return (
            <div key={block.id} className="space-y-6">
              {sections.map((section, sectionIndex) => {
                const normalizedLines = section
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean);
                const normalizedText = normalizedLines.join(" ");
                const headingRegex = /^(#{1,6})\s+(.+)$/;
                const headingMatch =
                  normalizedLines.length === 1
                    ? headingRegex.exec(normalizedLines[0] ?? "")
                    : null;

                if (headingMatch && showHeadings) {
                  const level = (headingMatch[1] ?? "").length;
                  const text = (headingMatch[2] ?? "").trim();
                  if (level >= 1 && level <= 6 && text) {
                    const headingId = `heading-${headingCounter++}`;
                    const HeadingTag = headingTags[level - 1]!;
                    const sizeClass = headingSizes[level] ?? headingSizes[1];

                    return React.createElement(
                      HeadingTag,
                      {
                        key: `${block.id}-${sectionIndex}`,
                        id: headingId,
                        className: `${sizeClass} scroll-mt-20`,
                      },
                      text
                    );
                  }
                }

                return normalizedText ? (
                  <p
                    key={`${block.id}-${sectionIndex}`}
                    className="text-[17px] leading-8 text-[#29465f] sm:text-[18px]"
                  >
                    {normalizedText}
                  </p>
                ) : null;
              })}
            </div>
          );
        } else {
          return (
            <figure key={block.id} className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={block.url}
                alt={block.caption || "Blog image"}
                className="w-full rounded-[28px] object-cover shadow-[0_24px_50px_rgba(26,77,116,0.16)]"
              />
              {block.caption && (
                <figcaption className="text-center text-sm leading-6 text-[#6f8daa] italic">
                  {block.caption}
                </figcaption>
              )}
            </figure>
          );
        }
      })}
    </div>
  );
}

function BlockEditor({
  blocks,
  onBlocksChange,
}: {
  blocks: BlogBlock[];
  onBlocksChange: (blocks: BlogBlock[]) => void;
}) {
  const blockImageInputRef = useRef<HTMLInputElement>(null);
  const [imageInsertIndex, setImageInsertIndex] = useState<number | null>(null);
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);
  const uploadFiles = useUploadFiles();

  const handleTextChange = (blockId: string, content: string) => {
    const updated = blocks.map((block) =>
      block.id === blockId && block.type === "text"
        ? { ...block, content }
        : block
    );
    onBlocksChange(updated);
  };

  const handleBlockDelete = (blockId: string) => {
    if (blocks.length === 1) {
      toast.error("You must have at least one block.");
      return;
    }
    const updated = blocks.filter((block) => block.id !== blockId);
    onBlocksChange(updated);
  };

  const handleMoveBlock = (blockId: string, direction: "up" | "down") => {
    const index = blocks.findIndex((b) => b.id === blockId);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === blocks.length - 1)
    ) {
      return;
    }

    const newBlocks = [...blocks];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    const temp = newBlocks[index]!;
    newBlocks[index] = newBlocks[swapIndex]!;
    newBlocks[swapIndex] = temp;
    onBlocksChange(newBlocks);
  };

  const handleAddTextBlock = (afterBlockId: string) => {
    const index = blocks.findIndex((b) => b.id === afterBlockId);
    if (index === -1) return; // Block not found
    
    const newBlock: TextBlock = {
      id: generateBlockId(),
      type: "text",
      content: "",
    };
    const updated = [...blocks.slice(0, index + 1), newBlock, ...blocks.slice(index + 1)];
    onBlocksChange(updated);
  };

  const handleImageSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || imageInsertIndex === null) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10 MB.");
      return;
    }

    const blockId = generateBlockId();
    setUploadingImageId(blockId);

    try {
      // Upload to S3
      const uploadRes = await uploadFiles.mutateAsync({
        files: [file],
        folder: "blogs/covers",
      });

      const imageUrl = uploadRes.data[0]?.url;
      if (!imageUrl) {
        toast.error("Image upload failed - no URL returned");
        setUploadingImageId(null);
        return;
      }

      const newBlock: ImageBlock = {
        id: blockId,
        type: "image",
        url: imageUrl,
        caption: "",
      };

      const updated = [
        ...blocks.slice(0, imageInsertIndex + 1),
        newBlock,
        ...blocks.slice(imageInsertIndex + 1),
      ];
      onBlocksChange(updated);
      setImageInsertIndex(null);
      toast.success("Image uploaded successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Image upload failed";
      toast.error(message);
    } finally {
      setUploadingImageId(null);
      if (event.target) event.target.value = "";
    }
  };

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => (
        <div key={block.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          {block.type === "text" ? (
            <div className="space-y-3">
              <textarea
                value={block.content}
                onChange={(e) => handleTextChange(block.id, e.target.value)}
                placeholder="Write your content here (supports line breaks)..."
                rows={6}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal outline-none focus:border-[#0094CA] focus:ring-2 focus:ring-[#0094CA]/20"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleAddTextBlock(block.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                >
                  <FiPlus className="h-4 w-4" />
                  Add Text
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImageInsertIndex(index);
                    blockImageInputRef.current?.click();
                  }}
                  disabled={uploadingImageId !== null}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#cceeff] bg-[#f0faff] px-3 py-2 text-sm font-medium text-[#0094CA] transition hover:bg-[#e6f6ff] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingImageId === null ? (
                    <>
                      <FiImage className="h-4 w-4" />
                      Add Image
                    </>
                  ) : (
                    <>
                      <LuLoader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveBlock(block.id, "up")}
                  disabled={index === 0}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
                >
                  <FiArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveBlock(block.id, "down")}
                  disabled={index === blocks.length - 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
                >
                  <FiArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleBlockDelete(block.id)}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={block.url}
                  alt="Block preview"
                  className="mb-3 max-h-64 w-full rounded object-cover"
                />
                <input
                  type="text"
                  value={block.caption}
                  onChange={(e) => {
                    const updated = blocks.map((b) =>
                      b.id === block.id && b.type === "image"
                        ? { ...b, caption: e.target.value }
                        : b
                    );
                    onBlocksChange(updated);
                  }}
                  placeholder="Image caption (optional)"
                  className="w-full rounded border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#0094CA] focus:ring-2 focus:ring-[#0094CA]/20"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleAddTextBlock(block.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                >
                  <FiPlus className="h-4 w-4" />
                  Add Text
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImageInsertIndex(index);
                    blockImageInputRef.current?.click();
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#cceeff] bg-[#f0faff] px-3 py-2 text-sm font-medium text-[#0094CA] transition hover:bg-[#e6f6ff]"
                >
                  <FiImage className="h-4 w-4" />
                  Add Image
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveBlock(block.id, "up")}
                  disabled={index === 0}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
                >
                  <FiArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveBlock(block.id, "down")}
                  disabled={index === blocks.length - 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
                >
                  <FiArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleBlockDelete(block.id)}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      <input
        ref={blockImageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelection}
        className="hidden"
      />
    </div>
  );
}

function BlogLoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
        >
          <div className="h-52 animate-pulse bg-gray-200" />
          <div className="space-y-3 p-5">
            <div className="h-4 w-24 animate-pulse rounded-full bg-gray-200" />
            <div className="h-6 w-5/6 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

function BlogCard({
  blog,
  isAdmin,
  onDelete,
  onEdit,
  onOpen,
}: {
  blog: BlogDTO;
  isAdmin: boolean;
  onDelete: (blog: BlogDTO) => void;
  onEdit: (blog: BlogDTO) => void;
  onOpen: (blogId: string) => void;
}) {
  const displayDate = formatBlogDate(blog.published_at ?? blog.created_at);
  const title = getBlogValue(blog.title, "Untitled blog");
  const authorName = getBlogValue(blog.author_name, "MySlotmate Team");
  const excerpt = getBlogExcerpt(blog);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[32px] border border-[#dbeaf5] bg-[linear-gradient(180deg,#ffffff,#f8fcff)] shadow-[0_18px_45px_rgba(46,96,145,0.10)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_60px_rgba(46,96,145,0.18)]">
      <div className="relative h-64 overflow-hidden bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={blog.cover_image_url ?? FALLBACK_BLOG_IMAGE}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,38,60,0.00)_20%,rgba(10,38,60,0.18)_100%)]" />
        <div className="absolute left-5 top-5 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold shadow-sm backdrop-blur-sm ${getCategoryColor(blog.category)}`}
          >
            {getBlogValue(blog.category, "General")}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/88 px-3 py-1.5 text-[11px] font-semibold text-[#3d5874] shadow-sm backdrop-blur-sm">
            <FiClock className="h-3.5 w-3.5" />
            {blog.read_time_minutes ?? 5} min read
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="mb-5">
          <h3 className="line-clamp-2 text-[1.9rem] leading-tight font-bold tracking-[-0.04em] text-[#16304c]">
            {title}
          </h3>
          <p className="mt-3 line-clamp-4 min-h-24 text-[15px] leading-7 text-[#6f8daa]">
            {excerpt}
          </p>
        </div>

        <div className="mt-auto rounded-[24px] border border-[#e5eef6] bg-white/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 space-y-2 text-sm text-[#58748f]">
              <p className="flex items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eff7fd] text-[#0094CA]">
                  <LuUser className="h-4 w-4" />
                </span>
                <span className="min-w-0 truncate font-medium text-[#284760]">
                  {authorName}
                </span>
              </p>
              <p className="flex items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f5f9fc] text-[#5f7e9a]">
                  <LuCalendar className="h-4 w-4" />
                </span>
                <span>{displayDate}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => onEdit(blog)}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#b8e4ff] bg-[#ebf8ff] text-[#0094CA] transition hover:bg-[#dcf2ff]"
                    aria-label={`Edit ${title}`}
                  >
                    <FiEdit2 className="h-4.5 w-4.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(blog)}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100"
                    aria-label={`Delete ${title}`}
                  >
                    <FiTrash2 className="h-4.5 w-4.5" />
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => onOpen(blog.id)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#0094CA,#13b5ea)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(0,148,202,0.24)] transition hover:translate-y-[-1px] hover:shadow-[0_20px_32px_rgba(0,148,202,0.30)]"
              >
                Read Story
                <LuArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function BlogDetailModal({
  blog,
  isAdmin,
  isLoading,
  onClose,
  onDelete,
  onEdit,
}: {
  blog: BlogDTO | null;
  isAdmin: boolean;
  isLoading: boolean;
  onClose: () => void;
  onDelete: (blog: BlogDTO) => void;
  onEdit: (blog: BlogDTO) => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const [readingProgress, setReadingProgress] = useState(0);
  const [showTOC, setShowTOC] = useState(true);

  const blocks = useMemo(() => (blog ? contentToBlocks(blog.content) : []), [blog]);
  const tocItems = useMemo(() => extractTableOfContents(blocks), [blocks]);

  // Update reading progress
  useEffect(() => {
    const container = modalContentRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight - container.clientHeight;
      const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      setReadingProgress(progress);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, []);

  const scrollToHeading = (headingId: string) => {
    const element = contentRef.current?.querySelector(`#${headingId}`);
    if (element && modalContentRef.current) {
      const rect = element.getBoundingClientRect();
      const containerRect = modalContentRef.current.getBoundingClientRect();
      const scrollTop = rect.top - containerRect.top + modalContentRef.current.scrollTop - 60;
      modalContentRef.current.scrollTo({ top: scrollTop, behavior: "smooth" });
    }
  };

  return (
    <div className="fixed inset-0 z-250 flex items-center justify-center bg-black/50 p-4">
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 z-251 h-1 bg-gray-200">
        <div
          className="h-full bg-[#0094CA] transition-all duration-300"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      <div
        ref={modalContentRef}
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 rounded-full bg-white/90 p-2 text-gray-600 shadow-sm transition hover:bg-white hover:text-gray-900"
          aria-label="Close blog"
        >
          <FiX className="h-5 w-5" />
        </button>

        {/* TOC Toggle Button */}
        {tocItems.length > 0 && (
          <button
            type="button"
            onClick={() => setShowTOC(!showTOC)}
            className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-lg bg-white/90 px-3 py-2 text-sm text-gray-600 shadow-sm transition hover:bg-white hover:text-gray-900"
            aria-label="Toggle table of contents"
          >
            <FiList className="h-4 w-4" />
            <span className="hidden sm:inline">TOC</span>
          </button>
        )}

        {isLoading ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <LuLoader2 className="h-8 w-8 animate-spin text-[#0094CA]" />
          </div>
        ) : blog ? (
          <div className="flex">
            {/* Table of Contents Sidebar */}
            {showTOC && tocItems.length > 0 && (
              <aside className="hidden w-64 border-r border-gray-200 bg-gray-50 p-6 lg:block">
                <h3 className="mb-4 text-sm font-semibold text-gray-700">Contents</h3>
                <nav className="space-y-2">
                  {tocItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => scrollToHeading(item.id)}
                      className={`block w-full text-left text-sm transition hover:text-[#0094CA] ${
                        item.level === 1 || item.level === 2
                          ? "font-medium text-gray-900"
                          : "pl-4 text-gray-600"
                      }`}
                      style={{
                        paddingLeft: `${(item.level - 1) * 12}px`,
                      }}
                    >
                      {item.text}
                    </button>
                  ))}
                </nav>
              </aside>
            )}

            {/* Main Content */}
            <div ref={contentRef} className="flex-1 p-6 sm:p-8">
              <div className="h-48 -mx-6 -mt-6 mb-6 overflow-hidden rounded-t-3xl bg-slate-100 sm:-mx-8 sm:mb-8 sm:h-56 lg:h-64">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={blog.cover_image_url ?? FALLBACK_BLOG_IMAGE}
                  alt={getBlogValue(blog.title, "Blog cover")}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getCategoryColor(blog.category)}`}
                >
                  {getBlogValue(blog.category, "General")}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <FiClock className="h-3.5 w-3.5" />
                  {blog.read_time_minutes ?? 5} min read
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <LuCalendar className="h-3.5 w-3.5" />
                  {formatBlogDate(blog.published_at ?? blog.created_at)}
                </span>
              </div>

              <h2 className="text-3xl font-bold tracking-[-0.04em] text-[#16304c]">
                {getBlogValue(blog.title, "Untitled blog")}
              </h2>
              <p className="mt-3 text-base leading-7 text-[#5f7e9a]">
                {getBlogValue(blog.description)}
              </p>

              <div className="mt-5 flex items-center justify-between border-y border-[#e4edf5] py-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <LuUser className="h-4 w-4" />
                  {getBlogValue(blog.author_name, "MySlotmate Team")}
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(blog)}
                      className="rounded-lg border border-[#cceeff] bg-[#f0faff] px-3 py-2 text-sm font-medium text-[#0094CA] transition hover:bg-[#e6f6ff]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(blog)}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <BlockRenderer blocks={blocks} showHeadings={true} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="text-lg font-semibold text-gray-900">
              Blog not found
            </p>
            <p className="max-w-md text-sm text-gray-500">
              The article could not be loaded right now. Please try again.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BlogsPage() {
  const [user] = useAuthState(auth);
  const coverImageInputRef = useRef<HTMLInputElement>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [backendUserId, setBackendUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedBlogId, setSelectedBlogId] = useState<string | null>(null);
  const [editingBlog, setEditingBlog] = useState<BlogDTO | null>(null);
  const [formState, setFormState] = useState<BlogFormState>(DEFAULT_FORM_STATE);

  const isAdmin =
    !!user?.email &&
    user.email.toLowerCase() ===
      String(env.NEXT_PUBLIC_ADMIN_EMAIL ?? "").toLowerCase();

  useEffect(() => {
    let active = true;

    if (!user) {
      setIdToken(null);
      return;
    }

    void user
      .getIdToken()
      .then((token) => {
        if (active) setIdToken(token);
      })
      .catch(() => {
        if (active) setIdToken(null);
      });

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    let active = true;

    const syncBackendUserId = async () => {
      const storedUserId = getStoredUserId();
      if (storedUserId) {
        if (active) setBackendUserId(storedUserId);
        return;
      }

      if (!user?.uid) {
        if (active) setBackendUserId(null);
        return;
      }

      try {
        const response = await fetch(
          `${env.NEXT_PUBLIC_API_URL}/users/by-firebase/${user.uid}`,
        );

        if (!response.ok) {
          if (active) setBackendUserId(null);
          return;
        }

        const payload = (await response.json()) as {
          data?: { id?: string };
        };
        const resolvedUserId = payload.data?.id ?? null;

        if (!resolvedUserId) {
          if (active) setBackendUserId(null);
          return;
        }

        setStoredUserId(resolvedUserId);
        if (active) setBackendUserId(resolvedUserId);
      } catch {
        if (active) setBackendUserId(null);
      }
    };

    void syncBackendUserId();

    return () => {
      active = false;
    };
  }, [user?.uid]);

  const { data: blogs = [], error, isLoading } = useListBlogs();
  const selectedBlogPreview = useMemo(
    () => blogs.find((blog) => blog.id === selectedBlogId) ?? null,
    [blogs, selectedBlogId],
  );
  const { data: selectedBlog, isLoading: selectedBlogLoading } =
    useBlog(selectedBlogId);

  const createBlogMutation = useCreateBlog();
  const updateBlogMutation = useUpdateBlog();
  const deleteBlogMutation = useDeleteBlog();
  const publishBlogMutation = usePublishBlog();
  const uploadBlogCoverMutation = useUploadBlogCover();

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          blogs
            .map((blog) => blog.category?.trim())
            .filter((category): category is string => Boolean(category)),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [blogs],
  );

  const filteredBlogs = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return [...blogs]
      .sort((left, right) => {
        const leftDate = new Date(
          left.published_at ?? left.created_at,
        ).getTime();
        const rightDate = new Date(
          right.published_at ?? right.created_at,
        ).getTime();
        return rightDate - leftDate;
      })
      .filter((blog) => {
        const matchesCategory =
          selectedCategory === "All" || blog.category === selectedCategory;
        const matchesSearch =
          !normalizedSearch ||
          getBlogValue(blog.title).toLowerCase().includes(normalizedSearch) ||
          getBlogValue(blog.description).toLowerCase().includes(normalizedSearch) ||
          getBlogValue(blog.category).toLowerCase().includes(normalizedSearch) ||
          getBlogValue(blog.author_name).toLowerCase().includes(normalizedSearch) ||
          getBlogValue(blog.content).toLowerCase().includes(normalizedSearch);

        return matchesCategory && matchesSearch;
      });
  }, [blogs, searchTerm, selectedCategory]);

  const isSaving =
    createBlogMutation.isPending ||
    updateBlogMutation.isPending ||
    publishBlogMutation.isPending ||
    uploadBlogCoverMutation.isPending;

  const listErrorMessage =
    error instanceof Error ? error.message : "Failed to load blogs.";

  const resetForm = () => {
    if (formState.coverImageFile && formState.cover_image_url.startsWith("blob:")) {
      URL.revokeObjectURL(formState.cover_image_url);
    }
    // Clean up blob URLs from image blocks
    formState.blocks.forEach((block) => {
      if (block.type === "image" && block.url.startsWith("blob:")) {
        URL.revokeObjectURL(block.url);
      }
    });
    setEditingBlog(null);
    setFormState(DEFAULT_FORM_STATE);
    if (coverImageInputRef.current) {
      coverImageInputRef.current.value = "";
    }
  };

  const handleFormChange = <K extends keyof BlogFormState>(
    key: K,
    value: BlogFormState[K],
  ) => {
    setFormState((current) => ({ ...current, [key]: value }));
  };

  const handleEdit = (blog: BlogDTO) => {
    setEditingBlog(blog);
    setFormState(mapBlogToFormState(blog));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCoverImageSelection = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Cover image must be under 5 MB.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setFormState((current) => {
      if (
        current.coverImageFile &&
        current.cover_image_url.startsWith("blob:")
      ) {
        URL.revokeObjectURL(current.cover_image_url);
      }

      return {
        ...current,
        coverImageFile: file,
        cover_image_url: previewUrl,
      };
    });

    event.target.value = "";
  };

  const clearCoverImage = () => {
    setFormState((current) => {
      if (
        current.coverImageFile &&
        current.cover_image_url.startsWith("blob:")
      ) {
        URL.revokeObjectURL(current.cover_image_url);
      }

      return {
        ...current,
        coverImageFile: null,
        cover_image_url: "",
      };
    });

    if (coverImageInputRef.current) {
      coverImageInputRef.current.value = "";
    }
  };

  const handleDelete = async (blog: BlogDTO) => {
    if (!isAdmin || !idToken) {
      toast.error("Admin authorization is required.");
      return;
    }

    const confirmed = window.confirm(
      `Delete "${getBlogValue(blog.title, "this blog")}"? This action cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      await deleteBlogMutation.mutateAsync({ blogId: blog.id, idToken });
      if (selectedBlogId === blog.id) setSelectedBlogId(null);
      if (editingBlog?.id === blog.id) resetForm();
      toast.success("Blog deleted.");
    } catch (deleteError) {
      const message =
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete the blog.";
      toast.error(message);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isAdmin || !idToken) {
      toast.error("Only admins can manage blogs.");
      return;
    }
    if (!backendUserId) {
      toast.error(
        "This admin account is not linked to a MySlotmate user profile yet. Complete signup once with the admin email, then try again.",
      );
      return;
    }

    const readTime = Number.parseInt(formState.read_time_minutes, 10);
    if (!formState.title.trim() || !formState.category.trim()) {
      toast.error("Title and category are required.");
      return;
    }
    if (!formState.description.trim() || formState.blocks.length === 0) {
      toast.error("Description and content are required.");
      return;
    }
    if (!Number.isFinite(readTime) || readTime <= 0) {
      toast.error("Read time must be a positive number.");
      return;
    }

    const payload: BlogCreatePayload = {
      category: formState.category.trim(),
      content: blocksToContent(formState.blocks),
      description: formState.description.trim(),
      read_time_minutes: readTime,
      title: formState.title.trim(),
    };

    const finalizePublishState = async (
      blog: BlogDTO,
      action: "created" | "updated",
    ) => {
      if (blog.published_at) {
        toast.success(`Blog ${action}.`);
        resetForm();
        return;
      }

      try {
        await publishBlogMutation.mutateAsync({
          blogId: blog.id,
          idToken,
        });
        toast.success(`Blog ${action} and published.`);
        resetForm();
      } catch (publishError) {
        const message =
          publishError instanceof Error
            ? publishError.message
            : "Automatic publishing failed.";

        if (isLikelyNetworkError(message)) {
          try {
            await publishBlogMutation.mutateAsync({
              blogId: blog.id,
              idToken,
            });
            toast.success(`Blog ${action} and published.`);
            resetForm();
            return;
          } catch (retryError) {
            const retryMessage =
              retryError instanceof Error
                ? retryError.message
                : "Automatic publishing failed.";
            setEditingBlog(blog);
            setFormState(mapBlogToFormState(blog));
            toast.error(
              `Blog ${action} as a draft, but publishing still failed. ${retryMessage}`,
            );
            return;
          }
        }

        setEditingBlog(blog);
        setFormState(mapBlogToFormState(blog));
        toast.error(`Blog ${action} as a draft, but publishing failed. ${message}`);
      }
    };

    try {
      let coverImageUrl = formState.cover_image_url.trim() || undefined;

      if (formState.coverImageFile) {
        const previousPreviewUrl =
          formState.cover_image_url.startsWith("blob:")
            ? formState.cover_image_url
            : null;
        const uploadedCover = await uploadBlogCoverMutation.mutateAsync(
          formState.coverImageFile,
        );

        if (!uploadedCover?.url) {
          throw new Error("Blog cover upload failed.");
        }

        coverImageUrl = uploadedCover.url;
        setFormState((current) => ({
          ...current,
          coverImageFile: null,
          cover_image_url: uploadedCover.url,
        }));

        if (previousPreviewUrl) {
          URL.revokeObjectURL(previousPreviewUrl);
        }
      }

      payload.cover_image_url = coverImageUrl;

      if (editingBlog) {
        const updated = await updateBlogMutation.mutateAsync({
          blogId: editingBlog.id,
          body: payload,
          idToken,
        });
        await finalizePublishState(updated.data, "updated");
      } else {
        const created = await createBlogMutation.mutateAsync({
          body: payload,
          idToken,
        });
        await finalizePublishState(created.data, "created");
      }
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Failed to save the blog.";
      if (message.includes("blogs_author_id_fkey")) {
        toast.error(
          "Blog creation failed because the admin account is authenticated but its app user record is out of sync. Sign in with the admin email and finish signup once, then retry.",
        );
        return;
      }
      toast.error(message);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <components.Navbar />

      <div className="flex-1">
        <div className="site-x mx-auto w-full max-w-280 py-8 pt-24">
          <Breadcrumb
            items={[{ label: "Home", href: "/" }, { label: "Blog & Stories" }]}
            className="mb-6"
          />

          <div className="mb-8 rounded-[28px] border border-[#dbeaf5] bg-[linear-gradient(180deg,#f7fcff,#ffffff)] p-6 shadow-[0_20px_45px_rgba(59,123,177,0.08)]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#a9daf5a6] bg-white/90 px-3.5 py-2 text-[11px] font-extrabold tracking-[0.08em] text-[#4a8ab8] uppercase">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
                  Stories & Insights
                </span>
                <h1 className="mt-4 text-3xl font-bold tracking-[-0.04em] text-[#16304c] sm:text-4xl">
                  MySlotmate Blog
                </h1>
                <p className="mt-2 text-sm leading-7 text-[#6f8daa] sm:text-base">
                  Explore hosting tips, community stories, and practical ideas
                  to make the most of time spent together.
                </p>
              </div>

              {isAdmin && (
                <div className="rounded-2xl border border-[#cceeff] bg-[#f0faff] px-4 py-3 text-sm text-[#1f628b]">
                  <p className="font-semibold text-[#16304c]">
                    Admin tools enabled
                  </p>
                  <p className="mt-1">
                    You can create, edit, and delete blog posts from this page.
                  </p>
                </div>
              )}
            </div>
          </div>

          {isAdmin && (
            <section className="mb-10 rounded-[28px] border border-[#dbeaf5] bg-white p-6 shadow-[0_18px_40px_rgba(60,121,175,0.08)]">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-[-0.03em] text-[#16304c]">
                    {editingBlog ? "Edit Blog" : "Create Blog"}
                  </h2>
                  <p className="mt-1 text-sm text-[#6f8daa]">
                    {editingBlog
                      ? "Update the selected article and save your changes."
                      : "Write a new article for the MySlotmate community."}
                  </p>
                </div>

                {editingBlog && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    Cancel edit
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-gray-700">
                      Title
                    </span>
                    <input
                      type="text"
                      value={formState.title}
                      onChange={(event) =>
                        handleFormChange("title", event.target.value)
                      }
                      placeholder="How to Plan the Perfect Experience"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm transition outline-none focus:border-[#0094CA] focus:ring-2 focus:ring-[#0094CA]/20"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-gray-700">
                      Category
                    </span>
                    <input
                      type="text"
                      list="blog-category-options"
                      value={formState.category}
                      onChange={(event) =>
                        handleFormChange("category", event.target.value)
                      }
                      placeholder="Hosting"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm transition outline-none focus:border-[#0094CA] focus:ring-2 focus:ring-[#0094CA]/20"
                    />
                    <datalist id="blog-category-options">
                      {categories.map((category) => (
                        <option key={category} value={category} />
                      ))}
                      {["Hosting", "Wellness", "Adventure", "Community"].map(
                        (category) => (
                          <option key={category} value={category} />
                        ),
                      )}
                    </datalist>
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">
                    Short Description
                  </span>
                  <textarea
                    value={formState.description}
                    onChange={(event) =>
                      handleFormChange("description", event.target.value)
                    }
                    placeholder="Learn the key tips and tricks for hosting an unforgettable experience."
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm transition outline-none focus:border-[#0094CA] focus:ring-2 focus:ring-[#0094CA]/20"
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-gray-700">
                      Cover Image
                    </span>
                    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
                      {formState.cover_image_url ? (
                        <div className="space-y-3">
                          <div className="overflow-hidden rounded-xl bg-slate-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={formState.cover_image_url}
                              alt="Blog cover preview"
                              className="h-44 w-full object-cover"
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => coverImageInputRef.current?.click()}
                              className="inline-flex items-center gap-2 rounded-lg border border-[#cceeff] bg-white px-3 py-2 text-sm font-medium text-[#0094CA] transition hover:bg-[#f0faff]"
                            >
                              <FiUpload className="h-4 w-4" />
                              Replace image
                            </button>
                            <button
                              type="button"
                              onClick={clearCoverImage}
                              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
                            >
                              Remove image
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => coverImageInputRef.current?.click()}
                          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl px-4 py-8 text-center text-sm text-gray-600 transition hover:bg-white"
                        >
                          <FiImage className="h-8 w-8 text-[#0094CA]" />
                          <span className="font-medium text-gray-800">
                            Upload a blog cover image
                          </span>
                          <span className="text-xs text-gray-500">
                            JPG, PNG, WEBP up to 5 MB
                          </span>
                        </button>
                      )}
                      <input
                        ref={coverImageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleCoverImageSelection}
                        className="hidden"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-gray-700">
                      Read Time
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={formState.read_time_minutes}
                      onChange={(event) =>
                        handleFormChange(
                          "read_time_minutes",
                          event.target.value,
                        )
                      }
                      placeholder="5"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm transition outline-none focus:border-[#0094CA] focus:ring-2 focus:ring-[#0094CA]/20"
                    />
                  </label>
                </div>

                <div className="block">
                  <span className="mb-3 block text-sm font-medium text-gray-700">
                    Blog Content (With Images)
                  </span>
                  <p className="mb-4 text-sm text-gray-600">
                    Create rich content with text and images. Use the buttons to add new blocks,
                    reorder them, and add captions to images.
                  </p>
                  <BlockEditor
                    blocks={formState.blocks}
                    onBlocksChange={(blocks) =>
                      handleFormChange("blocks", blocks)
                    }
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={isSaving || !idToken}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0094CA] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#007dab] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? (
                      <LuLoader2 className="h-4 w-4 animate-spin" />
                    ) : editingBlog ? (
                      <FiEdit2 className="h-4 w-4" />
                    ) : (
                      <FiPlus className="h-4 w-4" />
                    )}
                    {editingBlog
                      ? editingBlog.published_at
                        ? "Save Changes"
                        : "Save & Publish"
                      : "Create Blog"}
                  </button>

                  {!idToken && (
                    <p className="text-sm text-amber-700">
                      Admin token is not available yet. Please wait a moment.
                    </p>
                  )}
                </div>
              </form>
            </section>
          )}

          <section className="mb-8 flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-lg">
              <FiSearch className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search blogs by title, author, category, or content..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full rounded-xl border border-gray-200 py-3 pr-4 pl-11 text-sm transition outline-none focus:border-[#0094CA] focus:ring-2 focus:ring-[#0094CA]/20"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategory("All")}
                className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                  selectedCategory === "All"
                    ? "bg-[#0094CA] text-white"
                    : "bg-[#f5f9fc] text-[#5f7e9a] hover:bg-[#ebf4fa]"
                }`}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                    selectedCategory === category
                      ? "bg-[#0094CA] text-white"
                      : "bg-[#f5f9fc] text-[#5f7e9a] hover:bg-[#ebf4fa]"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </section>

          {isLoading ? (
            <BlogLoadingSkeleton />
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              {listErrorMessage}
            </div>
          ) : filteredBlogs.length > 0 ? (
            <div>
              <p className="mb-6 text-sm text-gray-600">
                Found {filteredBlogs.length} article
                {filteredBlogs.length !== 1 ? "s" : ""}
              </p>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {filteredBlogs.map((blog) => (
                  <BlogCard
                    key={blog.id}
                    blog={blog}
                    isAdmin={isAdmin}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    onOpen={setSelectedBlogId}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 py-16 text-center">
              <LuLoader2 className="mb-4 h-12 w-12 text-gray-300" />
              <p className="text-lg font-medium text-gray-700">
                {searchTerm || selectedCategory !== "All"
                  ? "No blogs match your current filters."
                  : "No blog posts are available right now."}
              </p>
              <p className="mt-2 max-w-md text-sm text-gray-500">
                {searchTerm || selectedCategory !== "All"
                  ? "Try a different search term or switch back to all categories."
                  : "Published stories will appear here once they are available."}
              </p>
            </div>
          )}
        </div>
      </div>

      <components.Home.Footer />

      {selectedBlogId && (
        <BlogDetailModal
          blog={selectedBlog ?? selectedBlogPreview}
          isAdmin={isAdmin}
          isLoading={selectedBlogLoading && !selectedBlogPreview}
          onClose={() => setSelectedBlogId(null)}
          onDelete={handleDelete}
          onEdit={(blog) => {
            handleEdit(blog);
            setSelectedBlogId(null);
          }}
        />
      )}
    </div>
  );
}

