"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
} from "~/hooks/useApi";
import type { BlogCreatePayload, BlogDTO } from "~/lib/api";
import { auth } from "~/utils/firebase";
import { env } from "~/env";

type BlogFormState = {
  category: string;
  content: string;
  cover_image_url: string;
  coverImageFile: File | null;
  description: string;
  read_time_minutes: string;
  title: string;
};

const DEFAULT_FORM_STATE: BlogFormState = {
  category: "",
  content: "",
  cover_image_url: "",
  coverImageFile: null,
  description: "",
  read_time_minutes: "5",
  title: "",
};

const FALLBACK_BLOG_IMAGE = "/assets/home/hiking.jpg";

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
    content: getBlogValue(blog.content),
    cover_image_url: blog.cover_image_url ?? "",
    coverImageFile: null,
    description: getBlogValue(blog.description),
    read_time_minutes: String(blog.read_time_minutes ?? 5),
    title: getBlogValue(blog.title),
  };
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

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="h-52 overflow-hidden bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={blog.cover_image_url ?? FALLBACK_BLOG_IMAGE}
          alt={getBlogValue(blog.title, "Blog cover")}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>

      <div className="p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getCategoryColor(blog.category)}`}
          >
            {getBlogValue(blog.category, "General")}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <FiClock className="h-3.5 w-3.5" />
            {blog.read_time_minutes ?? 5} min read
          </span>
        </div>

        <h3 className="line-clamp-2 text-xl font-bold text-[#16304c]">
          {getBlogValue(blog.title, "Untitled blog")}
        </h3>
        <p className="mt-2 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-[#6f8daa]">
          {getBlogExcerpt(blog)}
        </p>

        <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
          <div className="space-y-1 text-xs text-gray-500">
            <p className="flex items-center gap-1.5">
              <LuUser className="h-3.5 w-3.5" />
              {getBlogValue(blog.author_name, "MySlotmate Team")}
            </p>
            <p className="flex items-center gap-1.5">
              <LuCalendar className="h-3.5 w-3.5" />
              {displayDate}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => onEdit(blog)}
                  className="rounded-lg border border-[#cceeff] bg-[#f0faff] p-2 text-[#0094CA] transition hover:bg-[#e6f6ff]"
                  aria-label={`Edit ${getBlogValue(blog.title, "blog")}`}
                >
                  <FiEdit2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(blog)}
                  className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 transition hover:bg-red-100"
                  aria-label={`Delete ${getBlogValue(blog.title, "blog")}`}
                >
                  <FiTrash2 className="h-4 w-4" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => onOpen(blog.id)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0094CA] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#007dab]"
            >
              Read
              <LuArrowRight className="h-4 w-4" />
            </button>
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
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 rounded-full bg-white/90 p-2 text-gray-600 shadow-sm transition hover:bg-white hover:text-gray-900"
          aria-label="Close blog"
        >
          <FiX className="h-5 w-5" />
        </button>

        {isLoading ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <LuLoader2 className="h-8 w-8 animate-spin text-[#0094CA]" />
          </div>
        ) : blog ? (
          <>
            <div className="h-72 overflow-hidden bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={blog.cover_image_url ?? FALLBACK_BLOG_IMAGE}
                alt={getBlogValue(blog.title, "Blog cover")}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>

            <div className="p-6 sm:p-8">
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

              <div className="prose prose-slate mt-6 max-w-none text-[15px] leading-8 whitespace-pre-line text-[#29465f]">
                {getBlogValue(blog.content)}
              </div>
            </div>
          </>
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

    const readTime = Number.parseInt(formState.read_time_minutes, 10);
    if (!formState.title.trim() || !formState.category.trim()) {
      toast.error("Title and category are required.");
      return;
    }
    if (!formState.description.trim() || !formState.content.trim()) {
      toast.error("Description and content are required.");
      return;
    }
    if (!Number.isFinite(readTime) || readTime <= 0) {
      toast.error("Read time must be a positive number.");
      return;
    }

    const payload: BlogCreatePayload = {
      category: formState.category.trim(),
      content: formState.content.trim(),
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
        setEditingBlog(blog);
        setFormState(mapBlogToFormState(blog));
        const message =
          publishError instanceof Error
            ? publishError.message
            : "Automatic publishing failed.";
        toast.error(`Blog ${action}, but publishing failed. ${message}`);
      }
    };

    try {
      let coverImageUrl = formState.cover_image_url.trim() || undefined;

      if (formState.coverImageFile) {
        const uploadedCover = await uploadBlogCoverMutation.mutateAsync(
          formState.coverImageFile,
        );

        if (!uploadedCover?.url) {
          throw new Error("Blog cover upload failed.");
        }

        coverImageUrl = uploadedCover.url;
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
      toast.error(message);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <components.Navbar />

      <div className="flex-1">
        <div className="site-x mx-auto w-full max-w-[1120px] py-8 pt-24">
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

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">
                    Full Content
                  </span>
                  <textarea
                    value={formState.content}
                    onChange={(event) =>
                      handleFormChange("content", event.target.value)
                    }
                    placeholder="Write the full blog article here..."
                    rows={10}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm transition outline-none focus:border-[#0094CA] focus:ring-2 focus:ring-[#0094CA]/20"
                  />
                </label>

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

          <section className="mb-8 flex flex-col gap-4 rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
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
