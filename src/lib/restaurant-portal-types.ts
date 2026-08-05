export type PortalOrderRow = {
  preorderId: string;
  guestName: string;
  phone: string;
  cuisine: string;
  qty: number;
  paid: boolean;
  paidAt: string | null;
  qtyPaid: number;
  /** Restaurant has accepted this order into their kitchen queue. */
  confirmed: boolean;
  confirmedAt: string | null;
};

export type PortalData = {
  restaurant: { id: string; name: string; cuisine: string | null; phone: string | null };
  rows: PortalOrderRow[];
  totals: {
    meals: number;
    mealsPaid: number;
    mealsUnpaid: number;
    mealsConfirmed: number;
    households: number;
    householdsPaid: number;
  };
};
