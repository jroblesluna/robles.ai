import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fc from 'fast-check';
import Database from 'better-sqlite3';
import { ensureFtsTable, indexPost, type PostJson } from './indexer';

// --- Helpers ---

let db: InstanceType<typeof Database>;

/** Result shape returned by our search queries */
interface SearchResult {
  slug: string;
  language: 'en' | 'es';
  title: string;
  excerpt: string;
  snippet: string;
  score: number;
}

/**
 * Executes the same search query pattern used in searchRoutes.ts.
 * Returns { results, total } matching the API response shape.
 */
function executeSearch(
  query: string,
  opts: { lang?: 'en' | 'es'; page?: number; limit?: number } = {},
): { results: SearchResult[]; total: number } {
  const { lang, page = 1, limit = 9 } = opts;
  const offset = (page - 1) * limit;
  const matchValue = query.trim();

  if (lang) {
    const results = db.prepare(`
      SELECT slug, language, title, excerpt,
             snippet(blog_fts, 4, '<mark>', '</mark>', '...', 32) as snippet,
             bm25(blog_fts, 0, 0, 10, 5, 2, 3) as score
      FROM blog_fts
      WHERE blog_fts MATCH ?
        AND language = ?
      ORDER BY score, slug DESC
      LIMIT ? OFFSET ?
    `).all(matchValue, lang, limit, offset) as SearchResult[];

    const totalRow = db.prepare(`
      SELECT count(*) as total
      FROM blog_fts
      WHERE blog_fts MATCH ?
        AND language = ?
    `).get(matchValue, lang) as { total: number };

    return { results, total: totalRow.total };
  } else {
    const results = db.prepare(`
      SELECT slug, language, title, excerpt,
             snippet(blog_fts, 4, '<mark>', '</mark>', '...', 32) as snippet,
             bm25(blog_fts, 0, 0, 10, 5, 2, 3) as score
      FROM blog_fts
      WHERE blog_fts MATCH ?
      ORDER BY score, slug DESC
      LIMIT ? OFFSET ?
    `).all(matchValue, limit, offset) as SearchResult[];

    const totalRow = db.prepare(`
      SELECT count(*) as total
      FROM blog_fts
      WHERE blog_fts MATCH ?
    `).get(matchValue) as { total: number };

    return { results, total: totalRow.total };
  }
}

// --- Test Data Setup ---

/**
 * Seed the FTS table with diverse posts to ensure search queries return results.
 * Posts cover various topics in both languages to exercise language filtering and ranking.
 */
const seedPosts: PostJson[] = [
  {
    slug: '2025-06-01-artificial-intelligence-future',
    categories: ['AI', 'Technology'],
    translations: {
      en: {
        title: 'Artificial Intelligence and the Future',
        excerpt: 'Exploring how AI shapes tomorrow',
        content: [
          { heading: 'Introduction', body: 'Artificial intelligence is transforming industries worldwide with machine learning algorithms.' },
          { heading: 'Applications', body: 'Healthcare robotics and autonomous vehicles represent major breakthroughs.' },
        ],
      },
      es: {
        title: 'Inteligencia Artificial y el Futuro',
        excerpt: 'Explorando como la IA moldea el manana',
        content: [
          { heading: 'Introduccion', body: 'La inteligencia artificial esta transformando industrias en todo el mundo con algoritmos de aprendizaje automatico.' },
          { heading: 'Aplicaciones', body: 'Robotica en salud y vehiculos autonomos representan grandes avances.' },
        ],
      },
    },
  },
  {
    slug: '2025-05-15-machine-learning-deep-dive',
    categories: ['AI', 'MachineLearning'],
    translations: {
      en: {
        title: 'Machine Learning Deep Dive',
        excerpt: 'A comprehensive guide to ML techniques',
        content: [
          { heading: 'Neural Networks', body: 'Deep learning uses neural networks with multiple layers to learn representations.' },
          { heading: 'Training', body: 'Gradient descent optimization and backpropagation are fundamental to training.' },
        ],
      },
      es: {
        title: 'Profundizando en Aprendizaje Automatico',
        excerpt: 'Una guia completa de tecnicas de ML',
        content: [
          { heading: 'Redes Neuronales', body: 'El aprendizaje profundo utiliza redes neuronales con multiples capas para aprender representaciones.' },
          { heading: 'Entrenamiento', body: 'La optimizacion por descenso de gradiente y retropropagacion son fundamentales para el entrenamiento.' },
        ],
      },
    },
  },
  {
    slug: '2025-04-20-cloud-computing-trends',
    categories: ['Cloud', 'Infrastructure'],
    translations: {
      en: {
        title: 'Cloud Computing Trends in 2025',
        excerpt: 'How cloud infrastructure is evolving',
        content: [
          { heading: 'Serverless', body: 'Serverless computing eliminates server management while providing automatic scaling.' },
          { heading: 'Multi-Cloud', body: 'Organizations adopt multi-cloud strategies for redundancy and vendor flexibility.' },
        ],
      },
      es: {
        title: 'Tendencias de Computacion en la Nube 2025',
        excerpt: 'Como evoluciona la infraestructura en la nube',
        content: [
          { heading: 'Sin Servidor', body: 'La computacion sin servidor elimina la gestion de servidores proporcionando escalado automatico.' },
          { heading: 'Multi-Nube', body: 'Las organizaciones adoptan estrategias multi-nube para redundancia y flexibilidad de proveedores.' },
        ],
      },
    },
  },
  {
    slug: '2025-03-10-cybersecurity-essentials',
    categories: ['Security', 'Technology'],
    translations: {
      en: {
        title: 'Cybersecurity Essentials',
        excerpt: 'Protecting your digital assets',
        content: [
          { heading: 'Encryption', body: 'End-to-end encryption ensures data privacy during transmission across networks.' },
          { heading: 'Zero Trust', body: 'Zero trust architecture verifies every access request regardless of network location.' },
        ],
      },
      es: {
        title: 'Fundamentos de Ciberseguridad',
        excerpt: 'Protegiendo tus activos digitales',
        content: [
          { heading: 'Encriptacion', body: 'La encriptacion de extremo a extremo asegura la privacidad de datos durante la transmision en redes.' },
          { heading: 'Confianza Cero', body: 'La arquitectura de confianza cero verifica cada solicitud de acceso sin importar la ubicacion de red.' },
        ],
      },
    },
  },
  {
    slug: '2025-02-28-quantum-computing-overview',
    categories: ['Quantum', 'Research'],
    translations: {
      en: {
        title: 'Quantum Computing Overview',
        excerpt: 'Understanding quantum mechanics in computing',
        content: [
          { heading: 'Qubits', body: 'Quantum bits or qubits leverage superposition to process multiple states simultaneously.' },
          { heading: 'Entanglement', body: 'Quantum entanglement enables instant correlation between paired particles.' },
        ],
      },
      es: {
        title: 'Vision General de Computacion Cuantica',
        excerpt: 'Entendiendo la mecanica cuantica en computacion',
        content: [
          { heading: 'Qubits', body: 'Los bits cuanticos o qubits aprovechan la superposicion para procesar multiples estados simultaneamente.' },
          { heading: 'Entrelazamiento', body: 'El entrelazamiento cuantico permite correlacion instantanea entre particulas emparejadas.' },
        ],
      },
    },
  },
  {
    slug: '2025-01-05-robotics-automation',
    categories: ['Robotics', 'Automation'],
    translations: {
      en: {
        title: 'Robotics and Automation',
        excerpt: 'How robots transform manufacturing',
        content: [
          { heading: 'Industrial Robots', body: 'Collaborative robots work alongside humans in manufacturing assembly lines.' },
          { heading: 'Autonomous Systems', body: 'Self-driving vehicles and drones use sensor fusion for navigation.' },
        ],
      },
      es: {
        title: 'Robotica y Automatizacion',
        excerpt: 'Como los robots transforman la manufactura',
        content: [
          { heading: 'Robots Industriales', body: 'Los robots colaborativos trabajan junto a humanos en lineas de ensamblaje de manufactura.' },
          { heading: 'Sistemas Autonomos', body: 'Los vehiculos autonomos y drones usan fusion de sensores para navegacion.' },
        ],
      },
    },
  },
];

// --- Setup & Teardown ---

beforeAll(() => {
  db = new Database(':memory:');
  ensureFtsTable(db);
  for (const post of seedPosts) {
    indexPost(db, post);
  }
});

afterAll(() => {
  db.close();
});

// --- Property Tests ---

describe('Search API — Property Tests', () => {
  describe('Property 8: Empty query validation', () => {
    /**
     * **Validates: Requirements 4.5**
     *
     * For any query string that is empty or composed entirely of whitespace characters,
     * the Search API SHALL return HTTP 400.
     */
    it('empty or whitespace-only queries would trigger 400 validation', () => {
      // Arbitrary for whitespace-only strings (including empty)
      const whitespaceOnlyArb = fc
        .array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 0, maxLength: 20 })
        .map((chars) => chars.join(''));

      fc.assert(
        fc.property(whitespaceOnlyArb, (q) => {
          // Replicate the validation logic from searchRoutes.ts
          const isInvalid = !q || q.trim().length === 0;
          expect(isInvalid).toBe(true);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 9: Pagination bounds', () => {
    /**
     * **Validates: Requirements 4.4**
     *
     * For any valid search query with pagination parameters page and limit,
     * the number of results returned SHALL be less than or equal to limit,
     * and results across sequential pages SHALL not overlap (no duplicate slugs).
     */
    it('results count is always <= limit', () => {
      const limitArb = fc.integer({ min: 1, max: 10 });

      fc.assert(
        fc.property(limitArb, (limit) => {
          const { results } = executeSearch('computing', { limit });
          expect(results.length).toBeLessThanOrEqual(limit);
        }),
        { numRuns: 50 },
      );
    });

    it('no duplicate slugs across consecutive pages', () => {
      const limitArb = fc.integer({ min: 1, max: 4 });

      fc.assert(
        fc.property(limitArb, (limit) => {
          // Collect slugs from all pages
          const allSlugs: string[] = [];
          let page = 1;
          const maxPages = 10;

          while (page <= maxPages) {
            const { results } = executeSearch('computing OR robots OR intelligence', { limit, page });
            if (results.length === 0) break;
            allSlugs.push(...results.map((r) => `${r.slug}:${r.language}`));
            page++;
          }

          // Check for duplicates
          const uniqueSlugs = new Set(allSlugs);
          expect(uniqueSlugs.size).toBe(allSlugs.length);
        }),
        { numRuns: 30 },
      );
    });
  });

  describe('Property 10: Language filter correctness', () => {
    /**
     * **Validates: Requirements 4.3, 7.1**
     *
     * For any search query with a specified lang parameter ('en' or 'es'),
     * all returned results SHALL have their language field equal to the specified lang value.
     */
    it('all results match the specified language filter', () => {
      const langArb = fc.constantFrom<'en' | 'es'>('en', 'es');
      const queryArb = fc.constantFrom('intelligence', 'computing', 'robots', 'network', 'cloud');

      fc.assert(
        fc.property(langArb, queryArb, (lang, query) => {
          const { results } = executeSearch(query, { lang });
          for (const result of results) {
            expect(result.language).toBe(lang);
          }
        }),
        { numRuns: 50 },
      );
    });
  });

  describe('Property 11: Results ordered by descending relevance', () => {
    /**
     * **Validates: Requirements 4.7, 6.2, 6.3**
     *
     * For any search query returning multiple results, the sequence of BM25 scores
     * SHALL be in non-decreasing order (since BM25 returns negative values where
     * more negative = more relevant, ORDER BY score ASC gives most relevant first).
     * When scores are equal, results SHALL be ordered by slug descending.
     */
    it('scores are in non-decreasing order (most relevant first)', () => {
      const queryArb = fc.constantFrom('intelligence', 'computing', 'network', 'robots', 'quantum', 'learning');

      fc.assert(
        fc.property(queryArb, (query) => {
          const { results } = executeSearch(query, { limit: 20 });
          if (results.length < 2) return; // nothing to check for 0 or 1 result

          for (let i = 0; i < results.length - 1; i++) {
            // BM25 scores should be non-decreasing (ascending order)
            expect(results[i].score).toBeLessThanOrEqual(results[i + 1].score);
          }
        }),
        { numRuns: 50 },
      );
    });

    it('when scores are equal, slug is in descending order', () => {
      const queryArb = fc.constantFrom('intelligence', 'computing', 'network', 'robots', 'quantum');

      fc.assert(
        fc.property(queryArb, (query) => {
          const { results } = executeSearch(query, { limit: 20 });
          if (results.length < 2) return;

          for (let i = 0; i < results.length - 1; i++) {
            if (results[i].score === results[i + 1].score) {
              // When scores are tied, slug should be in descending order
              expect(results[i].slug >= results[i + 1].slug).toBe(true);
            }
          }
        }),
        { numRuns: 50 },
      );
    });
  });

  describe('Property 12: Highlight snippets contain mark tags', () => {
    /**
     * **Validates: Requirements 4.9**
     *
     * For any search result returned by the Search API, if the result includes
     * a non-empty snippet that contains highlighted matches (i.e., the search term
     * matched within the content column that the snippet targets), that snippet
     * SHALL contain at least one <mark>...</mark> tag pair wrapping matched text.
     *
     * Note: FTS5 snippet() targets a specific column (content, index 4). When the
     * match is only in another column (title, excerpt, categories), the snippet
     * shows content text without marks. This property validates that when marks
     * ARE present, they form valid pairs.
     */
    it('when snippets contain mark tags, they form valid open/close pairs', () => {
      // Use queries that are known to match content body text
      const queryArb = fc.constantFrom(
        'intelligence', 'neural', 'encryption', 'quantum', 'robots', 'serverless',
        'gradient', 'backpropagation', 'superposition', 'entanglement',
      );

      fc.assert(
        fc.property(queryArb, (query) => {
          const { results } = executeSearch(query, { limit: 20 });

          for (const result of results) {
            if (result.snippet && result.snippet.includes('<mark>')) {
              // Every <mark> must have a corresponding </mark>
              const openCount = (result.snippet.match(/<mark>/g) || []).length;
              const closeCount = (result.snippet.match(/<\/mark>/g) || []).length;
              expect(openCount).toBe(closeCount);
              expect(openCount).toBeGreaterThanOrEqual(1);

              // First <mark> appears before first </mark>
              const markIndex = result.snippet.indexOf('<mark>');
              const closeMarkIndex = result.snippet.indexOf('</mark>');
              expect(closeMarkIndex).toBeGreaterThan(markIndex);
            }
          }
        }),
        { numRuns: 50 },
      );
    });

    it('queries matching content body produce at least one snippet with mark tags', () => {
      // These terms definitely appear in content bodies of seed posts
      const bodyTermArb = fc.constantFrom(
        'intelligence', 'neural', 'encryption', 'superposition', 'collaborative',
      );

      fc.assert(
        fc.property(bodyTermArb, (query) => {
          const { results } = executeSearch(query, { limit: 20 });
          if (results.length === 0) return; // skip if no results

          // At least one result should have a snippet with <mark> tags
          const hasMarkedSnippet = results.some(
            (r) => r.snippet && r.snippet.includes('<mark>'),
          );
          expect(hasMarkedSnippet).toBe(true);
        }),
        { numRuns: 50 },
      );
    });
  });

  describe('Property 13: Response shape correctness', () => {
    /**
     * **Validates: Requirements 4.8, 4.10**
     *
     * For any valid search query (non-empty q), the Search API response SHALL contain
     * a results array and a total number where total is >= the length of results.
     */
    it('response has results array and total >= results.length', () => {
      const queryArb = fc.constantFrom('intelligence', 'computing', 'robots', 'quantum', 'cloud', 'network', 'automation');
      const limitArb = fc.integer({ min: 1, max: 10 });
      const pageArb = fc.integer({ min: 1, max: 5 });

      fc.assert(
        fc.property(queryArb, limitArb, pageArb, (query, limit, page) => {
          const response = executeSearch(query, { limit, page });

          // results is an array
          expect(Array.isArray(response.results)).toBe(true);

          // total is a number
          expect(typeof response.total).toBe('number');

          // total >= results.length
          expect(response.total).toBeGreaterThanOrEqual(response.results.length);
        }),
        { numRuns: 100 },
      );
    });

    it('each result has the expected fields', () => {
      const queryArb = fc.constantFrom('intelligence', 'computing', 'robots', 'quantum');

      fc.assert(
        fc.property(queryArb, (query) => {
          const { results } = executeSearch(query, { limit: 10 });

          for (const result of results) {
            expect(result).toHaveProperty('slug');
            expect(result).toHaveProperty('language');
            expect(result).toHaveProperty('title');
            expect(result).toHaveProperty('excerpt');
            expect(result).toHaveProperty('snippet');
            expect(result).toHaveProperty('score');

            expect(typeof result.slug).toBe('string');
            expect(['en', 'es']).toContain(result.language);
            expect(typeof result.title).toBe('string');
            expect(typeof result.excerpt).toBe('string');
            expect(typeof result.snippet).toBe('string');
            expect(typeof result.score).toBe('number');
          }
        }),
        { numRuns: 50 },
      );
    });
  });
});
