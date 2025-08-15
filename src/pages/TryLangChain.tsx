import LangChainChat from "@/components/LangChainChat";
import LangChainFileUploader from "@/components/LangChainFileUploader";
import FileUploader from "@/components/LangChainFileUploader";

export default function TryLangChain(){
  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">LangChain Full-Stack Demo</h1>
      <LangChainFileUploader/>
      <LangChainChat/>
      <p className="text-xs opacity-70">Sube documentos y consulta con RAG o prueba el agente con tools.</p>
    </main>
  );
}