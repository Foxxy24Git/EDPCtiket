"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";

export interface SearchableOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  emptyText?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Cari atau pilih...",
  disabled = false,
  className = "",
  emptyText = "Tidak ada pilihan yang cocok",
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      opt.label.toLowerCase().includes(term) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(term)) ||
      (opt.value && opt.value.toLowerCase().includes(term))
    );
  });

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Control Box */}
      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
            setSearchTerm("");
          }
        }}
        className={`w-full text-xs border rounded-lg px-3 py-2.5 bg-white flex items-center justify-between gap-2 cursor-pointer transition-all ${
          disabled
            ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-70"
            : isOpen
            ? "border-primary ring-2 ring-primary/20 shadow-sm"
            : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className={`truncate font-medium ${selectedOption ? "text-gray-900 font-mono" : "text-gray-400"}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${isOpen ? "rotate-180 text-primary" : ""}`} />
      </div>

      {/* Dropdown Menu Popover with integrated Search input */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Box Inside Popover */}
          <div className="p-2 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-1" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ketik untuk mencari no tiket, cabang, SN..."
              className="w-full text-xs bg-transparent border-none focus:outline-none focus:ring-0 text-gray-800 placeholder:text-gray-400"
              onClick={(e) => e.stopPropagation()}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchTerm("");
                }}
                className="text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto divide-y divide-gray-50 py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                    className={`px-3 py-2 text-xs cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                      isSelected
                        ? "bg-primary-50 text-primary font-bold"
                        : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="truncate font-mono font-medium">{opt.label}</span>
                      {opt.sublabel && (
                        <span className="text-[11px] text-gray-400 font-normal truncate mt-0.5">
                          {opt.sublabel}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </div>
                );
              })
            ) : (
              <div className="px-3 py-3 text-xs text-center text-gray-400 italic">
                {emptyText}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
