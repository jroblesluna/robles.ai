import { describe, it, expect, beforeEach } from 'vitest';
import { getPageContext, clearContextCache } from '../chatContext.js';

describe('chatContext — getPageContext', () => {
  beforeEach(() => {
    clearContextCache();
  });

  it('returns homepage context for "/" path', async () => {
    const context = await getPageContext('/');
    expect(context).toContain('Robles.AI');
    expect(context).toContain('Machine Learning Models');
    expect(context).toContain('Computer Vision Systems');
    expect(context).toContain('Natural Language Processing');
    expect(context).toContain('Deep Learning Systems');
    expect(context).toContain('Innovation-Driven');
  });

  it('returns demo context for /try-identity', async () => {
    const context = await getPageContext('/try-identity');
    expect(context).toContain('Identity Verification');
    expect(context).toContain('selfie');
    expect(context).toContain('document');
  });

  it('returns demo context for /try-langchain', async () => {
    const context = await getPageContext('/try-langchain');
    expect(context).toContain('LangChain');
    expect(context).toContain('RAG');
  });

  it('returns demo context for /try-rag', async () => {
    const context = await getPageContext('/try-rag');
    expect(context).toContain('RAG Pipeline');
    expect(context).toContain('Pinecone');
  });

  it('returns demo context for /try-medical', async () => {
    const context = await getPageContext('/try-medical');
    expect(context).toContain('Medical AI');
    expect(context).toContain('imaging');
  });

  it('returns generic demo context for unknown /try-* paths', async () => {
    const context = await getPageContext('/try-unknown');
    expect(context).toContain('demo page');
  });

  it('returns blog listing context for /blog', async () => {
    const context = await getPageContext('/blog');
    expect(context).toContain('News Center');
  });

  it('returns careers context for /careers', async () => {
    const context = await getPageContext('/careers');
    expect(context).toContain('Careers');
  });

  it('returns get-started context for /get-started', async () => {
    const context = await getPageContext('/get-started');
    expect(context).toContain('Get Started');
    expect(context).toContain('AI/ML transformation');
  });

  it('returns generic fallback for unknown paths', async () => {
    const context = await getPageContext('/some/unknown/page');
    expect(context).toContain('Robles.AI');
    expect(context).toContain('/some/unknown/page');
  });

  it('normalizes paths by stripping query params and hash', async () => {
    const context1 = await getPageContext('/?lang=en');
    const context2 = await getPageContext('/#features');
    const context3 = await getPageContext('/');
    expect(context1).toBe(context3);
    expect(context2).toBe(context3);
  });

  it('normalizes paths by stripping trailing slash', async () => {
    const context1 = await getPageContext('/careers/');
    const context2 = await getPageContext('/careers');
    expect(context1).toBe(context2);
  });

  it('caches results for the same path', async () => {
    const context1 = await getPageContext('/');
    const context2 = await getPageContext('/');
    expect(context1).toBe(context2);
  });

  it('produces different context for different paths', async () => {
    const homepage = await getPageContext('/');
    const careers = await getPageContext('/careers');
    const demo = await getPageContext('/try-rag');
    expect(homepage).not.toBe(careers);
    expect(homepage).not.toBe(demo);
    expect(careers).not.toBe(demo);
  });

  it('returns blog article context when a valid blog slug is found', async () => {
    // This test relies on the actual blog posts in server/data/posts
    const context = await getPageContext('/blog/2025-05-14-03-00-00-the-future-of-human-device-interaction');
    expect(context).toContain('Human-Device Interaction');
    expect(context).toContain('Robles.AI News Center');
  });

  it('returns fallback blog context for a non-existent blog slug', async () => {
    const context = await getPageContext('/blog/2099-01-01-00-00-00-does-not-exist');
    expect(context).toContain('Robles.AI News Center');
    expect(context).toContain('could not be loaded');
  });
});
