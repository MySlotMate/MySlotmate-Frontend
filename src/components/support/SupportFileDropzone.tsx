"use client";

import { useRef, useState } from "react";
import { FiUploadCloud } from "react-icons/fi";

interface SupportFileDropzoneProps {
  fileName?: string | null;
  onFileSelected: (file: File) => void;
  accept?: string;
  helperText?: string;
}

export default function SupportFileDropzone({
  fileName,
  onFileSelected,
  accept = ".svg,.png,.jpg,.jpeg,.pdf",
  helperText = "SVG, PNG, JPG or PDF (max. 10MB)",
}: SupportFileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleSelect = (file?: File | null) => {
    if (!file) {
      return;
    }

    onFileSelected(file);
  };

  return (
    <div
      onDragEnter={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setDragActive(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setDragActive(false);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setDragActive(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setDragActive(false);
        handleSelect(event.dataTransfer.files?.[0]);
      }}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-9 text-center transition ${
        dragActive
          ? "border-[#A020F0] bg-[#241333]"
          : "border-white/10 bg-white/[0.04] hover:border-[#A020F0]"
      }`}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => handleSelect(event.target.files?.[0])}
      />

      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#241333] text-[#D8B4FE]">
        <FiUploadCloud className="h-6 w-6" />
      </div>

      <div>
        <p className="text-sm font-semibold text-white">
          Click to upload or drag and drop
        </p>
        <p className="mt-1 text-xs text-[#A5A8C3]">{helperText}</p>
      </div>

      {fileName && (
        <p className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
          {fileName}
        </p>
      )}
    </div>
  );
}
