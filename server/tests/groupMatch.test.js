process.env.NODE_ENV = 'test';
const { rankForGroup, satisfaction } = require('../src/services/groupMatch.service');

const action = { id: 1, title: 'Action', genreIds: [28], voteAverage: 7, language: 'en', runtime: 110 };
const romance = { id: 2, title: 'Romance', genreIds: [10749], voteAverage: 7, language: 'en', runtime: 100 };
const blend = { id: 3, title: 'Action Romance', genreIds: [28, 10749], voteAverage: 7, language: 'en', runtime: 105 };
const horror = { id: 4, title: 'Horror', genreIds: [27], voteAverage: 8, language: 'en', runtime: 95 };
const epic = { id: 5, title: 'Epic', genreIds: [28, 10749], voteAverage: 9, language: 'en', runtime: 190 };

const alice = { userId: 'a', genres: [28], dislikedGenres: [27], language: 'en', maxRuntime: 150 };
const bob = { userId: 'b', genres: [10749], dislikedGenres: [], language: 'en', maxRuntime: 150 };

describe('group matching', () => {
  it('ranks the compromise movie first', () => {
    const r = rankForGroup([action, romance, blend, horror], [alice, bob]);
    expect(r[0].id).toBe(3);
  });
  it('penalises disliked genres', () => {
    expect(satisfaction(horror, alice)).toBeLessThan(satisfaction(romance, alice) + 0.2);
    const r = rankForGroup([action, romance, blend, horror], [alice, bob]);
    expect(r[r.length - 1].id).toBe(4);
  });
  it('enforces the strictest runtime limit', () => {
    const r = rankForGroup([blend, epic], [alice, bob]);
    expect(r.map((m) => m.id)).toEqual([3]);
  });
  it('represents every participant in the shortlist (fairness)', () => {
    const r = rankForGroup([action, romance, horror], [alice, bob], { limit: 2 });
    expect(r.map((m) => m.id).sort()).toEqual([1, 2]);
  });
  it('returns per-user scores and min <= mean', () => {
    const [top] = rankForGroup([blend], [alice, bob]);
    expect(top.perUser).toHaveLength(2);
    expect(top.min).toBeLessThanOrEqual(top.mean);
  });
  it('handles an empty group', () => {
    expect(rankForGroup([action], [])).toEqual([]);
  });
});
