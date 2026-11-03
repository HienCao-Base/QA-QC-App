"use client";

import { useEffect, useId, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { Camera, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Tên file ngẫu nhiên. `crypto.randomUUID` chỉ có trên HTTPS / localhost
 * (không có khi mở qua IP LAN, hoặc trên iOS < 15.4), còn `getRandomValues` thì luôn có.
 */
function randomId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; // UUID v4
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Lưới ảnh chỉ xem; bấm vào ảnh để xem toàn màn hình. `urls` là map path -> signed URL do server tạo. */
export function PhotoGrid({ paths, urls }: { paths: string[]; urls: Record<string, string> }) {
  const [open, setOpen] = useState<number | null>(null);
  const srcs = paths.map((p) => urls[p]).filter(Boolean);
  if (srcs.length === 0) return null;
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {srcs.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setOpen(i)}
            aria-label={`Xem ảnh minh chứng ${i + 1}/${srcs.length}`}
            className="group block overflow-hidden rounded-lg ring-1 ring-foreground/10 transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="size-20 object-cover transition-transform duration-200 group-hover:scale-105" />
          </button>
        ))}
      </div>
      {open != null && <Lightbox srcs={srcs} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </>
  );
}

/** Xem ảnh toàn màn hình: vuốt hoặc phím mũi tên để chuyển ảnh, Esc / nút X để đóng. */
function Lightbox({
  srcs,
  index,
  onIndex,
  onClose,
}: {
  srcs: string[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const startX = useRef<number | null>(null);
  const many = srcs.length > 1;
  const go = (d: number) => onIndex((index + d + srcs.length) % srcs.length);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-label={`Ảnh minh chứng ${index + 1}/${srcs.length}`}
      onKeyDown={(e) => {
        if (!many) return;
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none overscroll-contain bg-black/95 p-0 text-white backdrop:bg-black/80 backdrop:backdrop-blur-sm"
    >
      <div
        className="flex h-full flex-col"
        onPointerDown={(e) => (startX.current = e.clientX)}
        onPointerUp={(e) => {
          if (startX.current == null) return;
          const dx = e.clientX - startX.current;
          startX.current = null;
          if (many && Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        }}
      >
        <div className="flex items-center justify-between gap-2 px-safe pt-[env(safe-area-inset-top)]">
          <span className="tnum rounded-full bg-white/10 px-3 py-1 text-sm font-medium">
            {index + 1} / {srcs.length}
          </span>
          <div className="flex items-center gap-1">
            <a
              href={srcs[index]}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-medium hover:bg-white/10"
            >
              Mở ảnh gốc
            </a>
            <button
              type="button"
              autoFocus
              onClick={() => ref.current?.close()}
              aria-label="Đóng"
              className="grid size-11 place-items-center rounded-full hover:bg-white/10"
            >
              <X className="size-6" aria-hidden />
            </button>
          </div>
        </div>
        <div className="relative flex min-h-0 flex-1 items-center justify-center p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={srcs[index]}
            alt={`Ảnh minh chứng ${index + 1}`}
            draggable={false}
            className="max-h-full max-w-full object-contain select-none"
          />
          {many && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Ảnh trước"
                className="absolute top-1/2 left-3 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 backdrop-blur hover:bg-white/20"
              >
                <ChevronLeft className="size-6" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Ảnh sau"
                className="absolute top-1/2 right-3 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 backdrop-blur hover:bg-white/20"
              >
                <ChevronRight className="size-6" aria-hidden />
              </button>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}

/** Chọn/chụp ảnh, tự nén rồi tải lên Supabase Storage. */
export function PhotoPicker({
  folder,
  value,
  onChange,
  urls,
  max = 5,
  locked,
}: {
  folder: string;
  value: string[];
  onChange: (paths: string[]) => void;
  urls: Record<string, string>;
  max?: number;
  /** Ảnh không được bỏ (vd: ảnh minh chứng của phiếu đã phát hành). */
  locked?: string[];
}) {
  const input = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [local, setLocal] = useState<Record<string, string>>({});

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const room = max - value.length;
    if (room <= 0) return toast.error(`Tối đa ${max} ảnh`);
    setBusy(true);
    const supabase = createClient();
    const added: string[] = [];
    const previews: Record<string, string> = {};
    try {
      for (const file of Array.from(files).slice(0, room)) {
        const small = await imageCompression(file, { maxSizeMB: 0.4, maxWidthOrHeight: 1600, useWebWorker: true, fileType: "image/jpeg" });
        const path = `${folder}/${randomId()}.jpg`;
        const { error } = await supabase.storage.from("evidence").upload(path, small, { contentType: "image/jpeg" });
        if (error) throw error;
        added.push(path);
        previews[path] = URL.createObjectURL(small);
      }
    } catch (e) {
      toast.error("Tải ảnh thất bại: " + ((e as Error).message ?? ""));
    } finally {
      setLocal((l) => ({ ...l, ...previews }));
      if (added.length) onChange([...value, ...added]);
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex flex-wrap gap-3 pt-1">
      {value.map((p, i) => {
        const src = local[p] ?? urls[p];
        return (
          <div key={p} className="relative">
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={`Ảnh đã chọn ${i + 1}`} className="size-20 rounded-lg object-cover ring-1 ring-foreground/10" />
            ) : (
              <div className="size-20 animate-pulse rounded-lg bg-muted" />
            )}
            {/* Vùng chạm 44px, chấm tròn hiển thị vẫn nhỏ để không che ảnh. Ảnh bị khóa thì không có nút bỏ. */}
            {!locked?.includes(p) && <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== p))}
              aria-label={`Bỏ ảnh ${i + 1}`}
              className="group absolute -top-3 -right-3 grid size-11 place-items-center rounded-full focus-visible:outline-none"
            >
              <span className="grid size-6 place-items-center rounded-full bg-foreground text-background shadow-sm ring-2 ring-card group-hover:bg-destructive group-focus-visible:ring-ring">
                <X className="size-3.5" aria-hidden />
              </span>
            </button>}
          </div>
        );
      })}
      {/*
        Dùng <label> gắn với input file thay vì gọi input.click() bằng JS:
        trình duyệt di động (nhất là Safari iOS) luôn mở được hộp chọn / máy ảnh theo cách này.
        Input chỉ ẩn bằng sr-only (không display:none) để vẫn Tab tới được.
      */}
      {value.length < max && (
        <label
          htmlFor={inputId}
          aria-disabled={busy || undefined}
          className={cn(
            "grid size-20 cursor-pointer place-items-center rounded-lg border-2 border-dashed border-input bg-muted/40 text-muted-foreground transition-colors select-none",
            "hover:border-primary hover:bg-accent hover:text-primary active:scale-[0.97]",
            "has-[+input:focus-visible]:ring-2 has-[+input:focus-visible]:ring-ring has-[+input:focus-visible]:ring-offset-2",
            busy && "pointer-events-none opacity-60",
          )}
        >
          {busy ? (
            <span role="status" className="grid place-items-center">
              <Loader2 className="size-5 animate-spin" aria-hidden />
              <span className="sr-only">Đang tải ảnh lên…</span>
            </span>
          ) : (
            <span className="flex flex-col items-center gap-1 text-xs font-medium">
              <Camera className="size-5" aria-hidden /> Thêm ảnh
            </span>
          )}
        </label>
      )}
      {value.length < max && (
        <input
          ref={input}
          id={inputId}
          type="file"
          accept="image/*"
          multiple
          disabled={busy}
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
        />
      )}
    </div>
  );
}
