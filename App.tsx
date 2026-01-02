
import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Upload, 
  Waves, 
  Activity, 
  AlertCircle,
  Cpu,
  BarChart3,
  RefreshCcw,
  Zap
} from 'lucide-react';
import { AppState, AnalysisResult } from './types';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const performAnalysis = async (base64Data: string, mimeType: string, retryCount = 0) => {
    try {
      // Criação da instância com a chave do ambiente
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      
      // Flash é preferível para processamento de vídeo rápido e resiliente
      const modelName = 'gemini-3-flash-preview';

      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            { 
              text: `Analise este vídeo de surf como um técnico da elite WSL. 
              Extraia métricas biomecânicas e de performance.
              
              Retorne estritamente JSON:
              - score: nota de 0 a 10
              - summary: feedback técnico curto e impactante
              - posture: 5 métricas (subject: 'Joelho', 'Ombro', 'Quadril', 'Base', 'Cabeça', value: 0-10, fullMark: 10)
              - telemetry: 10 pontos de dados (time, flow: 0-100, power: 0-100)
              - maneuvers: lista de manobras (time: '00:00', name: string, execution: 0-10)
              - drills: 3 treinos recomendados (title, description, focus)` 
            },
            { inlineData: { data: base64Data, mimeType } }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              summary: { type: Type.STRING },
              posture: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    subject: { type: Type.STRING },
                    value: { type: Type.NUMBER },
                    fullMark: { type: Type.NUMBER },
                  },
                  required: ["subject", "value", "fullMark"],
                },
              },
              telemetry: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    time: { type: Type.STRING },
                    flow: { type: Type.NUMBER },
                    power: { type: Type.NUMBER },
                  },
                  required: ["time", "flow", "power"],
                },
              },
              maneuvers: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    time: { type: Type.STRING },
                    name: { type: Type.STRING },
                    execution: { type: Type.NUMBER },
                  },
                  required: ["time", "name", "execution"],
                },
              },
              drills: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    focus: { type: Type.STRING },
                  },
                  required: ["title", "description", "focus"],
                },
              },
            },
            required: ["score", "summary", "posture", "telemetry", "maneuvers", "drills"],
          }
        }
      });

      const textResponse = response.text;
      if (!textResponse) throw new Error("O modelo retornou uma resposta vazia.");

      const result = JSON.parse(textResponse) as AnalysisResult;
      setAnalysis(result);
      setState(AppState.COMPLETED);
    } catch (error: any) {
      console.error("Erro na API Gemini:", error);

      // Tratamento específico para erro de entidade/chave conforme documentação
      if (error.message?.includes("Requested entity was not found") || error.message?.includes("API key not valid")) {
        if (typeof window !== 'undefined' && (window as any).aistudio) {
          await (window as any).aistudio.openSelectKey();
          // Após abrir o seletor, tentamos novamente uma única vez
          if (retryCount < 1) return performAnalysis(base64Data, mimeType, retryCount + 1);
        }
      }

      // Tentativa de recuperação genérica
      if (retryCount < 1 && !error.message?.includes("safety")) {
        return performAnalysis(base64Data, mimeType, retryCount + 1);
      }

      let userFriendlyMsg = "Ocorreu um erro ao processar o vídeo. Tente um clipe mais curto (menos de 30s) ou em menor resolução.";
      
      if (error.message?.includes("exhausted")) {
        userFriendlyMsg = "Limite de requisições excedido. Aguarde alguns instantes.";
      } else if (error.message?.includes("safety")) {
        userFriendlyMsg = "O vídeo não pôde ser analisado por restrições de segurança do modelo.";
      }
      
      setErrorMessage(userFriendlyMsg);
      setState(AppState.ERROR);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vídeos maiores que 20MB costumam falhar no upload Base64 direto
    if (file.size > 20 * 1024 * 1024) {
      setErrorMessage("O arquivo é muito grande (Máx 20MB). Reduza a duração ou qualidade do vídeo.");
      setState(AppState.ERROR);
      return;
    }

    setState(AppState.UPLOADING);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = (reader.result as string).split(',')[1];
      setState(AppState.ANALYZING);
      performAnalysis(base64Data, file.type);
    };
    reader.onerror = () => {
      setErrorMessage("Erro ao ler o arquivo de vídeo.");
      setState(AppState.ERROR);
    };
    reader.readAsDataURL(file);
  };

  const reset = () => {
    setState(AppState.IDLE);
    setAnalysis(null);
    setVideoUrl(null);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <nav className="border-b border-white/5 bg-black/80 backdrop-blur-2xl sticky top-0 z-50 h-20">
        <div className="max-w-7xl mx-auto px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-cyan-500 p-2.5 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <Waves className="text-black" size={24} />
            </div>
            <div>
              <h1 className="text-2xl italic font-black uppercase tracking-tighter leading-none">
                SurfCoach <span className="text-cyan-400">IA</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                 <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></div>
                 <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.3em]">Neural Link Stable</p>
              </div>
            </div>
          </div>
          
          {state !== AppState.IDLE && (
            <button 
              onClick={reset}
              className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors flex items-center gap-2"
            >
              <RefreshCcw size={14} />
              New Analysis
            </button>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-12">
        {state === AppState.IDLE && (
          <div className="flex flex-col items-center justify-center min-h-[65vh] text-center">
             <div className="relative group cursor-pointer w-full max-w-lg" onClick={() => fileInputRef.current?.click()}>
                <div className="absolute -inset-4 bg-cyan-500/10 rounded-[4rem] blur-3xl opacity-50 group-hover:opacity-100 transition duration-700"></div>
                <div className="bg-[#0c0c0e] p-16 rounded-[3rem] border border-white/5 relative z-10 neon-border">
                   <div className="w-20 h-20 bg-cyan-500/10 rounded-3xl flex items-center justify-center mx-auto mb-10 border border-cyan-500/20">
                     <Zap className="text-cyan-400" size={40} />
                   </div>
                   <h2 className="text-4xl font-black italic uppercase mb-6 tracking-tighter">
                     Biomechanic <br /><span className="text-cyan-400">Engine</span>
                   </h2>
                   <p className="text-gray-500 text-sm mb-12 leading-relaxed font-medium uppercase tracking-widest px-6">
                     Análise profissional de fluxo, potência e postura via IA.
                   </p>
                   <button className="w-full bg-white text-black py-6 rounded-2xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:bg-cyan-400 transition-all shadow-xl text-xs">
                     <Upload size={20} />
                     Select Video
                   </button>
                   <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      accept="video/*" 
                      className="hidden" 
                   />
                </div>
             </div>
          </div>
        )}

        {(state === AppState.UPLOADING || state === AppState.ANALYZING) && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="relative mb-12">
              <div className="w-32 h-32 rounded-full border-[2px] border-cyan-500/10 border-t-cyan-400 animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <BarChart3 className="text-cyan-400 animate-pulse" size={40} />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-3xl font-black italic uppercase mb-3 tracking-tighter">
                {state === AppState.UPLOADING ? 'Uploading...' : 'Analyzing Flow...'}
              </h3>
              <p className="text-gray-500 text-sm font-medium uppercase tracking-widest animate-pulse">
                Calculating board trajectory and athlete positioning...
              </p>
            </div>
          </div>
        )}

        {state === AppState.ERROR && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="bg-red-500/10 p-12 rounded-[3rem] border border-red-500/20 text-center max-w-md">
              <AlertCircle className="text-red-500 mx-auto mb-6" size={48} />
              <h3 className="text-2xl font-black uppercase italic mb-4">Analysis Interrupted</h3>
              <p className="text-gray-400 text-sm mb-8 leading-relaxed font-medium">
                {errorMessage}
              </p>
              <button 
                onClick={reset}
                className="w-full bg-white text-black py-4 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-500 hover:text-white transition-all"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {state === AppState.COMPLETED && analysis && videoUrl && (
          <Dashboard data={analysis} videoUrl={videoUrl} />
        )}
      </main>

      <footer className="border-t border-white/5 py-12 bg-black/50">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <Cpu className="text-cyan-500" size={16} />
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
              Gemini 3 Flash Multimodal Integration
            </p>
          </div>
          <p className="text-[10px] text-gray-700 font-bold uppercase tracking-[0.2em]">
            &copy; 2025 SurfCoach. Elite Training Systems.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
