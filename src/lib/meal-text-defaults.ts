// Shared, client-safe meal-text defaults and types.

/** Opening lines both catered-meal texts lead with. */
export const MEAL_TEXT_UPDATE_INTRO = `IMPORTANT UPDATE REGARDING Your Taste of Conventions catered meal!`;

export const DEFAULT_MEAL_TEXT_TEMPLATE = `${MEAL_TEXT_UPDATE_INTRO}

Hi {first_name} —

The following information is how to pay your catered meal pre-order. Each restaurant has provided Zelle which is secure and direct.

Your pre-order is for {order} and {restaurant_cuisine} meal choices are:

{meal_choices}

{zelle_qr_link}

Or open Zelle in your bank app, then {pay_sentence}

The restaurant will verify your payment within 72 hrs. You will have both a bank receipt and your RSVP securing your meal.

August 23rd is the last day to prepay catered meals to guarantee your meal, and give the restaurant time to prepare.

When you're at the event, please present your RSVP receipt for your meal.

If you decide to not pre-purchase your meal, please login to your RSVP and cancel your pre-order.

You may opt to bring a covered dish as an alternative to pre-paying a catered meal. Ensuring all have food for the event takes pre-planning for all of us.

Thank you for your prompt attention and support in making this an encouraging and exciting experience for all of us! 😊

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
