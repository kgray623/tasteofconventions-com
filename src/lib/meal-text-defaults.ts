// Shared, client-safe meal-text defaults and types.
export const DEFAULT_MEAL_TEXT_TEMPLATE = `Hi {first_name} — based on your RSVP for A Taste of Special Conventions, please contact the restaurant below to pre-order and pay for your catered meal.

{restaurant_name} — {restaurant_phone}
{restaurant_website}
Your order: {order}

The restaurant has been notified that you will be calling, so please do so promptly. Thank you!`;

export type MealRestaurant = {
  id: string;
  name: string;
  cuisine: string | null;
  phone: string | null;
  website: string | null;
  order_ready: boolean;
};

export type MealTextRow = {
  id: string;
  name: string;
  phone: string;
  cuisine: string;
  qty: number;
  sent_at: string | null;
};
