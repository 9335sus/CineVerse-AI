// TMDB tells us WHICH services carry a movie but gives no per-service deep link.
// For the big services we open their search for the title (or their home page when we are not sure
// of their search URL). Anything else falls back to the JustWatch/TMDB page for the movie.
const RULES = [
  [/netflix/i, (q) => `https://www.netflix.com/search?q=${q}`],
  [/prime video|amazon video|amazon prime/i, (q) => `https://www.primevideo.com/search?phrase=${q}`],
  [/youtube/i, (q) => `https://www.youtube.com/results?search_query=${q}+movie`],
  [/google play/i, (q) => `https://play.google.com/store/search?q=${q}&c=movies`],
  [/hotstar|jio ?cinema/i, () => 'https://www.hotstar.com'],
  [/zee ?5/i, () => 'https://www.zee5.com'],
  [/sony ?liv/i, () => 'https://www.sonyliv.com'],
  [/apple/i, () => 'https://tv.apple.com'],
  [/mubi/i, () => 'https://mubi.com'],
];

export const providerLink = (name, title, fallback = null) => {
  const q = encodeURIComponent(title || '');
  const rule = RULES.find(([re]) => re.test(name || ''));
  return rule ? rule[1](q) : fallback;
};
