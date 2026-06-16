"use client";

import { useEffect, useState } from "react";
import type { Dispatch, PointerEvent, SetStateAction } from "react";
import type { LightboxImage } from "./types";

type LightboxProps = {
  images: LightboxImage[];
  selectedIndex: number | null;
  setSelectedIndex: Dispatch<SetStateAction<number | null>>;
};

export default function Lightbox({
  images,
  selectedIndex,
  setSelectedIndex,
}: LightboxProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const selectedImage =
    selectedIndex === null ? null : images[selectedIndex];

  function closeLightbox() {
    setSelectedIndex(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setIsDragging(false);
  }

  function showPrevious() {
    setSelectedIndex((currentIndex) => {
      if (currentIndex === null) return currentIndex;
      return currentIndex === 0 ? images.length - 1 : currentIndex - 1;
    });

    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setIsDragging(false);
  }

  function showNext() {
    setSelectedIndex((currentIndex) => {
      if (currentIndex === null) return currentIndex;
      return currentIndex === images.length - 1 ? 0 : currentIndex + 1;
    });

    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setIsDragging(false);
  }

  function zoomIn() {
    setZoom((currentZoom) => Math.min(currentZoom + 0.5, 4));
  }

  function zoomOut() {
    setZoom((currentZoom) => {
      const nextZoom = Math.max(currentZoom - 0.5, 1);

      if (nextZoom === 1) {
        setOffset({ x: 0, y: 0 });
      }

      return nextZoom;
    });
  }

  function resetZoom() {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setIsDragging(false);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (zoom === 1) return;

    setIsDragging(true);
    setDragStart({
      x: event.clientX - offset.x,
      y: event.clientY - offset.y,
    });

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!isDragging || zoom === 1) return;

    setOffset({
      x: event.clientX - dragStart.x,
      y: event.clientY - dragStart.y,
    });
  }

  function handlePointerUp() {
    setIsDragging(false);
  }

  useEffect(() => {
    if (selectedIndex !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedIndex]);

  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setIsDragging(false);
  }, [selectedIndex]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (selectedIndex === null) return;

      if (event.key === "Escape") {
        closeLightbox();
      }

      if (event.key === "ArrowLeft") {
        showPrevious();
      }

      if (event.key === "ArrowRight") {
        showNext();
      }

      if (event.key === "+" || event.key === "=") {
        zoomIn();
      }

      if (event.key === "-") {
        zoomOut();
      }

      if (event.key === "0") {
        resetZoom();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedIndex, images.length]);

  if (!selectedImage || selectedIndex === null) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/94 px-4 py-6 backdrop-blur-sm"
      onClick={closeLightbox}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          closeLightbox();
        }}
        className="absolute right-6 top-6 z-[120] border border-white/25 px-5 py-3 text-xs uppercase tracking-[0.25em] text-white/70 transition hover:bg-white hover:text-black"
      >
        Close
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          showPrevious();
        }}
        className="absolute left-6 top-1/2 z-[120] flex h-12 w-12 -translate-y-1/2 items-center justify-center border border-white/25 text-3xl text-white/70 transition hover:bg-white hover:text-black"
        aria-label="Previous image"
      >
        ‹
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          showNext();
        }}
        className="absolute right-6 top-1/2 z-[120] flex h-12 w-12 -translate-y-1/2 items-center justify-center border border-white/25 text-3xl text-white/70 transition hover:bg-white hover:text-black"
        aria-label="Next image"
      >
        ›
      </button>

      <div className="absolute bottom-6 left-1/2 z-[120] flex -translate-x-1/2 items-center gap-3 border border-white/15 bg-black/40 px-4 py-3 backdrop-blur-md">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            zoomOut();
          }}
          className="px-3 py-2 text-xs uppercase tracking-[0.2em] text-white/70 transition hover:text-white"
        >
          −
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            resetZoom();
          }}
          className="px-3 py-2 text-xs uppercase tracking-[0.2em] text-white/70 transition hover:text-white"
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            zoomIn();
          }}
          className="px-3 py-2 text-xs uppercase tracking-[0.2em] text-white/70 transition hover:text-white"
        >
          +
        </button>
      </div>

      <div
        className="relative flex h-[88vh] w-full max-w-7xl items-center justify-center overflow-hidden"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={(event) => {
          event.stopPropagation();

          if (event.deltaY < 0) {
            zoomIn();
          } else {
            zoomOut();
          }
        }}
      >
        <img
          src={selectedImage.src}
          alt={selectedImage.title}
          draggable={false}
          className={`max-h-[82vh] max-w-full select-none object-contain transition-transform duration-150 ${
            zoom > 1
              ? isDragging
                ? "cursor-grabbing"
                : "cursor-grab"
              : "cursor-zoom-in"
          }`}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          }}
          onDoubleClick={(event) => {
            event.stopPropagation();

            if (zoom === 1) {
              setZoom(2);
            } else {
              resetZoom();
            }
          }}
        />
      </div>

      <div className="absolute left-1/2 top-6 z-[110] -translate-x-1/2 text-center text-white">
        <p className="mb-2 text-xs uppercase tracking-[0.3em] text-white/45">
          {selectedIndex + 1} / {images.length}
        </p>
        <p className="font-serif text-2xl text-white">{selectedImage.title}</p>
        <p className="mt-2 text-sm text-white/55">
          {selectedImage.subtitle}
        </p>
      </div>
    </div>
  );
}
