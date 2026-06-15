import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const SHARE_URL = "https://tasteofconventions.com";

export const Route = createFileRoute("/share")({
  head: () => ({
    meta: [
      { title: "Share — A Taste of Special Conventions" },
      {
        name: "description",
        content:
          "Scan or share the QR code to open A Taste of Special Conventions on any phone.",
      },
      { property: "og:title", content: "Share — A Taste of Special Conventions" },
      {
        property: "og:description",
        content: "Scan the QR code to open A Taste of Special Conventions.",
      },
      { property: "og:url", content: "https://tasteofconventions.com/share" },
    ],
    links: [{ rel: "canonical", href: "https://tasteofconventions.com/share" }],
  }),
  component: SharePage,
});

function SharePage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, SHARE_URL, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: "H",
      color: { dark: "#1a1a1a", light: "#ffffff" },
    }).catch(() => undefined);
    QRCode.toDataURL(SHARE_URL, {
      width: 1024,
      margin: 2,
      errorCorrectionLevel: "H",
      color: { dark: "#1a1a1a", light: "#ffffff" },
    })
      .then(setDataUrl)
      .catch(() => undefined);
  }, []);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "A Taste of Special Conventions",
          text: "Join us — A Taste of Special Conventions",
          url: SHARE_URL,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      void copyLink();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-warm flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 shadow-elegant text-center space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-terracotta">A Taste of</p>
          <h1 className="font-display text-3xl text-ink">Special Conventions</h1>
          <p className="text-xs text-muted-foreground mt-2">Sunday, August 30, 2026</p>
        </div>
        <div className="flex justify-center">
          <div className="bg-white p-4 rounded-lg border border-border">
            <canvas ref={canvasRef} aria-label="QR code to tasteofconventions.com" />
          </div>
        </div>
        <p className="text-sm text-ink">
          Scan with any phone camera, or open{" "}
          <a href={SHARE_URL} className="underline font-medium">tasteofconventions.com</a>
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Button type="button" onClick={share} className="bg-ink text-cream hover:bg-ink/90">
            Share
          </Button>
          <Button type="button" variant="outline" onClick={copyLink}>
            Copy link
          </Button>
        </div>
        {dataUrl && (
          <a
            href={dataUrl}
            download="taste-of-conventions-qr.png"
            className="block text-xs underline text-muted-foreground hover:text-ink"
          >
            Download QR image
          </a>
        )}
        <p className="text-xs text-muted-foreground">
          Print it. Text it. Tape it to the fridge. Only people on the invitation list with the
          matching name and phone can sign in.
        </p>
      </div>
    </div>
  );
}
