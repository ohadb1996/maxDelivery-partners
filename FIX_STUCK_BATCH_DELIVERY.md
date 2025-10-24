# Fix Stuck Batched Delivery

## Problem
A batched delivery (2 deliveries together) is stuck in the "Active" section and won't complete even after clicking "השלמתי את המשלוח".

## Why This Happens
When you have a **batched delivery** (משלוח כפול), both deliveries need to be marked as completed together. If only one gets updated, the other stays active and keeps showing up.

## Solution Applied
I've updated the code so that when you click "השלמתי את המשלוח" on a batched delivery, it will now automatically update **ALL** deliveries in that batch to completed status.

## To Fix the Current Stuck Delivery

### Option 1: Using Firebase Console (Easiest)

1. Open Firebase Console: https://console.firebase.google.com
2. Go to your project
3. Click "Realtime Database" in the left menu
4. Navigate to: `Deliveries`
5. Find the delivery with ID: `-OC5DJE6` (you can use Ctrl+F to search)
6. Look at its `batch_id` field (something like `batch_-OC5DJE6_-OC5XXXX`)
7. Search for ALL deliveries with that same `batch_id`
8. For EACH delivery in the batch:
   - Click on the delivery
   - Find the `status` field
   - Change it from its current value to: `הושלם`
   - Click the ✓ checkmark to save
   - Also update `delivery_time` to current timestamp: `2025-10-24T15:00:00.000Z` (or current time)
   - Update `updated_at` to current timestamp as well

### Option 2: Delete from Courier's Active List

1. In Firebase Console, navigate to: `Couriers/{your-courier-id}/CollectedDeliveries`
2. Find the delivery ID: `-OC5DJE6` (and its batch partner if any)
3. Delete both entries
4. This will remove them from your active deliveries

### Option 3: Quick Fix - Change Status to הושלם

Since the delivery is already at "הגעתי ליעד" status, you can manually change it to completed:

1. Firebase Console → Realtime Database
2. `Deliveries/-OC5DJE6/status` → Change to `הושלם`
3. Find the batch partner (look at `batch_id` field)
4. Do the same for the batch partner delivery

## For Future Deliveries
The code has been updated, so this issue should not happen again. When you complete a batched delivery now, BOTH deliveries will be marked as completed automatically.

## Testing
After fixing the stuck delivery:
1. Refresh the partners app
2. Go to "פעיל" (Active) page
3. The stuck delivery should be gone
4. If it still shows, try clearing the app cache or restarting the app

