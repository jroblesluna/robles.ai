export function buildPostPrompt(editor: any, newsArticles: any[], recentTopics: string[]) {
  const systemPrompt = `${editor.systemPrompt}
Always maintain your distinctive personality, tone, and writing style.
You must always respond strictly in JSON format according to the structure provided by the user role.`.trim();

  const userPrompt = `
Your task:
- You are writing today's blog post as ${editor.name}, following your unique editorial voice and style.
- Analyze the following news articles carefully. Pay close attention to the FULL CONTENT provided — it contains specific data, names, technologies, and details you MUST use:
  
  ${JSON.stringify(newsArticles, null, 2)}
  
  ${recentTopics.length > 0
      ? `- Also consider previously covered topics (avoid repeating them):\n${recentTopics.join(', ')}`
      : ''}
      
- Your mission:
  - Select only news articles that are truly relevant and have enough substance.
  - Write an IN-DEPTH blog post that demonstrates expert knowledge. NOT a superficial summary.
  - You MUST cite specific data points, statistics, company names, technology names, research findings, and quotes directly from the source content.
  - Each section must deeply analyze one aspect — explain WHY it matters, HOW it works technically, and WHAT the implications are.
  - Include specific examples: name the companies, the technologies (specific model names, frameworks, algorithms), the numbers (percentages, dollar amounts, user counts).
  - Reflect how this topic applies to real industries with CONCRETE scenarios, not vague generalities.
  - If a source mentions a specific technology or methodology, explain it — don't just name-drop it.
  - End the article with a dedicated section like:
    - "How Robles.AI addresses this challenge" or "Where Robles.AI fits into this future"
    - Include a short call to action like "Contact us to learn how we can help."

- CRITICAL QUALITY RULES:
  - DO NOT write generic filler like "AI is transforming the world" or "technology plays a crucial role"
  - Every paragraph must contain at least one SPECIFIC fact, data point, or technical detail from the sources
  - Mention at least 3 news articles explicitly with their specific content
  - Use direct quotes from the sources when they add credibility (attribute them properly)
  - Write deeply — each section should TEACH the reader something they didn't know
  - Explain technical concepts for a professional audience (not dumbed down, not overly academic)
  - Write in both English and Spanish (both versions must be equally detailed)
  - Avoid markdown; return clean JSON
  - Follow this JSON format:

{
  "categories": [ "category_1", "category_2", "category_3", ...more if needed ],
  "keywords": [ "keyword_1", "keyword_2", "keyword_3", ...more if needed ],
  "translations": {
    "en": {
      "slug": "title-of-the-post",
      "title": "Title of the Post",
      "excerpt": "Excerpt of the post.",
      "content": [
        { "heading": "Heading 1", "body": "Detailed content of section 1." },
        { "heading": "Heading 2", "body": "Detailed content of section 2." },
        ...
      ]
    },
    "es": {
      "slug": "titulo-del-post",
      "title": "Titulo del Post",
      "excerpt": "Extracto del post.",
      "content": [
        { "heading": "Subtitulo 1", "body": "Contenido detallado del subtitulo 1." },
        { "heading": "Subtitulo 2", "body": "Contenido detallado del subtitulo 2." },
        ...
      ]
    }
  },
  "sources": [
    {
      "articleId": 1,
      "title": "News Title",
      "url": "https://source.com/article",
      "source": "News Outlet Name"
    },
    ... more only if used
  ]
}

- Section requirements:
  - 4 to 6 sections, each 3-5 paragraphs
  - Each paragraph: 150-300 words with SPECIFIC details
  - Target reading time: 12-18 min per language
  - Be informative, technical, and visionary — but always grounded in specific facts from the sources
  - The reader should finish knowing MORE than what a headline tells them
`.trim();

  return { systemPrompt, userPrompt };
}
