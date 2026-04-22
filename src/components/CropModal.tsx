"use client";

import { useRef, useState } from "react";
import ReactCrop, { Crop, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

async function cropToDataUrl(imgEl: HTMLImageElement, px: PixelCrop): Promise<string> {
  const scaleX = imgEl.naturalWidth / imgEl.width;
  const scaleY = imgEl.naturalHeight / imgEl.height;
  const sx = px.x * scaleX;
  const sy = px.y * scaleY;
  const sw = px.width * scaleX;
  const sh = px.height * scaleY;

  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  canvas.getContext("2d")!.drawImage(imgEl, sx, sy, sw, sh, 0, 0, sw, sh);

  const MAX = 1400;
  const ratio = Math.min(1, MAX / Math.max(canvas.width, canvas.height));
  if (ratio < 1) {
    const scaled = document.createElement("canvas");
    scaled.width = Math.round(canvas.width * ratio);
    scaled.height = Math.round(canvas.height * ratio);
    scaled.getContext("2d")!.drawImage(canvas, 0, 0, scaled.width, scaled.height);
    return scaled.toDataURL("image/jpeg", 0.82);
  }
  return canvas.toDataURL("image/jpeg", 0.82);
}

export function CropModal({
  src,
  onApply,
  onClose,
}: {
  src: string;
  onApply: (cropped: string) => void;
  onClose: () => void;
}) {
  const [crop, setCrop] = useState<Crop>();
  const [pixelCrop, setPixelCrop] = useState<PixelCrop | null>(null);
  const [busy, setBusy] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  function handleImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    const init: Crop = { unit: "%", x: 10, y: 10, width: 80, height: 80 };
    setCrop(init);
    setPixelCrop({
      unit: "px",
      x: width * 0.1,
      y: height * 0.1,
      width: width * 0.8,
      height: height * 0.8,
    });
  }

  async function handleApply() {
    if (!imgRef.current || !pixelCrop || pixelCrop.width < 2 || pixelCrop.height < 2) return;
    setBusy(true);
    try {
      const cropped = await cropToDataUrl(imgRef.current, pixelCrop);
      onApply(cropped);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      <div className="flex-1 flex items-center justify-center overflow-auto p-2">
        <ReactCrop
          crop={crop}
          onChange={(c, percent) => {
            setCrop(percent);
            setPixelCrop(c);
          }}
          className="max-w-full max-h-full"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={src}
            alt="crop"
            onLoad={handleImageLoad}
            style={{ maxHeight: "80vh", maxWidth: "100%" }}
          />
        </ReactCrop>
      </div>
      <div className="bg-[#2C2416] px-4 py-3 flex items-center justify-end gap-3">
        <button
          onClick={onClose}
          disabled={busy}
          className="px-3 py-1.5 text-xs text-white/80 disabled:opacity-40"
        >
          취소
        </button>
        <button
          onClick={handleApply}
          disabled={busy || !pixelCrop || pixelCrop.width < 2}
          className="px-3 py-1.5 text-xs bg-white text-[#2C2416] rounded-lg font-semibold disabled:opacity-40"
        >
          {busy ? "처리 중…" : "적용"}
        </button>
      </div>
    </div>
  );
}
