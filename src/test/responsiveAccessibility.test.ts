import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'public/original/js/accessibility.js'), 'utf8');

async function fixture() {
  const dom = new JSDOM(`<!doctype html><body>
    <div class="profile-btn"></div>
    <div class="screen active" id="first">
      <div class="radial-menu-container"><div class="radial-center-btn">Меню</div>
      <div class="radial-item" style="opacity:0">Hidden</div></div>
      <div class="option-circle disabled">Disabled</div>
      <button class="center-circle">Native</button>
      <div class="feedback"></div>
    </div>
    <div class="screen" id="second"><h2>Next lesson</h2></div>
  </body>`, { runScripts: 'outside-only', pretendToBeVisual: true });
  await new Promise<void>(resolve => dom.window.addEventListener('load', () => resolve()));
  dom.window.eval(source);
  return dom;
}

const settle = () => new Promise(resolve => setTimeout(resolve, 35));

describe('legacy lesson keyboard accessibility', () => {
  it('adds semantics and Enter/Space without double activating native buttons', async () => {
    const dom = await fixture();
    const doc = dom.window.document;
    const control = doc.querySelector<HTMLElement>('.radial-center-btn')!;
    let clicks = 0;
    control.addEventListener('click', () => clicks++);
    expect(control.getAttribute('role')).toBe('button');
    expect(control.tabIndex).toBe(0);
    expect(control.getAttribute('aria-expanded')).toBe('false');
    for (const key of ['Enter', ' ']) control.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key, bubbles: true }));
    control.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', repeat: true, bubbles: true }));
    expect(clicks).toBe(2);
    const native = doc.querySelector('button')!;
    let nativeClicks = 0;
    native.addEventListener('click', () => nativeClicks++);
    native.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(nativeClicks).toBe(0); // Browser supplies native activation itself.
    dom.window.dispatchEvent(new dom.window.Event('pagehide'));
    dom.window.close();
  });

  it('excludes invisible and disabled choices, then updates dynamically added ones', async () => {
    const dom = await fixture();
    const doc = dom.window.document;
    expect(doc.querySelector<HTMLElement>('.radial-item')!.tabIndex).toBe(-1);
    const disabled = doc.querySelector<HTMLElement>('.disabled')!;
    let clicks = 0;
    disabled.addEventListener('click', () => clicks++);
    disabled.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(clicks).toBe(0);
    expect(disabled.getAttribute('aria-disabled')).toBe('true');
    const item = doc.createElement('div');
    item.className = 'alippe-item';
    item.textContent = 'Ә';
    doc.querySelector('.screen.active')!.append(item);
    await settle();
    expect(item.getAttribute('role')).toBe('button');
    expect(item.tabIndex).toBe(0);
    dom.window.dispatchEvent(new dom.window.Event('pagehide'));
    dom.window.close();
  });

  it('announces feedback and moves focus on navigation without stealing lesson focus', async () => {
    const dom = await fixture();
    const doc = dom.window.document;
    expect(doc.querySelector('.feedback')!.getAttribute('role')).toBe('status');
    expect(doc.querySelector('.feedback')!.getAttribute('aria-live')).toBe('polite');
    const center = doc.querySelector<HTMLElement>('.radial-center-btn')!;
    center.focus();
    doc.querySelector('.feedback')!.textContent = 'Updated';
    await settle();
    expect(doc.activeElement).toBe(center);
    doc.getElementById('first')!.classList.remove('active');
    doc.getElementById('second')!.classList.add('active');
    await settle();
    expect(doc.activeElement).toBe(doc.querySelector('h2'));
    dom.window.dispatchEvent(new dom.window.Event('pagehide'));
    dom.window.close();
  });
});
