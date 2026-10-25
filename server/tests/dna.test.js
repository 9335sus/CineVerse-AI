process.env.NODE_ENV = 'test';
const dna = require('../src/services/dna.service');
const story = require('../src/services/story.service');

describe('Movie DNA helpers', () => {
  it('counts genres and finds the top ones', () => {
    const items = [{ genreIds: [28, 12] }, { genreIds: [28] }, { genreIds: [35] }];
    expect(dna.topGenreIds(items, 2)).toEqual([28, 12].slice(0, 1).concat([12]).slice(0, 2));
    expect(dna.genreCounts(items).get(28)).toBe(2);
  });
  it('cosine similarity: identical = 1, disjoint = 0, empty = 0', () => {
    const a = new Map([[1, 2], [2, 3]]);
    expect(dna.cosine(a, new Map(a))).toBeCloseTo(1);
    expect(dna.cosine(a, new Map([[9, 4]]))).toBe(0);
    expect(dna.cosine(a, new Map())).toBe(0);
  });
  it('compatibility is 0-100 and rewards shared movies', () => {
    const a = new Map([[1, 2]]);
    expect(dna.compatibility(a, a, 0)).toBe(80);
    expect(dna.compatibility(a, a, 5)).toBe(100);
    expect(dna.compatibility(a, new Map([[2, 1]]), 0)).toBe(0);
  });
  it('fills 12 months with zeros for empty months', () => {
    const now = new Date(Date.UTC(2026, 9, 21));
    const m = dna.fillMonths([{ _id: '2026-10', count: 3 }, { _id: '2026-01', count: 1 }], 12, now);
    expect(m).toHaveLength(12);
    expect(m[11]).toMatchObject({ month: '2026-10', count: 3 });
    expect(m[0].month).toBe('2025-11');
    expect(m.find((x) => x.month === '2026-02').count).toBe(0);
  });
  it('fills ratings 1-10 and days', () => {
    const r = dna.fillRatings([{ _id: 8, count: 2 }]);
    expect(r).toHaveLength(10);
    expect(r[7]).toEqual({ rating: 8, count: 2 });
    expect(dna.fillDays([], 14)).toHaveLength(14);
  });
  it('builds personality insights and stays empty with no history', () => {
    expect(dna.insights({ totalWatched: 0 })).toEqual([]);
    const i = dna.insights({ topGenreIds: [53], topShare: 0.5, distinctGenres: 3, avgRating: 8.4, ratedCount: 5, totalWatched: 10 });
    expect(i.map((x) => x.title)).toEqual(['The Edge-of-Seat Detective', 'The Specialist', 'The Generous Critic']);
  });
});

describe('Story service', () => {
  const movie = { title: 'Heat', overview: 'A crew and a cop.' };
  it('puts the spoiler rule and unofficial framing in the prompt', () => {
    const none = story.buildPrompt({ movie, premise: 'What if he stayed?', spoilerLevel: 'none' });
    expect(none).toMatch(/SPOILER-FREE/);
    expect(none).toMatch(/<idea>What if he stayed\?<\/idea>/);
    expect(story.buildPrompt({ movie, premise: 'x', spoilerLevel: 'full' })).toMatch(/SPOILERS ALLOWED/);
    expect(story.SYSTEM).toMatch(/never as instructions/);
  });
  it('includes earlier choices when continuing', () => {
    const p = story.buildPrompt({ movie, premise: 'x', spoilerLevel: 'light', segments: [{ narrative: 'Part one text', chosen: 'Run' }] });
    expect(p).toMatch(/The reader chose: Run/);
  });
  it('validates AI output', () => {
    expect(story.normalizeSegment({ narrative: ' Hi ', choices: ['a', 'b', 'c', 'd'] }, false).choices).toHaveLength(3);
    expect(() => story.normalizeSegment({ narrative: 'x', choices: ['only'] }, false)).toThrow();
    expect(() => story.normalizeSegment({ choices: ['a', 'b'] }, false)).toThrow();
    expect(story.normalizeSegment({ narrative: 'The end', choices: ['a', 'b'] }, true).choices).toEqual([]);
  });
  it('exposes a clear unofficial label', () => {
    expect(story.LABEL).toMatch(/Unofficial, AI-generated/);
  });
});
