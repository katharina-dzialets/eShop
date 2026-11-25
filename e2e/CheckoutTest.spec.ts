import { test, expect } from '@playwright/test';
import { addProductToCart, emptyCart } from './cart-helpers';

test('place an order through checkout', async ({ page }) => {
  await emptyCart(page);

  await page.goto('/user/orders');
  await expect(page.getByRole('heading', { name: 'Orders', exact: true })).toBeVisible();
  const existingOrderCount = await page.locator('.order-number').count();

  await addProductToCart(page, 'Adventurer GPS Watch');
  await page.goto('/cart');
  await expect(page.getByRole('heading', { name: 'Shopping bag', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Check out' }).click();

  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
  await expect(page.getByLabel('Address')).toHaveValue('15703 NE 61st Ct');
  await expect(page.getByLabel('City')).toHaveValue('Redmond');
  await page.getByRole('button', { name: 'Place order' }).click();

  await expect(page).toHaveURL(/\/user\/orders$/);
  await expect(page.getByRole('heading', { name: 'Orders', exact: true })).toBeVisible();
  await expect(page.locator('.order-number')).toHaveCount(existingOrderCount + 1);
});

test('decline checkout returns to the cart and keeps its items', async ({ page }) => {
  await emptyCart(page);
  await addProductToCart(page, 'Adventurer GPS Watch');

  await page.goto('/checkout');
  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();

  const decline = page.getByRole('link', { name: 'Decline', exact: true });
  await expect(decline).toBeVisible();
  // Red (--color-danger, #c0341d) with white text.
  await expect(decline).toHaveCSS('background-color', 'rgb(192, 52, 29)');
  await expect(decline).toHaveCSS('color', 'rgb(255, 255, 255)');

  await decline.click();

  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByRole('heading', { name: 'Shopping bag', exact: true })).toBeVisible();
  await expect(page.locator('.cart-item .name')).toHaveText(['Adventurer GPS Watch']);
  await expect(page.getByLabel('Quantity of Adventurer GPS Watch')).toHaveValue('1');
});
