import { ArrowLeft, ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { useIsNew, markSeen } from "@/lib/whats-new";

type Props = {
  target: string;
  className?: string;
  /** Arrow direction. "right" (default) points at the thing to the badge's right. */
  direction?: "right" | "left";
};

/** Small red "NEW →" pill that sits next to the new feature and points at it. */
export function NewBadge({ target, className = "", direction = "right" }: Props) {
  const show = useIsNew(target);
  if (!show) return null;
  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        markSeen(target);
      }}
      className={`inline-flex items-center gap-0.5 rounded-sm bg-brand-red px-1 py-0 text-[10px] font-semibold uppercase tracking-wider leading-none text-white cursor-pointer select-none ${className}`}
      role="status"
      aria-label="New feature"
    >
      {direction === "left" && <ArrowLeft className="h-2.5 w-2.5" strokeWidth={3} />}
      NEW
      {direction === "right" && <ArrowRight className="h-2.5 w-2.5" strokeWidth={3} />}
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
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <NewBadge target={target} />
      {children}
    </div>
  );
}
