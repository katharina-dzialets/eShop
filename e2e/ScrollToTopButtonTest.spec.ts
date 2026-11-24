import { test, expect, Page, Locator } from '@playwright/test';

// The big blue "back to top" button (src/WebApp/Components/Layout/ScrollToTopButton.razor).
// It floats in the bottom-left corner, mirroring the chatbot launcher on the right.

type Box = { x: number; y: number; width: number; height: number };

const BLUE = 'rgb(29, 78, 216)';        // --color-action-blue (#1D4ED8)
const BLUE_HOVER = 'rgb(30, 64, 175)';  // --color-action-blue-hover (#1E40AF)
const WHITE = 'rgb(255, 255, 255)';

function backToTop(page: Page): Locator {
  return page.getByRole('button', { name: 'Helloo', exact: true });
}

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  expect(box, 'element should have a layout box').not.toBeNull();
  return box!;
}

function intersects(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

async function scrollY(page: Page): Promise<number> {
  return page.evaluate(() => window.scrollY);
}

/** Scroll to a position and wait for the docking script to settle on the new frame. */
async function scrollToY(page: Page, y: number | 'bottom') {
  await page.evaluate(target => {
    const top = target === 'bottom' ? document.documentElement.scrollHeight : target;
    window.scrollTo({ top, behavior: 'instant' });
  }, y);
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
}

/** Contrast ratio between two `rgb(r, g, b)` colours (WCAG 2.x). */
function contrast(fg: string, bg: string): number {
  const lum = (rgb: string) => {
    const [r, g, b] = rgb.match(/\d+/g)!.slice(0, 3).map(Number).map(v => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [hi, lo] = [lum(fg), lum(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

test.describe('big blue back-to-top button', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('is one big blue pill in the bottom-left corner that stays there while scrolling', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Ready for a new adventure?' })).toBeVisible();

    const button = backToTop(page);
    await expect(button).toHaveCount(1);
    await expect(button).toBeVisible();
    await expect(button).toHaveText('Helloo');
    await expect(button).toHaveAttribute('type', 'button');
    await expect(button).toHaveAttribute('title', 'Back to top');

    // Colour: solid #1D4ED8 with white text that passes WCAG AA.
    await expect(button).toHaveCSS('background-color', BLUE);
    await expect(button).toHaveCSS('color', WHITE);
    await expect(button).toHaveCSS('position', 'fixed');
    expect(contrast(WHITE, BLUE)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(WHITE, BLUE_HOVER)).toBeGreaterThanOrEqual(4.5);

    // Size: 64 px tall, at least 64 px wide.
    const box = await boxOf(button);
    expect(box.height).toBeGreaterThanOrEqual(63.5);
    expect(box.width).toBeGreaterThanOrEqual(63.5);

    // Position: bottom-left, mirroring the chatbot launcher's gap from the right edge.
    const viewport = page.viewportSize()!;
    const chat = await boxOf(page.locator('.show-chatbot'));
    const chatRightGap = viewport.width - (chat.x + chat.width);
    expect(box.x + box.width).toBeLessThan(viewport.width / 2);
    expect(Math.abs(box.x - chatRightGap)).toBeLessThanOrEqual(20);
    const bottomGap = viewport.height - (box.y + box.height);
    expect(bottomGap).toBeGreaterThanOrEqual(16);
    expect(bottomGap).toBeLessThanOrEqual(36);

    // It floats: the same spot after scrolling part of the way down the page.
    await scrollToY(page, 400);
    expect(await scrollY(page)).toBeGreaterThan(0);
    const scrolled = await boxOf(button);
    expect(Math.abs(scrolled.x - box.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(scrolled.y - box.y)).toBeLessThanOrEqual(1);
  });

  test('scrolls the page back to the top when clicked', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.catalog-product').first()).toBeVisible();

    await scrollToY(page, 900);
    expect(await scrollY(page)).toBeGreaterThan(0);

    await backToTop(page).click();
    await expect.poll(() => scrollY(page)).toBe(0);
  });

  test('works from the keyboard with Enter and Space', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.catalog-product').first()).toBeVisible();
    const button = backToTop(page);

    for (const key of ['Enter', ' ']) {
      await scrollToY(page, 900);
      expect(await scrollY(page)).toBeGreaterThan(0);

      await button.focus();
      await expect(button).toBeFocused();
      // Visible focus ring (polled: the ring eases in).
      await expect.poll(() => button.evaluate(el => getComputedStyle(el).boxShadow)).toContain('rgb(30, 58, 138)');

      await page.keyboard.press(key);
      await expect.poll(() => scrollY(page)).toBe(0);
      // Keyboard users continue from the top of the page.
      await expect(page.locator('.eshop-brand')).toBeFocused();
    }
  });

  test('changes colour on hover and keeps white text', async ({ page }) => {
    await page.goto('/');
    const button = backToTop(page);
    await button.hover();
    await expect(button).toHaveCSS('background-color', BLUE_HOVER);
    await expect(button).toHaveCSS('color', WHITE);
  });

  test('is shown on the product page as well', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Adventurer GPS Watch' }).click();
    await expect(page.getByRole('heading', { name: 'Adventurer GPS Watch' })).toBeVisible();

    await expect(backToTop(page)).toHaveCount(1);
    await expect(backToTop(page)).toBeVisible();
    await expect(backToTop(page)).toHaveCSS('background-color', BLUE);
  });
});

for (const viewport of [
  { width: 375, height: 667 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
]) {
  test.describe(`back-to-top button at ${viewport.width} px`, () => {
    test.use({ viewport });

    test('stays on screen and covers no header, footer or chatbot control', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('.catalog-product').first()).toBeVisible();
      const button = backToTop(page);

      const checkNoOverlap = async (where: string, inCorner: boolean) => {
        const box = await boxOf(button);
        // Fully on screen, in the left half.
        expect(box.x, where).toBeGreaterThanOrEqual(0);
        expect(box.y, where).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width, where).toBeLessThanOrEqual(viewport.width / 2);
        expect(box.y + box.height, where).toBeLessThanOrEqual(viewport.height);
        if (inCorner) {
          const bottomGap = viewport.height - (box.y + box.height);
          expect(bottomGap, where).toBeGreaterThanOrEqual(16);
          expect(bottomGap, where).toBeLessThanOrEqual(36);
        }
        // Touch target never under 48 x 48.
        expect(box.width, where).toBeGreaterThanOrEqual(48);
        expect(box.height, where).toBeGreaterThanOrEqual(48);

        const others = page.locator([
          '.eshop-brand',
          '.eshop-topnav',
          '.eshop-topbar-actions',
          '.show-chatbot',
          '.eshop-footer a',
          '.eshop-footer-tagline',
          '.eshop-footer-copy',
        ].join(', '));
        for (const other of await others.all()) {
          if (!(await other.isVisible())) continue;
          const otherBox = await other.boundingBox();
          if (!otherBox) continue;
          const label = await other.evaluate(el => el.outerHTML.slice(0, 80));
          expect(intersects(box, otherBox), `${where}: overlaps ${label}`).toBe(false);
        }
      };

      await checkNoOverlap('top of the page', true);
      await scrollToY(page, 600);
      await checkNoOverlap('middle of the page', true);
      // At the very bottom the button docks on the footer's top edge when the whole footer
      // fits on screen. On phones the footer is taller than the screen, so the button stays
      // in the corner, on the empty strip the footer keeps for it, and is still reachable.
      await scrollToY(page, 'bottom');
      await checkNoOverlap('bottom of the page', viewport.width <= 480);
    });

    test('never sits under the open assistant panel', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('.catalog-product').first()).toBeVisible();

      await page.locator('.show-chatbot').click();
      const dock = page.locator('[data-chat-dock]');
      await expect(dock).toHaveClass(/is-open/);
      const button = backToTop(page);

      if (viewport.width <= 480) {
        // On phones the panel is a full-width bottom sheet, so the button steps aside.
        await expect(button).toBeHidden();
      } else {
        await expect(button).toBeVisible();
        // Wait for the panel's entrance animation to finish before measuring.
        await page.waitForTimeout(500);
        expect(intersects(await boxOf(button), await boxOf(dock))).toBe(false);
      }

      await page.locator('.show-chatbot').click();
      await expect(dock).not.toHaveClass(/is-open/);
      await expect(button).toBeVisible();
    });
  });
}
