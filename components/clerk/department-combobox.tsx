"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, Plus, Check, ChevronDown, X, Building2, Loader2 } from "lucide-react";
import type { Department } from "@/types";
import { createDepartment } from "@/lib/staff";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface DepartmentComboboxProps {
  id?: string;
  value?: number | null;
  onChange: (departmentId: number | undefined) => void;
  departments: Department[];
  onDepartmentCreated?: (department: Department) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

export function DepartmentCombobox({
  id = "staff-department",
  value,
  onChange,
  departments = [],
  onDepartmentCreated,
  error,
  disabled = false,
  required = false,
  placeholder,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: DepartmentComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Selected department lookup
  const selectedDepartment = useMemo(() => {
    if (value === undefined || value === null) return undefined;
    return departments.find((d) => d.id === Number(value));
  }, [departments, value]);

  // Normalized search query
  const normalizedQuery = searchQuery.trim().toLowerCase();

  // Filtered department list
  const filteredDepartments = useMemo(() => {
    if (!normalizedQuery) return departments;
    return departments.filter((d) =>
      (d.name || "").toLowerCase().includes(normalizedQuery)
    );
  }, [departments, normalizedQuery]);

  // Exact match detection to prevent duplicates
  const isExactMatch = useMemo(() => {
    if (!normalizedQuery) return false;
    return departments.some(
      (d) => (d.name || "").trim().toLowerCase() === normalizedQuery
    );
  }, [departments, normalizedQuery]);

  const canCreateNew = normalizedQuery.length >= 1 && !isExactMatch;

  // Auto-focus search input when opening
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle outside click to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
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

  // Quick inline department creation
  const handleCreateDepartment = async (nameToCreate: string) => {
    const trimmed = nameToCreate.trim();
    if (!trimmed || isCreating) return;

    setIsCreating(true);
    try {
      const newDept = await createDepartment(trimmed);
      toast.success("Department created successfully");

      if (onDepartmentCreated && newDept) {
        onDepartmentCreated(newDept);
      }

      if (newDept?.id) {
        onChange(newDept.id);
      }

      setSearchQuery("");
      setIsOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create department."
      );
    } finally {
      setIsCreating(false);
    }
  };

  // Keyboard navigation inside search input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (canCreateNew && filteredDepartments.length === 0) {
        void handleCreateDepartment(searchQuery);
      } else if (filteredDepartments.length > 0) {
        onChange(filteredDepartments[0].id);
        setSearchQuery("");
        setIsOpen(false);
      }
    }
  };

  const defaultPlaceholder = required
    ? "Select department..."
    : "Select department (Optional)";

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          "w-full h-10 px-3 rounded-xl border text-left text-sm flex items-center justify-between transition-all bg-white shadow-2xs",
          error
            ? "border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            : isOpen
            ? "border-indigo-600 ring-2 ring-indigo-500/20"
            : "border-slate-200 hover:border-slate-300",
          disabled ? "opacity-60 cursor-not-allowed bg-slate-50" : "cursor-pointer"
        )}
      >
        <div className="flex items-center gap-2 truncate min-w-0">
          <Building2 className="h-4 w-4 text-indigo-600 shrink-0" />
          {selectedDepartment ? (
            <span className="font-medium text-slate-900 truncate">
              {selectedDepartment.name}
            </span>
          ) : (
            <span className="text-slate-400 truncate">
              {placeholder || defaultPlaceholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {selectedDepartment && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange(undefined);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onChange(undefined);
                }
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              title="Clear department"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-slate-400 transition-transform duration-200",
              isOpen && "rotate-180 text-indigo-600"
            )}
          />
        </div>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute z-50 left-0 top-[calc(100%+4px)] w-full min-w-[280px] bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Input Bar */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/60">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search department (e.g. Science, Accounts)..."
                className="w-full h-8 pl-8 pr-7 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500/20 text-slate-800 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  title="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Department Items List */}
          <div className="max-h-56 overflow-y-auto p-1 text-xs space-y-0.5">
            {filteredDepartments.length > 0 ? (
              filteredDepartments.map((dept) => {
                const isSelected = selectedDepartment?.id === dept.id;
                return (
                  <div
                    key={dept.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(dept.id);
                      setSearchQuery("");
                      setIsOpen(false);
                    }}
                    className={cn(
                      "px-3 py-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors",
                      isSelected
                        ? "bg-indigo-50 text-indigo-700 font-semibold"
                        : "text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <span className="truncate">{dept.name}</span>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0 ml-2" />
                    )}
                  </div>
                );
              })
            ) : !canCreateNew ? (
              <div className="px-3 py-4 text-center text-slate-400 text-xs">
                {searchQuery
                  ? `No departments found matching "${searchQuery}".`
                  : "No departments available."}
              </div>
            ) : null}

            {/* Inline "+ Create Department" Option */}
            {canCreateNew && (
              <div className="pt-1 border-t border-slate-100 mt-1">
                <button
                  type="button"
                  disabled={isCreating}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void handleCreateDepartment(searchQuery);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg border border-dashed border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 font-semibold text-xs flex items-center justify-between transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  <div className="flex items-center gap-2 truncate">
                    {isCreating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600 shrink-0" />
                    ) : (
                      <Plus className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    )}
                    <span className="truncate">
                      {isCreating ? (
                        <>
                          Creating &ldquo;
                          <span className="underline">{searchQuery.trim()}</span>
                          &rdquo;...
                        </>
                      ) : (
                        <>
                          + Create &ldquo;
                          <span className="underline">{searchQuery.trim()}</span>
                          &rdquo; department
                        </>
                      )}
                    </span>
                  </div>
                  {isCreating && (
                    <span className="text-[10px] text-indigo-500 font-normal shrink-0 ml-1">
                      Loading...
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

