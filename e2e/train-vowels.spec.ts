import { test, expect } from './fixtures';
import { openGrade, openModule, findRadialEntry, returnToGrade } from './radial-navigation';

for (const [locale, grade, title, viewport] of [
  ['ru', 0, 'Поезд', { width: 390, height: 844 }],
  ['kk', 2, 'Пойыз', { width: 1440, height: 900 }],
] as const) test(`train has only vowels and no click narration in ${locale}`, async ({ page }) => {
  await page.setViewportSize(viewport);
  await page.addInitScript(lang => {
    localStorage.setItem('profileLang', lang); localStorage.setItem('locale', lang);
    localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true');
    const sounds: string[] = [];
    Object.assign(window, { trainTestAudio: sounds });
    const mediaPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      sounds.push(decodeURI(this.currentSrc || this.src)); return mediaPlay.call(this);
    };
  }, locale);
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
  const parent = await openGrade(page, grade);
  await openModule(page, parent, 'speech');
  const tile = await findRadialEntry(page, 'data-activity', 'g0Task2');
  await expect(tile).toHaveAccessibleName(title);
  if (locale === 'ru') expect(await page.evaluate(() => (window as unknown as { getRuVoiceoverAudioPath(text: string, lang: string): string }).getRuVoiceoverAudioPath('Поезд', 'ru-RU'))).toContain('/ui/');
  const getAudio = () => page.evaluate(() => (window as unknown as { trainTestAudio: string[] }).trainTestAudio);
  const before = (await getAudio()).length;
  await tile.click();
  const exercise = page.locator('#g0Task2'), center = exercise.locator('#voiceCenterBtn');
  await expect(exercise).toHaveClass(/active/);
  await expect(exercise.locator('.alippe-item')).toHaveCount(0);
  await center.click();
  const letters = exercise.locator('.small-bubble');
  await expect(letters).toHaveCount(8);
  const choices = await letters.allTextContents();
  expect(new Set(choices).size).toBe(8);
  expect(choices.every(letter => [...'АӘОӨҰҮЫІУ'].includes(letter))).toBe(true);
  const vowel = choices[0];
  await letters.first().click();
  await expect(center).toContainText(vowel);
  await expect.poll(async () => (await getAudio()).slice(before).some(src => src.includes('/sounds/Alippe/') || src.includes('/sounds/letters/'))).toBe(true);
  expect((await getAudio()).slice(before).filter(src => src.includes('/sounds/ru/ui/'))).toEqual([]);
  await exercise.locator('button[onclick*="grade0VoiceMenu"]').click();
  await expect(tile).toBeVisible();
  await returnToGrade(page, parent);
});
