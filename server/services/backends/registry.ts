/**
 * Declarative catalog of the demo backends (Cloud Run services) that the admin
 * portal manages. Names are the REAL project/service/subdomain values verified
 * against each sibling repo's AGENTS.md and the live `gcloud run services list`.
 *
 * The portal reads DNS/Cloud Run status per backend and can publish the CNAME
 * `<subdomain> → <cnameTarget>`. It never operates the service (read-only, v1).
 */
export interface BackendDef {
  id: string;
  label: string;
  /** CNAME record name (relative subdomain), e.g. "chatbot-api". */
  subdomain: string;
  publicUrl: string;
  cloudRunProject: string;
  cloudRunService: string;
  region: string;
  /** Overrides the global dns_cname_target if set. */
  cnameTarget?: string;
}

export const BACKENDS: BackendDef[] = [
  {
    id: 'chatbot',
    label: 'Chatbot — Tu chatbot en 60 segundos',
    subdomain: 'chatbot-api',
    publicUrl: 'https://chatbot-api.robles.ai',
    cloudRunProject: 'robles-ai-chatbot-project',
    cloudRunService: 'chatbot-api-server',
    region: 'us-central1',
  },
  {
    id: 'identity',
    label: 'Identity — Verificación de identidad',
    subdomain: 'identity-api',
    publicUrl: 'https://identity-api.robles.ai',
    cloudRunProject: 'robles-ai-identity-project',
    // NOTE: this service is "identity-server" (no -api suffix) — see DEMOS_PLAN §8.
    cloudRunService: 'identity-server',
    region: 'us-central1',
  },
  {
    id: 'rag',
    label: 'RAG — Pregúntale a tus documentos',
    subdomain: 'rag-api',
    publicUrl: 'https://rag-api.robles.ai',
    cloudRunProject: 'robles-ai-rag-project',
    cloudRunService: 'rag-api-server',
    region: 'us-central1',
  },
  {
    id: 'langchain',
    label: 'LangChain — Agente con herramientas',
    subdomain: 'langchain-api',
    publicUrl: 'https://langchain-api.robles.ai',
    cloudRunProject: 'robles-ai-langchain-project',
    cloudRunService: 'langchain-api-server',
    region: 'us-central1',
  },
  {
    id: 'transcription',
    label: 'Transcription — Voz a texto y diarización',
    subdomain: 'transcription-api',
    publicUrl: 'https://transcription-api.robles.ai',
    cloudRunProject: 'robles-ai-transcript-project',
    cloudRunService: 'transcription-api-server',
    region: 'us-central1',
  },
];

export function getBackend(id: string): BackendDef | undefined {
  return BACKENDS.find((b) => b.id === id);
}
