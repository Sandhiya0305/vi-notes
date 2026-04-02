import type React from "react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface EditorProps {
  content: string;
  placeholder?: string;
  isSessionActive: boolean;
  onContentChange: (content: string, inputType?: string | null) => void;
  onFocus: () => void;
  onBlur: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onPaste: (event: React.ClipboardEvent<HTMLDivElement>) => void;
}

export default function Editor({
  content,
  placeholder = "Start writing here. Focus begins a tracked session.",
  isSessionActive,
  onContentChange,
  onFocus,
  onBlur,
  onKeyDown,
  onPaste,
}: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const safeContent = typeof content === "string" ? content : "";

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerText !== safeContent) {
      editorRef.current.innerText = safeContent;
    }
  }, [safeContent]);

  const handleInput = (event: React.FormEvent<HTMLDivElement>) => {
    const nativeEvent = event.nativeEvent as InputEvent | undefined;
    const nextText = event.currentTarget?.innerText ?? "";
    onContentChange(nextText, nativeEvent?.inputType ?? null);
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Tracked Editor
          </p>
          <h2 className="text-lg font-semibold">
            Behavior-aware drafting workspace
          </h2>
        </div>
        <Badge variant={isSessionActive ? "success" : "secondary"}>
          {isSessionActive ? "Session live" : "Idle"}
        </Badge>
      </div>

      <div
        ref={editorRef}
        className={cn(
          "min-h-[400px] w-full rounded-lg border bg-background p-4 text-base leading-relaxed shadow-sm transition-colors",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground",
        )}
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder ?? "Start writing here."}
        suppressContentEditableWarning
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onInput={handleInput}
      />
    </section>
  );
}
