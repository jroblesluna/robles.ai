import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock react-i18next (BlogArticle only reads i18n.language for the back-to-toc label).
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'en' },
    t: (key: string) => key,
  }),
}));

import { BlogArticle, splitIntoParagraphs } from './BlogArticle';

const sampleContent = [
  { heading: 'First Section', body: 'Alpha paragraph one.\n\nAlpha paragraph two.' },
  { heading: 'Second Section', body: 'Beta paragraph.' },
];

describe('BlogArticle — Validates: Requirements 11.3', () => {
  it('renders a heading block per content entry with matching section ids', () => {
    const { container } = render(<BlogArticle content={sampleContent} />);

    const headings = container.querySelectorAll('h2');
    expect(headings.length).toBe(2);
    expect(screen.getByText('First Section')).toBeInTheDocument();
    expect(screen.getByText('Second Section')).toBeInTheDocument();
    // Section anchor ids follow the same `section-{idx}` scheme as the full page.
    expect(container.querySelector('#section-0')).not.toBeNull();
    expect(container.querySelector('#section-1')).not.toBeNull();
  });

  it('renders each split paragraph as its own <p>', () => {
    const { container } = render(<BlogArticle content={sampleContent} />);
    const paragraphs = container.querySelectorAll('article p');
    // First block splits into 2 paragraphs, second block into 1 => 3 total.
    expect(paragraphs.length).toBe(3);
    expect(screen.getByText('Alpha paragraph one.')).toBeInTheDocument();
    expect(screen.getByText('Alpha paragraph two.')).toBeInTheDocument();
    expect(screen.getByText('Beta paragraph.')).toBeInTheDocument();
  });

  it('omits the back-to-TOC link by default and shows it when requested', () => {
    const { rerender, container } = render(<BlogArticle content={sampleContent} />);
    expect(container.querySelector('a[href="#toc"]')).toBeNull();

    rerender(<BlogArticle content={sampleContent} showBackToToc />);
    const backLink = container.querySelector('a[href="#toc"]');
    expect(backLink).not.toBeNull();
  });

  it('renders a single article root element (same structure as the full page)', () => {
    const { container } = render(<BlogArticle content={sampleContent} />);
    const articles = container.querySelectorAll('article');
    expect(articles.length).toBe(1);
    expect(articles[0].className).toContain('prose');
  });
});

describe('splitIntoParagraphs', () => {
  it('splits on double line breaks', () => {
    expect(splitIntoParagraphs('one\n\ntwo')).toEqual(['one', 'two']);
  });

  it('returns the whole text when there is a single short sentence', () => {
    expect(splitIntoParagraphs('Just one.')).toEqual(['Just one.']);
  });
});
