import { describe, expect, it } from 'vitest';
import { applyCorrections, applyFinal, applyPartial, promoteProvisional, turnsToRefine, type TranscriptTurn } from '../transcriptTurns';

let id = 0;
const key = () => `k${++id}`;
const texts = (turns: TranscriptTurn[]) => turns.map((turn) => [turn.speaker, turn.text, turn.isFinal]);

describe('transcript turns', () => {
  it('keeps a single provisional line even when its speaker changes', () => {
    let turns = applyPartial([], { speaker: 0, text: 'ho' }, key);
    turns = applyPartial(turns, { speaker: 1, text: 'hola' }, key);
    expect(texts(turns)).toEqual([[1, 'hola', false]]);
  });

  it('clears the provisional line on a final from another speaker', () => {
    let turns = applyPartial([], { speaker: 0, text: 'ho' }, key);
    turns = applyFinal(turns, { speaker: 1, text: 'Buenos días' }, key);
    expect(texts(turns)).toEqual([[1, 'Buenos días', true]]);
  });

  it('merges consecutive finals by speaker and respects punctuation', () => {
    let turns = applyFinal([], { speaker: 0, text: 'Hola' }, key);
    turns = applyFinal(turns, { speaker: 0, text: ', doctor' }, key);
    turns = applyFinal(turns, { speaker: 0, text: 'Buenas' }, key);
    turns = applyFinal(turns, { speaker: 1, text: 'Sí' }, key);
    expect(texts(turns)).toEqual([[0, 'Hola, doctor Buenas', true], [1, 'Sí', true]]);
  });

  it('keeps provisional words when the session ends', () => {
    let turns = applyFinal([], { speaker: 0, text: 'Hola' }, key);
    turns = applyPartial(turns, { speaker: 1, text: 'identity from' }, key);
    expect(texts(promoteProvisional(turns, key))).toEqual([[0, 'Hola', true], [1, 'identity from', true]]);
  });

  it('holds back the open turn while live and releases it at the end', () => {
    let turns = applyFinal([], { speaker: 0, text: 'Uno' }, key);
    turns = applyFinal(turns, { speaker: 1, text: 'Dos' }, key);
    expect(turnsToRefine(turns, new Set(), true)).toEqual([turns[0].key]);
    expect(turnsToRefine(turns, new Set([turns[0].key]), false)).toEqual([turns[1].key]);
  });

  it('remembers what was heard when a turn is corrected', () => {
    const turns = applyFinal([], { speaker: 0, text: 'Microsoft three. 65' }, key);
    const [fixed] = applyCorrections(turns, new Map([[turns[0].key, 'Microsoft 365']]));
    expect(fixed).toMatchObject({ text: 'Microsoft 365', original: 'Microsoft three. 65' });
    expect(applyCorrections(turns, new Map())).toEqual(turns);
  });
});
