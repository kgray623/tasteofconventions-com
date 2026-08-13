export type MealTextEvidenceDecision = "confirmed" | "disputed";

const normalizeCuisine = (raw: string) => {
  const lower = raw.toLowerCase();
  if (lower.includes("myanmar") || lower.includes("burmese")) return "Myanmar";
  if (lower.includes("africa") || lower.includes("mozambique")) return "African";
  if (lower.includes("indonesia")) return "Indonesian";
  return raw.trim();
};

export async function loadTodayPaymentTextEvidence(supabaseAdmin: any, actorId: string) {
  const { data: latestEvents, error: latestError } = await supabaseAdmin
    .from("meal_text_events")
    .select("event_at")
    .eq("campaign", "payment_update")
    .eq("action", "sent")
    .neq("evidence_source", "human_reconciliation")
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
    .gte("event_at", start)
    .lt("event_at", endDate.toISOString())
    .order("event_at", { ascending: false });
  if (eventsError) throw new Error(eventsError.message);

  const { data: reviewerReviews, error: reviewerError } = await supabaseAdmin
    .from("meal_text_evidence_reviews")
    .select("id,meal_text_event_id,decision,note,reviewed_at,reviewer_id,created_at")
    .eq("reviewer_id", actorId)
    .order("reviewed_at", { ascending: false })
    .order("created_at", { ascending: false });
  if (reviewerError) throw new Error(reviewerError.message);
  const reviewedEventIds = [...new Set(((reviewerReviews ?? []) as any[]).map((review) => review.meal_text_event_id as string))];
  const reviewedEvents = reviewedEventIds.length > 0
    ? await supabaseAdmin
        .from("meal_text_events")
        .select("id,preorder_id,cuisine,event_at,actor_id")
        .in("id", reviewedEventIds)
        .eq("campaign", "payment_update")
    : { data: [], error: null };
  if (reviewedEvents.error) throw new Error(reviewedEvents.error.message);
  const allEvents = new Map<string, any>();
  for (const event of [...((events ?? []) as any[]), ...((reviewedEvents.data ?? []) as any[])]) allEvents.set(event.id, event);
  const eventIds = [...allEvents.keys()];
  const reviews = eventIds.length > 0
    ? await supabaseAdmin
        .from("meal_text_evidence_reviews")
        .select("id,meal_text_event_id,decision,note,reviewed_at,reviewer_id,created_at")
        .eq("reviewer_id", actorId)
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
    lines: [...allEvents.values()].map((event) => {
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

export async function reconcilePaymentTextContact(
  supabaseAdmin: any,
  input: {
    preorderId: string;
    cuisines: string[];
    reviewerId: string;
    decision: MealTextEvidenceDecision;
  },
) {
  const cuisines = [...new Set(input.cuisines.map(normalizeCuisine).filter(Boolean))];
  const { data: preorder, error: preorderError } = await supabaseAdmin
    .from("cuisine_preorders")
    .select("id,selections")
    .eq("id", input.preorderId)
    .maybeSingle();
  if (preorderError) throw new Error(preorderError.message);
  if (!preorder) throw new Error("This meal contact could not be found");
  const active = new Set(
    (Array.isArray(preorder.selections) ? preorder.selections : [])
      .filter((item: any) => Number(item?.qty) > 0)
      .map((item: any) => normalizeCuisine(String(item?.cuisine ?? item?.country ?? ""))),
  );
  if (cuisines.length === 0 || cuisines.some((cuisine) => !active.has(cuisine))) {
    throw new Error("This confirmation does not match the current meal order");
  }

  const [{ data: payments, error: paymentError }, { data: confirmations, error: confirmationError }] = await Promise.all([
    supabaseAdmin.from("meal_payments").select("cuisine").eq("preorder_id", input.preorderId).is("cancelled_meal_at", null),
    supabaseAdmin.from("meal_order_status").select("cuisine,confirmed").eq("preorder_id", input.preorderId).eq("confirmed", true),
  ]);
  if (paymentError) throw new Error(paymentError.message);
  if (confirmationError) throw new Error(confirmationError.message);
  const paid = new Set([...(payments ?? []), ...(confirmations ?? [])].map((row: any) => normalizeCuisine(String(row.cuisine ?? ""))));
  if (cuisines.some((cuisine) => paid.has(cuisine))) throw new Error("Payment status changed; refresh before reconciling this contact");

  const evidence = await loadTodayPaymentTextEvidence(supabaseAdmin, input.reviewerId);
  const existingByCuisine = new Map(
    evidence.lines
      .filter((line) => line.preorder_id === input.preorderId)
      .map((line) => [normalizeCuisine(line.cuisine), line.event_id]),
  );
  const missing = cuisines.filter((cuisine) => !existingByCuisine.has(cuisine));
  if (input.decision === "confirmed" && missing.length > 0) {
    const eventAt = new Date().toISOString();
    const { data: inserted, error } = await supabaseAdmin
      .from("meal_text_events")
      .insert(missing.map((cuisine) => ({
        campaign: "payment_update",
        action: "sent",
        preorder_id: input.preorderId,
        cuisine,
        actor_id: input.reviewerId,
        event_at: eventAt,
        evidence_source: "human_reconciliation",
      })))
      .select("id,cuisine,actor_id,evidence_source");
    if (error) throw new Error(error.message);
    if ((inserted ?? []).length !== missing.length) throw new Error("The reconciliation event write could not be verified");
    for (const event of inserted ?? []) existingByCuisine.set(normalizeCuisine(event.cuisine), event.id);
  }
  const eventIds = cuisines.map((cuisine) => existingByCuisine.get(cuisine)).filter((id): id is string => Boolean(id));
  if (eventIds.length === 0) throw new Error("There is no send mark to dispute for this contact");
  if (input.decision === "confirmed" && eventIds.length !== cuisines.length) throw new Error("Not every cuisine message could be confirmed");
  return appendPaymentTextEvidenceReviews(supabaseAdmin, {
    eventIds,
    reviewerId: input.reviewerId,
    decision: input.decision,
    note: input.decision === "confirmed"
      ? "Reviewer confirms this contact physically received the payment update"
      : "Reviewer states this mark does not prove a physically sent text",
  });
}

export async function confirmMealInstructionText(
  supabaseAdmin: any,
  input: { preorderId: string; cuisine: string; reviewerId: string },
) {
  const cuisine = normalizeCuisine(input.cuisine);
  const { data: preorder, error: preorderError } = await supabaseAdmin
    .from("cuisine_preorders")
    .select("id,selections")
    .eq("id", input.preorderId)
    .maybeSingle();
  if (preorderError) throw new Error(preorderError.message);
  if (!preorder) throw new Error("This meal preorder could not be found");
  const active = new Set(
    (Array.isArray(preorder.selections) ? preorder.selections : [])
      .filter((item: any) => Number(item?.qty) > 0)
      .map((item: any) => normalizeCuisine(String(item?.cuisine ?? item?.country ?? ""))),
  );
  if (!active.has(cuisine)) throw new Error("This cuisine is no longer active on the preorder");

  const eventAt = new Date().toISOString();
  const { data: event, error } = await supabaseAdmin
    .from("meal_text_events")
    .insert({
      campaign: "payment_update",
      action: "sent",
      preorder_id: input.preorderId,
      cuisine,
      actor_id: input.reviewerId,
      event_at: eventAt,
      evidence_source: "human_reconciliation",
    })
    .select("id,preorder_id,cuisine,actor_id,evidence_source")
    .single();
  if (error) throw new Error(error.message);
  if (!event || event.preorder_id !== input.preorderId || normalizeCuisine(event.cuisine) !== cuisine) {
    throw new Error("The physical-send event could not be verified");
  }
  return appendPaymentTextEvidenceReviews(supabaseAdmin, {
    eventIds: [event.id],
    reviewerId: input.reviewerId,
    decision: "confirmed",
    note: "Reviewer confirms this cuisine instruction text was physically sent",
  });
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