"use client";

import { useState } from "react";
import { Paperclip, X, Loader2, FileText } from "lucide-react";
import { toast } from "@/components/ui/toaster";

interface UploadedFile {
  fileId: string;
  url: string;
  name: string;
  isImage: boolean;
}

export function ReceiptUploader({ onChange }: { onChange: (fileIds: string[]) => void }) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    const uploaded: UploadedFile[] = [];
    for (const file of Array.from(fileList)) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", "RECEIPT");
      try {
        const res = await fetch("/api/uploads", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "فشل رفع الملف");
        uploaded.push({ fileId: data.fileId, url: data.url, name: file.name, isImage: file.type.startsWith("image/") });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "فشل رفع الملف");
      }
    }
    setUploading(false);
    setFiles((prev) => {
      const next = [...prev, ...uploaded];
      onChange(next.map((f) => f.fileId));
      return next;
    });
  }

  function remove(fileId: string) {
    setFiles((prev) => {
      const next = prev.filter((f) => f.fileId !== fileId);
      onChange(next.map((f) => f.fileId));
      return next;
    });
  }

  return (
    <div className="space-y-2">
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground hover:border-primary-300 hover:text-primary-700">
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
        {uploading ? "جاري الرفع..." : "أرفق صورة أو PDF للإيصال"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading}
        />
      </label>
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f) => (
            <div key={f.fileId} className="flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs">
              {f.isImage ? <Paperclip className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
              <span className="max-w-[120px] truncate">{f.name}</span>
              <button type="button" onClick={() => remove(f.fileId)}>
                <X className="h-3 w-3 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
