import { test } from "vitest";
import fs from "node:fs";
import { renderMealTemplate, paymentLines, zelleQrLinkLine, zellePayLinkLine, mealOrderText, cuisineLabel } from "@/lib/meal-text-message";

test("render", () => {
  const tpl = fs.readFileSync("/tmp/tpl.txt", "utf8");
  for (const line of fs.readFileSync("/tmp/rests.txt", "utf8").trim().split("\n")) {
    const [name, cuisine, zn, zp, qr, link, cp, bp, note] = line.split("|");
    const r = { name, cuisine, phone: null, zelle_name: zn, zelle_phone: zp, zelle_qr_url: qr, zelle_pay_link: link, chicken_price: cp, beef_price: bp, price_note: note };
    const out = renderMealTemplate(tpl, {
      ...paymentLines(r), firstName: "Kari", restaurantName: name, restaurantCuisine: cuisineLabel(cuisine),
      restaurantPhone: "", restaurantWebsite: "", order: mealOrderText(1, cuisine),
      zelleQrLink: zelleQrLinkLine(cuisine, r), zelleLink: zellePayLinkLine(r),
    });
    console.log("=====", name, "=====\n" + out);
  }
});
