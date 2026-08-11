import { useEffect, useState } from "react";
import { Copy, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SmsTextButton } from "@/components/sms-text-button";
import {
  cuisineLabel,
  mealPhotosLine,
  paymentLines,
  renderMealTemplate,
  smsNumber,
  zelleQrLinkLine,
} from "@/lib/meal-text-message";
import type { MealRestaurant } from "@/lib/meal-text-defaults";

const CUISINES = ["African", "Indonesian", "Myanmar"] as const;
const STORAGE_KEY = "meal-text-self-test";

type Props = {
  restaurants: MealRestaurant[];
  zelleTemplate: string;
  self: { name: string; phone: string };
};

const orderText = (qty: number, cuisine: string) =>
  `${qty} ${cuisine} meal${qty === 1 ? "" : "s"}`;

const restaurantFor = (restaurants: MealRestaurant[], cuisine: string) =>
  restaurants.find(
    (r) =>
      (r.cuisine ?? "").toLowerCase() === cuisine.toLowerCase() ||
      r.name.toLowerCase() === cuisine.toLowerCase() ||
      (cuisine === "Myanmar" && r.name.toLowerCase().includes("burmese")),
  );

/**
 * Test the real payment text on yourself, one per cuisine. Uses the exact same
 * template and message builder as the live queue, so what you receive is what a
 * guest receives. Nothing is recorded: no sent marks, no payment rows, no guest
 * records are touched by anything on this panel.
 */
export function MealTextSelfTest({ restaurants, zelleTemplate, self }: Props) {
  const [name, setName] = useState(self.name || "");
  const [phone, setPhone] = useState(self.phone || "");
  const [qty, setQty] = useState(1);

  // Remember what you typed, so the test is one tap next time.
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
      if (saved && typeof saved === "object") {
        if (typeof saved.name === "string" && saved.name) setName(saved.name);
        if (typeof saved.phone === "string" && saved.phone) setPhone(saved.phone);
        if (Number.isFinite(saved.qty) && saved.qty > 0) setQty(Number(saved.qty));
      }
    } catch {
      /* ignore unreadable storage */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ name, phone, qty }));
    } catch {
      /* ignore write failures */
    }
  }, [name, phone, qty]);

  const bodyFor = (cuisine: string) => {
    const r = restaurantFor(restaurants, cuisine);
    const pay = paymentLines(r);
    const who = name.trim() || "Friend";
    return renderMealTemplate(zelleTemplate, {
      ...pay,
      firstName: who.split(/\s+/)[0] ?? who,
      restaurantName: r?.name ?? cuisine,
      restaurantCuisine: cuisineLabel(r?.cuisine?.trim() || cuisine),
      restaurantPhone: r?.phone?.trim() || "[add the restaurant's phone number]",
      restaurantWebsite: r?.website?.trim() || "",
      order: orderText(qty, cuisine),
      mealPhotos: mealPhotosLine(cuisine),
      zelleQrLink: zelleQrLinkLine(cuisine, r),
      zelleLink: "",
    });
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Message copied");
    } catch {
      toast.error("Copy blocked — select the text and copy it manually.");
    }
  };

  const num = smsNumber(phone);

  return (
    <Card className="p-5 space-y-4 border-terracotta/40">
      <div className="flex flex-wrap items-center gap-2">
        <FlaskConical className="w-5 h-5 text-terracotta" />
        <h3 className="font-display text-xl">Test on yourself</h3>
        <Badge variant="outline">Nothing is recorded</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        Send yourself the exact payment text for each cuisine before anyone else gets it. These use
        the same wording, prices, Zelle details and links as the live queue. Sending from here never
        marks anything as sent and never changes a guest, meal or payment record.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <label htmlFor="self-test-name" className="text-xs text-muted-foreground">
            Name in the message
          </label>
          <Input
            id="self-test-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Kari"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="self-test-phone" className="text-xs text-muted-foreground">
            Your phone number
          </label>
          <Input
            id="self-test-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="402-555-0123"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="self-test-qty" className="text-xs text-muted-foreground">
            Meals per cuisine
          </label>
          <Input
            id="self-test-qty"
            value={String(qty)}
            onChange={(e) => {
              const n = Number(e.target.value.replace(/\D/g, ""));
              setQty(Number.isFinite(n) && n > 0 ? n : 1);
            }}
            inputMode="numeric"
          />
        </div>
      </div>

      {!num && (
        <p className="text-xs text-brand-red">
          Add your phone number above to enable the test text buttons.
        </p>
      )}

      <div className="space-y-4">
        {CUISINES.map((cuisine) => {
          const r = restaurantFor(restaurants, cuisine);
          const body = bodyFor(cuisine);
          return (
            <div key={cuisine} className="rounded-md border border-border p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{cuisineLabel(cuisine)}</span>
                <Badge variant="outline" className="text-[10px]">
                  {orderText(qty, cuisine)}
                </Badge>
                {r ? (
                  <span className="text-xs text-muted-foreground">{r.name}</span>
                ) : (
                  <span className="text-xs text-brand-red">No restaurant on file</span>
                )}
              </div>
              <Textarea readOnly value={body} rows={10} className="text-xs" />
              <div className="flex flex-wrap gap-2">
                {num && (
                  <SmsTextButton
                    numbers={[num]}
                    body={body}
                    label={`Text myself the ${cuisineLabel(cuisine)} message`}
                  />
                )}
                <Button size="sm" variant="outline" onClick={() => void copy(body)}>
                  <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy message
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
