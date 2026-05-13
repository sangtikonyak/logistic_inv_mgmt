# Frontend Dashboard Implementation Plan

## Overview
The dashboard provides a high-level overview of the system's health, financial performance, and recent operations. It is fully reactive to a global date range filter.

## 1. UI/UX Design

### Layout Structure
- **Global Filter Bar**: Top-aligned, containing a Date Range Picker (Start Date, End Date) and an optional Warehouse selector.
- **Key Metrics Row (Stats Cards)**: 4-5 cards showing:
    - Total Sales (Currency)
    - Total Purchases (Currency)
    - Low Stock Count (Alert color)
    - Pending Shipments
- **Main Section (Charts)**: 
    - **Sales vs Purchases Trend**: A dual-line or stacked area chart showing daily/weekly performance.
- **Side/Bottom Section**:
    - **Latest Activity Feed**: A list of the latest 10 user activities with relative timestamps (e.g., "2 mins ago").
    - **Inventory Health Table**: A condensed view of the top 5 low-stock items.

### Aesthetics
- Modern, clean layout using TailwindCSS.
- Use of icons (Heroicons or similar) for stats cards.
- Status indicators (Green for growth/healthy, Red for alerts/low stock).

## 2. Technical Strategy

### Component Architecture
The dashboard will reside in `frontend/src/features/dashboard`.
- `DashboardPage.jsx`: Main container and layout.
- `components/StatsGrid.jsx`: Container for metric cards.
- `components/PerformanceChart.jsx`: Recharts integration.
- `components/ActivityFeed.jsx`: List component for user actions.
- `components/InventoryAlerts.jsx`: Table/list for low stock items.

### Data Fetching & State
- **Global State**: The `dateFrom` and `dateTo` state should be managed in the `DashboardPage` or a shared context.
- **API Hooks**: Utilize the standard fetch pattern in `src/shared/api`.
    - `getDashboardSummary(filters)`
    - `getDashboardActivities()`
    - `getSalesTrend(filters)`
- **Effect**: Updating the date range triggers a re-fetch of all dependent components via `useEffect` or a data-fetching library like TanStack Query.

### Libraries
- **Charting**: Recommend `recharts` for its native React support and ease of styling with Tailwind.
- **Date Handling**: `date-fns` (already in `package.json`).

## 3. Implementation Steps

1. **Step 1: API Services**: Define the new dashboard and activity endpoints in `frontend/src/shared/api/reporting.js` (or similar).
2. **Step 2: Core Layout**: Build the `DashboardPage` shell with the grid layout and global date state.
3. **Step 3: Stats Cards**: Implement the summary metrics.
4. **Step 4: Activity Feed**: Create the feed UI with descriptive icons for different `action_type` values (e.g., Shopping cart for Sales, Box for Inventory).
5. **Step 5: Chart Integration**: Set up Recharts to visualize the trend data.
6. **Step 6: Wiring**: Connect the date range picker to the API calls to ensure the dashboard updates in real-time.

## 4. Recommendations

- **Default Date Range**: Set the default state to "Last 30 Days" on component mount for an immediate meaningful view.
- **Skeleton Loaders**: Use skeleton screens for charts and cards while data is fetching to improve perceived performance.
- **Relative Time**: Use `date-fns` `formatDistanceToNow` for the activity feed timestamps.
- **Memoization**: Memoize chart components to prevent unnecessary re-renders when other parts of the dashboard update.
- **Empty States**: Ensure there are clean "No data found for this range" states for all widgets.
