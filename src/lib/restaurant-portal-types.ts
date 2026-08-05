export type PortalOrderRow = {
  preorderId: string;
  guestName: string;
  phone: string;
  cuisine: string;
  qty: number;
  paid: boolean;
  paidAt: string | null;
  qtyPaid: number;
};

export type PortalData = {
  restaurant: { id: string; name: string; cuisine: string | null; phone: string | null };
  rows: PortalOrderRow[];
  totals: {
    meals: number;
    mealsPaid: number;
    mealsUnpaid: number;
    households: number;
    householdsPaid: number;
  };
};
