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

type Box = { x: number; y: number; width: number; height: number };
const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

test('big red Checkout button never covers the sticky side panels on desktop', async ({ page }) => {
  // Fills the cart with four lines first, which takes longer than the default 30s on slow hosts.
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  const checkout = page.getByRole('link', { name: 'Checkout', exact: true });

  // Enough lines that the item list outgrows the summary card, so the card pins while scrolling.
  await emptyCart(page);
  for (const product of ['Adventurer GPS Watch', 'AeroLite Cycling Helmet', 'Alpine Fusion Goggles', 'Alpine Tech Crampons']) {
    await addProductToCart(page, product);
  }

  await page.goto('/cart');
  const summary = page.locator('.cart-summary');
  await expect(summary).toBeVisible();
  await expect(page.locator('[data-cart-quantity-input]')).toHaveCount(4);
  const button = (await checkout.boundingBox())!;
  expect(overlaps(button, (await summary.boundingBox())!)).toBe(false);

  // Scroll until the card is stuck at its sticky offset, then check it again.
  const stickyTop = await summary.evaluate(el => parseFloat(getComputedStyle(el).top));
  const scrollTo = Math.ceil((await summary.boundingBox())!.y - stickyTop) + 40;
  await page.evaluate(y => window.scrollTo(0, y), scrollTo);
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(scrollTo);
  await expect.poll(async () => Math.round((await summary.boundingBox())!.y)).toBe(Math.round(stickyTop));
  expect(overlaps((await checkout.boundingBox())!, (await summary.boundingBox())!)).toBe(false);

  // The item page's buy box shares the same sticky offset, which must start below the button.
  await page.goto('/');
  await page.getByRole('link', { name: 'Adventurer GPS Watch' }).click();
  const buy = page.locator('.item-buy');
  await expect(buy).toBeVisible();
  expect(await buy.evaluate(el => parseFloat(getComputedStyle(el).top))).toBeGreaterThan(button.y + button.height);
  expect(overlaps((await checkout.boundingBox())!, (await buy.boundingBox())!)).toBe(false);
});
