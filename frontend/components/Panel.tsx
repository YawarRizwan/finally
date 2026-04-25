"use client";

import type { ReactNode } from "react";

type Props = {
  title: string;
  rightSlot?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

/**
 * Standard terminal panel shell: dark border, uppercase title bar, content.
 */
export function Panel({ title, rightSlot, children, className = "", bodyClassName = "" }: Props) {
  return (
    <section
      className={`flex flex-col overflow-hidden rounded-sm border border-border-subtle bg-bg-panel ${className}`}
    >
      <header className="flex items-center justify-between border-b border-border-subtle bg-bg-panel-raised px-3 py-1.5">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">
          {title}
        </h2>
        {rightSlot}
      </header>
      <div className={`flex-1 min-h-0 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
