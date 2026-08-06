import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isEmbedded, publicSiteUrl } from "@/lib/meal-text-message";

/**
 * Embedded webviews (the Lovable preview being the one committee members hit)
 * refuse to hand `sms:` off to the phone's Messages app. Nothing in the page can
 * override that, so show a one-tap way out to the real site.
 */
export function OpenOnSiteBanner() {
  const [framed, setFramed] = useState(false);
  const [href, setHref] = useState(publicSiteUrl("/"));

  useEffect(() => {
    setFramed(isEmbedded());
    setHref(publicSiteUrl());
  }, []);

  if (!framed) return null;

  return (
    <Card className="p-4 space-y-2 border-terracotta/40 bg-terracotta/5">
      <p className="text-sm font-medium">
        Texting can't open Messages from inside this preview.
      </p>
      <p className="text-xs text-muted-foreground">
        Tap the button below to open this same page on tasteofconventions.com in your phone's browser —
        your Text buttons work there.
      </p>
      <a
        href={href}
        target="_top"
        rel="noopener"
        className={cn(buttonVariants({ size: "sm" }), "bg-terracotta text-cream hover:bg-terracotta/90")}
      >
        <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Open on tasteofconventions.com
      </a>
    </Card>
  );
}
