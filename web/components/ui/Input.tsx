"use client";

import React, { forwardRef, useState } from "react";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  showPasswordToggle?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, showPasswordToggle, className = "", type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const effectiveType = isPassword && showPassword ? "text" : type;

    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-[13px] font-medium text-[var(--foreground)]">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            type={effectiveType}
            className={`
              w-full h-[44px] rounded-xl border text-sm
              bg-[var(--background)]/50 text-[var(--foreground)]
              placeholder:text-[var(--muted-foreground)]/50
              outline-none transition-all duration-200
              hover:border-[var(--border)]/60
              focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/10
              disabled:opacity-50 disabled:cursor-not-allowed
              ${icon ? "pl-10" : "pl-4"}
              ${isPassword && showPasswordToggle ? "pr-11" : "pr-4"}
              ${error ? "border-[var(--destructive)]/60 focus:border-[var(--destructive)]/60 focus:ring-[var(--destructive)]/10" : "border-[var(--border)]/30"}
              ${className}
            `}
            {...props}
          />
          {isPassword && showPasswordToggle && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors p-1"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>
        {error && (
          <div className="flex items-center gap-1.5 text-[12px] text-[var(--destructive)]">
            <AlertCircle size={13} />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
export default Input;
