// Shared, client-safe meal-text defaults and types.

/** Opening lines both catered-meal texts lead with. */
export const MEAL_TEXT_UPDATE_INTRO = `IMPORTANT UPDATE REGARDING your Taste of Conventions catered meal!`;

export const DEFAULT_MEAL_TEXT_TEMPLATE = `${MEAL_TEXT_UPDATE_INTRO}

Hi {first_name} —

Please see the following regarding your catered meal.

1. The {restaurant_cuisine} restaurant has provided Zelle to pre-pay your order, which is a secure method of payment.

2. All meals will be gluten-free, seed oil free (only using butter or beef tallow) and MSG free.

3. Your meal choices are:

{meal_choices}

Authentic side dishes will be included on each plate as seen at the tasteofconventions.com RSVP.

The committee vetted each meal and selected the best dishes for all tastes.

4. {zelle_qr_link}

{pay_sentence}

Send payment above.

5. The restaurant will verify your payment receipt within 72 hrs. You will have both your bank receipt and your RSVP as proof of your meal purchase.

6. August 23rd is the last day to pre-pay your meal which guarantees your meal will be available at the event.

7. If you chose to not pre-purchase a catered meal, please cancel your RSVP by logging into your account at tasteofconventions.com.

8. If you decline to purchase a catered meal, please bring a covered dish so you may enjoy a meal together.

9. If you have any issues, please text 808.278.7562.

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
