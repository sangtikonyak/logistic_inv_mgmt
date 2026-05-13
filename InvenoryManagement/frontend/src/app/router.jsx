import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppShell } from './layouts/AppShell.jsx'
import { useAuth } from './providers/AuthProvider.jsx'
import { usePermissions } from '../shared/lib/permissions.js'
import { AcceptInvitePage } from '../features/auth/pages/AcceptInvitePage.jsx'
import { InviteUsersPage } from '../features/auth/pages/InviteUsersPage.jsx'
import { LoginPage } from '../features/auth/pages/LoginPage.jsx'
import { RegisterCompanyPage } from '../features/auth/pages/RegisterCompanyPage.jsx'
import { DashboardPage } from '../features/dashboard/pages/DashboardPage.jsx'
import { LandingPage } from '../features/marketing/pages/LandingPage.jsx'
import { ProductModuleLayout } from '../features/products/components/ProductModuleLayout.jsx'
import { ProductCategoriesPage } from '../features/products/pages/ProductCategoriesPage.jsx'
import { ProductCustomFieldsPage } from '../features/products/pages/ProductCustomFieldsPage.jsx'
import { ProductDetailPage } from '../features/products/pages/ProductDetailPage.jsx'
import { ProductFormPage } from '../features/products/pages/ProductFormPage.jsx'
import { ProductAttributesPage } from '../features/products/pages/ProductAttributesPage.jsx'
import { ProductListPage } from '../features/products/pages/ProductListPage.jsx'
import { ProductUnitsPage } from '../features/products/pages/ProductUnitsPage.jsx'
import { ModulePlaceholderPage } from '../features/shared/pages/ModulePlaceholderPage.jsx'
import { WarehouseModuleLayout } from '../features/warehouses/components/WarehouseModuleLayout.jsx'
import { WarehouseListPage } from '../features/warehouses/pages/WarehouseListPage.jsx'
import { WarehouseFormPage } from '../features/warehouses/pages/WarehouseFormPage.jsx'
import { WarehouseDetailPage } from '../features/warehouses/pages/WarehouseDetailPage.jsx'
import { InventoryModuleLayout } from '../features/inventory/components/InventoryModuleLayout.jsx'
import { StockListingPage } from '../features/inventory/pages/StockListingPage.jsx'
import { StockDetailPage } from '../features/inventory/pages/StockDetailPage.jsx'
import { LowStockAlertsPage } from '../features/inventory/pages/LowStockAlertsPage.jsx'
import { MovementsPage } from '../features/inventory/pages/MovementsPage.jsx'
import { TransferListPage } from '../features/inventory/pages/TransferListPage.jsx'
import { TransferFormPage } from '../features/inventory/pages/TransferFormPage.jsx'
import { TransferDetailPage } from '../features/inventory/pages/TransferDetailPage.jsx'
import { LotExpiryPage } from '../features/inventory/pages/LotExpiryPage.jsx'
import { ContainerTracePage } from '../features/inventory/pages/ContainerTracePage.jsx'
import { PurchaseModuleLayout } from '../features/purchase/components/PurchaseModuleLayout.jsx'
import { SupplierListPage } from '../features/purchase/pages/SupplierListPage.jsx'
import { SupplierFormPage } from '../features/purchase/pages/SupplierFormPage.jsx'
import { PurchaseOrderListPage } from '../features/purchase/pages/PurchaseOrderListPage.jsx'
import { PurchaseOrderFormPage } from '../features/purchase/pages/PurchaseOrderFormPage.jsx'
import { PurchaseOrderDetailPage } from '../features/purchase/pages/PurchaseOrderDetailPage.jsx'
import { ReceiptListPage } from '../features/purchase/pages/ReceiptListPage.jsx'
import { ReceiptFormPage } from '../features/purchase/pages/ReceiptFormPage.jsx'
import { ReceiptDetailPage } from '../features/purchase/pages/ReceiptDetailPage.jsx'
import { RequisitionListPage } from '../features/procurement/pages/RequisitionListPage.jsx'
import { RequisitionFormPage } from '../features/procurement/pages/RequisitionFormPage.jsx'
import { RequisitionDetailPage } from '../features/procurement/pages/RequisitionDetailPage.jsx'
import { SalesModuleLayout } from '../features/sales/components/SalesModuleLayout.jsx'
import { CustomerListPage } from '../features/sales/pages/CustomerListPage.jsx'
import { CustomerFormPage } from '../features/sales/pages/CustomerFormPage.jsx'
import { SalesOrderListPage } from '../features/sales/pages/SalesOrderListPage.jsx'
import { SalesOrderFormPage } from '../features/sales/pages/SalesOrderFormPage.jsx'
import { SalesOrderDetailPage } from '../features/sales/pages/SalesOrderDetailPage.jsx'
import { ReservationListPage } from '../features/sales/pages/ReservationListPage.jsx'
import { ReservationDetailPage } from '../features/sales/pages/ReservationDetailPage.jsx'
import { ReservationFormPage } from '../features/sales/pages/ReservationFormPage.jsx'
import { ShipmentListPage } from '../features/sales/pages/ShipmentListPage.jsx'
import { ShipmentDetailPage } from '../features/sales/pages/ShipmentDetailPage.jsx'
import { ShipmentFormPage } from '../features/sales/pages/ShipmentFormPage.jsx'
import { ReturnsModuleLayout } from '../features/returns/components/ReturnsModuleLayout.jsx'
import { PurchaseReturnListPage } from '../features/returns/pages/PurchaseReturnListPage.jsx'
import { PurchaseReturnDetailPage } from '../features/returns/pages/PurchaseReturnDetailPage.jsx'
import { PurchaseReturnFormPage } from '../features/returns/pages/PurchaseReturnFormPage.jsx'
import { SalesReturnListPage } from '../features/returns/pages/SalesReturnListPage.jsx'
import { SalesReturnDetailPage } from '../features/returns/pages/SalesReturnDetailPage.jsx'
import { SalesReturnFormPage } from '../features/returns/pages/SalesReturnFormPage.jsx'
import { ReportingModuleLayout } from '../features/reporting/components/ReportingModuleLayout.jsx'
import { ReportingDashboardPage } from '../features/reporting/pages/ReportingDashboardPage.jsx'
import { ReplenishmentModuleLayout } from '../features/replenishment/components/ReplenishmentModuleLayout.jsx'
import { DemandSnapshotsPage } from '../features/replenishment/pages/DemandSnapshotsPage.jsx'

function ProtectedRoute() {
  const { isAuthenticated, isBootstrapped } = useAuth()

  if (!isBootstrapped) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--canvas)] px-6 text-center">
        <div className="rounded-[1.75rem] border border-[var(--line)] bg-white px-8 py-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <p className="font-[var(--font-display)] text-sm uppercase tracking-[0.28em] text-[var(--muted)]">
            Loading session
          </p>
          <p className="mt-3 text-sm text-slate-600">
            Rehydrating local auth context before opening the protected workspace.
          </p>
        </div>
      </div>
    )
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/auth/login" replace />
}

function PublicOnlyRoute() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Navigate to="/app/dashboard" replace /> : <Outlet />
}

function SuperAdminRoute() {
  const { isSuperAdmin } = usePermissions()
  return isSuperAdmin ? <Outlet /> : <Navigate to="/app/dashboard" replace />
}

function ReportsRoute() {
  const { can, role } = usePermissions()
  const roleAllowed = role === 'ADMIN' || role === 'MANAGER' || role === 'SUPER_ADMIN'
  const permissionAllowed = can('REPORTS', 'READ')
  return roleAllowed || permissionAllowed ? <Outlet /> : <Navigate to="/app/dashboard" replace />
}

function ReplenishmentRoute() {
  const { can, role } = usePermissions()
  const roleAllowed = role === 'ADMIN' || role === 'MANAGER' || role === 'SUPER_ADMIN'
  const permissionAllowed = can('REPLENISHMENT', 'READ')
  return roleAllowed || permissionAllowed ? <Outlet /> : <Navigate to="/app/dashboard" replace />
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route element={<PublicOnlyRoute />}>
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register-company" element={<RegisterCompanyPage />} />
          <Route path="/auth/accept-invite" element={<AcceptInvitePage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<AppShell />}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="products" element={<ProductModuleLayout />}>
              <Route index element={<Navigate to="/app/products/list" replace />} />
              <Route path="list" element={<ProductListPage />} />
              <Route path="new" element={<ProductFormPage />} />
              <Route path="categories" element={<ProductCategoriesPage />} />
              <Route path="units" element={<ProductUnitsPage />} />
              <Route path="custom-fields" element={<ProductCustomFieldsPage />} />
              <Route path=":productId" element={<ProductDetailPage />} />
              <Route path=":productId/edit" element={<ProductFormPage />} />
              <Route path=":productId/attributes" element={<ProductAttributesPage />} />
            </Route>
            <Route path="warehouses" element={<WarehouseModuleLayout />}>
              <Route index element={<Navigate to="/app/warehouses/list" replace />} />
              <Route path="list" element={<WarehouseListPage />} />
              <Route path="new" element={<WarehouseFormPage />} />
              <Route path=":warehouseId" element={<WarehouseDetailPage />} />
              <Route path=":warehouseId/edit" element={<WarehouseFormPage />} />
            </Route>
            <Route path="inventory" element={<InventoryModuleLayout />}>
              <Route index element={<Navigate to="/app/inventory/stock" replace />} />
              <Route path="stock" element={<StockListingPage />} />
              <Route path="stock/:itemId" element={<StockDetailPage />} />
              <Route path="alerts" element={<LowStockAlertsPage />} />
              <Route path="movements" element={<MovementsPage />} />
              <Route path="lots" element={<LotExpiryPage />} />
              <Route path="containers" element={<ContainerTracePage />} />
              <Route path="transfers" element={<TransferListPage />} />
              <Route path="transfers/new" element={<TransferFormPage />} />
              <Route path="transfers/:transferId" element={<TransferDetailPage />} />
            </Route>
            <Route path="purchases" element={<PurchaseModuleLayout />}>
              <Route index element={<Navigate to="/app/purchases/orders" replace />} />
              <Route path="suppliers" element={<SupplierListPage />} />
              <Route path="suppliers/new" element={<SupplierFormPage />} />
              <Route path="suppliers/:supplierId" element={<SupplierFormPage />} />
              <Route path="requisitions" element={<RequisitionListPage />} />
              <Route path="requisitions/new" element={<RequisitionFormPage />} />
              <Route path="requisitions/:requisitionId" element={<RequisitionDetailPage />} />
              <Route path="orders" element={<PurchaseOrderListPage />} />
              <Route path="orders/new" element={<PurchaseOrderFormPage />} />
              <Route path="orders/:orderId" element={<PurchaseOrderDetailPage />} />
              <Route path="orders/:orderId/edit" element={<PurchaseOrderFormPage />} />
              <Route path="orders/:orderId/receive" element={<ReceiptFormPage />} />
              <Route path="receipts" element={<ReceiptListPage />} />
              <Route path="receipts/:receiptId" element={<ReceiptDetailPage />} />
            </Route>
            <Route path="sales" element={<SalesModuleLayout />}>
              <Route index element={<Navigate to="/app/sales/orders" replace />} />
              <Route path="orders" element={<SalesOrderListPage />} />
              <Route path="orders/new" element={<SalesOrderFormPage />} />
              <Route path="orders/:orderId" element={<SalesOrderDetailPage />} />
              <Route path="orders/:orderId/edit" element={<SalesOrderFormPage />} />
              <Route path="orders/:orderId/reserve" element={<ReservationFormPage />} />
              <Route path="orders/:orderId/ship" element={<ShipmentFormPage />} />
              <Route path="reservations" element={<ReservationListPage />} />
              <Route path="reservations/:reservationId" element={<ReservationDetailPage />} />
              <Route path="shipments" element={<ShipmentListPage />} />
              <Route path="shipments/:shipmentId" element={<ShipmentDetailPage />} />
              <Route path="customers" element={<CustomerListPage />} />
              <Route path="customers/new" element={<CustomerFormPage />} />
              <Route path="customers/:customerId" element={<CustomerFormPage />} />
            </Route>
            <Route path="returns" element={<ReturnsModuleLayout />}>
              <Route index element={<Navigate to="/app/returns/purchase" replace />} />
              <Route path="purchase" element={<PurchaseReturnListPage />} />
              <Route path="purchase/:purchaseReturnId" element={<PurchaseReturnDetailPage />} />
              <Route path="purchase/:purchaseReturnId/edit" element={<PurchaseReturnFormPage />} />
              <Route path="receipts/:receiptId/return" element={<PurchaseReturnFormPage />} />
              <Route path="sales" element={<SalesReturnListPage />} />
              <Route path="sales/:salesReturnId" element={<SalesReturnDetailPage />} />
              <Route path="sales/:salesReturnId/edit" element={<SalesReturnFormPage />} />
              <Route path="shipments/:shipmentId/return" element={<SalesReturnFormPage />} />
            </Route>
            <Route element={<ReportsRoute />}>
              <Route path="reports" element={<ReportingModuleLayout />}>
                <Route index element={<Navigate to="/app/reports/dashboard" replace />} />
                <Route path="dashboard" element={<ReportingDashboardPage />} />
              </Route>
            </Route>
            <Route element={<ReplenishmentRoute />}>
              <Route path="replenishment" element={<ReplenishmentModuleLayout />}>
                <Route index element={<Navigate to="/app/replenishment/demand-snapshots" replace />} />
                <Route path="demand-snapshots" element={<DemandSnapshotsPage />} />
              </Route>
            </Route>
            <Route element={<SuperAdminRoute />}>
              <Route path="settings/users" element={<InviteUsersPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
