import { useEffect, useRef, useState } from "react";
import { Copy, ExternalLink, Send } from "lucide-react";
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
import { isEmbedded, openSms, publicSiteUrl, smsHref } from "@/lib/meal-text-message";

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
 * blocked scheme) we offer the real site plus copy/paste instead of leaving a
 * dead button.
 */
export function SmsTextButton({ numbers, body, label, className }: Props) {
  const to = numbers.filter(Boolean);
  const href = smsHref(to, body);
  const [showFallback, setShowFallback] = useState(false);
  const [framed, setFramed] = useState(false);
  const [siteHref, setSiteHref] = useState(publicSiteUrl("/"));
  const timer = useRef<number | null>(null);

  useEffect(() => {
    setFramed(isEmbedded());
    setSiteHref(publicSiteUrl());
  }, []);

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
      if (document.visibilityState === "visible") {
        // One scripted retry (adds the Android intent:// handoff) before giving up.
        openSms(to, body);
        window.setTimeout(() => {
          if (document.visibilityState === "visible") setShowFallback(true);
        }, 900);
      }
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
            <DialogTitle>
              {framed
                ? "You're in the Lovable preview — Messages can't open here"
                : "This browser wouldn't open Messages"}
            </DialogTitle>
            <DialogDescription>
              Open this page on tasteofconventions.com in your phone's browser and the Text button
              works. Or copy the message below and send it yourself to {to.join(", ")}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            <a
              href={siteHref}
              target="_top"
              rel="noopener"
              className={cn(
                buttonVariants({ size: "sm" }),
                "bg-terracotta text-cream hover:bg-terracotta/90",
              )}
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Open on tasteofconventions.com
            </a>
            <Button size="sm" variant="outline" onClick={() => void copy()}>
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
          <Textarea readOnly value={body} rows={12} className="text-xs" />
        </DialogContent>
      </Dialog>
    </>
  );
}
