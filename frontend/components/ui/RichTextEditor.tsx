'use client';

import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  helperText?: string;
  minHeight?: number;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Start typing...',
  disabled = false,
  error,
  label,
  helperText,
  minHeight = 200,
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-teal-400 hover:text-teal-300 underline',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none',
        style: `min-height: ${minHeight}px; padding: 16px;`,
      },
    },
  });

  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!isMounted || !editor) {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-white mb-2">
            {label}
          </label>
        )}
        <div
          className="rounded-xl overflow-hidden border-2"
          style={{
            backgroundColor: 'oklch(0.1 0 0 / 0.8)',
            borderColor: 'oklch(0.7 0.15 180 / 0.2)',
            minHeight: `${minHeight}px`,
          }}
        >
          <div className="p-4 text-gray-500 text-sm">Loading editor...</div>
        </div>
      </div>
    );
  }

  const toggleBold = () => editor.chain().focus().toggleBold().run();
  const toggleItalic = () => editor.chain().focus().toggleItalic().run();
  const toggleUnderline = () => editor.chain().focus().toggleUnderline().run();
  const toggleBulletList = () => editor.chain().focus().toggleBulletList().run();
  const toggleOrderedList = () => editor.chain().focus().toggleOrderedList().run();
  const setHeading = (level: 1 | 2 | 3) => editor.chain().focus().toggleHeading({ level }).run();
  const setLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };
  const unsetLink = () => editor.chain().focus().unsetLink().run();

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-white mb-2">
          {label}
        </label>
      )}
      <div
        className={`rounded-xl overflow-hidden border-2 transition-all ${
          error
            ? 'border-red-500/50'
            : 'border-teal-500/20 focus-within:border-teal-500/50'
        }`}
        style={{
          backgroundColor: 'oklch(0.1 0 0 / 0.8)',
        }}
      >
        {/* Toolbar */}
        <div
          className="flex flex-wrap items-center gap-1 p-2 border-b-2"
          style={{
            backgroundColor: 'oklch(0.15 0 0 / 0.9)',
            borderColor: 'oklch(0.7 0.15 180 / 0.2)',
          }}
        >
          {/* Text Formatting */}
          <div className="flex items-center gap-1 border-r-2 pr-2 mr-2" style={{ borderColor: 'oklch(0.7 0.15 180 / 0.2)' }}>
            <button
              type="button"
              onClick={toggleBold}
              className={`p-2 rounded hover:bg-teal-500/20 transition-colors ${
                editor.isActive('bold') ? 'bg-teal-500/30 text-teal-400' : 'text-gray-400 hover:text-teal-400'
              }`}
              title="Bold"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={toggleItalic}
              className={`p-2 rounded hover:bg-teal-500/20 transition-colors ${
                editor.isActive('italic') ? 'bg-teal-500/30 text-teal-400' : 'text-gray-400 hover:text-teal-400'
              }`}
              title="Italic"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </button>
            <button
              type="button"
              onClick={toggleUnderline}
              className={`p-2 rounded hover:bg-teal-500/20 transition-colors ${
                editor.isActive('underline') ? 'bg-teal-500/30 text-teal-400' : 'text-gray-400 hover:text-teal-400'
              }`}
              title="Underline"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19h14M5 7h14M5 12h14" />
              </svg>
            </button>
          </div>

          {/* Headings */}
          <div className="flex items-center gap-1 border-r-2 pr-2 mr-2" style={{ borderColor: 'oklch(0.7 0.15 180 / 0.2)' }}>
            <button
              type="button"
              onClick={() => setHeading(1)}
              className={`p-2 rounded hover:bg-teal-500/20 transition-colors ${
                editor.isActive('heading', { level: 1 }) ? 'bg-teal-500/30 text-teal-400' : 'text-gray-400 hover:text-teal-400'
              }`}
              title="Heading 1"
            >
              <span className="text-xs font-bold">H1</span>
            </button>
            <button
              type="button"
              onClick={() => setHeading(2)}
              className={`p-2 rounded hover:bg-teal-500/20 transition-colors ${
                editor.isActive('heading', { level: 2 }) ? 'bg-teal-500/30 text-teal-400' : 'text-gray-400 hover:text-teal-400'
              }`}
              title="Heading 2"
            >
              <span className="text-xs font-bold">H2</span>
            </button>
            <button
              type="button"
              onClick={() => setHeading(3)}
              className={`p-2 rounded hover:bg-teal-500/20 transition-colors ${
                editor.isActive('heading', { level: 3 }) ? 'bg-teal-500/30 text-teal-400' : 'text-gray-400 hover:text-teal-400'
              }`}
              title="Heading 3"
            >
              <span className="text-xs font-bold">H3</span>
            </button>
          </div>

          {/* Lists */}
          <div className="flex items-center gap-1 border-r-2 pr-2 mr-2" style={{ borderColor: 'oklch(0.7 0.15 180 / 0.2)' }}>
            <button
              type="button"
              onClick={toggleBulletList}
              className={`p-2 rounded hover:bg-teal-500/20 transition-colors ${
                editor.isActive('bulletList') ? 'bg-teal-500/30 text-teal-400' : 'text-gray-400 hover:text-teal-400'
              }`}
              title="Bullet List"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              type="button"
              onClick={toggleOrderedList}
              className={`p-2 rounded hover:bg-teal-500/20 transition-colors ${
                editor.isActive('orderedList') ? 'bg-teal-500/30 text-teal-400' : 'text-gray-400 hover:text-teal-400'
              }`}
              title="Numbered List"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
            </button>
          </div>

          {/* Link */}
          <div className="flex items-center gap-1">
            {editor.isActive('link') ? (
              <button
                type="button"
                onClick={unsetLink}
                className="p-2 rounded hover:bg-teal-500/20 transition-colors bg-teal-500/30 text-teal-400"
                title="Remove Link"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={setLink}
                className="p-2 rounded hover:bg-teal-500/20 transition-colors text-gray-400 hover:text-teal-400"
                title="Add Link"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Editor Content */}
        <div
          style={{
            minHeight: `${minHeight}px`,
            maxHeight: '600px',
            overflowY: 'auto',
          }}
        >
          <EditorContent
            editor={editor}
            className="prose prose-invert max-w-none"
            style={{
              color: 'white',
            }}
          />
          <style jsx global>{`
            .ProseMirror {
              outline: none;
              padding: 16px;
              color: white;
              min-height: ${minHeight}px;
            }
            
            .ProseMirror p {
              margin: 0.5em 0;
            }
            
            .ProseMirror p.is-editor-empty:first-child::before {
              content: attr(data-placeholder);
              float: left;
              color: #6b7280;
              pointer-events: none;
              height: 0;
            }
            
            .ProseMirror h1,
            .ProseMirror h2,
            .ProseMirror h3 {
              margin: 0.75em 0 0.5em 0;
              font-weight: 600;
              color: white;
            }
            
            .ProseMirror h1 {
              font-size: 1.5em;
            }
            
            .ProseMirror h2 {
              font-size: 1.25em;
            }
            
            .ProseMirror h3 {
              font-size: 1.1em;
            }
            
            .ProseMirror ul,
            .ProseMirror ol {
              padding-left: 1.5em;
              margin: 0.5em 0;
            }
            
            .ProseMirror li {
              margin: 0.25em 0;
            }
            
            .ProseMirror a {
              color: #14b8a6;
              text-decoration: underline;
            }
            
            .ProseMirror a:hover {
              color: #5eead4;
            }
            
            .ProseMirror strong {
              font-weight: 600;
            }
            
            .ProseMirror em {
              font-style: italic;
            }
            
            .ProseMirror u {
              text-decoration: underline;
            }
          `}</style>
        </div>
      </div>
      {error && (
        <p className="mt-2 text-sm flex items-center gap-1.5" style={{ color: 'oklch(0.65 0.2 330)' }}>
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </p>
      )}
      {helperText && !error && (
        <p className="mt-2 text-xs text-gray-500">{helperText}</p>
      )}
    </div>
  );
};
