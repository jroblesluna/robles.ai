export function buildPostPrompt(editor: any, newsArticles: any[], recentTopics: string[]) {
  const systemPrompt = `${editor.systemPrompt}
Always maintain your distinctive personality, tone, and writing style.
You must always respond strictly in JSON format according to the structure provided by the user role.`.trim();

  const userPrompt = `
Your task:
- You are writing today's blog post as ${editor.name}, following your unique editorial voice and style.
- You have ${newsArticles.length} source articles below with FULL SCRAPED CONTENT. Use this content deeply.

SOURCE ARTICLES:
${JSON.stringify(newsArticles, null, 2)}

${recentTopics.length > 0
    ? `Previously covered topics (avoid repeating): ${recentTopics.join(", ")}`
    : ""}

WRITING INSTRUCTIONS:

1. STRUCTURE: Dedicate ONE FULL SECTION to each major source article (minimum 3 articles, each gets its own heading and 3-5 paragraphs). Do NOT merge multiple articles into one generic section.

2. DEPTH REQUIREMENTS FOR EACH SECTION:
   - Paragraph 1: State the specific news — WHO did WHAT, WHEN, with exact names, figures, and context from the source
   - Paragraph 2: Explain the TECHNICAL DETAILS — how does this technology/approach work? What specific methods, algorithms, architectures, or processes are involved? Pull this from the scraped content.
   - Paragraph 3: Analyze the IMPLICATIONS — what does this mean for the industry? Include specific market data, adoption numbers, competitor landscape, or expert quotes from the source.
   - Paragraph 4 (optional): Your editorial perspective — connect this to broader trends, add your expert opinion, relate to Robles.AI's domain

3. MANDATORY SPECIFICS (your article MUST include):
   - At least 5 specific numbers/statistics from the sources (revenue figures, percentages, dates, user counts, etc.)
   - At least 3 named technologies, products, or methodologies
   - At least 2 named people (CEOs, researchers, etc.) with their actual quotes or paraphrased statements from the sources
   - At least 3 named companies or institutions
   - Technical explanations that go beyond surface level (explain HOW things work, not just WHAT happened)

4. FORBIDDEN PATTERNS (do NOT write these):
   - "AI is transforming the world/industry/landscape"
   - "The implications are profound"
   - "This technology plays a crucial role"
   - "In today's rapidly evolving..."
   - Any sentence that could apply to ANY technology article (be specific to THIS news)
   - Generic calls to action without connection to the specific content discussed

5. FINAL SECTION: "Where Robles.AI Fits" — connect SPECIFICALLY to the technologies discussed (not generic "we help with AI"), mention which specific capability or service relates to the article content.

6. Write in BOTH English and Spanish (both equally detailed, not a shortened translation).

JSON FORMAT:
{
  "categories": ["category_1", "category_2", "category_3"],
  "keywords": ["keyword_1", "keyword_2", "keyword_3", "keyword_4", "keyword_5"],
  "translations": {
    "en": {
      "slug": "descriptive-slug-with-specific-topic",
      "title": "Specific Title Mentioning Key Technology or Company",
      "excerpt": "2-3 sentence excerpt with a specific data point.",
      "content": [
        { "heading": "Section Heading About Specific Article", "body": "Full detailed content. Multiple paragraphs separated by newlines. Each paragraph 150-250 words. Must contain specific data from source." },
        { "heading": "Another Specific Section", "body": "..." }
      ]
    },
    "es": {
      "slug": "slug-descriptivo-con-tema-especifico",
      "title": "Titulo Especifico Mencionando Tecnologia o Empresa Clave",
      "excerpt": "Extracto de 2-3 oraciones con un dato especifico.",
      "content": [
        { "heading": "Encabezado Sobre Articulo Especifico", "body": "Contenido completo y detallado..." }
      ]
    }
  },
  "sources": [
    { "articleId": 1, "title": "Exact Article Title", "url": "https://...", "source": "Outlet Name" }
  ]
}

QUALITY CHECK — before returning, verify your output:
- Does each section contain at least 3 specific facts/numbers from the source?
- Could a reader learn HOW a technology works from your article?
- Would an expert in the field find new, specific information?
- Is every paragraph grounded in source data (not filler)?

LENGTH REQUIREMENTS (CRITICAL):
- MINIMUM 2000 words per language (English and Spanish each)
- Each section body MUST be at least 4 paragraphs, each paragraph 150-250 words
- Total article: 5-7 sections minimum
- Target reading time: 15-20 min per language
- If your output is under 2000 words per language, you have NOT written enough detail

QUOTES REQUIREMENT:
- Include at least 2 DIRECT QUOTES from the source material (attributed to specific people)
- If the source doesn't have quotes, paraphrase a specific statement and attribute it to the source/author
- Example: According to Tim Breen, CEO of GlobalFoundries, "this represents a paradigm shift in..."
`.trim();

  return { systemPrompt, userPrompt };
}
