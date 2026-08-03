// Shared, client-safe meal-text defaults and types.
export const DEFAULT_MEAL_TEXT_TEMPLATE = `Hi {first_name} —

Because you RSVP'd for A Taste of Special Conventions and pre ordered a catered meal, the following is the contact information for the restaurant to pre-pay your catered meal direct.

{restaurant_name} — {restaurant_phone}
{restaurant_website}

Your order is for {order}

The restaurant has been notified you will call to pre pay your meal, so please do so promptly.

Save your receipt to present at the event in order to verify your purchase and obtain your meal.

Thank you! 😊`;


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
