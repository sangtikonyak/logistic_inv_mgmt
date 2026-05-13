# Returns Module - Navigation Guide

## ✅ Navigation Menu Added

The Returns module is now accessible from the main sidebar navigation under the **Operations** section.

### Sidebar Menu Structure

```
OPERATIONS
├── Inventory
├── Purchases
│   ├── Suppliers
│   ├── Purchase Orders
│   └── Receipts
├── Sales
│   ├── Sales Orders
│   ├── Reservations
│   ├── Shipments
│   └── Customers
└── Returns ← NEW!
    ├── Purchase Returns
    └── Sales Returns
```

### Menu Item Details

**Main Menu:**
- **Label:** Returns
- **Icon Code:** RT
- **Route:** `/app/returns`
- **Section:** Operations

**Sub-Menu Items:**
1. **Purchase Returns**
   - Icon Code: PR
   - Route: `/app/returns/purchase`
   - Shows list of all purchase returns

2. **Sales Returns**
   - Icon Code: SR
   - Route: `/app/returns/sales`
   - Shows list of all sales returns

### How to Access

1. **From Sidebar:**
   - Click "Returns" in the Operations section
   - Automatically redirects to Purchase Returns list
   - Use sub-menu to switch between Purchase/Sales returns

2. **From Receipt Detail Page:**
   - View any posted receipt
   - Click "Create Return" button (if ADMIN/MANAGER)
   - Opens return form pre-filled with receipt items

3. **From Shipment Detail Page:**
   - View any posted shipment
   - Click "Create Return" button (if ADMIN/MANAGER)
   - Opens return form pre-filled with shipment items

### Visual Indicators

**Active State:**
- When on any returns page, the "Returns" menu item will have:
  - Dark background (`bg-[#111827]`)
  - White text
  - RT icon with white background

**Sub-Menu Active State:**
- Active sub-menu item has:
  - White background with shadow
  - Dark text
  - Bold font weight

### Role-Based Visibility

**All Users (ADMIN, MANAGER, STAFF):**
- ✅ Can see Returns menu item
- ✅ Can view returns lists
- ✅ Can view return details

**ADMIN & MANAGER Only:**
- ✅ Can create returns
- ✅ Can edit draft returns
- ✅ Can post returns to inventory
- ✅ Can cancel returns

**STAFF:**
- ❌ Cannot create/edit/post/cancel returns
- ✅ Read-only access

### Quick Navigation Paths

**Create Purchase Return:**
1. Navigate to Purchases → Receipts
2. Click on a posted receipt
3. Click "Create Return" button
4. Fill form and submit

**Create Sales Return:**
1. Navigate to Sales → Shipments
2. Click on a posted shipment
3. Click "Create Return" button
4. Fill form and submit

**View All Returns:**
1. Click "Returns" in sidebar
2. Use filters (search, status)
3. Click any return to view details

**Post a Return:**
1. Navigate to return detail page
2. Ensure status is DRAFT
3. Click "Post to Inventory" button
4. Confirm action
5. Inventory automatically adjusted

### Breadcrumb Navigation

When on returns pages, the topbar shows:
```
StockFlow / Returns
```

### Module Layout Tabs

When inside the Returns module, you'll see horizontal tabs:
- **Purchase Returns** (left tab)
- **Sales Returns** (right tab)

These tabs provide quick switching between return types without using the sidebar.

---

## Testing the Navigation

### Manual Test Steps

1. **Login to the application**
   - Use ADMIN or MANAGER credentials

2. **Verify sidebar menu**
   - Scroll to Operations section
   - Confirm "Returns" menu item is visible
   - Icon should show "RT"

3. **Click Returns menu**
   - Should navigate to `/app/returns/purchase`
   - Sub-menu should expand showing:
     - Purchase Returns (PR)
     - Sales Returns (SR)

4. **Test sub-menu navigation**
   - Click "Sales Returns"
   - Should navigate to `/app/returns/sales`
   - Active indicator should move to Sales Returns

5. **Test module tabs**
   - Click "Purchase Returns" tab at top
   - Should navigate back to purchase returns
   - Tab should highlight

6. **Test deep linking**
   - Manually navigate to `/app/returns/purchase`
   - Sidebar should show Returns as active
   - Sub-menu should be expanded

7. **Test role-based access**
   - Login as STAFF user
   - Verify Returns menu is visible
   - Verify no "Create Return" buttons appear

---

## Troubleshooting

### Issue: Returns menu not visible
**Solution:** Clear browser cache and refresh

### Issue: Sub-menu not expanding
**Solution:** Ensure you're on a returns route (`/app/returns/*`)

### Issue: Active state not showing
**Solution:** Check that route matches exactly (trailing slashes matter)

### Issue: Navigation redirects to dashboard
**Solution:** Verify authentication token is valid

---

## Screenshots Reference

### Sidebar - Collapsed State
```
┌─────────────────────┐
│ SF  StockFlow       │
│     INVENTORY       │
├─────────────────────┤
│ OPERATIONS          │
│ [IN] Inventory      │
│ [PU] Purchases      │
│ [SA] Sales          │
│ [RT] Returns    ←   │ NEW!
│ [UA] User Access    │
└─────────────────────┘
```

### Sidebar - Expanded State (on Returns page)
```
┌─────────────────────┐
│ SF  StockFlow       │
│     INVENTORY       │
├─────────────────────┤
│ OPERATIONS          │
│ [IN] Inventory      │
│ [PU] Purchases      │
│ [SA] Sales          │
│ [RT] Returns    ●   │ ← Active
│   ├─[PR] Purchase   │
│   └─[SR] Sales      │
│ [UA] User Access    │
└─────────────────────┘
```

### Module Layout Tabs
```
┌──────────────────────────────────────┐
│ RETURNS MANAGEMENT                   │
│ Returns                              │
│ Manage purchase and sales returns... │
├──────────────────────────────────────┤
│ [Purchase Returns] [Sales Returns]   │
└──────────────────────────────────────┘
```

---

**Last Updated:** April 17, 2026
**Status:** ✅ Navigation Implemented and Active
