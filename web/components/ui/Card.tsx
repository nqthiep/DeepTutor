"use client";

import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`
        surface-card w-full max-w-[420px] p-8
        ${className}
      `}
    >
      {children}
    </div>
  );
}
