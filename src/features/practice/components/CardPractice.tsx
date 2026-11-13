import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import type { CardRuntime } from '../legacy/cards';
import { SentenceBuilder } from './SentenceBuilder';
import { SpatialMatrix } from './SpatialMatrix';
import '../cards/cards.css';

export function CardPractice({ runtime }: { runtime: CardRuntime }) {
  const sentence = useSyncExternalStore(runtime.sentence.subscribe, runtime.sentence.getSnapshot);
  const spatial = useSyncExternalStore(runtime.spatial.subscribe, runtime.spatial.getSnapshot);
  const sentenceRoot = document.getElementById('sentenceBuilderScreen'), spatialRoot = document.getElementById('grade0SpatialMatrixScreen');
  return <>
    {sentence.active && sentenceRoot && createPortal(<SentenceBuilder key={`${sentence.learner}:${sentence.grade}:${sentence.locale}`} snapshot={sentence} store={runtime.sentence} />, sentenceRoot)}
    {spatial.active && spatialRoot && createPortal(<SpatialMatrix key={spatial.round} snapshot={spatial} store={runtime.spatial} />, spatialRoot)}
  </>;
}
