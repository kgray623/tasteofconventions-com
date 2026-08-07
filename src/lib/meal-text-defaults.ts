// Shared, client-safe meal-text defaults and types.
export const DEFAULT_MEAL_TEXT_TEMPLATE = `Hi {first_name} —

Because you RSVP'd for A Taste of Special Conventions and pre ordered a catered meal, the following is the contact information for the restaurant to pre-pay your catered meal direct.

{restaurant_name} — {restaurant_cuisine} the phone number is {restaurant_phone}

{restaurant_website}

Your order is for {order}.

How to pay:
{payment_options}
{online_prices}

The restaurant has been notified you will call to pre pay your meal, so please do so promptly.

Save your receipt to present at the event in order to verify your purchase and obtain your meal.

Thank you! 😊`;

/** Follow-up text for guests who were already texted before Zelle/Venmo existed. */
export const DEFAULT_ZELLE_UPDATE_TEMPLATE = `Hi {first_name} — quick update on your {restaurant_cuisine} meal ({order}).

You can now pay online instead of calling — here are all the ways to pay:
{payment_options}
{online_prices}

All catered meals must be paid for by Sunday, August 23. Please save your confirmation to show at the event.

Thank you! 😊`;

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
  inviter: string;
};
