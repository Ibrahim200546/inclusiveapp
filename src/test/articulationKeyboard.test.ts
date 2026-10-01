import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const base = resolve('public/original');
const markup = new JSDOM(readFileSync(resolve(base, 'index2.html'), 'utf8'));
const fixtureHtml = ['g0ArticulationMap', 'articulationModal']
  .map(id => markup.window.document.getElementById(id)!.outerHTML).join('');
markup.window.close();
const mapSource = readFileSync(resolve(base, 'articulation-circles.js'), 'utf8');
const accessibilitySource = readFileSync(resolve(base, 'js/accessibility.js'), 'utf8');

describe('articulation map keyboard flow', () => {
  let dom: JSDOM;
  let doc: Document;
  let app: any;

  beforeEach(async () => {
    dom = new JSDOM(`<!doctype html><body>${fixtureHtml}</body>`, {
      runScripts: 'outside-only', pretendToBeVisual: true,
    });
    await new Promise<void>(resolve => dom.window.addEventListener('load', () => resolve()));
    doc = dom.window.document;
    app = dom.window as any;
    doc.getElementById('g0ArticulationMap')!.classList.add('active');
    app.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    app.stopArticulationPractice = vi.fn();
    app.stopContentPlayback = vi.fn();
    app.eval(mapSource);
    app.eval(accessibilitySource);
    app.initArticulationMap();
  });

  afterEach(() => {
    dom.window.dispatchEvent(new dom.window.Event('pagehide'));
    dom.window.close();
  });

  function node(key: string): SVGElement {
    return Array.from(doc.querySelectorAll<SVGElement>('[data-focus-key]'))
      .find(element => element.getAttribute('data-focus-key') === key)!;
  }

  function key(element: Element, value: string, options: KeyboardEventInit = {}) {
    const event = new dom.window.KeyboardEvent('keydown', {
      key: value, bubbles: true, cancelable: true, ...options,
    });
    element.dispatchEvent(event);
    return event;
  }

  function openMap() {
    node('center').focus();
    key(node('center'), 'Enter');
  }

  function openLesson() {
    openMap();
    node('ring-1:С').focus();
    key(node('ring-1:С'), 'Enter');
    key(node('ring-1:С'), 'Enter');
  }

  it('exposes only the center initially and opens all 18 first-ring controls with Enter', () => {
    expect(node('center').getAttribute('role')).toBe('button');
    expect(node('center').getAttribute('aria-expanded')).toBe('false');
    expect(doc.querySelectorAll('.artic-map-node')).toHaveLength(50);
    expect(doc.querySelectorAll('.artic-map-node[tabindex="0"]')).toHaveLength(0);
    openMap();
    expect(doc.querySelectorAll('.artic-map-node.is-visible')).toHaveLength(18);
    expect(doc.querySelectorAll('.artic-map-node[tabindex="0"]')).toHaveLength(18);
    expect(node('center').getAttribute('aria-expanded')).toBe('true');
    expect(doc.activeElement).toBe(node('center'));
    for (const hidden of doc.querySelectorAll('.artic-map-node:not(.is-visible)')) {
      expect(hidden.getAttribute('tabindex')).toBe('-1');
      expect(hidden.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('supports Space, ignores key repeat, and refuses hidden-node activation', () => {
    key(node('center'), 'Enter', { repeat: true });
    key(node('ring-1:С'), 'Enter');
    expect(doc.querySelectorAll('.artic-map-node.is-visible')).toHaveLength(0);
    node('center').focus();
    expect(key(node('center'), ' ').defaultPrevented).toBe(true);
    expect(doc.querySelectorAll('.artic-map-node.is-visible')).toHaveLength(18);
    node('ring-1:С').focus();
    key(node('ring-1:С'), ' ', { repeat: true });
    expect(node('ring-1:С').getAttribute('aria-pressed')).toBe('false');
  });

  it('preserves letter focus through SVG replacement and opens its lesson on the second Enter', () => {
    openMap();
    const original = node('ring-1:С');
    original.focus();
    key(original, 'Enter');
    expect(original.isConnected).toBe(false);
    expect(doc.activeElement).toBe(node('ring-1:С'));
    expect(node('ring-1:С').getAttribute('aria-pressed')).toBe('true');
    expect(node('ring-2:З').getAttribute('tabindex')).toBe('0');
    expect(doc.getElementById('articulationModal')).not.toHaveClass('active');
    key(node('ring-1:С'), 'Enter');
    const modal = doc.getElementById('articulationModal')!;
    expect(modal).toHaveClass('active');
    expect(modal.getAttribute('role')).toBe('dialog');
    expect(modal.getAttribute('aria-modal')).toBe('true');
    expect(modal.getAttribute('aria-labelledby')).toBe('lessonLetter');
    expect(doc.getElementById('lessonLetter')).toHaveTextContent('С');
    expect(doc.activeElement).toBe(modal.querySelector('button'));
  });

  it('contains Tab at both modal boundaries and restores the selected node on Escape', () => {
    openLesson();
    const modal = doc.getElementById('articulationModal')!;
    const buttons = Array.from(modal.querySelectorAll('button'));
    const first = buttons[0], last = buttons[buttons.length - 1];
    first.focus();
    expect(key(first, 'Tab', { shiftKey: true }).defaultPrevented).toBe(true);
    expect(doc.activeElement).toBe(last);
    expect(key(last, 'Tab').defaultPrevented).toBe(true);
    expect(doc.activeElement).toBe(first);
    expect(key(first, 'Escape').defaultPrevented).toBe(true);
    expect(modal).not.toHaveClass('active');
    expect(doc.activeElement).toBe(node('ring-1:С'));
    expect(app.stopArticulationPractice).toHaveBeenCalled();
    expect(app.stopContentPlayback).toHaveBeenCalled();
  });

  it('returns focus to the center when collapsing hides the focused letter', () => {
    openMap();
    node('ring-1:С').focus();
    app.collapseAllArticulationRings();
    expect(doc.activeElement).toBe(node('center'));
    expect(doc.querySelectorAll('.artic-map-node[tabindex="0"]')).toHaveLength(0);
    expect(node('center').getAttribute('aria-expanded')).toBe('false');
  });
});
