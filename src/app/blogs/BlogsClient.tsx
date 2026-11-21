"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
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
import {
  useAdminBlogs,
  useCreateBlog,
  useDeleteBlog,
  useListBlogs,
  usePublishBlog,
  useUnpublishBlog,
  useUploadBlogCover,
  useUpdateBlog,
  useUploadFiles,
} from "~/hooks/useApi";
import type { BlogCreatePayload, BlogDTO } from "~/lib/api";
import {
  getLoggedOutAt,
  getStoredUserId,
  setStoredUserId,
} from "~/lib/auth-storage";
import { isSigningOut } from "~/lib/signOut";
import { RichTextEditor } from "~/components/RichTextEditor";
import { RichTextView } from "~/components/RichTextView";
import { ImageCropModal } from "~/components/ImageCropModal";
import { auth } from "~/utils/firebase";
import { env } from "~/env";
import CitySky from "~/components/website/CitySky";
import WebsiteFooter from "~/components/website/WebsiteFooter";
import WebsiteNav from "~/components/website/WebsiteNav";
import Reveal from "~/components/website/about/Reveal";
import StarField from "~/components/website/about/StarField";
import { GRADIENT } from "~/components/website/shared";
import {
  FeaturedStory,
  StoryCard,
  StoryCardSkeleton,
} from "~/components/website/stories/StoryCard";

const delay = (s: number) => ({ "--d": `${s}s` }) as React.CSSProperties;

/** Real MySlotMate events, one photo each. */
const MOMENTS = [
  ["/Event Photos/sip-and-paint/sip-and-paint.webp", "Sip & Paint"],
  ["/Event Photos/open-mic/openmic.webp", "Open Mic"],
  ["/Event Photos/Chrochet event/IMG_1141.webp", "Crochet Circle"],
  ["/Event Photos/plate-to-fame/IMG-20260621-WA0023.webp", "Plate to Fame"],
] as const;

// Block types for rich content editor
export type TextBlock = { id: string; type: "text"; content: string };
export type ImageBlock = {
  id: string;
  type: "image";
  url: string;
  caption: string;
};
export type BlogBlock = TextBlock | ImageBlock;

type BlogFormState = {
  category: string;
  blocks: BlogBlock[];
  cover_image_url: string;
  coverImageFile: File | null;
  description: string;
  read_time_minutes: string;
  title: string;
  slug: string;
};

const DEFAULT_FORM_STATE: BlogFormState = {
  category: "",
  blocks: [{ id: "1", type: "text", content: "" }],
  cover_image_url: "",
  coverImageFile: null,
  description: "",
  read_time_minutes: "5",
  title: "",
  slug: "",
};

/** Client-side slugify — mirrors the server's slug.Make for a live preview. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Helper functions for block management
function generateBlockId() {
  return Math.random().toString(36).substring(2, 11);
}

function blocksToContent(blocks: BlogBlock[]): string {
  return JSON.stringify(blocks);
}

export function contentToBlocks(
  content: string | null | undefined,
): BlogBlock[] {
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
    slug: blog.slug ?? "",
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
    1: "font-outfit text-3xl font-bold tracking-tight text-white sm:text-4xl",
    2: "font-outfit text-2xl font-bold tracking-tight text-white sm:text-[2rem]",
    3: "font-outfit text-xl font-bold text-white sm:text-2xl",
    4: "font-outfit text-lg font-bold text-white",
    5: "text-base font-bold text-white",
    6: "text-sm font-bold uppercase tracking-[0.12em] text-[#D8B4FE]",
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
                className="text-[17px] leading-8 text-[#C9CBE0] sm:text-[18px]"
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
                    className="text-[17px] leading-8 text-[#C9CBE0] sm:text-[18px]"
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
                className="w-full rounded-[24px] border border-white/10 object-cover"
              />
              {block.caption && (
                <figcaption className="text-center text-sm leading-6 text-[#777B98] italic">
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
          className="rounded-lg border border-white/10 bg-white/[0.04] p-4 transition"
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
              <div className="rounded-lg bg-[#121426] p-3">
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
                  className="w-full rounded border border-white/10 px-3 py-2 text-sm outline-none focus:border-[#A020F0] focus:ring-2 focus:ring-[#A020F0]/20"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleBlockDelete(block.id)}
                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/15"
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

export default function BlogsClient({
  initialBlogs,
}: {
  initialBlogs: BlogDTO[];
}) {
  const [user] = useAuthState(auth);
  const coverImageInputRef = useRef<HTMLInputElement>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [backendUserId, setBackendUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [editingBlog, setEditingBlog] = useState<BlogDTO | null>(null);
  const [formState, setFormState] = useState<BlogFormState>(DEFAULT_FORM_STATE);
  // Once the admin edits the slug by hand, stop auto-syncing it from the title.
  const [slugTouched, setSlugTouched] = useState(false);

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
      const storedToken = localStorage.getItem("msm_auth_token");
      if (active) setIdToken(storedToken);
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
          // eslint-disable-next-line no-restricted-syntax -- reviewed: public endpoint or sends the auth header itself
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

        // Don't restore an id while (or after) the user is logging out.
        if (!isSigningOut() && auth.currentUser && !getLoggedOutAt())
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

  // Admins fetch every blog (incl. drafts); regular visitors only see published.
  const publicBlogsQuery = useListBlogs();
  const adminBlogsQuery = useAdminBlogs(isAdmin ? idToken : null);
  // Server-rendered posts keep content in the initial HTML; the client
  // query takes over once it resolves.
  const blogs = isAdmin
    ? (adminBlogsQuery.data ?? [])
    : (publicBlogsQuery.data ?? initialBlogs);
  const error = isAdmin ? adminBlogsQuery.error : publicBlogsQuery.error;
  const isLoading = isAdmin
    ? !idToken || adminBlogsQuery.isLoading
    : publicBlogsQuery.isLoading && initialBlogs.length === 0;

  // Which submit button was pressed: "publish" makes the post live,
  // "draft" saves it hidden from the public.
  const submitModeRef = useRef<"publish" | "draft">("publish");

  const createBlogMutation = useCreateBlog();
  const updateBlogMutation = useUpdateBlog();
  const deleteBlogMutation = useDeleteBlog();
  const publishBlogMutation = usePublishBlog();
  const unpublishBlogMutation = useUnpublishBlog();
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
    unpublishBlogMutation.isPending ||
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
    setSlugTouched(false);
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
      // Send the slug only when set; the server slugifies + de-duplicates it,
      // and falls back to the title when omitted.
      ...(formState.slug.trim() ? { slug: formState.slug.trim() } : {}),
    };

    const mode = submitModeRef.current;

    const finalizePublishState = async (
      blog: BlogDTO,
      action: "created" | "updated",
    ) => {
      // Draft mode: keep the post hidden. If it was previously published,
      // pull it back to draft; otherwise nothing to do.
      if (mode === "draft") {
        if (blog.published_at) {
          try {
            await unpublishBlogMutation.mutateAsync({
              blogId: blog.id,
              idToken,
            });
          } catch (unpublishError) {
            const message =
              unpublishError instanceof Error
                ? unpublishError.message
                : "Failed to move the blog to draft.";
            setEditingBlog(blog);
            setFormState(mapBlogToFormState(blog));
            toast.error(
              `Blog ${action}, but it is still published. ${message}`,
            );
            return;
          }
        }
        toast.success(`Blog ${action} as draft.`);
        resetForm();
        return;
      }

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

  const showFeatured =
    selectedCategory === "All" &&
    !searchTerm.trim() &&
    filteredBlogs.length > 0;
  const featured = showFeatured ? filteredBlogs[0]! : null;
  const rest = showFeatured ? filteredBlogs.slice(1) : filteredBlogs;
  const adminActions = (blog: BlogDTO) =>
    isAdmin ? (
      <>
        <button
          type="button"
          onClick={() => handleEdit(blog)}
          className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-[#080914]/70 text-white backdrop-blur-md transition hover:bg-[#A020F0]"
          aria-label={`Edit ${blog.title ?? "story"}`}
        >
          <FiEdit2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => handleDelete(blog)}
          className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-[#080914]/70 text-red-300 backdrop-blur-md transition hover:bg-red-500 hover:text-white"
          aria-label={`Delete ${blog.title ?? "story"}`}
        >
          <FiTrash2 className="h-3.5 w-3.5" />
        </button>
      </>
    ) : undefined;
  const chip = (active: boolean) =>
    `h-9 shrink-0 rounded-full border px-4 text-[13px] font-medium whitespace-nowrap transition ${active ? "border-[#A020F0] bg-[#241333] text-[#D8B4FE]" : "border-white/10 text-[#A5A8C3] hover:text-white"}`;

  return (
    <div className="relative isolate flex min-h-screen w-full flex-col bg-[#080914] font-[family-name:var(--font-inter)] text-white">
      <StarField />
      <div className="relative z-10 flex flex-1 flex-col">
        <WebsiteNav />

        <main className="flex-1">
          {/* Hero */}
          <section className="mx-auto w-full max-w-[1280px] px-5 pt-16 pb-12 text-center md:px-10 md:pt-24 md:pb-16">
            <Reveal className="flex flex-col items-center">
              <p className="msm-r flex items-center gap-3 text-xs font-bold tracking-[0.18em] text-[#D8B4FE] uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-[#D8B4FE] shadow-[0_0_10px_#D8B4FE]" />
                MySlotMate Stories
              </p>
              <h1
                className="font-outfit msm-r mt-6 max-w-[15ch] text-[clamp(40px,6.4vw,84px)] leading-[1.02] font-light tracking-[-0.03em] text-balance"
                style={delay(0.1)}
              >
                Every star has{" "}
                <span
                  className={`${GRADIENT} bg-clip-text font-medium text-transparent`}
                >
                  a story.
                </span>
              </h1>
              <p
                className="msm-r mt-6 max-w-[540px] text-[17px] leading-relaxed text-[#A5A8C3]"
                style={delay(0.2)}
              >
                Notes from hosts and explorers across the Northeast, on what
                happens when people step outside and show up.
              </p>
              <label
                className="msm-r mt-9 flex h-12 w-full max-w-[440px] items-center gap-2.5 rounded-full border border-white/10 bg-[#121426]/80 px-4 backdrop-blur-md focus-within:border-[#A020F0]"
                style={delay(0.3)}
              >
                <FiSearch className="h-4 w-4 shrink-0 text-[#777B98]" />
                <span className="sr-only">Search stories</span>
                <input
                  type="search"
                  placeholder="Search stories"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="h-full w-full bg-transparent text-[15px] text-white outline-none placeholder:text-[#777B98]"
                />
              </label>
            </Reveal>
          </section>

          <div className="mx-auto w-full max-w-[1280px] px-5 md:px-10">
            {isAdmin && (
              <section className="mb-12 rounded-[28px] border border-white/10 bg-[#121426] p-6 text-white shadow-[0_18px_40px_rgba(60,121,175,0.08)]">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold tracking-[-0.03em] text-white">
                      {editingBlog ? "Edit Blog" : "Create Blog"}
                    </h2>
                    <p className="mt-1 text-sm text-[#A5A8C3]">
                      {editingBlog
                        ? "Update the selected article and save your changes."
                        : "Write a new article for the MySlotmate community."}
                    </p>
                  </div>

                  {editingBlog && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/[0.04]"
                    >
                      Cancel edit
                    </button>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-white/80">
                        Title
                      </span>
                      <input
                        type="text"
                        value={formState.title}
                        onChange={(event) => {
                          const nextTitle = event.target.value;
                          setFormState((current) => ({
                            ...current,
                            title: nextTitle,
                            // Auto-fill the slug from the title for a new,
                            // untouched blog; never silently change an existing
                            // blog's slug or one the admin has edited.
                            slug:
                              !editingBlog && !slugTouched
                                ? slugify(nextTitle)
                                : current.slug,
                          }));
                        }}
                        placeholder="How to Plan the Perfect Experience"
                        className="w-full rounded-xl border border-white/10 px-4 py-3 text-sm transition outline-none focus:border-[#A020F0] focus:ring-2 focus:ring-[#A020F0]/20"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-white/80">
                        URL slug
                      </span>
                      <input
                        type="text"
                        value={formState.slug}
                        onChange={(event) => {
                          setSlugTouched(true);
                          // Lenient while typing (keep a trailing hyphen so word
                          // boundaries work); the server slugifies again on save.
                          handleFormChange(
                            "slug",
                            event.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, "-")
                              .replace(/^-+/, ""),
                          );
                        }}
                        placeholder="how-to-plan-the-perfect-experience"
                        className="w-full rounded-xl border border-white/10 px-4 py-3 text-sm transition outline-none focus:border-[#A020F0] focus:ring-2 focus:ring-[#A020F0]/20"
                      />
                      <span className="mt-1 block text-xs text-[#777B98]">
                        /blogs/{formState.slug || "your-blog-slug"}
                        {editingBlog
                          ? " — changing this changes the blog's public URL."
                          : ""}
                      </span>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-white/80">
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
                        className="w-full rounded-xl border border-white/10 px-4 py-3 text-sm transition outline-none focus:border-[#A020F0] focus:ring-2 focus:ring-[#A020F0]/20"
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
                    <span className="mb-1.5 block text-sm font-medium text-white/80">
                      Short Description
                    </span>
                    <textarea
                      value={formState.description}
                      onChange={(event) =>
                        handleFormChange("description", event.target.value)
                      }
                      placeholder="Learn the key tips and tricks for hosting an unforgettable experience."
                      rows={3}
                      className="w-full rounded-xl border border-white/10 px-4 py-3 text-sm transition outline-none focus:border-[#A020F0] focus:ring-2 focus:ring-[#A020F0]/20"
                    />
                  </label>

                  <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-white/80">
                        Cover Image
                      </span>
                      <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.04] p-4">
                        {formState.cover_image_url ? (
                          <div className="space-y-3">
                            <div className="overflow-hidden rounded-xl bg-white/[0.06]">
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
                                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#121426] px-3 py-2 text-sm font-medium text-[#D8B4FE] transition hover:bg-white/[0.04]"
                              >
                                <FiUpload className="h-4 w-4" />
                                Replace image
                              </button>
                              <button
                                type="button"
                                onClick={clearCoverImage}
                                className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/15"
                              >
                                Remove image
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => coverImageInputRef.current?.click()}
                            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl px-4 py-8 text-center text-sm text-[#A5A8C3] transition hover:bg-[#121426]"
                          >
                            <FiImage className="h-8 w-8 text-[#D8B4FE]" />
                            <span className="font-medium text-white">
                              Upload a blog cover image
                            </span>
                            <span className="text-xs text-[#A5A8C3]">
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
                      <span className="mb-1.5 block text-sm font-medium text-white/80">
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
                        className="w-full rounded-xl border border-white/10 px-4 py-3 text-sm transition outline-none focus:border-[#A020F0] focus:ring-2 focus:ring-[#A020F0]/20"
                      />
                    </label>
                  </div>

                  <div className="block">
                    <span className="mb-3 block text-sm font-medium text-white/80">
                      Blog Content (With Images)
                    </span>
                    <p className="mb-4 text-sm text-[#A5A8C3]">
                      Create rich content with text and images. Use the buttons
                      to add new blocks, reorder them, and add captions to
                      images.
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
                      onClick={() => {
                        submitModeRef.current = "publish";
                      }}
                      disabled={isSaving || !idToken}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#A020F0] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#8A1AD0] disabled:cursor-not-allowed disabled:opacity-60"
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
                          : "Publish Blog"
                        : "Publish Blog"}
                    </button>

                    <button
                      type="submit"
                      onClick={() => {
                        submitModeRef.current = "draft";
                      }}
                      disabled={isSaving || !idToken}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-[#D8B4FE] transition hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {editingBlog?.published_at
                        ? "Move to Draft"
                        : "Save as Draft"}
                    </button>

                    {!idToken && (
                      <p className="text-sm text-amber-300">
                        Admin token is not available yet. Please wait a moment.
                      </p>
                    )}
                  </div>
                </form>
              </section>
            )}

            {isLoading ? (
              <div className="grid gap-6 pb-24 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <StoryCardSkeleton key={i} />
                ))}
              </div>
            ) : error ? (
              <div className="mb-24 rounded-[24px] border border-red-400/30 bg-red-500/10 px-6 py-5 text-sm text-red-200">
                {listErrorMessage}
              </div>
            ) : (
              <>
                {featured && (
                  <Reveal className="mb-16">
                    <div className="msm-r">
                      <FeaturedStory
                        blog={featured}
                        actions={adminActions(featured)}
                      />
                    </div>
                  </Reveal>
                )}

                {/* Filters */}
                <div className="sticky top-0 z-20 -mx-5 mb-8 flex flex-col gap-4 bg-[#080914]/80 px-5 py-4 backdrop-blur-xl md:-mx-10 md:flex-row md:items-center md:justify-between md:px-10">
                  <h2 className="font-outfit text-2xl font-bold">
                    {showFeatured ? "More stories" : "Stories"}
                    <span className="ml-2 text-base font-medium text-[#777B98]">
                      {rest.length}
                    </span>
                  </h2>
                  {categories.length > 0 && (
                    <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:px-0">
                      <button
                        type="button"
                        onClick={() => setSelectedCategory("All")}
                        className={chip(selectedCategory === "All")}
                      >
                        All
                      </button>
                      {categories.map((category) => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => setSelectedCategory(category)}
                          className={chip(selectedCategory === category)}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {rest.length > 0 ? (
                  <Reveal
                    className="grid gap-6 pb-24 md:grid-cols-2 lg:grid-cols-3"
                    threshold={0.1}
                  >
                    {rest.map((blog, i) => (
                      <div
                        key={blog.id}
                        className="msm-r"
                        style={delay((i % 3) * 0.12)}
                      >
                        <StoryCard
                          blog={blog}
                          i={i + 1}
                          className="h-full"
                          actions={adminActions(blog)}
                        />
                      </div>
                    ))}
                    {/* Fills an uneven last row with an invitation. */}
                    {rest.length % 3 !== 0 && (
                      <div
                        className={`msm-r ${rest.length % 2 === 0 ? "md:col-span-2 lg:col-span-1" : ""}`}
                        style={delay((rest.length % 3) * 0.12)}
                      >
                        <div className="relative flex h-full min-h-[320px] flex-col justify-end overflow-hidden rounded-[28px] border border-[#652A91] bg-gradient-to-br from-[#241333] via-[#121426] to-[#080914] p-8">
                          <div
                            aria-hidden
                            className="msm-drift absolute -top-16 -right-16 h-56 w-56 rounded-full bg-[#A020F0]/40 blur-[80px]"
                          />
                          <span className="absolute top-8 left-8 h-2 w-2 rounded-full bg-[#121426] shadow-[0_0_14px_4px_rgb(216_180_254/0.7)]" />
                          <p className="font-outfit relative text-[clamp(26px,2.4vw,32px)] leading-tight font-normal text-balance">
                            The best stories start with showing up.
                          </p>
                          <p className="relative mt-3 text-[15px] leading-relaxed text-[#A5A8C3]">
                            Find an event near you this week and write your own.
                          </p>
                          <Link
                            href="/#discover"
                            className={`font-outfit relative mt-6 flex h-11 w-fit items-center rounded-full px-5 text-[15px] font-semibold text-white ${GRADIENT}`}
                          >
                            Explore events
                          </Link>
                        </div>
                      </div>
                    )}
                  </Reveal>
                ) : (
                  <div className="mb-24 flex flex-col items-center rounded-[28px] border border-dashed border-white/10 px-6 py-16 text-center">
                    <span className="h-2 w-2 rounded-full bg-[#121426] shadow-[0_0_14px_4px_rgb(216_180_254/0.7)]" />
                    <p className="font-outfit mt-6 text-xl font-semibold">
                      {searchTerm || selectedCategory !== "All"
                        ? "No stories match that yet."
                        : showFeatured
                          ? "More stories are on their way."
                          : "No stories yet."}
                    </p>
                    <p className="mt-2 max-w-md text-sm text-[#A5A8C3]">
                      {searchTerm || selectedCategory !== "All"
                        ? "Try another word, or go back to all stories."
                        : "New stories from hosts and explorers will appear here."}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Moments: stories told in photos */}
          <section className="mx-auto w-full max-w-[1280px] px-5 pb-24 md:px-10">
            <Reveal className="max-w-[560px]">
              <p className="msm-r flex items-center gap-3 text-xs font-bold tracking-[0.18em] text-[#D8B4FE] uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-[#D8B4FE] shadow-[0_0_10px_#D8B4FE]" />
                Moments
              </p>
              <h2
                className="font-outfit msm-r mt-4 text-[clamp(28px,3.4vw,44px)] leading-[1.08] font-normal tracking-tight text-balance"
                style={delay(0.1)}
              >
                Some stories don&rsquo;t need words.
              </h2>
            </Reveal>
            <Reveal
              className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5"
              threshold={0.15}
            >
              {MOMENTS.map(([src, caption], i) => (
                <figure
                  key={src}
                  className="msm-r group relative overflow-hidden rounded-[24px] border border-white/10"
                  style={delay(i * 0.12)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`People at a MySlotMate ${caption} event`}
                    loading="lazy"
                    className="aspect-[3/4] w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                  <figcaption className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-[#080914]/90 to-transparent px-4 pt-12 pb-4 text-sm font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#121426] shadow-[0_0_10px_2px_rgb(216_180_254/0.7)]" />
                    {caption}
                  </figcaption>
                </figure>
              ))}
            </Reveal>
          </section>

          {/* Closing: back down to the city */}
          <section className="relative isolate flex min-h-[70svh] flex-col items-center overflow-hidden px-5 pt-20 pb-52 text-center">
            <CitySky skylineClass="h-[42%]" />
            <Reveal className="flex flex-col items-center">
              <h2 className="font-outfit msm-r max-w-[16ch] text-[clamp(34px,5vw,68px)] leading-[1.04] font-light tracking-[-0.03em] text-balance">
                The next story could be{" "}
                <span
                  className={`${GRADIENT} bg-clip-text font-medium text-transparent`}
                >
                  yours.
                </span>
              </h2>
              <div
                className="msm-r mt-9 flex flex-wrap justify-center gap-3"
                style={delay(0.15)}
              >
                <Link
                  href="/#discover"
                  className={`font-outfit flex h-12 items-center gap-1.5 rounded-full px-6 text-base font-semibold text-white ${GRADIENT}`}
                >
                  Find something to show up to
                </Link>
                <Link
                  href="/host-with-us"
                  className="font-outfit flex h-12 items-center rounded-full border border-white/15 bg-[#080914]/40 px-6 text-base font-semibold text-white backdrop-blur-md transition hover:bg-white/5"
                >
                  Host with us
                </Link>
              </div>
            </Reveal>
          </section>
        </main>

        <WebsiteFooter />
      </div>
    </div>
  );
}
