"use client";

import { useCallback, useRef, useState } from "react";
import { Upload } from "lucide-react";

interface FileUploadProps {
  onFileLoad: (content: string, fileName: string) => void;
}

export function FileUpload({ onFileLoad }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".md") && !file.name.endsWith(".markdown")) {
        alert("Please upload a Markdown file (.md or .markdown)");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        onFileLoad(text, file.name);
      };
      reader.readAsText(file);
    },
    [onFileLoad]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex w-full max-w-lg cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-12 transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
      >
        <div className="rounded-full bg-muted p-4">
          <Upload className="size-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-lg font-medium">Drop your .md file here</p>
          <p className="mt-1 text-sm text-muted-foreground">
            or click to browse files
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.markdown"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
