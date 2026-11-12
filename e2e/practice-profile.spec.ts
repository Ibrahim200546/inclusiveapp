import { test, expect, type Page } from './fixtures';

const authKey = 'practice-profile-test-auth';
const avatar = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jh1sAAAAASUVORK5CYII=';

async function initialize(page: Page, signedIn = false) {
  await page.addInitScript(({ authKey, signedIn }) => {
    (window as Window & { INCLUSIVE_SUPABASE_AUTH_STORAGE_KEY?: string }).INCLUSIVE_SUPABASE_AUTH_STORAGE_KEY = authKey;
    localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true');
    localStorage.setItem('profileLang', 'ru'); localStorage.setItem('locale', 'ru');
    if (signedIn) localStorage.setItem(authKey, JSON.stringify({ access_token: 'test-token', user: { id: 'learner-test', email: 'learner@example.test' } }));
  }, { authKey, signedIn });
}

async function backend(page: Page, role = 'student') {
  const state = { name: 'Алия', avatar, coins: 100, failSave: false, failCoins: false, writes: [] as Record<string, unknown>[] };
  await page.route('**/rest/v1/**', async route => {
    const url = new URL(route.request().url());
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON(); state.writes.push(body);
      if (url.pathname.endsWith('/profiles')) {
        if (state.failSave) { await route.fulfill({ status: 503, json: {} }); return; }
        if (body.full_name !== undefined) state.name = body.full_name;
        if (body.avatar_url !== undefined) state.avatar = body.avatar_url;
      } else {
        if (state.failCoins) { await route.fulfill({ status: 503, json: {} }); return; }
        state.coins = body.coins;
      }
      await route.fulfill({ status: 201, body: '' });
    } else await route.fulfill({ json: url.pathname.endsWith('/profiles')
      ? [{ full_name: state.name, avatar_url: state.avatar, role }] : [{ coins: state.coins }] });
  });
  return state;
}

test('guest profile keeps local rewards and presents no editable or admin controls', async ({ page }) => {
  await initialize(page);
  let requests = 0;
  await page.route('**/rest/v1/**', route => { requests++; return route.fulfill({ json: [] }); });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/original/index2.html');
  await page.locator('.top-right-controls .profile-btn').click();
  const modal = page.locator('#profileModal[data-react-owned="true"]');
  await expect(modal).toHaveClass(/active/);
  await expect(modal.locator('#profileNameDisplay')).toHaveText('Гость');
  await expect(modal.locator('#profileNameEditIcon')).toBeHidden();
  await expect(modal.locator('#profilePhotoWrapper')).toBeDisabled();
  await expect(modal.locator('#profileAdminAiControls')).toBeHidden();
  await expect(modal.locator('#profileLogoutBtn')).toBeHidden();
  await expect(modal.locator('#profileLoginBtn')).toBeVisible();
  await page.evaluate(() => (window as unknown as { addCoins(amount: number): void }).addCoins(15));
  await expect(modal.locator('#profileModalCoinCount')).toHaveText('15');
  await modal.locator('#lang-btn-kk').click();
  await expect(modal.locator('#profileNameDisplay')).toHaveText('Қонақ');
  await expect(modal.locator('#profileGuestNotice')).toContainText('сақталмайды');
  expect(requests).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('profile-guest-mobile.png') });
  await page.keyboard.press('Escape');
  await expect(modal).not.toHaveClass(/active/);
  await expect(page.locator('.top-right-controls .profile-btn')).toBeFocused();
});

test('signed-in profile saves name and photo, updates the shell and reloads persisted values', async ({ page }) => {
  await initialize(page, true); const state = await backend(page);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/original/index2.html');
  await expect(page.locator('#coinCount')).toHaveText('100');
  await page.locator('.top-right-controls .profile-btn').click();
  const modal = page.locator('#profileModal');
  await expect(modal.locator('#profileNameDisplay')).toHaveText('Алия');
  await expect(modal.locator('#profileNameEditIcon')).toBeEnabled();
  page.once('dialog', dialog => dialog.accept('  Новое имя  '));
  await modal.getByRole('button', { name: 'Изменить имя' }).click();
  await expect(modal.locator('#profileNameDisplay')).toHaveText('Новое имя');
  expect(state.writes).toContainEqual({ id: 'learner-test', full_name: 'Новое имя' });
  await modal.locator('#profileImageInput').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: Buffer.from(avatar.split(',')[1], 'base64') });
  await expect.poll(() => state.writes.some(body => body.avatar_url === avatar)).toBe(true);
  await expect(page.locator('#topProfileImg')).toHaveAttribute('src', avatar);
  await page.reload();
  await page.locator('.top-right-controls .profile-btn').click();
  await expect(modal.locator('#profileNameDisplay')).toHaveText('Новое имя');
  await expect(modal.locator('#modalProfileImg')).toHaveAttribute('src', avatar);
  expect(await page.evaluate(() => (window as unknown as { currentUserId: string }).currentUserId)).toBe('learner-test');
  expect(errors).toEqual([]);
});

test('failed edits keep saved values, validate photos and retry coin persistence', async ({ page }) => {
  await initialize(page, true); const state = await backend(page);
  await page.goto('/original/index2.html');
  await page.locator('.top-right-controls .profile-btn').click();
  const modal = page.locator('#profileModal');
  await expect(modal.locator('#profileNameEditIcon')).toBeEnabled();
  state.failSave = true;
  page.once('dialog', dialog => dialog.accept('Не сохранено'));
  await modal.getByRole('button', { name: 'Изменить имя' }).click();
  await expect(modal.getByRole('alert')).toContainText('Изменения не сохранены');
  await expect(modal.locator('#profileNameDisplay')).toHaveText('Алия');
  const writes = state.writes.length;
  await modal.locator('#profileImageInput').setInputFiles({ name: 'large.png', mimeType: 'image/png', buffer: Buffer.alloc(2 * 1024 * 1024 + 1) });
  await expect(modal.getByRole('alert')).toContainText('2 МБ');
  expect(state.writes).toHaveLength(writes);
  await modal.locator('#profileImageInput').setInputFiles({ name: 'not-image.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') });
  await expect(modal.getByRole('alert')).toContainText('файл изображения');
  state.failCoins = true;
  await page.evaluate(() => (window as unknown as { addCoins(amount: number): void }).addCoins(10));
  const coinError = modal.getByRole('alert').filter({ hasText: 'Монеты не сохранены' });
  await expect(coinError).toBeVisible();
  await expect(modal.locator('#profileModalCoinCount')).toHaveText('110');
  state.failCoins = false;
  await coinError.getByRole('button', { name: 'Повторить' }).click();
  await expect(coinError).toHaveCount(0);
  expect(state.coins).toBe(110);
});

test('admin widget preferences remain synchronized and persist across reloads', async ({ page }) => {
  await initialize(page, true); await backend(page, 'admin');
  await page.setViewportSize({ width: 390, height: 847 });
  await page.goto('/original/index2.html');
  await page.locator('.top-right-controls .profile-btn').click();
  const admin = page.locator('#profileAdminAiControls');
  await expect(admin).toBeVisible();
  await admin.locator('label').first().click();
  await expect(page.locator('body')).toHaveClass(/ai-chat-hidden-by-admin/);
  await expect(admin.locator('#admin_ai_all_toggle')).toHaveJSProperty('indeterminate', true);
  await page.screenshot({ path: test.info().outputPath('profile-admin-mobile.png') });
  await page.reload();
  await page.locator('.top-right-controls .profile-btn').click();
  await expect(admin.locator('#admin_ai_chat_toggle')).not.toBeChecked();
  await admin.locator('label').last().click();
  await expect(admin.locator('#admin_ai_chat_toggle')).toBeChecked();
  await expect(page.locator('body')).not.toHaveClass(/ai-chat-hidden-by-admin/);
});

test('unauthorized profile load clears the session and returns to guest mode', async ({ page }) => {
  await initialize(page, true);
  await page.route('**/rest/v1/**', route => route.fulfill({ status: 401, json: {} }));
  await page.goto('/original/index2.html');
  await page.locator('.top-right-controls .profile-btn').click();
  await expect(page.locator('#profileNameDisplay')).toHaveText('Гость');
  await expect(page.locator('#profileGuestNotice')).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), authKey)).toBeNull();
  await expect(page.locator('#profileAdminAiControls')).toBeHidden();
});

test('profile retries a failed initial load and cancels edits on close', async ({ page }) => {
  await initialize(page, true);
  let failLoad = true;
  let releaseSave!: () => void;
  let aborted = false;
  page.on('requestfailed', request => {
    if (request.method() === 'POST' && request.url().includes('/profiles?')) aborted = true;
  });
  await page.route('**/rest/v1/**', async route => {
    if (route.request().method() === 'POST') {
      await new Promise<void>(resolve => { releaseSave = resolve; });
      await route.fulfill({ status: 201, body: '' }).catch(() => {}); // The client intentionally aborted this request.
    } else if (route.request().url().includes('/profiles?')) {
      await route.fulfill(failLoad ? { status: 503, json: {} } : { json: [{ full_name: 'Алия', avatar_url: avatar, role: 'student' }] });
    } else await route.fulfill({ json: [{ coins: 100 }] });
  });
  await page.goto('/original/index2.html');
  await page.locator('.top-right-controls .profile-btn').click();
  const modal = page.locator('#profileModal');
  await expect(modal.getByRole('alert')).toContainText('Не удалось загрузить профиль');
  failLoad = false;
  await modal.getByRole('button', { name: 'Повторить' }).click();
  await expect(modal.locator('#profileNameEditIcon')).toBeEnabled();
  page.once('dialog', dialog => dialog.accept('Позднее имя'));
  await modal.getByRole('button', { name: 'Изменить имя' }).click();
  await expect.poll(() => typeof releaseSave).toBe('function');
  await expect(modal.getByRole('status')).toContainText('Сохранение');
  await modal.getByRole('button', { name: 'Закрыть', exact: true }).click();
  await expect.poll(() => aborted).toBe(true);
  releaseSave();
  await page.locator('.top-right-controls .profile-btn').click();
  await expect(modal.locator('#profileNameDisplay')).toHaveText('Алия');
  await expect(modal.getByRole('alert')).toHaveCount(0);
});
