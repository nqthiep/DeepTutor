"use client";

import React from "react";

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
}

export default function Label({ children, className = "", ...props }: LabelProps) {
  return (
    <label
      className={`block text-[13px] font-medium text-[var(--foreground)] ${className}`}
      {...props}
    >
      {children}
    </label>
  );
}
