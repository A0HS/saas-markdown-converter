"use client";

import { Download, RotateCcw, Loader2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/shared/theme-toggle";

interface ConverterToolbarProps {
  fileName: string | null;
  isConverting: boolean;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  onConvert: () => void;
  onReset: () => void;
}

export function ConverterToolbar({
  fileName,
  isConverting,
  fontSize,
  onFontSizeChange,
  onConvert,
  onReset,
}: ConverterToolbarProps) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b px-3">
      <div className="flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 32 32"
          fill="none"
          className="size-6 shrink-0"
        >
          <rect x="2" y="2" width="28" height="28" rx="6" fill="#2B579A"/>
          <text x="16" y="24" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="22" fill="white" textAnchor="middle">W</text>
        </svg>
        <h1 className="text-sm font-semibold tracking-tight">
          <span className="hidden sm:inline">한국GPT협회 Markdown to Word</span>
          <span className="sm:hidden">한국GPT협회 MD → Word</span>
        </h1>
      </div>

      <div className="flex items-center gap-1">
        {fileName && (
          <>
            <span className="hidden max-w-[200px] truncate text-xs text-muted-foreground md:inline">
              {fileName}
            </span>

            <div className="flex items-center gap-0.5 rounded-md border px-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onFontSizeChange(Math.max(8, fontSize - 1))}
                    disabled={fontSize <= 8}
                  >
                    <Minus />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Decrease font size</TooltipContent>
              </Tooltip>
              <span className="w-10 text-center text-xs tabular-nums">
                {fontSize}px
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onFontSizeChange(Math.min(20, fontSize + 1))}
                    disabled={fontSize >= 20}
                  >
                    <Plus />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Increase font size</TooltipContent>
              </Tooltip>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  onClick={onConvert}
                  disabled={isConverting}
                >
                  {isConverting ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Download />
                  )}
                  <span className="hidden sm:inline">
                    {isConverting ? "Converting..." : "Convert to Word"}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download as .docx</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onReset}>
                  <RotateCcw className="size-4" />
                  <span className="sr-only">Reset</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset</TooltipContent>
            </Tooltip>
          </>
        )}

        <ThemeToggle />
      </div>
    </header>
  );
}
