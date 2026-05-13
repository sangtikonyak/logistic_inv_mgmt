import { spawn } from 'child_process';
import { setTimeout as delay } from 'timers/promises';

interface ApiResult {
  name: string;
  ok: boolean;
  status?: number;
  body: unknown;
}

const baseUrl = 'http://127.0.0.1:3000/api/v1';

async function request(name: string, path: string, init: RequestInit = {}): Promise<ApiResult> {
  try {
    const response = await fetch(`${baseUrl}${path}`, init);
    const text = await response.text();
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : text;
    } catch {
      body = text;
    }

    return { name, ok: response.ok, status: response.status, body };
  } catch (error) {
    return { name, ok: false, body: error instanceof Error ? error.message : String(error) };
  }
}

async function waitForServer() {
  for (let i = 0; i < 30; i += 1) {
    try {
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'x@example.com', password: 'x' }),
      });
      if (response.status === 400 || response.status === 401) {
        return;
      }
    } catch {}
    await delay(1000);
  }
  throw new Error('Server did not start on port 3000 in time');
}

async function main() {
  const server = spawn('powershell', ['-NoProfile', '-Command', 'npm run start'], {
    cwd: process.cwd(),
    stdio: 'ignore',
  });

  try {
    await waitForServer();

    const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const email = `warehouse-check.${stamp}@example.com`;
    const password = 'Password123!';
    const results: ApiResult[] = [];

    results.push(
      await request('register-company', '/auth/register-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: `Warehouse Check ${stamp}`, adminEmail: email, password }),
      })
    );

    const login = await request('login', '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    results.push(login);

    const token = (login.body as any)?.data?.accessToken as string;
    if (!login.ok || !token) {
      console.log(JSON.stringify(results, null, 2));
      process.exit(1);
    }

    const authHeaders = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const unit = await request('create-unit', '/products/units', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name: 'Piece', code: 'PCS', description: 'Pieces' }),
    });
    results.push(unit);
    const unitId = (unit.body as any)?.data?.[0]?.id as string;

    const category = await request('create-category', '/products/categories', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name: 'Hardware', parentCategoryId: null, description: 'Hardware items' }),
    });
    results.push(category);
    const categoryId = (category.body as any)?.data?.[0]?.id as string;

    const product = await request('create-product', '/products', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Warehouse Check Product',
        productType: 'SIMPLE',
        unitId,
        status: 'ACTIVE',
        isSellable: true,
        isPurchasable: true,
        trackInventory: true,
        allowBackorder: false,
        categoryIds: [categoryId],
        sellingPrice: 20,
        costPrice: 9,
        currencyCode: 'USD',
      }),
    });
    results.push(product);
    const productId = (product.body as any)?.data?.id as string;

    const warehouse1 = await request('create-warehouse-1', '/warehouses', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name: 'Check Primary', code: `P-${stamp}`, status: 'ACTIVE', isDefault: true }),
    });
    results.push(warehouse1);
    const warehouse1Id = (warehouse1.body as any)?.data?.id as string;

    const warehouse2 = await request('create-warehouse-2', '/warehouses', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name: 'Check Secondary', code: `S-${stamp}`, status: 'ACTIVE' }),
    });
    results.push(warehouse2);
    const warehouse2Id = (warehouse2.body as any)?.data?.id as string;

    const zone = await request('create-zone', `/warehouses/${warehouse1Id}/zones`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name: 'Check Zone', code: `Z-${stamp}`, sortOrder: 1 }),
    });
    results.push(zone);
    const zoneId = (zone.body as any)?.data?.id as string;

    const bin = await request('create-bin', `/warehouses/zones/${zoneId}/bins`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name: 'Check Bin', code: `B-${stamp}`, sortOrder: 1, isPickable: true, isReceiving: true, isDispatch: false }),
    });
    results.push(bin);
    const binId = (bin.body as any)?.data?.id as string;

    results.push(
      await request('stock-adjustment-in', `/warehouses/${warehouse1Id}/stock/adjustments`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ productId, zoneId, binId, adjustmentType: 'ADJUSTMENT_IN', quantity: 4, notes: 'Warehouse check opening stock' }),
      })
    );

    results.push(
      await request('list-movements', `/warehouses/${warehouse1Id}/movements?page=1&limit=20`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })
    );

    const transfer = await request('create-transfer', '/warehouse-transfers', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        sourceWarehouseId: warehouse1Id,
        destinationWarehouseId: warehouse2Id,
        notes: 'Warehouse check transfer',
        items: [{ productId, quantity: 2, sourceBinId: binId }],
      }),
    });
    results.push(transfer);
    const transferId = (transfer.body as any)?.data?.id as string;

    results.push(
      await request('complete-transfer', `/warehouse-transfers/${transferId}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
    );

    results.push(
      await request('source-stock-after-transfer', `/warehouses/${warehouse1Id}/stock/${productId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })
    );

    results.push(
      await request('destination-stock-after-transfer', `/warehouses/${warehouse2Id}/stock/${productId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })
    );

    console.log(JSON.stringify(results, null, 2));

    if (results.some((result) => !result.ok)) {
      process.exit(1);
    }
  } finally {
    server.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
