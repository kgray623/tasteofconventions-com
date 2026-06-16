import { ArrowRight } from "lucide-react";
import { useIsNew, markSeen } from "@/lib/whats-new";

type Props = {
  target: string;
  /** Direction the arrow points — toward the new thing. Default: left (badge sits to the right of the item). */
  direction?: "left" | "right";
  className?: string;
};

/**
 * Bright "NEW →" pill that points at a recently-added feature.
 * Auto-hides after the registry window or once the user has interacted with it.
 */
export function NewBadge({ target, direction = "left", className = "" }: Props) {
  const show = useIsNew(target);
  if (!show) return null;

  const arrow = (
    <ArrowRight
      className={`w-3.5 h-3.5 ${direction === "left" ? "rotate-180" : ""}`}
      strokeWidth={3}
    />
  );

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        markSeen(target);
      }}
      className={`inline-flex items-center gap-1 rounded-full bg-terracotta px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-md animate-pulse cursor-pointer select-none ${className}`}
      role="status"
      aria-label="New feature"
    >
      {direction === "left" && arrow}
      NEW
      {direction === "right" && arrow}
    </span>
  );
}
