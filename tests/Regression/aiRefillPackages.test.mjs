import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('refill catalog is editable by active verified admins and versioned instead of deleting purchases', () => {
    const page = read('resources/js/pages/admin/AiRefillPackages.tsx');
    const controller = read('app/Http/Controllers/Admin/AI/AiCreditAdminController.php');
    assert.match(page, /<AdminLayout/);
    for (const action of ['Add package', 'Edit', 'Remove', 'Save package', 'Confirm removal']) assert.ok(page.includes(action));
    assert.match(page, /price_minor: priceMinor, currency: 'BDT'/);
    assert.match(controller, /authorize\(\$request->user\(\), 'ai.manage_packages'\)/);
    const access = read('app/Domain/AI/Services/AiAdminAccess.php');
    assert.match(access, /in_array\(\$permission, \['ai.manage_features', 'ai.manage_editorial', 'ai.manage_packages'\], true\)/);
    assert.ok(access.indexOf("'ai.manage_packages'") < access.indexOf("DB::table('ai_admin_permissions')"));
    assert.match(controller, /authorize\(\$request->user\(\), 'ai.manage_credits'\)/);
    assert.match(controller, /pg_advisory_xact_lock/);
    assert.match(controller, /replace_id/);
    assert.match(controller, /where\('active', true\)\s*->update\(\['active' => false/);
    assert.doesNotMatch(controller, /DB::table\('ai_credit_packages'\)[^;]*->delete\(/);
});

test('payment selection keeps existing settlement, paid entitlement and strict BDT checkout', () => {
    const manager = read('app/Domain/Billing/Payments/Services/PaymentGatewayManager.php');
    const checkout = read('app/Domain/Billing/Payments/Services/PaymentCheckoutService.php');
    const routes = read('routes/web.php');
    assert.match(manager, /foreach \(\['bkash', 'sslcommerz'\] as \$provider\)/);
    assert.match(manager, /payments\.ai_refill_providers/);
    assert.match(checkout, /forAiRefill\(\$requestedProvider\)/);
    assert.match(checkout, /\$previous->provider !== \$provider/);
    assert.match(checkout, /\$plan\['source'\] !== 'subscription'/);
    assert.match(checkout, /\$product->currency !== 'BDT'/);
    assert.match(routes, /bkash\|nagad\|sslcommerz/);
    assert.match(read('app/Providers/AppServiceProvider.php'), /payments.gateway.sslcommerz',\s*\\App\\Domain\\Billing\\Payments\\Gateways\\UnconfiguredGateway::class/);
});
