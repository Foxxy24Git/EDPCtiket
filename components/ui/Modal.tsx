"use client";

import { cn } from "@/lib/cn";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Tutup modal saat tekan Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Cegah scroll body saat modal terbuka
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop (Portal langsung ke document.body sehingga inset-0 menutup 100% viewport tanpa celah margin 16px) */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs cursor-pointer m-0 p-0 top-0 left-0 w-screen h-screen"
            onClick={onClose}
          />

          {/* Panel Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none m-0 top-0 left-0 w-screen h-screen">
            <motion.div
              key="panel"
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "relative w-full bg-white rounded-2xl shadow-card-lg pointer-events-auto",
                "border border-gray-100 overflow-hidden",
                sizeClasses[size]
              )}
            >
              {/* Tombol Silang (X) di Pojok Kanan Atas - Berwarna Merah Saat Hover */}
              <button
                onClick={onClose}
                aria-label="Tutup"
                className="absolute top-3.5 right-3.5 z-10 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>

              {/* Header (jika title atau description ada) */}
              {(title || description) && (
                <div className="p-4 pr-12 border-b border-gray-100 bg-gray-50/50">
                  {title && (
                    <h2 className="text-sm font-bold text-gray-900">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="mt-0.5 text-xs text-gray-500">
                      {description}
                    </p>
                  )}
                </div>
              )}

              {/* Body */}
              <div className="p-4">{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
