// Shared, client-safe meal-text defaults and types.

/** Opening lines both catered-meal texts lead with. */
export const MEAL_TEXT_UPDATE_INTRO = `IMPORTANT UPDATE REGARDING Your Catered Meal!`;

export const DEFAULT_MEAL_TEXT_TEMPLATE = `${MEAL_TEXT_UPDATE_INTRO}

Hi {first_name} —

This is an update regarding your Taste of Conventions catered meal.

In light of Jesus counsel about letting our yes mean yes, this is the information regarding your pre ordered catered meal request.

Each restaurant has provided a Zelle option which is a secure. Pre-pay with Zelle guarantees your meal. All catered meals must be pre-paid by AUGUST 23RD.

Thank you for your understanding in this matter.

For {restaurant_cuisine} your choices are:

{meal_choices}

{pay_sentence}

Your order is for {order}.

{meal_photos}

These are custom meals for our event that have been tasted by the Food Tasting Committee to ensure the quality.

Once you make a payment, the restaurant will update your profile to PAID.

Your receipt will appear in your bank account and in your RSVP.

August 23rd is the last day to prepay.

Please present your RSVP receipt at the event when obtaining your meal.

Thank you for your support in making this an encouraging and exciting experience for all! 😊

Christian ❤️ love,

Taste of Conventions Food Committee


P.S. Anyone not prepaying aren't guaranteed a meal. If you opt to not purchase a catered meal, please bring a covered dish.`;

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
