"use client";

import { useCallback, useState } from "react";
import { ConverterToolbar } from "./converter-toolbar";
import { FileUpload } from "./file-upload";
import { MarkdownPreview } from "./markdown-preview";

export function ConverterLayout() {
  const [content, setContent] = useState<string>("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [fontSize, setFontSize] = useState(10);

  const handleFileLoad = useCallback((text: string, name: string) => {
    setContent(text);
    setFileName(name);
  }, []);

  const handleReset = useCallback(() => {
    setContent("");
    setFileName(null);
  }, []);

  const handleConvert = useCallback(async () => {
    if (!content || !fileName) return;

    setIsConverting(true);
    try {
      const response = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown: content }),
      });

      if (!response.ok) {
        throw new Error("Conversion failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName.replace(/\.(md|markdown)$/, ".docx");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Convert error:", error);
      alert("Failed to convert. Please try again.");
    } finally {
      setIsConverting(false);
    }
  }, [content, fileName]);

  return (
    <div className="flex h-dvh flex-col">
      <ConverterToolbar
        fileName={fileName}
        isConverting={isConverting}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        onConvert={handleConvert}
        onReset={handleReset}
      />
      <main className="flex-1 overflow-hidden">
        {fileName ? (
          <MarkdownPreview content={content} fontSize={fontSize} />
        ) : (
          <FileUpload onFileLoad={handleFileLoad} />
        )}
      </main>
    </div>
  );
}
