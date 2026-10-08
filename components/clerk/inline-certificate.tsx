"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Bold, Italic, Underline, Strikethrough, RemoveFormatting, AlignLeft, AlignCenter, AlignRight, Undo2, Redo2 } from "lucide-react";
import type MediumEditor from "medium-editor";

/** Keep browser edits outside React's generated template tree. */
export function InlineCertificate({ documentKey, revision, readDraft, onSave, editable, children }: {
  documentKey: string;
  revision: number;
  readDraft: () => string | undefined;
  onSave: (html: string) => void;
  editable: boolean;
  children: ReactNode;
}) {
  const template = useRef<HTMLDivElement>(null);
  const editor = useRef<HTMLDivElement>(null);
  const workspace = useRef<HTMLDivElement>(null);
  const richEditor = useRef<InstanceType<typeof MediumEditor> | null>(null);
  const saveDraft = useRef(onSave);
  const selection = useRef<Range | null>(null);
  const [focused, setFocused] = useState(false);
  const [ready, setReady] = useState(false);
  const [editorError, setEditorError] = useState(false);
  const [format, setFormat] = useState({ bold: false, italic: false, underline: false });

  useLayoutEffect(() => { saveDraft.current = onSave; });

  useEffect(() => {
    if (!editable || !editor.current) return;
    let disposed = false;
    let instance: InstanceType<typeof MediumEditor> | null = null;
    import("medium-editor").then(({ default: MediumEditor }) => {
      if (disposed || !editor.current) return;
      instance = new MediumEditor(editor.current, {
        toolbar: false,
        anchorPreview: false,
        placeholder: false,
        imageDragging: false,
        spellcheck: true,
        paste: { forcePlainText: true, cleanPastedHTML: true },
      });
      instance.subscribe("editableInput", (_event: any, element: any) => saveDraft.current(element.innerHTML));
      richEditor.current = instance;
      setReady(true);
      setEditorError(false);
    }).catch(() => { if (!disposed) setEditorError(true); });
    return () => { disposed = true; instance?.destroy(); richEditor.current = null; };
  }, [editable]);

  useEffect(() => {
    const rememberSelection = () => {
      const current = window.getSelection();
      if (!current?.rangeCount || !editor.current?.contains(current.anchorNode) || !editor.current.contains(current.focusNode)) return;
      selection.current = current.getRangeAt(0).cloneRange();
      setFormat({ bold: richEditor.current?.queryCommandState("bold") ?? false, italic: richEditor.current?.queryCommandState("italic") ?? false, underline: richEditor.current?.queryCommandState("underline") ?? false });
    };
    const outside = (event: PointerEvent) => {
      if (!workspace.current?.contains(event.target as Node)) setFocused(false);
    };
    document.addEventListener("selectionchange", rememberSelection);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("selectionchange", rememberSelection);
      document.removeEventListener("pointerdown", outside);
    };
  }, []);

  useLayoutEffect(() => {
    if (editor.current && template.current) {
      selection.current = null;
      editor.current.innerHTML = readDraft() ?? template.current.innerHTML;
    }
  }, [documentKey, revision, readDraft, children]);

  const save = () => {
    if (editor.current) saveDraft.current(editor.current.innerHTML);
  };

  const applyFormat = (command: string, value?: string) => {
    if (!editable || !richEditor.current) return;
    editor.current?.focus();
    const current = window.getSelection();
    if (selection.current && editor.current?.contains(selection.current.commonAncestorContainer)) {
      current?.removeAllRanges();
      current?.addRange(selection.current);
    }
    richEditor.current.execAction(command, value ? { value } : undefined);
    richEditor.current.checkContentChanged(editor.current ?? undefined);
    save();
    if (current?.rangeCount) selection.current = current.getRangeAt(0).cloneRange();
    setFormat({ bold: richEditor.current.queryCommandState("bold"), italic: richEditor.current.queryCommandState("italic"), underline: richEditor.current.queryCommandState("underline") });
  };

  return <div ref={workspace} className="certificate-editor-workspace">
    <div className="certificate-format-toolbar no-print" role="toolbar" aria-label="Certificate text formatting">
      {focused && editable && ready ? <>
        {([{ command: "bold", label: "Bold", icon: Bold }, { command: "italic", label: "Italic", icon: Italic }, { command: "underline", label: "Underline", icon: Underline }] as const).map(item => <button key={item.command} type="button" title={item.label} aria-label={item.label} aria-pressed={format[item.command]} onMouseDown={event => event.preventDefault()} onClick={() => applyFormat(item.command)}><item.icon size={16} /></button>)}
        <span className="format-divider" />
        <select aria-label="Font family" defaultValue="" onChange={event => applyFormat("fontName", event.target.value)} className="h-8 max-w-32 rounded border border-slate-200 bg-white px-2 text-xs"><option value="" disabled>Font</option><option value="Georgia">Georgia</option><option value="Times New Roman">Times New Roman</option><option value="Arial">Arial</option><option value="Calibri">Calibri</option></select>
        <select aria-label="Font size" defaultValue="" onChange={event => applyFormat("fontSize", event.target.value)} className="h-8 rounded border border-slate-200 bg-white px-2 text-xs"><option value="" disabled>Size</option>{[{ value: "2", label: "Small" }, { value: "3", label: "Normal" }, { value: "4", label: "Large" }, { value: "5", label: "Heading" }].map(size => <option key={size.value} value={size.value}>{size.label}</option>)}</select>
        <button type="button" title="Strikethrough" aria-label="Strikethrough" onMouseDown={event => event.preventDefault()} onClick={() => applyFormat("strikeThrough")}><Strikethrough size={16} /></button>
        <button type="button" title="Clear formatting" aria-label="Clear formatting" onMouseDown={event => event.preventDefault()} onClick={() => applyFormat("removeFormat")}><RemoveFormatting size={16} /></button>
        <span className="format-divider" />
        <label className="format-color" title="Text color">Text color<input type="color" aria-label="Text color" defaultValue="#173044" onChange={event => applyFormat("foreColor", event.target.value)} /></label>
        <span className="format-divider" />
        {[{ command: "justifyLeft", label: "Align left", icon: AlignLeft }, { command: "justifyCenter", label: "Align center", icon: AlignCenter }, { command: "justifyRight", label: "Align right", icon: AlignRight }, { command: "undo", label: "Undo", icon: Undo2 }, { command: "redo", label: "Redo", icon: Redo2 }].map(item => <button key={item.command} type="button" title={item.label} aria-label={item.label} onMouseDown={event => event.preventDefault()} onClick={() => applyFormat(item.command)}><item.icon size={16} /></button>)}
      </> : <span className="format-placeholder">{editorError ? "Formatting could not load. Please refresh to retry." : editable && !ready ? "Loading text formatting…" : "Click the certificate to start editing"}</span>}
    </div>
    <div ref={template} hidden aria-hidden="true">{children}</div>
    <div
      id="printable-certificate"
      ref={editor}
      className="certificate-sheet certificate-editable"
      contentEditable={editable}
      suppressContentEditableWarning
      role="textbox"
      aria-label="Editable certificate. Click any text to change it before printing."
      aria-multiline="true"
      spellCheck
      onFocus={() => setFocused(true)}
      onInput={save}
      onDrop={event => event.preventDefault()}
    />
  </div>;
}
