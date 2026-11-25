import { test, expect } from '@playwright/test';
import { addProductToCart, emptyCart } from './cart-helpers';

test('big red Checkout button floats in the top-right corner and opens checkout', async ({ page }) => {
  await emptyCart(page);
  await addProductToCart(page, 'Adventurer GPS Watch');

  // Shown on every page: check it on the catalog, then scroll to prove it stays fixed.
  await page.goto('/');
  const checkout = page.getByRole('link', { name: 'Checkout', exact: true });
  await expect(checkout).toBeVisible();
  await expect(checkout).toHaveCSS('position', 'fixed');
  // Red (--color-danger, #c0341d) with white text.
  await expect(checkout).toHaveCSS('background-color', 'rgb(192, 52, 29)');
  await expect(checkout).toHaveCSS('color', 'rgb(255, 255, 255)');

  const viewport = page.viewportSize()!;
  const box = (await checkout.boundingBox())!;
  expect(box.x + box.width).toBeGreaterThan(viewport.width * 0.75);
  expect(box.y).toBeLessThan(viewport.height * 0.25);

  await page.mouse.wheel(0, 2000);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  expect((await checkout.boundingBox())!.y).toBeCloseTo(box.y, 0);

  await page.goto('/cart');
  await expect(checkout).toBeVisible();

  await checkout.click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
});
