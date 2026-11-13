import { describe, expect, it, vi } from 'vitest';
import { createLessonStore } from './store';
import { lessonFrame } from './animation';
import type { CardIdentity } from '../cards/content';
import type { PlaybackResult } from '../curriculum/playback';

function setup() {
  let identity: CardIdentity = { locale: 'kk', grade: 0, learner: 'one' };
  const player = { speak: vi.fn(async (): Promise<PlaybackResult> => 'ended'), recording: vi.fn(async (): Promise<PlaybackResult> => 'ended'), stop: vi.fn() };
  const reward = vi.fn();
  const store = createLessonStore({ identity: () => identity, player, reward, random: () => .5 });
  return { store, player, reward, identity(changes: Partial<CardIdentity>) { identity = { ...identity, ...changes }; store.syncIdentity(); } };
}
describe('React articulation lessons', () => {
  it('requires three correct rounds and rewards once per completed game', () => {
    const { store, reward } = setup(); store.start('g0QSoundAdventure');
    store.next(); store.announceCompletion(); expect(reward).not.toHaveBeenCalled();
    for (let round = 0; round < 3; round++) {
      store.answer('К'); store.next(); expect(store.getSnapshot()).toMatchObject({ round, solved: false, feedback: 'wrong' });
      store.answer('Қ'); store.answer('К'); expect(store.getSnapshot().solved).toBe(true);
      store.next();
    }
    store.next(); store.announceCompletion(); store.announceCompletion();
    expect(reward).toHaveBeenCalledTimes(1);
    store.reset(); store.announceCompletion(); expect(reward).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toMatchObject({ round: 0, solved: false, completed: false, rewarded: false });
  });
  it('uses the correct options for each autumn sentence', () => {
    const { store, reward } = setup(); store.start('g0AutumnStory');
    for (const choice of ['autumn', 'cold', 'leaves']) {
      expect(store.getSnapshot().choices).toContain(choice);
      store.answer('unknown'); expect(store.getSnapshot().solved).toBe(false);
      store.answer(choice); store.next();
    }
    expect(store.getSnapshot().completed).toBe(true); expect(reward).toHaveBeenCalledTimes(1);
  });
  it('keeps Kazakh words in the Қ game and follows locale for autumn', async () => {
    const { store, player, identity } = setup(); identity({ locale: 'ru' }); store.start('g0QSoundAdventure');
    await store.listen(); expect(player.speak).toHaveBeenLastCalledWith('Қасқыр', 'kk');
    store.start('g0AutumnStory'); await store.listen(); expect(player.speak).toHaveBeenLastCalledWith('Наступила осень.', 'ru');
    identity({ locale: 'kk' }); await store.listen(); expect(player.speak).toHaveBeenLastCalledWith('Күз келді.', 'kk');
  });
  it('holds the listen control until playback ends and handles missing audio', async () => {
    const { store, player } = setup(); let finish!: (result: PlaybackResult) => void;
    player.speak.mockImplementation(() => new Promise(resolve => { finish = resolve; })); store.start('g0AutumnStory');
    const pending = store.listen(); await store.listen(); expect(player.speak).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().listening).toBe(true); finish('error'); await pending;
    expect(store.getSnapshot()).toMatchObject({ listening: false, feedback: 'unavailable', solved: false });
  });
  it.each(['navigation', 'locale', 'learner', 'grade', 'reset', 'stop', 'dispose'] as const)('invalidates late narration after %s', async change => {
    const { store, player, identity, reward } = setup(); let finish!: (result: PlaybackResult) => void;
    player.speak.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    store.start('g0AutumnStory'); const pending = store.listen();
    if (change === 'navigation') { store.close(); store.start('g0AutumnStory'); }
    else if (change === 'locale') identity({ locale: 'ru' });
    else if (change === 'learner') identity({ learner: 'two' });
    else if (change === 'grade') identity({ grade: 1 });
    else store[change]();
    const after = store.getSnapshot(); finish('error'); await pending;
    expect(store.getSnapshot()).toEqual(after); expect(after.listening).toBe(false); expect(reward).not.toHaveBeenCalled();
  });
  it('retains answers across language changes but resets for a new learner or grade', () => {
    const { store, identity, reward } = setup(); store.start('g0AutumnStory'); store.answer('autumn'); store.next(); store.answer('cold');
    identity({ locale: 'ru' }); expect(store.getSnapshot()).toMatchObject({ round: 1, solved: true });
    identity({ learner: 'two' }); expect(store.getSnapshot()).toMatchObject({ round: 0, solved: false });
    store.answer('autumn'); identity({ grade: 1 }); store.next(); expect(store.getSnapshot().round).toBe(0); expect(reward).not.toHaveBeenCalled();
  });
  it('does not allow off-screen or disposed actions to play or reward', async () => {
    const { store, player, reward } = setup(); store.start('g0QSoundAdventure'); store.close();
    store.answer('Қ'); store.next(); await store.listen(); store.play(); store.announceCompletion();
    store.dispose(); store.start('g0AutumnStory'); await store.listen();
    expect(player.speak).not.toHaveBeenCalled(); expect(reward).not.toHaveBeenCalled(); expect(store.getSnapshot().screen).toBeNull();
  });
  it('pauses, seeks, loops, changes speed and resets animation on exit', () => {
    const { store } = setup(); store.start('g0ArticulationLessons'); store.advance(100); expect(store.getSnapshot().progress).toBe(0);
    store.play(); store.advance(100); expect(store.getSnapshot().progress).toBeCloseTo(.0075);
    store.pause(); store.advance(100); expect(store.getSnapshot().progress).toBeCloseTo(.0075);
    store.seek(3); expect(store.getSnapshot().progress).toBe(1);
    store.setSpeed(.5); store.restart(); store.advance(1000); expect(store.getSnapshot().progress).toBe(.005);
    store.seek(.999); store.play(); store.advance(100); expect(store.getSnapshot().progress).toBeCloseTo(.004);
    store.select('hill'); expect(store.getSnapshot()).toMatchObject({ selected: 'hill', progress: 0, playing: false });
    store.play(); store.close(); store.advance(100); store.start('g0ArticulationLessons');
    expect(store.getSnapshot()).toMatchObject({ selected: 'hill', progress: 0, playing: false, speed: .5 });
  });
  it('keeps reduced-motion geometry still within a phase and the hill tongue tip anchored', () => {
    expect(lessonFrame('teeth', .3, true)).toEqual(lessonFrame('teeth', .4, true));
    expect(lessonFrame('teeth', .3, false).tongue.d).not.toBe(lessonFrame('teeth', .4, false).tongue.d);
    for (const progress of [0, .3, .6, .9, 1]) expect(lessonFrame('hill', progress, false).tongue.d).toMatch(/^M220 357/);
  });
});
