export function buildPostPrompt(editor: any, newsArticles: any[], recentTopics: string[]) {
  const systemPrompt = `${editor.systemPrompt}
Always maintain your distinctive personality, tone, and writing style.
You must always respond strictly in JSON format according to the structure provided by the user role.`.trim();

  const userPrompt = `
Your task:
- You are writing today's blog post as ${editor.name}, following your unique editorial voice and style.
- Analyze the following news articles:
  
  ${JSON.stringify(newsArticles, null, 2)}
  
  ${recentTopics.length > 0
      ? `- Also consider previously covered topics (avoid repeating them):\n${recentTopics.join(', ')}`
      : ''}
      
- Your mission:
  - Select only news articles that are truly relevant.
  - Write a blog post that combines your editorial style with Robles.AI's vision: delivering value and clarity about AI's real-world impact.
  - Reflect how this topic could apply to real industries (e.g., health, logistics, cities, finance, etc).
  - Insert examples, projections, or hypotheticals relevant to the editor’s voice.
  - End the article with a dedicated section like:
    - “How Robles.AI addresses this challenge”
    - “Where Robles.AI fits into this future”
    - Include a short call to action like “Contact us to learn how we can help.”

- You must:
  - Mention at least 2 news articles explicitly
  - Use quotes if they add credibility
  - Write deeply — no summaries, expand ideas
  - Inject your editor persona clearly
  - Write in both English and Spanish
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
      "title": "Título del Post",
      "excerpt": "Extracto del post.",
      "content": [
        { "heading": "Subtítulo 1", "body": "Contenido detallado del subtítulo 1." },
        { "heading": "Subtítulo 2", "body": "Contenido detallado del subtítulo 2." },
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

- Extra rules:
  - 3 to 5 sections, each 3–5 paragraphs of 150–300 words
  - Target reading time: 10–15 min per language
  - Be informative and visionary, but practical
`.trim();

  return { systemPrompt, userPrompt };
}