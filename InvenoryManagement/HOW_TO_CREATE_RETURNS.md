# How to Create Returns - User Guide

## ✅ "Create Return" Buttons Added

The "Create Return" buttons have been added to both Receipt and Shipment detail pages.

---

## 📦 Creating a Purchase Return

### Step 1: Navigate to a Posted Receipt
1. Go to **Purchases → Receipts** from the sidebar
2. Click on any receipt to view details
3. Ensure the receipt status is **POSTED** (green badge)

### Step 2: Click "Create Return" Button
- The **"Create Return"** button appears in the top-right action area
- Button styling: Orange border with white background
- Only visible if:
  - ✅ Receipt status is POSTED
  - ✅ Your role is ADMIN or MANAGER

### Step 3: Fill the Return Form
You'll be redirected to: `/app/returns/receipts/{receiptId}/return`

**Form Fields:**
- **Return Date** (required): Date when goods are being returned
- **Return Reason** (optional): e.g., "Damaged", "Wrong item", "Quality issue"
- **Additional Notes** (optional): Any extra details

**Items Section:**
- All received items are pre-loaded
- For each item, enter **Qty Returning** (0 to received quantity)
- Unit cost is shown as read-only
- At least one item must have quantity > 0

### Step 4: Submit
- Click **"Create Draft Return"** button
- You'll be redirected to the return detail page
- Status will be **DRAFT** (amber badge)

### Step 5: Post the Return (Optional)
- From the return detail page, click **"Post to Inventory"**
- Confirm the action
- Inventory will be adjusted (stock decreased)
- Status changes to **POSTED** (green badge)

---

## 🚚 Creating a Sales Return

### Step 1: Navigate to a Posted Shipment
1. Go to **Sales → Shipments** from the sidebar
2. Click on any shipment to view details
3. Ensure the shipment status is **POSTED** (green badge)

### Step 2: Click "Create Return" Button
- The **"Create Return"** button appears in the top-right action area
- Button styling: Orange border with white background
- Only visible if:
  - ✅ Shipment status is POSTED
  - ✅ Your role is ADMIN or MANAGER

### Step 3: Fill the Return Form
You'll be redirected to: `/app/returns/shipments/{shipmentId}/return`

**Form Fields:**
- **Return Date** (required): Date when goods are being returned
- **Return Reason** (optional): e.g., "Defective", "Wrong item", "Customer changed mind"
- **Additional Notes** (optional): Any extra details

**Items Section:**
- All shipped items are pre-loaded
- For each item, enter **Qty Returning** (0 to shipped quantity)
- Unit price is shown as read-only
- At least one item must have quantity > 0

### Step 4: Submit
- Click **"Create Draft Return"** button
- You'll be redirected to the return detail page
- Status will be **DRAFT** (amber badge)

### Step 5: Post the Return (Optional)
- From the return detail page, click **"Post to Inventory"**
- Confirm the action
- Inventory will be adjusted (stock increased)
- Status changes to **POSTED** (green badge)

---

## 🎯 Button Visibility Rules

### Purchase Returns (Receipt Detail Page)

| Receipt Status | User Role | Button Visible? |
|----------------|-----------|-----------------|
| DRAFT | ADMIN/MANAGER | ❌ No |
| DRAFT | STAFF | ❌ No |
| POSTED | ADMIN/MANAGER | ✅ Yes |
| POSTED | STAFF | ❌ No |
| CANCELLED | Any | ❌ No |

### Sales Returns (Shipment Detail Page)

| Shipment Status | User Role | Button Visible? |
|-----------------|-----------|-----------------|
| DRAFT | ADMIN/MANAGER | ❌ No |
| DRAFT | STAFF | ❌ No |
| POSTED | ADMIN/MANAGER | ✅ Yes |
| POSTED | STAFF | ❌ No |
| CANCELLED | Any | ❌ No |

**Why only POSTED?**
- You can only return goods that have been officially received/shipped
- DRAFT receipts/shipments haven't affected inventory yet
- CANCELLED receipts/shipments are already voided

---

## 🔄 Complete Workflow Examples

### Example 1: Purchase Return for Damaged Goods

1. **Receive Goods**
   - Navigate to Purchase Order
   - Create receipt with 100 units
   - Post receipt → Inventory +100

2. **Discover Damage**
   - 5 units are damaged
   - Navigate to the receipt detail page
   - Click **"Create Return"**

3. **Create Return**
   - Return Date: Today
   - Reason: "Damaged during shipping"
   - Notes: "Boxes were wet, items unusable"
   - Qty Returning: 5 units
   - Submit

4. **Post Return**
   - Review return details
   - Click **"Post to Inventory"**
   - Confirm → Inventory -5
   - Final inventory: 95 units

### Example 2: Sales Return for Wrong Item

1. **Ship Goods**
   - Navigate to Sales Order
   - Create shipment with 20 units
   - Post shipment → Inventory -20

2. **Customer Reports Issue**
   - Customer received wrong color
   - 3 units need to be returned
   - Navigate to the shipment detail page
   - Click **"Create Return"**

3. **Create Return**
   - Return Date: Today
   - Reason: "Wrong item shipped"
   - Notes: "Customer ordered blue, received red"
   - Qty Returning: 3 units
   - Submit

4. **Post Return**
   - Review return details
   - Click **"Post to Inventory"**
   - Confirm → Inventory +3
   - Inventory restocked for resale

---

## 🎨 Visual Guide

### Receipt Detail Page - Button Location

```
┌─────────────────────────────────────────────────────┐
│ Goods Receipt Note                                  │
│ REC-2024-001                                        │
│ Against PO: PO-2024-001                             │
│ [POSTED]  Jan 15, 2024                              │
│                                                     │
│                    [Create Return] [Back to Receipts]│
└─────────────────────────────────────────────────────┘
```

### Shipment Detail Page - Button Location

```
┌─────────────────────────────────────────────────────┐
│ Shipment                                            │
│ SHIP-2024-001                                       │
│ [POSTED]  Jan 15, 2024                              │
│                                                     │
│         [Create Return] [View Order] [Back]         │
└─────────────────────────────────────────────────────┘
```

### Button Styling

**Create Return Button:**
- Border: 2px solid orange (#F59E0B)
- Background: White
- Text: Orange (#F59E0B)
- Hover: Light orange background (#FEF3C7)

---

## ⚠️ Important Notes

### Business Rules
1. **Cannot return more than received/shipped**
   - HTML5 validation prevents this
   - Backend also validates (data integrity)

2. **Cannot return from DRAFT receipts/shipments**
   - Must post first to affect inventory
   - Then create return

3. **Cannot edit POSTED returns**
   - Once posted, returns are final
   - Only DRAFT returns can be edited

4. **Cannot return 0 items**
   - At least one item must have quantity > 0
   - Form validation prevents submission

### Permissions
- **STAFF users:** Can view returns but cannot create/post/cancel
- **MANAGER users:** Can create, post, and cancel returns
- **ADMIN users:** Full access to all return operations

### Inventory Impact
- **Purchase Return Posted:** Stock decreases (goods sent back to supplier)
- **Sales Return Posted:** Stock increases (goods returned by customer)
- **Draft Returns:** No inventory impact until posted

---

## 🐛 Troubleshooting

### Issue: "Create Return" button not visible
**Possible Causes:**
1. Receipt/Shipment is not POSTED
2. Your role is STAFF (read-only)
3. Receipt/Shipment is CANCELLED

**Solution:** Verify status and role

### Issue: Cannot submit return form
**Possible Causes:**
1. All items have quantity = 0
2. Return date is empty
3. Quantity exceeds available amount

**Solution:** Check form validation messages

### Issue: Error when posting return
**Possible Causes:**
1. Return is not in DRAFT status
2. Backend validation failed
3. Network error

**Solution:** Check error message, verify return status

---

## 📊 Return Status Flow

```
┌─────────┐
│  DRAFT  │ ← Create return from receipt/shipment
└────┬────┘
     │
     ├─→ [Post to Inventory] → ┌────────┐
     │                          │ POSTED │ (Final)
     │                          └────────┘
     │
     └─→ [Cancel Return] ────→ ┌───────────┐
                                │ CANCELLED │ (Final)
                                └───────────┘
```

**Status Meanings:**
- **DRAFT:** Return created but not yet processed
- **POSTED:** Return processed, inventory adjusted
- **CANCELLED:** Return voided, no inventory impact

---

## 🎓 Best Practices

1. **Add Clear Reasons**
   - Always fill the "Return Reason" field
   - Helps with supplier/customer communication
   - Useful for analytics and reporting

2. **Review Before Posting**
   - Double-check quantities
   - Verify return date
   - Posting is irreversible

3. **Use Notes Field**
   - Document any special circumstances
   - Reference damage reports or photos
   - Note customer communication

4. **Track Return Patterns**
   - Use Returns list filters
   - Monitor frequent return reasons
   - Identify quality issues early

---

**Last Updated:** April 17, 2026
**Status:** ✅ Fully Implemented
