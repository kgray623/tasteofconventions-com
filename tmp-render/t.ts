import { paymentLines, renderMealTemplate, zelleQrLinkLine, mealOrderText } from "../src/lib/meal-text-message";
import { DEFAULT_MEAL_TEXT_TEMPLATE } from "../src/lib/meal-text-defaults";
const rs = [
 {name:"Lalibela",cuisine:"African",zelle_phone:"402-939-9093",zelle_name:"Senait T Gebremichael",chicken_price:21.90,beef_price:27.38},
 {name:"Koen",cuisine:"Indonesian",zelle_phone:"402-853-2509",zelle_name:"Inez Retnosari",chicken_price:24,beef_price:29},
 {name:"Burmese",cuisine:"Myanmar",zelle_phone:"310-595-6907",zelle_name:"Asian Burmese Restaurant",chicken_price:21.80,beef_price:27.25},
];
for (const r of rs) {
  const p = paymentLines(r as any);
  console.log("=====", r.cuisine);
  console.log(renderMealTemplate(DEFAULT_MEAL_TEXT_TEMPLATE, {
    firstName:"Tina", restaurantName:r.name, restaurantCuisine:r.cuisine!, restaurantPhone:"", restaurantWebsite:"",
    order: mealOrderText(1, r.cuisine!), ...p, zelleQrLink: zelleQrLinkLine(r.cuisine),
  } as any));
}
