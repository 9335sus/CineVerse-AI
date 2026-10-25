process.env.NODE_ENV = 'test';
const { scoreMovie, rankMovies, fallbackExplanation } = require('../src/services/recommendation.service');
const ai = require('../src/services/ai.service');

const comedy = { id: 1, title: 'Funny', genreIds: [35, 10751], voteAverage: 7.5, runtime: 95 };
const horror = { id: 2, title: 'Scary', genreIds: [27, 53], voteAverage: 7.5, runtime: 100 };
const long = { id: 3, title: 'Epic', genreIds: [35], voteAverage: 9, runtime: 200 };

describe('mood scoring', () => {
  it('prefers movies that match mood, genre and intensity', () => {
    const prefs = { mood: 'happy', genres: [35], intensity: 'light', timeMinutes: 120 };
    expect(scoreMovie(comedy, prefs).score).toBeGreaterThan(scoreMovie(horror, prefs).score);
  });
  it('keeps scores within 0-100', () => {
    const { score } = scoreMovie({ genreIds: [35], voteAverage: 10, runtime: 120 }, { mood: 'happy', genres: [35], intensity: 'light', timeMinutes: 120 }, [35]);
    expect(score).toBeLessThanOrEqual(100);
  });
  it('drops movies longer than the available time', () => {
    const ranked = rankMovies([comedy, long], { mood: 'happy', genres: [35], intensity: 'light', timeMinutes: 120 });
    expect(ranked.map((m) => m.id)).toEqual([1]);
  });
  it('boosts movies matching profile genres', () => {
    const p = { mood: 'happy', genres: [], intensity: 'light' };
    expect(scoreMovie(comedy, p, [35]).score).toBeGreaterThan(scoreMovie(comedy, p, []).score);
  });
});

describe('rule-based fallback', () => {
  it('explains using genre names and mood', () => {
    const t = fallbackExplanation(comedy, { mood: 'happy', genres: [35], timeMinutes: 120 }, { 35: 'Comedy', 10751: 'Family' });
    expect(t).toMatch(/Comedy/);
    expect(t.endsWith('.')).toBe(true);
  });
  it('AI is reported unconfigured by default so the fallback is used', () => {
    expect(ai.isConfigured()).toBe(false);
  });
  it('parses JSON even when wrapped in chatter', () => {
    expect(ai.parseJsonObject('Sure!\n```json\n{"1":"ok"}\n```')).toEqual({ 1: 'ok' });
  });
});
