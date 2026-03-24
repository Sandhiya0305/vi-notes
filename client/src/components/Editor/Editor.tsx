import type React from 'react';
import { useEffect, useRef } from 'react';
import '../../styles/editor.css';

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
  placeholder = 'Start writing here. Focus begins a tracked session.',
  isSessionActive,
  onContentChange,
  onFocus,
  onBlur,
  onKeyDown,
  onPaste,
}: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const safeContent = typeof content === 'string' ? content : '';

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerText !== safeContent) {
      editorRef.current.innerText = safeContent;
    }
  }, [safeContent]);

  const handleInput = (event: React.FormEvent<HTMLDivElement>) => {
    const nativeEvent = event.nativeEvent as InputEvent | undefined;
    const nextText = event.currentTarget?.innerText ?? '';
    onContentChange(nextText, nativeEvent?.inputType ?? null);
  };

  return (
    <section className="editor-shell">
      <div className="editor-header">
        <div>
          <p className="eyebrow">Tracked Editor</p>
          <h2>Behavior-aware drafting workspace</h2>
        </div>
        <span className={isSessionActive ? 'editor-badge active' : 'editor-badge'}>
          {isSessionActive ? 'Session live' : 'Idle'}
        </span>
      </div>

      <div
        ref={editorRef}
        className="editor-surface editor-textarea"
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder ?? 'Start writing here.'}
        style={{ color: '#111827', caretColor: '#111827', backgroundColor: '#ffffff' }}
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
