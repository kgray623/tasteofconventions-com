// Shared, client-safe meal-text defaults and types.

/** Opening lines both catered-meal texts lead with. */
export const MEAL_TEXT_UPDATE_INTRO = `UPDATE REGARDING Your Catered Meal!`;

export const DEFAULT_MEAL_TEXT_TEMPLATE = `${MEAL_TEXT_UPDATE_INTRO}

Hi {first_name} —

This is an update to your Taste of Conventions catered pre-order meal.

The following information is how to pre-pay. Each restaurant has provided Zelle which is secure and direct.

For {restaurant_cuisine} your choices are:

{meal_choices}

{zelle_qr_link}

{pay_sentence}

Your order is for {order}.

The restaurant will verify your payment within 72 hrs and your RSVP will be updated and verified.

August 23rd is the last day to prepay.

Please present your receipt at the Taste of Conventions event in order to obtain your meal.

If you decide to not pre-purchase your meal, please login to your RSVP and cancel your pre-order.

Bringing a covered dish is the alternative to a pre-paid catered meal ensuring no one is left out of the festivities.

Thank you for your prompt attention and support in making this an encouraging and exciting experience for all! 😊

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
