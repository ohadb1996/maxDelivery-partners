# Cross-Business Batch Pickup Flow

## Problem
For cross-business batches (2 deliveries from 2 different businesses), the courier needs to:
1. Pick up from Business 1 → Business confirms
2. Pick up from Business 2 → Business confirms  
3. Only THEN proceed to deliver to customers

## Solution Design

### Database Fields (Added to each delivery in batch)

```typescript
{
  // Existing fields...
  is_batched: true,
  batch_id: "batch_xxx",
  
  // NEW: Cross-business pickup tracking
  pickup1_confirmed: false,  // Has first business confirmed pickup
  pickup2_confirmed: false,  // Has second business confirmed pickup  
  courier_arrived_pickup1: null,  // Timestamp
  courier_arrived_pickup2: null,  // Timestamp
}
```

### Status Flow

**Current Simple Flow:**
```
accepted → arrived_pickup → [wait for business] → picked_up → arrived_delivery → delivered
```

**New Cross-Business Flow:**
```
accepted 
  ↓
arrived_at_business_1 (courier marks)
  ↓
[WAIT for Business 1 confirmation] → pickup1_confirmed = true
  ↓  
arrived_at_business_2 (courier marks)
  ↓
[WAIT for Business 2 confirmation] → pickup2_confirmed = true
  ↓
picked_up (both confirmed) → arrived_delivery → delivered
```

### UI Changes

**Pickup Section for Cross-Business Batch:**

Shows 2 cards with progress:

**Business 1 Card:**
- ⏳ Waiting: "לך לעסק ראשון" + Navigate buttons
- ✅ Arrived: "הגעתי לעסק ראשון" button (courier clicks)
- ⏰ Confirming: "ממתין לאישור בעל העסק..." (locked, waiting)
- ✅ Confirmed: "נאסף מעסק ראשון ✓" (green checkmark)

**Business 2 Card:**
- 🔒 Locked until Business 1 confirmed
- Same flow as Business 1

**Only after BOTH confirmed:**
- Show delivery cards
- Enable "הגעתי ליעד" button

### Implementation Steps

1. ✅ Add new fields to DBDelivery interface
2. ⏳ Create helper functions:
   - `markArrivedAtBusiness1()`
   - `markArrivedAtBusiness2()`
   - `checkIfPickupsCompleted()`
3. ⏳ Update ActiveJob UI to show separate business pickup cards
4. ⏳ Add blocking logic (can't proceed until both confirmed)
5. ⏳ Update business app to confirm each pickup separately

### Business App Changes Needed

Business owners need to see:
- Which delivery in the batch is THEIRS
- Separate "אשר איסוף" button for their delivery only
- Can't confirm the other business's delivery

This requires updating the business app's delivery details page to:
1. Detect if delivery is part of cross-business batch
2. Show only their delivery for confirmation
3. Update `pickup1_confirmed` or `pickup2_confirmed` based on which delivery is theirs

### Firebase Structure

```
Deliveries/
  delivery_id_1: {
    batch_id: "batch_xxx",
    is_batched: true,
    business_email: "business1@example.com",
    pickup1_confirmed: false,  // This business's pickup
    courier_arrived_pickup1: "2025-01-01T10:00:00Z",
    ...
  }
  delivery_id_2: {
    batch_id: "batch_xxx", 
    is_batched: true,
    business_email: "business2@example.com",
    pickup2_confirmed: false,  // This business's pickup
    courier_arrived_pickup2: null,  // Courier hasn't arrived yet
    ...
  }
```

### Next Steps

1. Finish implementing courier-side functions
2. Update ActiveJob UI with separate pickup cards
3. Test courier flow
4. Update business app for separate confirmations
5. Test end-to-end flow


