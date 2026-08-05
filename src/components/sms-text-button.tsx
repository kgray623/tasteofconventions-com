import { useRef, useState } from "react";
import { Copy, Send } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { smsHref } from "@/lib/meal-text-message";

type Props = {
  /** Normalized phone number(s), e.g. +14025551234 */
  numbers: string[];
  body: string;
  label: string;
  className?: string;
};

/**
 * Real <a href="sms:..."> so the phone's own Messages app handles the tap — no
 * JavaScript interception, which is the only thing that reliably works on iOS
 * and Android. If nothing opens within ~1.4s (framed preview, desktop browser,
 * blocked scheme) we show the message so it can be copied and pasted instead of
 * leaving a dead button.
 */
export function SmsTextButton({ numbers, body, label, className }: Props) {
  const to = numbers.filter(Boolean);
  const href = smsHref(to, body);
  const [showFallback, setShowFallback] = useState(false);
  const timer = useRef<number | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      toast.success("Message copied — paste it into Messages.");
    } catch {
      toast.error("Copy blocked — select the text and copy it manually.");
    }
  };

  const armFallback = () => {
    if (timer.current) window.clearTimeout(timer.current);
    const clear = () => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = null;
    };
    window.addEventListener("pagehide", clear, { once: true });
    window.addEventListener("blur", clear, { once: true });
    document.addEventListener("visibilitychange", clear, { once: true });
    timer.current = window.setTimeout(() => {
      timer.current = null;
      if (document.visibilityState === "visible") setShowFallback(true);
    }, 1400);
  };

  if (to.length === 0) return null;

  return (
    <>
      <a
        href={href}
        target="_top"
        rel="noopener"
        onClick={armFallback}
        className={cn(
          buttonVariants({ size: "sm" }),
          "bg-pink-500 text-white hover:bg-pink-600",
          className,
        )}
      >
        <Send className="w-3.5 h-3.5 mr-1.5" /> {label}
      </a>

      <Dialog open={showFallback} onOpenChange={setShowFallback}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Messages didn't open</DialogTitle>
            <DialogDescription>
              This browser blocked the text link. Copy the message below, open Messages yourself and
              send it to {to.join(", ")}.
            </DialogDescription>
          </DialogHeader>
          <Textarea readOnly value={body} rows={12} className="text-xs" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void copy()}>
              <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy message
            </Button>
            <a
              href={href}
              target="_top"
              rel="noopener"
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            >
              <Send className="w-3.5 h-3.5 mr-1.5" /> Try Messages again
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
