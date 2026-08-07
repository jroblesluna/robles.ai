import { describe, it, expect } from 'vitest';
import {
  truncateText,
  extractHashtagsAndMentions,
  formatForPlatform,
} from '../services/platforms/contentFormatter.js';

describe('truncateText', () => {
  it('returns text as-is when within limit', () => {
    const text = 'Hello world.';
    expect(truncateText(text, 100)).toBe(text);
  });

  it('truncates at sentence boundary (period)', () => {
    const text = 'First sentence. Second sentence. Third sentence.';
    // Limit to 32 chars — should fit "First sentence. Second sentence."
    expect(truncateText(text, 32)).toBe('First sentence. Second sentence.');
  });

  it('truncates at sentence boundary (exclamation mark)', () => {
    const text = 'Hello! This is a longer sentence that goes on.';
    expect(truncateText(text, 10)).toBe('Hello!');
  });

  it('truncates at sentence boundary (question mark)', () => {
    const text = 'Really? Yes it is a long text that exceeds.';
    expect(truncateText(text, 10)).toBe('Really?');
  });

  it('falls back to word boundary with ellipsis when no sentence boundary', () => {
    const text = 'This is a long text without any sentence endings';
    const result = truncateText(text, 20);
    expect(result.length).toBeLessThanOrEqual(20);
    expect(result).toContain('…');
    // maxLength=20, ellipsis=1 char, so 19 chars available: "This is a long text"
    // last space in those 19 chars is at index 14 (before "text"), so truncates there
    expect(result).toBe('This is a long…');
  });

  it('handles hard truncation when no word boundary', () => {
    const text = 'Superlongwordwithoutanyspaces';
    const result = truncateText(text, 10);
    expect(result.length).toBeLessThanOrEqual(10);
    expect(result).toContain('…');
  });

  it('returns empty string for maxLength 0', () => {
    expect(truncateText('Hello world', 0)).toBe('');
  });

  it('handles empty text', () => {
    expect(truncateText('', 100)).toBe('');
  });

  it('handles text that exactly matches the limit', () => {
    const text = 'Exact.';
    expect(truncateText(text, 6)).toBe('Exact.');
  });
});

describe('extractHashtagsAndMentions', () => {
  it('extracts hashtags from text', () => {
    const result = extractHashtagsAndMentions('Hello world #ai #tech');
    expect(result.body).toBe('Hello world');
    expect(result.hashtags).toEqual(['#ai', '#tech']);
    expect(result.mentions).toEqual([]);
  });

  it('extracts mentions from text', () => {
    const result = extractHashtagsAndMentions('Hello @user1 @user2');
    expect(result.body).toBe('Hello');
    expect(result.hashtags).toEqual([]);
    expect(result.mentions).toEqual(['@user1', '@user2']);
  });

  it('extracts both hashtags and mentions', () => {
    const result = extractHashtagsAndMentions('Post text #ai @user1 #tech @user2');
    expect(result.body).toBe('Post text');
    expect(result.hashtags).toEqual(['#ai', '#tech']);
    expect(result.mentions).toEqual(['@user1', '@user2']);
  });

  it('handles text without hashtags or mentions', () => {
    const result = extractHashtagsAndMentions('Just plain text here.');
    expect(result.body).toBe('Just plain text here.');
    expect(result.hashtags).toEqual([]);
    expect(result.mentions).toEqual([]);
  });

  it('handles empty text', () => {
    const result = extractHashtagsAndMentions('');
    expect(result.body).toBe('');
    expect(result.hashtags).toEqual([]);
    expect(result.mentions).toEqual([]);
  });

  it('handles text that is only hashtags', () => {
    const result = extractHashtagsAndMentions('#ai #ml #deeplearning');
    expect(result.body).toBe('');
    expect(result.hashtags).toEqual(['#ai', '#ml', '#deeplearning']);
  });
});

describe('formatForPlatform', () => {
  describe('LinkedIn format selection', () => {
    it('selects carousel_pdf when slides >= 2', () => {
      const result = formatForPlatform(
        'linkedin',
        'Post text',
        ['url1', 'url2', 'url3'],
        Buffer.from('pdf-data'),
      );
      expect(result.mediaType).toBe('carousel_pdf');
      expect(result.mediaUrls).toEqual(['url1', 'url2', 'url3']);
      expect(result.pdfBuffer).toBeDefined();
    });

    it('selects single_image when slides < 2', () => {
      const result = formatForPlatform(
        'linkedin',
        'Post text',
        ['url1'],
      );
      expect(result.mediaType).toBe('single_image');
      expect(result.mediaUrls).toEqual(['url1']);
    });

    it('uses cover image for single_image when no slides', () => {
      const result = formatForPlatform(
        'linkedin',
        'Post text',
        [],
        undefined,
        'cover-url',
      );
      expect(result.mediaType).toBe('single_image');
      expect(result.mediaUrls).toEqual(['cover-url']);
    });
  });

  describe('Instagram format selection', () => {
    it('selects multi_image when slides >= 2', () => {
      const result = formatForPlatform(
        'instagram',
        'Post text',
        ['url1', 'url2'],
      );
      expect(result.mediaType).toBe('multi_image');
      expect(result.mediaUrls).toEqual(['url1', 'url2']);
    });

    it('selects single_image when slides < 2', () => {
      const result = formatForPlatform(
        'instagram',
        'Post text',
        ['url1'],
      );
      expect(result.mediaType).toBe('single_image');
      expect(result.mediaUrls).toEqual(['url1']);
    });

    it('uses cover image when no slides', () => {
      const result = formatForPlatform(
        'instagram',
        'Post text',
        [],
        undefined,
        'cover-url',
      );
      expect(result.mediaType).toBe('single_image');
      expect(result.mediaUrls).toEqual(['cover-url']);
    });
  });

  describe('Facebook format selection', () => {
    it('selects multi_image when slides >= 1', () => {
      const result = formatForPlatform(
        'facebook',
        'Post text',
        ['url1'],
      );
      expect(result.mediaType).toBe('multi_image');
      expect(result.mediaUrls).toEqual(['url1']);
    });

    it('selects text_only when no slides, uses cover image', () => {
      const result = formatForPlatform(
        'facebook',
        'Post text',
        [],
        undefined,
        'cover-url',
      );
      expect(result.mediaType).toBe('text_only');
      expect(result.mediaUrls).toEqual(['cover-url']);
    });

    it('selects text_only with empty mediaUrls when no slides and no cover', () => {
      const result = formatForPlatform(
        'facebook',
        'Post text',
        [],
      );
      expect(result.mediaType).toBe('text_only');
      expect(result.mediaUrls).toEqual([]);
    });
  });

  describe('text truncation with platform limits', () => {
    it('truncates LinkedIn text to 3000 characters', () => {
      const longText = 'A'.repeat(4000);
      const result = formatForPlatform('linkedin', longText, ['url1', 'url2']);
      expect(result.text.length).toBeLessThanOrEqual(3000);
    });

    it('truncates Instagram text to 2200 characters', () => {
      const longText = 'A'.repeat(3000);
      const result = formatForPlatform('instagram', longText, ['url1', 'url2']);
      expect(result.text.length).toBeLessThanOrEqual(2200);
    });

    it('does not truncate Facebook text under limit', () => {
      const text = 'Short post text.';
      const result = formatForPlatform('facebook', text, ['url1']);
      expect(result.text).toBe('Short post text.');
    });
  });

  describe('hashtag and mention preservation', () => {
    it('preserves hashtags after truncation', () => {
      const text = 'Some body text. #ai #tech';
      const result = formatForPlatform('linkedin', text, ['url1', 'url2']);
      expect(result.text).toContain('#ai');
      expect(result.text).toContain('#tech');
    });

    it('preserves mentions after truncation', () => {
      const text = 'Some body text. @user1 @user2';
      const result = formatForPlatform('instagram', text, ['url1', 'url2']);
      expect(result.text).toContain('@user1');
      expect(result.text).toContain('@user2');
    });

    it('preserves both hashtags and mentions with long body', () => {
      // Body that needs truncation + hashtags/mentions
      const body = 'A'.repeat(2100);
      const text = `${body} #ai #tech @user1`;
      const result = formatForPlatform('instagram', text, ['url1', 'url2']);
      expect(result.text).toContain('#ai');
      expect(result.text).toContain('#tech');
      expect(result.text).toContain('@user1');
      expect(result.text.length).toBeLessThanOrEqual(2200);
    });
  });
});
