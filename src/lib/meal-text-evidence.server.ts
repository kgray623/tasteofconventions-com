export type MealTextEvidenceDecision = "confirmed" | "disputed";

export async function loadTodayPaymentTextEvidence(supabaseAdmin: any, actorId: string) {
  const { data: latestEvents, error: latestError } = await supabaseAdmin
    .from("meal_text_events")
    .select("event_at")
    .eq("campaign", "payment_update")
    .eq("action", "sent")
    .eq("actor_id", actorId)
    .order("event_at", { ascending: false })
    .limit(1);
  if (latestError) throw new Error(latestError.message);
  const latestAt = (latestEvents?.[0]?.event_at as string | undefined) ?? new Date().toISOString();
  const activityDay = latestAt.slice(0, 10);
  const start = `${activityDay}T00:00:00.000Z`;
  const endDate = new Date(`${activityDay}T00:00:00.000Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  const { data: events, error: eventsError } = await supabaseAdmin
    .from("meal_text_events")
    .select("id,preorder_id,cuisine,event_at,actor_id")
    .eq("campaign", "payment_update")
    .eq("action", "sent")
    .eq("actor_id", actorId)
    .gte("event_at", start)
    .lt("event_at", endDate.toISOString())
    .order("event_at", { ascending: false });
  if (eventsError) throw new Error(eventsError.message);

  const eventIds = ((events ?? []) as any[]).map((event) => event.id as string);
  const reviews = eventIds.length > 0
    ? await supabaseAdmin
        .from("meal_text_evidence_reviews")
        .select("id,meal_text_event_id,decision,note,reviewed_at,reviewer_id")
        .in("meal_text_event_id", eventIds)
        .order("reviewed_at", { ascending: false })
        .order("created_at", { ascending: false })
    : { data: [], error: null };
  if (reviews.error) throw new Error(reviews.error.message);

  const latestReview = new Map<string, any>();
  for (const review of (reviews.data ?? []) as any[]) {
    if (!latestReview.has(review.meal_text_event_id)) {
      latestReview.set(review.meal_text_event_id, review);
    }
  }

  return {
    utc_day: activityDay,
    lines: ((events ?? []) as any[]).map((event) => {
      const review = latestReview.get(event.id);
      return {
        event_id: event.id as string,
        preorder_id: event.preorder_id as string,
        cuisine: event.cuisine as string,
        event_at: event.event_at as string,
        decision: (review?.decision ?? null) as MealTextEvidenceDecision | null,
        note: (review?.note ?? null) as string | null,
        reviewed_at: (review?.reviewed_at ?? null) as string | null,
      };
    }),
  };
}

export async function appendPaymentTextEvidenceReviews(
  supabaseAdmin: any,
  input: {
    eventIds: string[];
    reviewerId: string;
    decision: MealTextEvidenceDecision;
    note: string | null;
  },
) {
  const { data: events, error: eventError } = await supabaseAdmin
    .from("meal_text_events")
    .select("id,campaign,action")
    .in("id", input.eventIds);
  if (eventError) throw new Error(eventError.message);
  if ((events ?? []).length !== input.eventIds.length) throw new Error("One or more text records could not be found");
  if ((events ?? []).some((event: any) => event.campaign !== "payment_update" || event.action !== "sent")) {
    throw new Error("Evidence reviews can only be attached to payment-update send records");
  }

  const reviewedAt = new Date().toISOString();
  const rows = input.eventIds.map((eventId) => ({
    meal_text_event_id: eventId,
    reviewer_id: input.reviewerId,
    decision: input.decision,
    note: input.note,
    reviewed_at: reviewedAt,
  }));
  const { data: inserted, error } = await supabaseAdmin
    .from("meal_text_evidence_reviews")
    .insert(rows)
    .select("id,meal_text_event_id,reviewer_id,decision,note,reviewed_at");
  if (error) throw new Error(error.message);
  if ((inserted ?? []).length !== rows.length) throw new Error("The evidence review write could not be verified");
  for (const review of (inserted ?? []) as any[]) {
    if (review.reviewer_id !== input.reviewerId || review.decision !== input.decision) {
      throw new Error("The evidence review read-back did not match the requested decision");
    }
  }
  return { ok: true, reviews: inserted ?? [] };
}