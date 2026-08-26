import path from 'path';
import fs from 'fs/promises';
import { readFileSync } from 'fs';

// ============================================================
// Context Provider — Assembles page-specific context for the
// AI chatbot based on the visitor's current page path.
// ============================================================

/** In-memory cache: pagePath → context string */
const contextCache = new Map<string, string>();

/**
 * Returns contextual information about the page the visitor is currently on.
 * Results are cached in memory to avoid redundant file reads within a session.
 *
 * @param pagePath - The current page route (e.g. "/blog/2025-05-14-03-00-00-some-slug")
 * @returns A string with page-relevant context for the AI system prompt
 */
export async function getPageContext(pagePath: string): Promise<string> {
  // Normalize path (remove trailing slash, query params, hash)
  const normalized = pagePath.split('?')[0].split('#')[0].replace(/\/$/, '') || '/';

  // Check cache first
  if (contextCache.has(normalized)) {
    return contextCache.get(normalized)!;
  }

  let context: string;

  if (normalized === '/') {
    context = getHomepageContext();
  } else if (normalized.startsWith('/blog/')) {
    const slug = normalized.replace('/blog/', '');
    context = await getBlogContext(slug);
  } else if (normalized.startsWith('/try-')) {
    context = getDemoContext(normalized);
  } else {
    context = getRouteDescription(normalized);
  }

  // Cache the result
  contextCache.set(normalized, context);
  return context;
}

/**
 * Clears the context cache. Useful when a session navigates to a new page
 * or when the cache should be invalidated.
 */
export function clearContextCache(): void {
  contextCache.clear();
}

// ----------------------------------------------------------
// Homepage Context
// ----------------------------------------------------------

function getHomepageContext(): string {
  // Try to load dynamic context from i18n files for maximum accuracy
  try {
    const translationPath = path.resolve(process.cwd(), 'src/i18n/locales/en/translation.json');
    const data = JSON.parse(readFileSync(translationPath, 'utf-8'));
    
    const solutions = (data.solutions?.items || [])
      .map((s: any) => `- ${s.title}: ${s.description}`)
      .join('\n');

    const caseStudies = (data.caseStudies?.items || [])
      .map((cs: any) => `- ${cs.title} [${cs.category}]: ${cs.description}`)
      .join('\n');

    const courses = (data.courses?.items || [])
      .map((c: any) => `- ${c.title} (${c.level}, ${c.duration}, ${c.format}): ${c.description}`)
      .join('\n');

    const features = (data.features?.items || {});
    const featuresList = Object.values(features)
      .map((f: any) => `- ${f.title}: ${f.description}`)
      .join('\n');

    return `The visitor is on the Robles.AI homepage. Robles.AI provides robust artificial intelligence solutions that transform businesses with cutting-edge AI technology.

AI Solutions Offered:
${solutions}

Case Studies (proven results):
${caseStudies}

AI Education & Training Courses:
${courses}

Why Choose Robles.AI:
${featuresList || `- Innovation-Driven: Implementing cutting-edge AI research into practical solutions.
- Ethically Developed: Building AI with integrity, ensuring solutions that are fair and transparent.
- Rapid Deployment: AI solutions from concept to production faster than traditional methods.
- Industry Expertise: Deep domain knowledge across healthcare, manufacturing, finance, and retail.`}

Company Info:
- Robles.AI serves businesses in Latin America and the United States
- CEO: Antonio Robles Luna (LinkedIn: https://www.linkedin.com/in/antonio-robles-luna/)
- The company offers AI diagnosis, prioritization, and implementation in measurable stages
- Contact: Available via the chat, WhatsApp, or the contact form on the website
- Social media: Facebook (RoblesAITech), Instagram (robles.ai), LinkedIn (antonio-robles-luna)`;
  } catch {
    // Fallback to hardcoded context if i18n files can't be read
    return `The visitor is on the Robles.AI homepage. Robles.AI provides robust artificial intelligence solutions that transform businesses with cutting-edge AI technology.

Services and Solutions:
- Machine Learning Models: Custom ML solutions for predictive analytics, recommendation systems, and process optimization.
- Computer Vision Systems: Image and video analysis for object detection, facial recognition, and visual quality control.
- Natural Language Processing: Text analysis, sentiment detection, and conversational AI for customer service and content analysis.
- Deep Learning Systems: Advanced neural networks for complex pattern recognition, anomaly detection, and autonomous decision-making.

Case Studies:
- Smart City Security Surveillance System [Smart Cities]: Citywide computer vision system that reduced crime by 27% and improved emergency response times by 42%.
- Predictive Analytics for Patient Care [Healthcare]: ML system that predicts patient readmission risks with 87% accuracy, reducing readmissions by 23%.
- Fraud Detection for Financial Services [Finance]: AI system with 99.2% accuracy, saving $4.5M annually in fraud losses.
- AI Chatbot for Customer Service [Generative AI]: Generative AI assistant handling 78% of customer inquiries without human intervention.

AI Courses:
- PyTorch Deep Learning (Intermediate, 10 Weeks, Online) - $1,595
- TensorFlow for Production (Advanced, 12 Weeks, Online) - $1,995
- Hugging Face Transformers (Intermediate, 8 Weeks, Online)
- Computer Vision with OpenCV (Beginner, 6 Weeks, Online)

Why Robles.AI:
- Innovation-Driven, Ethically Developed, Rapid Deployment, Industry Expertise

Company Info:
- CEO: Antonio Robles Luna
- Serves Latin America and the United States
- Social media: Facebook (RoblesAITech), Instagram (robles.ai), LinkedIn (antonio-robles-luna)`;
  }
}

// ----------------------------------------------------------
// Blog Context
// ----------------------------------------------------------

async function getBlogContext(slug: string): Promise<string> {
  try {
    const postData = await readBlogPost(slug);
    if (!postData) {
      return `The visitor is reading a blog article on the Robles.AI News Center, but the specific article content could not be loaded. The blog covers topics in AI, machine learning, computer vision, and data science.`;
    }

    // Use English translation by default, fall back to any available
    const translation = postData.translations?.en || postData.translations?.es;
    if (!translation) {
      return `The visitor is reading a blog article on the Robles.AI News Center.`;
    }

    const title = translation.title;
    const excerpt = translation.excerpt || '';
    const contentSections = (translation.content || [])
      .map((section: { heading: string; body: string }) =>
        `## ${section.heading}\n${section.body}`
      )
      .join('\n\n');

    const categories = (postData.categories || []).join(', ');

    return `The visitor is reading the following blog article on the Robles.AI News Center:

Title: ${title}
${excerpt ? `Summary: ${excerpt}` : ''}
${categories ? `Categories: ${categories}` : ''}

Article Content:
${contentSections}`.trim();
  } catch (error) {
    console.warn('[ChatContext] Failed to load blog post context:', error);
    return `The visitor is reading a blog article on the Robles.AI News Center. The blog covers topics in AI, machine learning, computer vision, and data science.`;
  }
}

/**
 * Reads a blog post JSON file from the filesystem.
 * Supports the date-based directory structure: server/data/posts/YYYY/MM/DD/slug.json
 */
async function readBlogPost(slug: string): Promise<any | null> {
  const postsDir = path.resolve(process.cwd(), 'server/data/posts');

  // Extract date parts from the slug (format: YYYY-MM-DD-HH-MM-SS-title-words)
  const dateMatch = slug.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!dateMatch) {
    return null;
  }

  const [, yyyy, mm, dd] = dateMatch;
  const dayDir = path.join(postsDir, yyyy, mm, dd);

  // Try exact match first
  const exactPath = path.join(dayDir, `${slug}.json`);
  try {
    const data = await fs.readFile(exactPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    // Exact match failed, try fuzzy match by prefix
  }

  // Fallback: look for a file that starts with the same date-time prefix
  try {
    const files = await fs.readdir(dayDir);
    const prefix = slug.slice(0, 19); // YYYY-MM-DD-HH-MM-SS
    const match = files.find((f) => f.startsWith(prefix) && f.endsWith('.json'));

    if (match) {
      const data = await fs.readFile(path.join(dayDir, match), 'utf-8');
      return JSON.parse(data);
    }
  } catch {
    // Directory or files not accessible
  }

  return null;
}

// ----------------------------------------------------------
// Demo Pages Context
// ----------------------------------------------------------

function getDemoContext(pagePath: string): string {
  const demoDescriptions: Record<string, string> = {
    '/try-identity': `The visitor is on the Identity Verification Demo page. This demo allows users to test Robles.AI's Identity Verification API by uploading a selfie and an identification document. The system uses computer vision and facial recognition to verify identity by comparing the face in the selfie against the photo on the document, providing match results with confidence scores.`,

    '/try-langchain': `The visitor is on the LangChain Full-Stack Demo page. This demo showcases Robles.AI's capabilities with LangChain integration, offering three modes: RAG (Retrieval Augmented Generation) with document upload, Agent with Tools, and JSON Structured output. Users can upload documents, ask questions, and see how AI agents process information using different strategies.`,

    '/try-rag': `The visitor is on the RAG Pipeline Demo page. This demo walks users through a complete Retrieval Augmented Generation pipeline: uploading a PDF document, extracting text and generating chunks, creating embeddings and indexing them in a vector database (Pinecone), querying the vector DB, applying reranking (MonoT5 and BGE), and generating answers with multiple LLMs (Llama and GPT-4).`,

    '/try-medical': `The visitor is on the Medical AI Demo page. This demo allows users to analyze medical images using AI. Users select an imaging modality (such as X-ray, MRI, CT scan, or ultrasound) and upload clinical images for AI-powered diagnostic insights. The system provides analysis based on the selected modality and clinical focus area.`,
  };

  return demoDescriptions[pagePath] ||
    `The visitor is on a Robles.AI demo page where they can try AI-powered tools and services interactively.`;
}

// ----------------------------------------------------------
// Other Routes Context
// ----------------------------------------------------------

function getRouteDescription(pagePath: string): string {
  const routeDescriptions: Record<string, string> = {
    '/blog': `The visitor is browsing the Robles.AI News Center, which features daily AI and technology news articles covering machine learning, computer vision, NLP, deep learning, and business transformation topics.`,

    '/careers': `The visitor is on the Robles.AI Careers page, exploring open positions. Robles.AI is building AI solutions for businesses across Latin America and the United States.`,

    '/apply': `The visitor is on the Robles.AI job application page, submitting their application to join the team.`,

    '/get-started': `The visitor is on the "Get Started with AI" landing page. Robles.AI offers a proven process for AI/ML transformation: identifying opportunities, prioritizing by real impact, and implementing in measurable stages. Services include AI diagnosis, auditing, chatbot development, LLM integration, RAG pipelines, and custom ML solutions.`,

    '/otp': `The visitor is on a utility page for one-time password generation.`,
  };

  return routeDescriptions[pagePath] ||
    `The visitor is on the Robles.AI website (${pagePath}). Robles.AI provides AI and machine learning solutions for businesses.`;
}
