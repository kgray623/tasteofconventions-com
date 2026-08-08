// Shared, client-safe meal-text defaults and types.

/** Opening paragraph both catered-meal texts lead with. */
export const MEAL_TEXT_UPDATE_INTRO = `UPDATE REGARDING Your Catered Meal. The restaurants have given us a virtual pre-pay option for catered meals through Zelle. One offers Venmo too.

Thank you for your understanding as this is a first for all of us.`;

export const DEFAULT_MEAL_TEXT_TEMPLATE = `${MEAL_TEXT_UPDATE_INTRO}

Hi {first_name} —

Because you RSVP'd for A Taste of Special Conventions and ordered a catered meal, the following is the information to pay for your catered meal direct online instead of calling the restaurant and paying over the phone.

Thank you for your patience and understanding as this is a first for all of us.

{restaurant_name} — {restaurant_cuisine}
{restaurant_zelle}

Your order is for {order}.

How to pay:
{payment_options}
{online_prices}

{meal_photos}

The restaurant has been notified you will be prepaying your meal, as they are making these meals exclusively for our event.

Please dear friend, pay by August 23rd to ensure your meal is ready for your arrival at the Taste of Conventions event.

Your receipt will be in your bank and will be in your RSVP at tasteofconventions.com. Please present at the event your purchase receipt to obtain your meal.

Thank you for your support in making this an encouraging experience for all! 😊

The Taste of Conventions Food Committee`;

/** Follow-up text for guests who were already texted before Zelle/Venmo existed. */
export const DEFAULT_ZELLE_UPDATE_TEMPLATE = `${MEAL_TEXT_UPDATE_INTRO}

Hi {first_name} — quick update on your {restaurant_cuisine} meal ({order}).

You can now pay online instead of calling — here are all the ways to pay:
{payment_options}
{online_prices}

{meal_photos}

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
