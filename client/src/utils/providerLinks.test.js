import { providerLink } from './providerLinks';

describe('providerLink', () => {
  it('opens the title search on Netflix and encodes the title', () => {
    expect(providerLink('Netflix', 'Fast & Furious')).toBe('https://www.netflix.com/search?q=Fast%20%26%20Furious');
    expect(providerLink('Netflix Standard with Ads', 'Heat')).toMatch(/^https:\/\/www\.netflix\.com\/search/);
  });
  it('recognises other big services by their TMDB names', () => {
    expect(providerLink('Amazon Prime Video', 'Heat')).toMatch(/primevideo\.com\/search\?phrase=Heat/);
    expect(providerLink('Google Play Movies', 'Heat')).toMatch(/play\.google\.com\/store\/search\?q=Heat/);
    expect(providerLink('YouTube', 'Heat')).toMatch(/youtube\.com\/results/);
    expect(providerLink('Disney Plus Hotstar', 'Heat')).toBe('https://www.hotstar.com');
    expect(providerLink('Zee5', 'Heat')).toBe('https://www.zee5.com');
    expect(providerLink('Sony Liv', 'Heat')).toBe('https://www.sonyliv.com');
  });
  it('uses the fallback for unknown services and null when there is none', () => {
    expect(providerLink('SomeNewService', 'Heat', 'https://example.com/jw')).toBe('https://example.com/jw');
    expect(providerLink('SomeNewService', 'Heat')).toBeNull();
  });
});
