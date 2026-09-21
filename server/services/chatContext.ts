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

    const demos = (data.demosCatalog?.items || [])
      .map((d: any) => {
        const status = d.status === 'live' ? 'LIVE, try now' : 'coming soon';
        const path = d.href ? ` (${d.href})` : '';
        return `- ${d.title} [${d.modelType}] — ${status}${path}: ${d.description}`;
      })
      .join('\n');

    return `The visitor is on the Robles.AI homepage. Robles.AI provides robust artificial intelligence solutions that transform businesses with cutting-edge AI technology.

AI Solutions Offered:
${solutions}

Interactive AI Demos (the "AI Demos Playground" — visitors can try these live in the browser with no signup, at /demos):
${demos}

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

    '/try-rag': `The visitor is on the RAG Pipeline Demo page ("Ask your documents"). The visitor uploads a PDF and it is prepared automatically: the text is extracted in the browser, chunked, embedded and indexed in a vector database (Pinecone). Then they just type a question (or pick a suggested one) and the pipeline runs on its own: vector search, reranking (MonoT5 and BGE) and answers from two LLMs (GPT-4 and Llama), with the source passages cited. A "Live RAG pipeline" timeline shows each step live with its duration; clicking a step shows its data (pages, chunks, retrieved and reranked passages with scores) and the real API requests and responses.`,

    '/try-medical': `The visitor is on the Medical AI Demo page. This demo is COMING SOON: they can browse the imaging modalities (X-ray, ultrasound, retina, dermatology, histopathology), but no image is analyzed yet and nothing is uploaded or stored. Do not claim it produces results. If they are interested in AI medical imaging for their clinic or use case, invite them to get in touch.`,

    '/try-object-detection': `The visitor is on the Object Detection Demo page. This demo runs a real-time object detection model (COCO-SSD on TensorFlow.js) entirely in the browser — no server involved. Users can use their live webcam or upload an image, and the model draws bounding boxes with labels and confidence scores over the 80 object classes it recognizes. Everything is processed locally, so the video/image never leaves the device.`,

    '/try-emotion': `The visitor is on the Facial Emotion Recognition Demo page. This demo uses face-api.js (TensorFlow.js) in the browser to detect faces, draw a 68-point facial landmark mesh, and classify facial expressions into 7 emotions (neutral, happy, sad, angry, surprised, fearful, disgusted) in real time via webcam or an uploaded image. All processing happens locally in the browser — no images or biometric data are sent to any server or stored.`,

    '/try-transcription': `The visitor is on the Speech-to-Text & Diarization Demo page. This live demo captures audio from the user's microphone and streams it over a WebSocket to a Deepgram-powered backend (Nova-3 model). Transcripts appear in real time with speaker diarization — each speaker is labelled separately. After recording, the user can run an AI analysis (POST /analyze) that detects the industry, assigns speaker roles, extracts a terminology map (basic and specialized forms of each term), and generates a structured summary. Audio is streamed through and not stored anywhere — nothing persists after the session ends. The demo runs at /try-transcription.`,
  };

  const base = demoDescriptions[pagePath] ||
    `The visitor is on a Robles.AI demo page where they can try AI-powered tools and services interactively.`;
  const angle = DEMO_BUSINESS_ANGLE[pagePath];
  if (!angle) return base;
  const guidance = DEMOS_WITH_CALCULATOR.has(pagePath) ? DEMO_SALES_GUIDANCE : DEMO_SALES_GUIDANCE_NO_CALC;
  return `${base}\n\nBusiness angle to lead with: ${angle}\n${guidance}`;
}

/**
 * What each live demo is worth to a business (DEMOS_PLAN.md §3.1). Robly leads
 * with this instead of the model's technical details.
 */
const DEMO_BUSINESS_ANGLE: Record<string, string> = {
  '/try-identity': 'customer onboarding / KYC in seconds — less manual review cost and fewer sign-up drop-offs. Fits banks, fintechs, insurers, telcos and marketplaces.',
  '/try-rag': '"ask your documents" — answers from PDFs, manuals and policies with the source cited, cutting search time and tier-1 support tickets. Fits support, legal, HR and operations.',
  '/try-langchain': 'an assistant that completes tasks (looks things up, calculates, fills in data), not just chats — repetitive back-office and customer-service work handled without a person. Our telco case study shows this kind of system can autonomously resolve up to 78% of requests.',
  '/try-transcription': 'automatic meeting and call notes — who said what, topics and key terms, ready when the call ends, saving hours of minute-writing and enabling call-center QA. Fits call centers, sales, healthcare and legal.',
  '/try-object-detection': 'cameras that count, detect and alert on their own — inventory counts, occupancy and safety. Fits retail, warehouses, manufacturing, logistics and cities. Our Smart City case study shows this kind of system can achieve up to 27% less crime and 42% faster emergency response.',
  '/try-emotion': 'aggregated, anonymous customer-experience measurement in stores or at events, without surveys. Do NOT suggest it for evaluating employees or students — emotion recognition is restricted in workplaces and education in some jurisdictions (e.g. the EU AI Act).',
};

const DEMOS_WITH_CALCULATOR = new Set([
  '/try-identity', '/try-rag', '/try-langchain', '/try-transcription', '/try-object-detection',
]);

const DEMO_SALES_GUIDANCE =
  'Near the end of the page there is a "How much would you save?" calculator: invite the visitor to enter their own monthly volume, minutes per unit, share automated and hourly cost to see hours freed and monthly/yearly savings. Then offer the free AI diagnostic at /diagnostico-ia or a conversation with the team to apply it to their company. Never promise specific savings figures — the calculator uses the visitor\'s own numbers, and only cite case-study figures with their "up to" wording.';

const DEMO_SALES_GUIDANCE_NO_CALC =
  'Offer the free AI diagnostic at /diagnostico-ia or a conversation with the team to apply it to their company. Never promise specific results.';

// ----------------------------------------------------------
// Other Routes Context
// ----------------------------------------------------------

function getRouteDescription(pagePath: string): string {
  const routeDescriptions: Record<string, string> = {
    '/blog': `The visitor is browsing the Robles.AI News Center, which features daily AI and technology news articles covering machine learning, computer vision, NLP, deep learning, and business transformation topics.`,

    '/careers': `The visitor is on the Robles.AI Careers page, exploring open positions. Robles.AI is building AI solutions for businesses across Latin America and the United States.`,

    '/apply': `The visitor is on the Robles.AI job application page, submitting their application to join the team.`,

    '/get-started': `The visitor is on the "Get Started with AI" landing page. Robles.AI offers a proven process for AI/ML transformation: identifying opportunities, prioritizing by real impact, and implementing in measurable stages. Services include AI diagnosis, auditing, chatbot development, LLM integration, RAG pipelines, and custom ML solutions.`,

    '/demos': `The visitor is on the "AI Demos Lab" — interactive AI demos they can try live in the browser with no signup, each framed around the money it saves or earns. Live now: Customer onboarding in seconds (identity verification, /try-identity), Ask your documents (RAG, /try-rag), Automatic meeting and call notes (speech-to-text + speaker diarization + AI analysis, /try-transcription), An assistant that does tasks (AI agent with tools, /try-langchain), Camera-based counting and inspection (object detection in the browser, /try-object-detection), and Customer experience without surveys (facial expression analysis in the browser, /try-emotion). Each live demo shows a business case and, where it applies, a "How much would you save?" calculator. Coming soon: Your chatbot in 60 seconds (paste your website URL, get a trained assistant), Invoices and documents to data in seconds, an AI voice receptionist, a live fraud simulator, demand forecasting from your own CSV, and a product photo studio. If a visitor is interested in a coming-soon demo or a custom one for their business, invite them to take the free diagnostic at /diagnostico-ia or get in touch.`,

    '/otp': `The visitor is on a utility page for one-time password generation.`,
  };

  return routeDescriptions[pagePath] ||
    `The visitor is on the Robles.AI website (${pagePath}). Robles.AI provides AI and machine learning solutions for businesses.`;
}
