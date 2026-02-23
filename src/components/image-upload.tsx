"use client";

import { useState, useCallback } from "react";
import { X, Loader2, ImageIcon } from "lucide-react";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;
      if (file.size > 5 * 1024 * 1024) {
        alert("La imagen no puede superar 5MB");
        return;
      }

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/menu/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");

        const data = await res.json();
        onChange(data.secure_url);
      } catch {
        alert("Error al subir la imagen");
      } finally {
        setUploading(false);
      }
    },
    [onChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [handleUpload],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
    },
    [handleUpload],
  );

  if (value) {
    return (
      <div className="relative group rounded-xl overflow-hidden border border-white/10">
        <img
          src={value}
          alt="Preview"
          className="w-full h-40 object-cover"
        />
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center h-40 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
        dragOver
          ? "border-orange-500 bg-orange-500/10"
          : "border-white/10 hover:border-white/20 bg-white/[0.02]"
      }`}
    >
      {uploading ? (
        <Loader2 size={24} className="text-orange-400 animate-spin" />
      ) : (
        <>
          <ImageIcon size={24} className="text-slate-500 mb-2" />
          <span className="text-xs text-slate-400">
            Arrastra una imagen o haz clic
          </span>
          <span className="text-xs text-slate-600 mt-0.5">
            JPG, PNG. Máx 5MB.
          </span>
        </>
      )}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInput}
        disabled={uploading}
      />
    </label>
  );
}
