"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  FiEdit2,
  FiImage,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUpload,
} from "react-icons/fi";
import { LuLoader2 } from "react-icons/lu";
import { toast } from "sonner";
import * as components from "~/components";
import {
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
import { RichTextEditor, RichTextView } from "~/components/RichTextEditor";
import { ImageCropModal } from "~/components/ImageCropModal";
import { auth } from "~/utils/firebase";
import { env } from "~/env";

// Block types for rich content editor
export type TextBlock = { id: string; type: "text"; content: string };
export type ImageBlock = { id: string; type: "image"; url: string; caption: string };
export type BlogBlock = TextBlock | ImageBlock;

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

export const FALLBACK_BLOG_IMAGE = "/assets/home/hiking.webp";

// Helper functions for block management
function generateBlockId() {
  return Math.random().toString(36).substring(2, 11);
}

function blocksToContent(blocks: BlogBlock[]): string {
  return JSON.stringify(blocks);
}

export function contentToBlocks(content: string | null | undefined): BlogBlock[] {
  if (!content?.trim())
    return [{ id: generateBlockId(), type: "text", content: "" }];

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

export function formatBlogDate(dateString: string | null | undefined) {
  if (!dateString) return "Draft";

  return new Date(dateString).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function getBlogValue(value: string | null | undefined, fallback = "") {
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

export function textBlockToSections(content: string) {
  return content
    .split(/\n\s*\n/g)
    .map((section) => section.trim())
    .filter(Boolean);
}

// Extract table of contents from blocks
export type TOCItem = { id: string; level: number; text: string };

export function extractTableOfContents(blocks: BlogBlock[]): TOCItem[] {
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

export function getBlogExcerpt(blog: BlogDTO) {
  const source = getBlogValue(blog.description) || getBlogValue(blog.content);
  if (source.length <= 140) return source;
  return `${source.slice(0, 137).trim()}...`;
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

export function BlockRenderer({
  blocks,
  showHeadings = false,
}: {
  blocks: BlogBlock[];
  showHeadings?: boolean;
}) {
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
          // Newer blocks contain HTML from the rich text editor. Older blocks
          // are plain text with markdown-style headings — preserve that path.
          const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(block.content);
          if (looksLikeHtml) {
            return (
              <RichTextView
                key={block.id}
                html={block.content}
                className="text-[17px] leading-8 text-[#29465f] sm:text-[18px]"
              />
            );
          }
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
                      text,
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
  const uploadFiles = useUploadFiles();

  // ── Inline images inserted from inside the rich text editor ──────────
  // The RichTextEditor's image button calls `requestInlineImage()` which
  // returns a Promise<url|null>. We open a hidden file picker → crop modal →
  // upload, then resolve the promise so the editor inserts the image.
  const inlineFileInputRef = useRef<HTMLInputElement>(null);
  const [pendingInlineCrop, setPendingInlineCrop] = useState<File | null>(null);
  const inlineResolverRef = useRef<((url: string | null) => void) | null>(null);

  const requestInlineImage = (): Promise<string | null> => {
    return new Promise((resolve) => {
      inlineResolverRef.current = resolve;
      inlineFileInputRef.current?.click();
    });
  };

  const finishInlineFlow = (url: string | null) => {
    inlineResolverRef.current?.(url);
    inlineResolverRef.current = null;
    setPendingInlineCrop(null);
  };

  const handleInlineFilePicked = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (event.target) event.target.value = "";
    if (!file) {
      finishInlineFlow(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      finishInlineFlow(null);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10 MB.");
      finishInlineFlow(null);
      return;
    }
    setPendingInlineCrop(file);
  };

  const handleInlineCropConfirm = async (blob: Blob, originalName: string) => {
    const ext = blob.type === "image/png" ? "png" : "jpg";
    const baseName = originalName.replace(/\.[^.]+$/, "") || "image";
    const cropped = new File([blob], `${baseName}-cropped.${ext}`, {
      type: blob.type,
    });
    try {
      const uploadRes = await uploadFiles.mutateAsync({
        files: [cropped],
        folder: "blogs/covers",
      });
      const url = uploadRes.data[0]?.url ?? null;
      if (!url) {
        toast.error("Image upload failed - no URL returned");
        finishInlineFlow(null);
        return;
      }
      finishInlineFlow(url);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Image upload failed";
      toast.error(message);
      finishInlineFlow(null);
    }
  };

  const handleTextChange = (blockId: string, content: string) => {
    const updated = blocks.map((block) =>
      block.id === blockId && block.type === "text"
        ? { ...block, content }
        : block,
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

  return (
    <div className="space-y-4">
      {blocks.map((block) => (
        <div
          key={block.id}
          className="rounded-lg border border-gray-200 bg-gray-50 p-4 transition"
        >
          {block.type === "text" ? (
            <div className="space-y-3">
              <RichTextEditor
                value={block.content}
                onChange={(html) => handleTextChange(block.id, html)}
                placeholder="Write your content here…"
                onRequestImage={requestInlineImage}
              />
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
                        : b,
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
                  onClick={() => handleBlockDelete(block.id)}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
                >
                  Delete Image
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Inline image flow (toolbar button inside RichTextEditor) */}
      <input
        ref={inlineFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInlineFilePicked}
        className="hidden"
      />
      <ImageCropModal
        file={pendingInlineCrop}
        onClose={() => finishInlineFlow(null)}
        onConfirm={(blob, name) => void handleInlineCropConfirm(blob, name)}
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
  const excerpt = getBlogExcerpt(blog);

  return (
    <article className="flex flex-col justify-between h-full p-5 rounded-[28px] bg-white/82 border border-[#aeddf899] shadow-[0_20px_42px_rgba(60,121,175,0.1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_56px_rgba(60,121,175,0.16)]">
      <div className="space-y-4">
        <div
          className="relative min-h-[220px] w-full overflow-hidden rounded-[28px] border border-[#addbf699] bg-[linear-gradient(145deg,#e5f7ff,#f9fdff)] group cursor-pointer"
          onClick={() => onOpen(blog.id)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={blog.cover_image_url ?? FALLBACK_BLOG_IMAGE}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105 rounded-[28px]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(22,48,76,0.02)_0%,rgba(22,48,76,0.18)_100%)] pointer-events-none rounded-[28px]" />
        </div>

        <div className="grid content-start gap-2.5 pt-2">
          <div>
            <span className="inline-flex items-center justify-center gap-2 rounded-full px-3.5 py-1.5 bg-white/90 border border-[#a9daf5a6] text-[0.74rem] font-extrabold tracking-[0.08em] text-[#4a8ab8] uppercase before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#4a8ab8]">
              {getBlogValue(blog.category, "General")}
            </span>
          </div>
          <h3
            className="font-outfit text-[1.08rem] font-semibold leading-[1.24] tracking-[-0.04em] text-[#16304c] m-0 cursor-pointer transition hover:text-[#0e8ae0]"
            onClick={() => onOpen(blog.id)}
          >
            {title}
          </h3>
          <p className="line-clamp-3 text-[0.88rem] leading-[1.68] text-[#6f8daa] m-0">
            {excerpt}
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-[#f0f6fb] pt-4">
        <div className="flex flex-wrap items-center gap-2.5 text-[0.76rem] font-semibold text-[#5a88ac]">
          <span>{displayDate}</span>
          <span className="text-[#a9daf5]">•</span>
          <span>{blog.read_time_minutes ?? 5} Min Read</span>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => onEdit(blog)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#b8e4ff] bg-[#ebf8ff] text-[#0094CA] transition hover:bg-[#dcf2ff]"
                aria-label={`Edit ${title}`}
              >
                <FiEdit2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(blog)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100"
                aria-label={`Delete ${title}`}
              >
                <FiTrash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}



export default function BlogsPage() {
  const router = useRouter();
  const [user] = useAuthState(auth);
  const coverImageInputRef = useRef<HTMLInputElement>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [backendUserId, setBackendUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [editingBlog, setEditingBlog] = useState<BlogDTO | null>(null);
  const [formState, setFormState] = useState<BlogFormState>(DEFAULT_FORM_STATE);

  const isAdmin = useMemo(() => {
    if (!user?.email) return false;
    const adminEmails = String(env.NEXT_PUBLIC_ADMIN_EMAIL ?? "")
      .toLowerCase()
      .split(",")
      .map((e) => e.trim());
    return adminEmails.includes(user.email.toLowerCase());
  }, [user?.email]);

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
          getBlogValue(blog.description)
            .toLowerCase()
            .includes(normalizedSearch) ||
          getBlogValue(blog.category)
            .toLowerCase()
            .includes(normalizedSearch) ||
          getBlogValue(blog.author_name)
            .toLowerCase()
            .includes(normalizedSearch) ||
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
    if (
      formState.coverImageFile &&
      formState.cover_image_url.startsWith("blob:")
    ) {
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
        toast.error(
          `Blog ${action} as a draft, but publishing failed. ${message}`,
        );
      }
    };

    try {
      let coverImageUrl = formState.cover_image_url.trim() || undefined;

      if (formState.coverImageFile) {
        const previousPreviewUrl = formState.cover_image_url.startsWith("blob:")
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
    <div className="blog-bg flex min-h-screen flex-col">
      <components.Navbar />

      <div className="flex-1">
        <main className="mx-auto max-w-[1120px] px-4 pt-24 pb-16">
          <section className="grid gap-1.5 py-0.5 mb-2">
            <h1 className="font-outfit text-[clamp(1.9rem,3.3vw,2.8rem)] font-semibold tracking-[-0.06em] text-[#16304c] m-0">
              The Myslotmate Blog
            </h1>
            <p className="max-w-[620px] mt-0.5 text-[0.88rem] leading-[1.7] text-[#6f8daa] m-0">
              Practical stories, host insights, and local experience ideas from the Myslotmate world.
            </p>
          </section>

          {isAdmin && (
            <div className="mb-10 rounded-2xl border border-[#cceeff] bg-[#f0faff] px-4 py-3 text-sm text-[#1f628b]">
              <p className="font-semibold text-[#16304c]">
                Admin tools enabled
              </p>
              <p className="mt-1">
                You can create, edit, and delete blog posts from this page.
              </p>
            </div>
          )}

          {isAdmin && (
            <section className="mb-12 rounded-[28px] border border-[#dbeaf5] bg-white p-6 shadow-[0_18px_40px_rgba(60,121,175,0.08)]">
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
                              onClick={() =>
                                coverImageInputRef.current?.click()
                              }
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
                    Create rich content with text and images. Use the buttons to
                    add new blocks, reorder them, and add captions to images.
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

          {isLoading ? (
            <BlogLoadingSkeleton />
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              {listErrorMessage}
            </div>
          ) : filteredBlogs.length > 0 ? (
            <div className="space-y-12">
              {/* Featured Blog */}
              {(() => {
                const featuredBlog = filteredBlogs[0]!;
                const authorName = getBlogValue(featuredBlog.author_name, "MySlotmate Team");
                const displayDate = formatBlogDate(featuredBlog.published_at ?? featuredBlog.created_at);
                const excerpt = getBlogExcerpt(featuredBlog);

                return (
                  <section className="grid lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] gap-6.5 items-stretch p-7 rounded-[32px] bg-white/72 border border-[#aeddf8a6] shadow-[0_24px_60px_rgba(58,119,172,0.12)]">
                    <div className="grid content-start gap-5">
                      <div className="w-full">
                        <span className="flex w-full items-center justify-center gap-2 rounded-full px-3.5 py-2 bg-white/90 border border-[#a9daf5a6] text-[0.74rem] font-extrabold tracking-[0.08em] text-[#4a8ab8] uppercase before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#4a8ab8]">
                          Featured Story
                        </span>
                      </div>
                      <h2
                        className="font-outfit text-[clamp(1.5rem,2.45vw,2.1rem)] font-semibold leading-[1.16] tracking-[-0.04em] text-[#16304c] m-0 cursor-pointer transition hover:text-[#0e8ae0]"
                        onClick={() => router.push(`/blogs/${featuredBlog.id}`)}
                      >
                        {getBlogValue(featuredBlog.title, "Untitled blog")}
                      </h2>
                      <div className="flex flex-wrap gap-2.5 mt-0.5">
                        <span className="inline-flex items-center justify-center gap-2 rounded-full px-3.5 py-1.5 bg-white/90 border border-[#78bce759] text-[0.74rem] font-extrabold tracking-[0.08em] text-[#4c84ab] uppercase">
                          {getBlogValue(featuredBlog.category, "Host Strategy")}
                        </span>
                        <span className="inline-flex items-center justify-center gap-2 rounded-full px-3.5 py-1.5 bg-white/90 border border-[#78bce759] text-[0.74rem] font-extrabold tracking-[0.08em] text-[#4c84ab] uppercase">
                          {authorName}
                        </span>
                        <span className="inline-flex items-center justify-center gap-2 rounded-full px-3.5 py-1.5 bg-white/90 border border-[#78bce759] text-[0.74rem] font-extrabold tracking-[0.08em] text-[#4c84ab] uppercase">
                          {displayDate}
                        </span>
                        <span className="inline-flex items-center justify-center gap-2 rounded-full px-3.5 py-1.5 bg-white/90 border border-[#78bce759] text-[0.74rem] font-extrabold tracking-[0.08em] text-[#4c84ab] uppercase">
                          {featuredBlog.read_time_minutes ?? 5} Min Read
                        </span>
                      </div>
                      <p className="text-[0.88rem] leading-[1.68] text-[#6f8daa] m-0 line-clamp-4">
                        {excerpt}
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                        <button
                          type="button"
                          onClick={() => router.push(`/blogs/${featuredBlog.id}`)}
                          className="inline-flex items-center gap-2 bg-transparent border-0 p-0 font-outfit text-[0.92rem] font-bold text-[#0e8ae0] cursor-pointer hover:underline after:content-['>'] after:text-base"
                        >
                          Read article
                        </button>

                        {isAdmin && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(featuredBlog)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#b8e4ff] bg-[#ebf8ff] text-[#0094CA] transition hover:bg-[#dcf2ff]"
                              aria-label="Edit featured story"
                            >
                              <FiEdit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(featuredBlog)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100"
                              aria-label="Delete featured story"
                            >
                              <FiTrash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div
                      className="relative min-h-[320px] w-full overflow-hidden rounded-[28px] border border-[#addbf699] bg-[linear-gradient(145deg,#e5f7ff,#f9fdff)] group cursor-pointer"
                      onClick={() => router.push(`/blogs/${featuredBlog.id}`)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={featuredBlog.cover_image_url ?? FALLBACK_BLOG_IMAGE}
                        alt={getBlogValue(featuredBlog.title, "Featured story")}
                        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105 rounded-[28px]"
                      />
                    </div>
                  </section>
                );
              })()}

              <section className="mt-12 mb-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mt-13 mb-5.5">
                  <div>
                    <h2 className="font-outfit text-[clamp(1.5rem,2.3vw,2rem)] font-semibold leading-[1.16] tracking-[-0.04em] text-[#16304c] m-0">
                      Browse the latest from Myslotmate
                    </h2>
                    <p className="mt-3 text-[0.9rem] leading-[1.68] text-[#6f8daa] m-0">
                      Editorial inspiration with the same bright, local-first energy as the main brand.
                    </p>
                  </div>
                  <div className="relative w-full md:max-w-sm">
                    <FiSearch className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search blogs..."
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      className="w-full rounded-full border border-[rgba(120,188,231,0.35)] bg-white/90 py-2.5 pr-4 pl-11 text-sm text-[#16304c] placeholder-[#6f8daa] outline-none transition focus:border-[#0094CA] focus:ring-2 focus:ring-[#0094CA]/20 shadow-[0_10px_24px_rgba(74,141,194,0.08)]"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mt-2.5">
                  <span
                    onClick={() => setSelectedCategory("All")}
                    className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[0.74rem] font-extrabold tracking-[0.08em] uppercase cursor-pointer transition-all duration-200 ${selectedCategory === "All"
                        ? "bg-[linear-gradient(135deg,#1fa7ff,#66d1ff)] border border-transparent text-white shadow-[0_14px_26px_rgba(31,167,255,0.24)]"
                        : "bg-white/90 border border-[#78bce759] text-[#4c84ab] hover:bg-[#ebf6ff] hover:text-[#0e8ae0]"
                      }`}
                  >
                    All Posts
                  </span>
                  {categories.map((category) => (
                    <span
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[0.74rem] font-extrabold tracking-[0.08em] uppercase cursor-pointer transition-all duration-200 ${selectedCategory === category
                          ? "bg-[linear-gradient(135deg,#1fa7ff,#66d1ff)] border border-transparent text-white shadow-[0_14px_26px_rgba(31,167,255,0.24)]"
                          : "bg-white/90 border border-[#78bce759] text-[#4c84ab] hover:bg-[#ebf6ff] hover:text-[#0e8ae0]"
                        }`}
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </section>

              {/* Story Grid for remaining blogs */}
              {filteredBlogs.length > 1 && (
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                  {filteredBlogs.slice(1).map((blog) => (
                    <BlogCard
                      key={blog.id}
                      blog={blog}
                      isAdmin={isAdmin}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                      onOpen={(id) => router.push(`/blogs/${id}`)}
                    />
                  ))}
                </section>
              )}
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
        </main>
      </div>

      <components.Home.Footer />
    </div>
  );
}
