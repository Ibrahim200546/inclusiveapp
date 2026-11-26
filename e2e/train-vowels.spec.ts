import { test, expect } from './fixtures';
import { openGrade, openModule, findRadialEntry, returnToGrade } from './radial-navigation';

for (const [locale, grade, title, vowel, audioFolder, viewport] of [
  ['ru', 0, 'Поезд', 'А', 'sounds/ru/', { width: 390, height: 844 }],
  ['ru', 0, 'Поезд', 'Ә', 'sounds/', { width: 390, height: 844 }],
  ['kk', 2, 'Пойыз', 'Ә', 'sounds/', { width: 1440, height: 900 }],
] as const) test(`train shows only vowels and plays ${vowel} without click narration in ${locale}`, async ({ page }) => {
  await page.setViewportSize(viewport);
  await page.addInitScript(lang => {
    localStorage.setItem('profileLang', lang); localStorage.setItem('locale', lang);
    localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true');
    const audio = { attempted: [] as string[], played: [] as string[] };
    Object.assign(window, { trainTestAudio: audio });
    const mediaPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      const path = decodeURIComponent(new URL(this.currentSrc || this.src, location.href).pathname);
      audio.attempted.push(path);
      return mediaPlay.call(this).then(() => { audio.played.push(path); });
    };
  }, locale);
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
  const parent = await openGrade(page, grade);
  await openModule(page, parent, 'speech');
  const tile = await findRadialEntry(page, 'data-activity', 'g0Task2');
  await expect(tile).toHaveAccessibleName(title);
  if (locale === 'ru') expect(await page.evaluate(() => (window as unknown as { getRuVoiceoverAudioPath(text: string, lang: string): string }).getRuVoiceoverAudioPath('Поезд', 'ru-RU'))).toContain('/ui/');
  const getAudio = () => page.evaluate(() => (window as unknown as { trainTestAudio: { attempted: string[]; played: string[] } }).trainTestAudio);
  const before = await getAudio();
  await tile.click();
  const exercise = page.locator('#g0Task2'), center = exercise.locator('#voiceCenterBtn');
  await expect(exercise).toHaveClass(/active/);
  await expect(center).toHaveAttribute('aria-expanded', 'false');
  await expect(exercise.locator('.alippe-item')).toHaveCount(0);
  await center.click();
  await expect(center).toHaveAttribute('aria-expanded', 'true');
  await exercise.evaluate((element, lang) => {
    element.classList.add('train-test-transition');
    element.classList.remove('train-test-transition');
    window.dispatchEvent(new CustomEvent('profile-language-change', { detail: { lang } }));
  }, locale);
  const letters = exercise.locator('.small-bubble');
  const assertVowels = async () => {
    await expect(letters).toHaveCount(8);
    const choices = await letters.allTextContents();
    expect(new Set(choices).size).toBe(8);
    expect(choices.every(letter => [...'АӘОӨҰҮЫІУ'].includes(letter))).toBe(true);
    return choices;
  };
  if (!(await assertVowels()).includes(vowel)) {
    // The next menu always includes the one vowel omitted by this shuffle.
    await center.click();
    await expect(letters).toHaveCount(0);
    await center.click();
    expect(await assertVowels()).toContain(vowel);
  }
  const choice = exercise.getByRole('button', { name: locale === 'ru' ? `Выбрать звук ${vowel}` : `${vowel} дыбысын таңдау`, exact: true });
  await choice.click();
  await expect(center).toContainText(vowel);
  const letter = vowel.toLowerCase();
  const expectedSample = [
    `/original/${audioFolder}Alippe/Alippe_${letter}.mp3`,
    `/original/${audioFolder}letters/letter_${letter}.mp3`,
  ];
  await expect.poll(async () => (await getAudio()).played.slice(before.played.length).some(path => expectedSample.includes(path)), {
    message: `Expected playback of ${expectedSample.join(' or ')}`,
  }).toBe(true);
  expect((await getAudio()).attempted.slice(before.attempted.length).filter(src => src.includes('/sounds/ru/ui/'))).toEqual([]);
  await exercise.locator('button[onclick*="grade0VoiceMenu"]').click();
  await expect(tile).toBeVisible();
  await returnToGrade(page, parent);
});
