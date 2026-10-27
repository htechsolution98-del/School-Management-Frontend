"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, Plus, Check, ChevronDown, X, BookOpen } from "lucide-react";
import { BookCategory } from "@/lib/library";

export interface CategoryComboboxProps {
  value: string;
  onChange: (categoryName: string, categoryRefId?: number | null) => void;
  categories: BookCategory[];
  allBookCategoryNames?: string[];
  error?: string;
  disabled?: boolean;
}

export function CategoryCombobox({
  value,
  onChange,
  categories,
  allBookCategoryNames = [],
  error,
  disabled = false,
}: CategoryComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Combine categories and known book category names into unique Title Case entries
  const options = useMemo(() => {
    const map = new Map<string, { name: string; id?: number }>();

    categories.forEach((cat) => {
      if (cat.is_active === false && cat.name.trim().toLowerCase() !== (value || "").trim().toLowerCase()) {
        return;
      }
      const trimmed = cat.name.trim();
      const lower = trimmed.toLowerCase();
      if (lower && lower !== "all" && !map.has(lower)) {
        map.set(lower, { name: trimmed, id: cat.id });
      }
    });

    allBookCategoryNames.forEach((catName) => {
      const trimmed = catName.trim();
      const lower = trimmed.toLowerCase();
      if (lower && lower !== "all" && !map.has(lower)) {
        map.set(lower, { name: trimmed });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, allBookCategoryNames]);

  // Normalized search query
  const normalizedQuery = searchQuery.trim().toLowerCase();

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!normalizedQuery) return options;
    return options.filter((opt) => opt.name.toLowerCase().includes(normalizedQuery));
  }, [options, normalizedQuery]);

  // Check if current search query already matches an existing option (case-insensitive & whitespace-normalized)
  const isExactMatch = useMemo(() => {
    if (!normalizedQuery) return false;
    return options.some((opt) => opt.name.trim().toLowerCase() === normalizedQuery);
  }, [options, normalizedQuery]);

  const canCreateNew = normalizedQuery.length >= 2 && !isExactMatch;

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setHighlightedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Handle outside click to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    const totalCount = filteredOptions.length + (canCreateNew ? 1 : 0);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1 < totalCount ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : totalCount - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (canCreateNew && highlightedIndex === filteredOptions.length) {
        handleCreate(searchQuery);
      } else if (filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const handleSelect = (option: { name: string; id?: number }) => {
    onChange(option.name, option.id ?? null);
    setIsOpen(false);
  };

  const handleCreate = (text: string) => {
    const cleaned = text.trim();
    if (!cleaned) return;
    // Format to Title Case
    const titleCased = cleaned
      .split(" ")
      .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ""))
      .join(" ");

    // Check if category already matches an existing id
    const matched = categories.find((c) => c.name.trim().toLowerCase() === titleCased.toLowerCase());
    onChange(titleCased, matched ? matched.id : null);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full" onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        type="button"
        id="category-combobox-trigger"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full h-10 px-3 rounded-xl border text-left text-sm flex items-center justify-between transition-all bg-white shadow-2xs ${
          error
            ? "border-rose-500 bg-rose-50/20 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20"
            : isOpen
            ? "border-indigo-600 ring-2 ring-indigo-500/20"
            : "border-slate-200 hover:border-slate-300"
        } ${disabled ? "opacity-60 cursor-not-allowed bg-slate-50" : "cursor-pointer"}`}
      >
        <div className="flex items-center gap-2 truncate">
          <BookOpen className="h-4 w-4 text-indigo-500 shrink-0" />
          {value ? (
            <span className="font-semibold text-slate-900 truncate">{value}</span>
          ) : (
            <span className="text-slate-400">Select or type subject/category...</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {value && !disabled && (
            <div
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange("", null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onChange("", null);
                }
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              title="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </div>
          )}
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-indigo-600" : ""
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu / Popover */}
      {isOpen && (
        <div className="absolute z-[9999] left-0 top-[calc(100%+4px)] w-full min-w-[280px] bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Internal Search Input */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                placeholder="Search subject (e.g. Math, Science)..."
                className="w-full h-8 pl-8 pr-7 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 text-slate-800 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setHighlightedIndex(0);
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Options List with Internal Scrolling */}
          <ul ref={listRef} className="max-h-56 overflow-y-auto p-1.5 space-y-0.5 divide-y-0 text-xs">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const isSelected = value.trim().toLowerCase() === opt.name.trim().toLowerCase();
                const isHighlighted = idx === highlightedIndex;
                return (
                  <li
                    key={opt.name}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-3 py-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                      isSelected
                        ? "bg-indigo-50 text-indigo-700 font-bold"
                        : isHighlighted
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="truncate">{opt.name}</span>
                    {isSelected && <Check className="h-4 w-4 text-indigo-600 shrink-0 ml-2" />}
                  </li>
                );
              })
            ) : !canCreateNew ? (
              <li className="px-3 py-6 text-center text-slate-400 text-xs">
                No subjects found matching &ldquo;{searchQuery}&rdquo;.
              </li>
            ) : null}

            {/* Create New Option */}
            {canCreateNew && (
              <li
                role="option"
                aria-selected={false}
                onClick={() => handleCreate(searchQuery)}
                onMouseEnter={() => setHighlightedIndex(filteredOptions.length)}
                className={`px-3 py-2.5 rounded-lg cursor-pointer border border-dashed border-indigo-200 mt-1 flex items-center gap-2 text-indigo-700 font-bold transition-colors ${
                  highlightedIndex === filteredOptions.length ? "bg-indigo-50/80" : "bg-indigo-50/40 hover:bg-indigo-50"
                }`}
              >
                <Plus className="h-4 w-4 text-indigo-600 shrink-0" />
                <span className="truncate">
                  Create &ldquo;<span className="underline">{searchQuery.trim()}</span>&rdquo; as new subject
                </span>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
