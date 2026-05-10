import { useState, useCallback } from "react";

interface UseDragDropOptions {
  onDrop: (files: File[]) => void;
  accept?: string; // e.g., "image/*" or ".pdf,.doc"
}

export function useDragDrop({
  onDrop,
  accept = "image/*",
}: UseDragDropOptions) {
  const [isDragging, setIsDragging] = useState(false);

  const validateFiles = useCallback(
    (files: FileList | File[]): File[] => {
      const fileArray = Array.from(files);

      // Filter by accept pattern
      if (accept) {
        return fileArray.filter((file) => {
          if (accept === "image/*") {
            return file.type.startsWith("image/");
          }
          // For other patterns, just accept if accept contains *
          if (accept.includes("*")) {
            const ext = file.name.split(".").pop()?.toLowerCase();
            const acceptTypes = accept
              .split(",")
              .map((t) => t.trim().replace(".", ""));
            return acceptTypes.some(
              (type) => type === "*" || (ext && acceptTypes.includes(ext)),
            );
          }
          return true;
        });
      }

      return fileArray;
    },
    [accept],
  );

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = validateFiles(e.dataTransfer.files);
      if (files.length > 0) {
        onDrop(files);
      }
    },
    [onDrop, validateFiles],
  );

  return {
    isDragging,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
  };
}
