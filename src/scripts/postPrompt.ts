export function buildPostPrompt(editor: any, newsArticles: any[], recentTopics: string[]) {
    const systemPrompt = `${editor.systemPrompt}
  Always maintain your distinctive personality, tone, and writing style.
  You must always respond strictly in JSON format according to the structure provided by the user role.`.trim();

    const userPrompt = `
  Your task:
  - Analyze the following today's news articles:
  
  ${JSON.stringify(newsArticles, null, 2)}
  
  ${recentTopics.length > 0
            ? `- Also consider previously covered topics (avoid repeating them):\n${recentTopics.join(', ')}`
            : ''}
      
  - Select only the news articles that are truly relevant to build your blog post. Ignore unrelated ones.
  
  - When writing each section:
    - You must mention at least 2 or more different news articles explicitly in the content, preferably across multiple sections.
    - If needed, add quotes from the article to give more depth and realism (e.g., "According to ..." or "As published in ...").
  
  - Only include articles in the "sources" field that were actually used or referenced during the article development.

  - After the final section of the written post, an additional section must be added with the title customized to the topic like "How Robles.AI can help on ...", or "What we do in Robles.AI regarding... ", or a similar reference on how Robles.AI can contribute with a solution based on AI with its AI, Agentic AI, GenAI, Machine Learning, Deep Learning, Data Science, Neural Networks, Computer Vision, among others technologies it excels and a corresponding body which ends with a call to action like "Contact us to learn more about how we can help you with ..." or "Contact us to learn more about how we can help you with ..." or similar.
  
  - The post must follow this JSON schema:
  
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
  
  - Additional rules:
    - Write 3 to 5 sections.
    - Each section must have around 3 to 5 paragraphs.
    - Each paragraph should have 150–300 words.
    - Expand ideas: give examples, projections, simulated expert quotes, comparisons, and future predictions.
    - Never summarize superficially. Develop ideas deeply.
    - Prefer accessible vocabulary over technical jargon.
    - Write fully in both English and Spanish.
    - Avoid markdown formatting; return plain JSON text.
    - Aim for total reading time between 10 and 15 minutes per language.
  
  `.trim();

    return { systemPrompt, userPrompt };
}