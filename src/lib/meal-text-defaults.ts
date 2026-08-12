// Shared, client-safe meal-text defaults and types.

/** Opening lines both catered-meal texts lead with. */
export const MEAL_TEXT_UPDATE_INTRO = `IMPORTANT UPDATE REGARDING your Taste of Conventions catered meal!`;

export const DEFAULT_MEAL_TEXT_TEMPLATE = `${MEAL_TEXT_UPDATE_INTRO}

Hi {first_name} —

Please see the following information regarding your catered, pre-ordered meal.

1. The {restaurant_cuisine} restaurant has provided Zelle to collect pre-payment for your order, a secure method of payment.

2. All meals are gluten-free, seed oil free (only using butter or beef tallow) and MSG free.

3. Your meal choices are:

{meal_choices}

Side dishes are included. The committee vetted the meals and selected specific dishes for all tastes.

4. {zelle_qr_link}

{pay_sentence}

5. The restaurant will verify your payment receipt within 72 hrs.

6. You will have both your bank receipt and your RSVP of your meal purchase.

7. August 23rd is the last day to prepay which guarantees your meal at the event.

8. If you don't want to pre-purchase a catered meal, please cancel your RSVP by logging into your account at tasteofconventions.com.

9. If you're declining a catered meal, please bring a covered dish to share as we enjoy a meal together.

10. If you have any issues, please text 808.278.7562.

Thank you for your support in making this an encouraging and exciting experience for all! 😊

Christian ❤️ love,

Taste of Conventions Food Committee`;


/** Follow-up text for guests who were already texted before Zelle/Venmo existed. */
export const DEFAULT_ZELLE_UPDATE_TEMPLATE = DEFAULT_MEAL_TEXT_TEMPLATE;


export type MealRestaurant = {
  id: string;
  name: string;
  cuisine: string | null;
  phone: string | null;
  website: string | null;
  order_ready: boolean;
  venmo_handle?: string | null;
  zelle_name?: string | null;
  zelle_phone?: string | null;
  zelle_qr_url?: string | null;
  /** Legacy Zelle QR landing URL. Do not present as a direct bank-app payment link. */
  zelle_pay_link?: string | null;
  chicken_price?: number | null;
  beef_price?: number | null;
  price_note?: string | null;
};

export type MealTextRow = {
  id: string;
  name: string;
  phone: string;
  cuisine: string;
  qty: number;
  sent_at: string | null;
  /** Separate mark: the Zelle/Venmo follow-up text. Never derived from sent_at. */
  zelle_sent_at: string | null;
  /** Who tapped the check for the payment update. Marks are human-only. */
  sent_by?: string | null;
  inviter: string;
  state?: import("@/lib/meal-communication").MealCommunicationState;
  paid_at?: string | null;
  paid_source?: import("@/lib/meal-communication").MealPaymentSource | null;
  paid_note?: string | null;
  exception?: string | null;
};
