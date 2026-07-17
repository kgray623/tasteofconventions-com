## Add Sonja Ingram as a guest of Myisha Woods

**Guest to add**
- Name: Sonja Ingram
- Phone: (402) 321-9014 (normalized: 4023219014)
- Notes: Walnut Creek congregation
- Event: Aug 30, 2026

**Committee-member linkage**

Myisha Woods is currently only in the `invitations` table (marked committee). She is NOT in the `inviters` table, so she has no `host_id` that another guest can be attached to. To make Sonja truly appear as "added by Myisha Woods," Myisha needs an `inviters` row.

### Steps

1. Create an `inviters` row for **Myisha Woods** with a new `host_id` (active = true). This lets her host guests and show up in "Added by" attribution.
2. Insert an `invitations` row for **Sonja Ingram**:
   - event_id = current event
   - host_id = Myisha's new host_id
   - guest_name = "Sonja Ingram"
   - guest_phone = "(402) 321-9014", guest_phone_normalized = "4023219014"
   - notes = "Walnut Creek congregation"
   - is_committee = false
3. Verify: search `(402) 321-9014` in `/admin` search bar and confirm "Sonja Ingram · Added by Myisha Woods" appears.

### Note

Myisha's own `inviters.host_id` won't be tied to her auth user (she doesn't have one on file here), so she'll be an attribution-only host until she signs in. That matches how a few other committee members are already set up.

**Timestamp:** 2026-07-17 UTC