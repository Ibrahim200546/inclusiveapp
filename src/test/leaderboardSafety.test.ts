import { readFileSync } from 'node:fs';
import { beforeEach, expect, it } from 'vitest';

const source = readFileSync('public/original/script.js', 'utf8');
function render() {
  const start = source.indexOf('function localProgressRecords()');
  const end = source.indexOf('function openLocalProgress()', start);
  return new Function('profileText', source.slice(start, end) + '; renderLocalProgress();');
}

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<h2 id="localProgressTitle"></h2><button id="localProgressClose"></button><p id="localProgressSummary"></p><ul id="localProgressList"></ul>';
});

it('reports only supported grades and ignores historic cloud profiles and unsafe stored values', () => {
  localStorage.setItem('eduCorex.learning.v1:guest', JSON.stringify({
    first: { grade: 0, completed: 3 },
    second: { grade: 1, completed: '<img src=fake onerror=alert(1)>' },
    third: { grade: 44, completed: 9 },
    invalid: 'bad',
  }));
  localStorage.setItem('eduCorex.curriculum.v1:guest', JSON.stringify({ first: { grade: 4, everCompleted: true } }));
  localStorage.setItem('eduCorex.learning.v1:old-account', JSON.stringify({ skipped: { grade: 2, completed: 9 } }));
  render()((_kk: string, ru: string) => ru);
  expect(document.querySelector('#localProgressSummary')?.textContent).toBe('Записи прогресса: 2');
  expect([...document.querySelectorAll('li')].map(li => li.textContent)).toEqual([
    '0 класс: 1', '1 класс: 0', '2 класс: 0', '3 класс: 0', '4 класс: 1',
  ]);
  expect(document.querySelector('img')).toBeNull();
});
