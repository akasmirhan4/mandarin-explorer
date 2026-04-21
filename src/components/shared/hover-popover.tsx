"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "~/lib/utils";

type Props = {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  triggerClassName?: string;
  delay?: number;
  onClick?: () => void;
};

type Pos = { top: number; left: number };

export function HoverPopover({
  content,
  children,
  className,
  triggerClassName,
  delay = 80,
  onClick,
}: Props) {
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      if (openTimer.current) clearTimeout(openTimer.current);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const compute = () => {
      const trigger = triggerRef.current;
      const popup = popupRef.current;
      if (!trigger || !popup) return;
      const rect = trigger.getBoundingClientRect();
      const popupRect = popup.getBoundingClientRect();
      const margin = 8;

      let top = rect.top - popupRect.height - 6;
      let left = rect.left + rect.width / 2 - popupRect.width / 2;

      if (top < margin) top = rect.bottom + 6;
      if (left < margin) left = margin;
      if (left + popupRect.width > window.innerWidth - margin) {
        left = window.innerWidth - popupRect.width - margin;
      }

      setPos({ top: top + window.scrollY, left: left + window.scrollX });
    };

    compute();
    const onScroll = () => compute();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  const handleEnter = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    if (open) return;
    openTimer.current = setTimeout(() => setOpen(true), delay);
  };

  const handleLeave = () => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    closeTimer.current = setTimeout(() => setOpen(false), 60);
  };

  return (
    <>
      <span
        ref={triggerRef}
        className={triggerClassName}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onFocus={handleEnter}
        onBlur={handleLeave}
        onClick={onClick}
      >
        {children}
      </span>
      {mounted && open &&
        createPortal(
          <div
            ref={popupRef}
            role="tooltip"
            style={{
              position: "absolute",
              top: pos?.top ?? 0,
              left: pos?.left ?? 0,
              visibility: pos ? "visible" : "hidden",
              pointerEvents: "none",
            }}
            className={cn(
              "bg-ink text-background z-1000 max-w-xs rounded-md px-2.5 py-1.5 text-xs shadow-md",
              className,
            )}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}
