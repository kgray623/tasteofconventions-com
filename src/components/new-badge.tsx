import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { useIsNew, markSeen } from "@/lib/whats-new";

type Props = {
  target: string;
  className?: string;
};

/** Bright red "NEW →" pill that sits to the LEFT of the new thing and points right at it. */
export function NewBadge({ target, className = "" }: Props) {
  const show = useIsNew(target);
  if (!show) return null;
  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        markSeen(target);
      }}
      className={`inline-flex items-center gap-1.5 rounded-full bg-brand-red px-3 py-1.5 text-sm font-extrabold uppercase tracking-wider text-white shadow-lg ring-2 ring-white animate-pulse cursor-pointer select-none ${className}`}
      role="status"
      aria-label="New feature"
    >
      NEW
      <ArrowRight className="w-5 h-5" strokeWidth={3} />
    </span>
  );
}

/** Convenience wrapper: renders [NEW →] [children] in a flex row. */
export function NewBadgeRow({
  target,
  children,
  className = "",
}: {
  target: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <NewBadge target={target} />
      {children}
    </div>
  );
}
