import { test as base } from '@playwright/test';

// Layout/narration tests do not need to download 241 MB of weights per context.
// Real cold loading/inference is verified separately against the deployed worker.
export const test = base.extend({
  page: async ({ page }, providePage) => {
    // Most UI tests exercise the universal dedicated-worker fallback. Shared
    // transport and navigation lifetime have separate unit and real-model checks.
    await page.addInitScript(() => Object.defineProperty(window, 'SharedWorker', { value: undefined, configurable: true }));
    await page.route('**/js/phoneme-worker.js*', route => route.fulfill({
      contentType: 'text/javascript',
      body: `self.onmessage = ({ data }) => {
        if (data.type === 'load') self.postMessage({ id:data.id, ready:true });
        else self.postMessage({ id:data.id, segments:[] });
      };`,
    }));
    await providePage(page);
  },
});

export { expect, type Locator, type Page } from '@playwright/test';
