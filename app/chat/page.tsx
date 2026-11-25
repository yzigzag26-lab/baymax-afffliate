'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { AppShell } from '@/components/AppShell';
import { Icon } from '@/components/icons';

interface Attachment {
  name: string;
  path: string;
  mime: string;
  size: number;
  url: string;
}

interface Msg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  meta?: { toolTrace?: { name: string; ok: boolean }[]; provider?: string; attachments?: Attachment[] };
}

interface PendingFile {
  file: File;
  preview?: string;
}

/** Autonomous agent pipeline shown while a reply is being produced. */
const MAX_FILES = 6;
const MAX_SIZE = 15 * 1024 * 1024; // 15MB — matches backend limit

function ext(name: string): string {
  const m = name.match(/\.([a-z0-9]{1,6})$/i);
  return m ? m[1].toUpperCase() : 'FILE';
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(f: File): boolean {
  return f.type.startsWith('image/');
}

/** Attachment URLs from the backend are either absolute (Supabase) or root-relative (local mode behind /api). */
function resolveUrl(url: string): string {
  return url.startsWith('/') ? '/api' + url : url;
}

export default function ChatPage() {
  return (
    <AppShell title="Chat">
      <ChatBody />
    </AppShell>
  );
}

function ChatBody() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState<{ phase: 'upload' | 'agent' } | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  useEffect(() => {
    api<{ messages: Msg[] }>('/chat/messages').then((r) => {
      setMessages(r.messages);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const pane = messagesRef.current;
    if (pane) pane.scrollTo({ top: pane.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);


  function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list);
    setError('');
    setPending((prev) => {
      const next = [...prev];
      for (const file of incoming) {
        if (next.length >= MAX_FILES) {
          setError(`Max ${MAX_FILES} files per message`);
          break;
        }
        if (file.size > MAX_SIZE) {
          setError(`"${file.name}" is larger than 15 MB`);
          continue;
        }
        if (next.some((p) => p.file.name === file.name && p.file.size === file.size)) continue;
        next.push({
          file,
          preview: isImageFile(file) ? URL.createObjectURL(file) : undefined,
        });
      }
      return next;
    });
  }

  async function captureScreenshot() {
    setError('');
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError('Screen capture is not supported by this browser. You can attach a screenshot file instead.');
      return;
    }
    let stream: MediaStream | undefined;
    try {
      // The browser will ask you to choose a tab, window, or entire screen.
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const track = stream.getVideoTracks()[0];
      if (!track) throw new Error('No screen was selected.');
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      await video.play();
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not capture the selected screen.');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Screenshot capture failed.')), 'image/png');
      });
      const file = new File([blob], `baymax-screenshot-${Date.now()}.png`, { type: 'image/png' });
      addFiles([file]);
    } catch (e: any) {
      if (e?.name !== 'NotAllowedError' && e?.name !== 'AbortError') {
        setError(e?.message ?? 'Could not capture the selected screen.');
      }
    } finally {
      stream?.getTracks().forEach((track) => track.stop());
    }
  }

  function removePending(index: number) {
    setPending((prev) => {
      const target = prev[index];
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function send(text: string) {
    const message = text.trim();
    if ((!message && !pending.length) || thinking) return;
    setError('');

    const outgoing = pending;
    setPending([]);
    setInput('');
    const optimistic: Msg = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);

    let sent: Attachment[] = [];
    try {
      if (outgoing.length) {
        setThinking({ phase: 'upload' });
        const fd = new FormData();
        outgoing.forEach((p) => fd.append('files', p.file));
        const up = await api<{ files: Attachment[] }>('/chat/upload', { method: 'POST', body: fd });
        sent = up.files;
        // reflect real attachments on the optimistic message
        setMessages((m) =>
          m.map((msg) => (msg.id === optimistic.id ? { ...msg, meta: { attachments: sent } } : msg))
        );
      }

      setThinking({ phase: 'agent' });
      const res = await api<{ reply: string; toolTrace: { name: string; ok: boolean }[]; provider: string }>(
        '/chat',
        { body: { message: message || 'Please review the attached files.', attachments: sent.length ? sent : undefined } }
      );
      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: res.reply,
          created_at: new Date().toISOString(),
          meta: { toolTrace: res.toolTrace, provider: res.provider },
        },
      ]);
    } catch (e: any) {
      setError(e?.message ?? 'Message failed');
    } finally {
      outgoing.forEach((p) => p.preview && URL.revokeObjectURL(p.preview));
      setThinking(null);
    }
  }

  const empty = messages.length === 0 && !thinking;

  return (
    <div
      className="relative h-full w-full max-w-none mx-0"
      onDragOver={(e) => {
        e.preventDefault();
        if (!dragging) setDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        dragDepth.current = 0;
        setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
      }}
    >
      {/* ambient glass backdrop */}
      <div className="ambient" aria-hidden="true">
        <span className="b1" />
        <span className="b2" />
        <span className="b3" />
      </div>

      {/* drag & drop overlay */}
      {dragging && (
        <div className="absolute inset-0 z-30 rounded-3xl bg-sky/25 backdrop-blur-md border-2 border-dashed border-sky-deep/70 flex flex-col items-center justify-center gap-2 pointer-events-none fade-up">
          <Icon name="paperclip" className="w-8 h-8 text-sky-deep" />
          <div className="text-sm font-extrabold text-navy">Drop files to attach</div>
          <div className="text-xs text-navy/60 font-semibold">.zip · .pdf · .jpeg · any format · up to 15 MB each</div>
        </div>
      )}

      <div className="relative z-10 flex flex-col h-full min-h-0 px-0 py-0">
        {/* ── messages ── */}
        <div ref={messagesRef} className="flex-1 min-h-0 overflow-y-auto chat-scroll px-5 sm:px-8 py-5 space-y-5">
          {empty && (
            <div className="h-full flex items-center justify-center px-6">
              <p className="max-w-sm text-center text-[15px] leading-7 text-navy/55">
                Hi, I am Baymax. What would you like to work on?
              </p>
            </div>
          )}

          {messages.map((m) => (
            <Message key={m.id} m={m} />
          ))}

          {thinking && (
            <div className="flex items-center gap-2 px-1 py-2 text-sm text-navy/50">
              <span className="chat-typing-dot" />
              <span className="chat-typing-dot" />
              <span className="chat-typing-dot" />
              <span className="ml-1">{thinking.phase === 'upload' ? 'Attaching files…' : 'Baymax is typing…'}</span>
            </div>
          )}

          {error && (
            <div className="glass-soft text-center text-xs text-danger font-semibold rounded-xl px-3 py-2 mx-auto w-fit">
              {error}
            </div>
          )}
        </div>

        {/* ── pending attachments ── */}
        {pending.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-3 fade-up">
            {pending.map((p, i) => (
              <div key={`${p.file.name}-${i}`} className="glass-soft rounded-xl flex items-center gap-2 pl-1.5 pr-2 py-1.5 max-w-[15rem]">
                {p.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.preview} alt="" className="w-9 h-9 rounded-lg object-cover" />
                ) : (
                  <span className="w-9 h-9 rounded-lg bg-sky-deep/10 text-sky-deep flex items-center justify-center text-[10px] font-extrabold">
                    {ext(p.file.name)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-navy truncate">{p.file.name}</div>
                  <div className="text-[10px] text-navy/40">{fmtSize(p.file.size)}</div>
                </div>
                <button
                  onClick={() => removePending(i)}
                  aria-label={`Remove ${p.file.name}`}
                  className="p-1 rounded-full text-navy/40 hover:text-danger hover:bg-danger/10 transition"
                >
                  <Icon name="x" className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── composer ── */}
        <div className="chat-composer-wrap">
          <div className="chat-composer glass flex items-center gap-2 rounded-full px-2 py-1.5 focus-within:border-sky-deep/50 focus-within:ring-2 focus-within:ring-sky-deep/15 transition">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Attach files (.zip, .pdf, .jpeg…)"
              className="glass-soft w-9 h-9 rounded-full flex items-center justify-center text-navy/55 hover:text-sky-deep transition shrink-0"
              aria-label="Attach files"
            >
              <Icon name="paperclip" className="w-4 h-4" />
            </button>
            <button
              onClick={captureScreenshot}
              title="Capture a screenshot of a tab, window, or screen"
              className="glass-soft w-9 h-9 rounded-full flex items-center justify-center text-navy/55 hover:text-sky-deep transition shrink-0"
              aria-label="Capture screenshot"
            >
              <Icon name="camera" className="w-4 h-4" />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Message Baymax"
              className="flex-1 bg-transparent px-2 py-2 text-sm text-ink placeholder:text-navy/35 outline-none min-w-0"
            />
            <button
              onClick={() => send(input)}
              disabled={(!input.trim() && !pending.length) || Boolean(thinking)}
              className="btn-send w-10 h-10 rounded-full text-white flex items-center justify-center disabled:opacity-30 shrink-0"
              aria-label="Send"
            >
              <Icon name="send" className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Message({ m }: { m: Msg }) {
  const isUser = m.role === 'user';
  const attachments = m.meta?.attachments ?? [];
  return (
    <div className={`flex gap-3 fade-up ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`max-w-[88%] ${isUser ? 'text-right' : ''}`}>
        <div
          className={
            isUser
              ? 'bubble-user text-white rounded-2xl rounded-tr-md px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap inline-block text-left'
              : 'chat-assistant-bubble rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap inline-block'
          }
        >
          {m.content || (attachments.length ? '📎' : '')}
        </div>

        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {attachments.map((a) => {
              const href = resolveUrl(a.url);
              const image = a.mime.startsWith('image/');
              return image ? (
                <a key={a.path} href={href} target="_blank" rel="noreferrer" title={a.name}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={href}
                    alt={a.name}
                    className="h-20 max-w-[10rem] w-auto object-cover rounded-xl border border-white/70 shadow-md hover:-translate-y-0.5 transition"
                  />
                </a>
              ) : (
                <a
                  key={a.path}
                  href={href}
                  download={a.name}
                  title={`${a.name} (${fmtSize(a.size)})`}
                  className="glass-soft inline-flex items-center gap-2 rounded-xl px-2.5 py-2 hover:border-sky-deep/40 hover:-translate-y-0.5 transition-all max-w-[14rem]"
                >
                  <span className="w-8 h-8 rounded-lg bg-sky-deep/10 text-sky-deep flex items-center justify-center text-[9px] font-extrabold shrink-0">
                    {ext(a.name)}
                  </span>
                  <span className="min-w-0 text-left">
                    <span className="block text-xs font-semibold text-navy truncate">{a.name}</span>
                    <span className="block text-[10px] text-navy/40">{fmtSize(a.size)}</span>
                  </span>
                </a>
              );
            })}
          </div>
        )}


      </div>
    </div>
  );
}
