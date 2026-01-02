
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Upload, 
  Waves, 
  Cpu, 
  BarChart3, 
  RefreshCcw, 
  Zap, 
  CheckCircle2, 
  ShieldAlert, 
  Search,
  Lock,
  ExternalLink
} from 'lucide-react';
import { AppState, AnalysisResult } from './types';
import Dashboard from './components/Dashboard';

// Fix: Declaring AIStudio and window.aistudio correctly to match existing global definitions and modifiers.
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    readonly aistudio: AIStudio;
  }
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Verifica se a chave de API já foi selecionada ao carregar o app
  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      } else {
        // Fallback para ambientes onde o aistudio não está presente (ex: dev local padrão)
        setHasApiKey(!!process.env.API_KEY);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      // Após o trigger, assumimos que o usuário selecionou ou está em processo
      setHasApiKey(true);
    }
  };

  const extractFrames = async (file: File, frameCount: number = 16): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      
      const timeout = setTimeout(() => {
        URL.revokeObjectURL(url);
        reject(new Error("Timeout ao processar vídeo. Tente um arquivo menor."));
      }, 30000);

      video.onloadedmetadata = async () => {
        try {
          const frames: any[] = [];
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { alpha: false });
          canvas.width = 1280;
          canvas.height = 720;

          for (let i = 0; i < frameCount; i++) {
            const time = (video.duration / (frameCount + 1)) * (i + 1);
            video.currentTime = time;
            await new Promise((res) => {
              const onSeeked = () => {
                ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                frames.push({ inlineData: { data: dataUrl.split(',')[1], mimeType: 'image/jpeg' } });
                video.removeEventListener('seeked', onSeeked);
                res(true);
              };
              video.addEventListener('seeked', onSeeked);
            });
          }
          clearTimeout(timeout);
          URL.revokeObjectURL(url);
          resolve(frames);
        } catch (err) {
          clearTimeout(timeout);
          URL.revokeObjectURL(url);
          reject(err);
        }
      };
    });
  };

  const performAnalysis = async (contentParts: any[]) => {
    try {
      // Cria instância nova a cada chamada para garantir o uso da chave mais recente do diálogo
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const modelName = 'gemini-3-pro-preview';

      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            { text: "Analise a técnica de surf nesta sequência. Forneça pontuação técnica e biomecânica." },
            ...contentParts
          ]
        },
        config: {
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 16384 },
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
                    fullMark: { type: Type.NUMBER }
                  },
                  required: ["subject", "value", "fullMark"]
                }
              },
              telemetry: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    time: { type: Type.STRING },
                    flow: { type: Type.NUMBER },
                    power: { type: Type.NUMBER }
                  },
                  required: ["time", "flow", "power"]
                }
              },
              maneuvers: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    time: { type: Type.STRING },
                    name: { type: Type.STRING },
                    execution: { type: Type.NUMBER }
                  },
                  required: ["time", "name", "execution"]
                }
              },
              drills: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    focus: { type: Type.STRING }
                  },
                  required: ["title", "description", "focus"]
                }
              }
            },
            required: ["score", "summary", "posture", "telemetry", "maneuvers", "drills"]
          }
        }
      });

      const rawText = response.text || "";
      let jsonContent = rawText.trim();
      const firstBrace = jsonContent.indexOf('{');
      const lastBrace = jsonContent.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonContent = jsonContent.substring(firstBrace, lastBrace + 1);
      }

      setAnalysis(JSON.parse(jsonContent));
      setState(AppState.COMPLETED);
    } catch (error: any) {
      console.error("Analysis Error:", error);
      const errorStr = error.toString().toLowerCase();
      
      // Se o erro for de API Key (não encontrado ou unauthorized), resetamos o estado de chave
      if (errorStr.includes("not found") || errorStr.includes("api key") || errorStr.includes("unauthorized")) {
        setHasApiKey(false);
        setErrorMessage("Sessão expirada ou chave inválida. Por favor, conecte seu projeto novamente.");
      } else {
        setErrorMessage(error.message || "Erro no processamento neural.");
      }
      setState(AppState.ERROR);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setState(AppState.UPLOADING);
    setVideoUrl(URL.createObjectURL(file));

    try {
      setIsOptimizing(true);
      const frames = await extractFrames(file);
      setIsOptimizing(false);
      setState(AppState.ANALYZING);
      await performAnalysis(frames);
    } catch (err: any) {
      setErrorMessage(err.message);
      setState(AppState.ERROR);
    }
  };

  const reset = () => {
    setState(AppState.IDLE);
    setAnalysis(null);
    setVideoUrl(null);
    setErrorMessage('');
  };

  // TELA DE SETUP DE CHAVE API
  if (hasApiKey === false) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-[#0c0c0e] p-12 rounded-[3rem] border border-cyan-500/20 text-center shadow-2xl">
          <div className="w-20 h-20 bg-cyan-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-cyan-500/20">
            <Lock className="text-cyan-400" size={32} />
          </div>
          <h2 className="text-3xl font-black italic uppercase mb-4 tracking-tighter">Acesso Seguro</h2>
          <p className="text-gray-400 text-sm mb-10 leading-relaxed font-medium">
            Para realizar análises biomecânicas profissionais, conecte seu projeto do Google AI Studio. 
            <br /><br />
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-cyan-400 underline inline-flex items-center gap-1">
              Saiba mais sobre faturamento <ExternalLink size={12} />
            </a>
          </p>
          <button 
            onClick={handleSelectKey}
            className="w-full bg-cyan-500 text-black py-5 rounded-2xl font-black uppercase tracking-[0.2em] hover:bg-white transition-all shadow-[0_0_30px_rgba(6,182,212,0.2)] text-xs"
          >
            Configurar Acesso IA
          </button>
        </div>
      </div>
    );
  }

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
              <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.3em] mt-1">PRO ENGINE v4.2</p>
            </div>
          </div>
          {state !== AppState.IDLE && (
            <button onClick={reset} className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full">
              <RefreshCcw size={14} /> Reset System
            </button>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-12">
        {state === AppState.IDLE && (
          <div className="flex flex-col items-center justify-center min-h-[65vh] text-center">
             <div className="relative group cursor-pointer w-full max-w-lg" onClick={() => fileInputRef.current?.click()}>
                <div className="absolute -inset-4 bg-cyan-500/10 rounded-[4rem] blur-3xl opacity-50 group-hover:opacity-100 transition duration-700"></div>
                <div className="bg-[#0c0c0e] p-16 rounded-[3rem] border border-white/5 relative z-10 neon-border group-hover:border-cyan-500/30 transition-all">
                   <div className="w-20 h-20 bg-cyan-500/10 rounded-3xl flex items-center justify-center mx-auto mb-10 border border-cyan-500/20">
                     <Zap className="text-cyan-400" size={40} />
                   </div>
                   <h2 className="text-4xl font-black italic uppercase mb-6 tracking-tighter">Biomechanic <br /><span className="text-cyan-400">Analysis</span></h2>
                   <p className="text-gray-500 text-sm mb-12 uppercase tracking-widest font-medium">Ready for Elite Performance</p>
                   <button className="w-full bg-white text-black py-6 rounded-2xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:bg-cyan-400 transition-all text-xs">
                     <Upload size={20} /> Upload Video
                   </button>
                   <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="video/*" className="hidden" />
                </div>
             </div>
          </div>
        )}

        {(state === AppState.UPLOADING || state === AppState.ANALYZING) && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="relative mb-12">
              <div className="w-40 h-40 rounded-full border-[3px] border-cyan-500/5 border-t-cyan-400 animate-spin"></div>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {isOptimizing ? <Search className="text-cyan-400 animate-pulse" size={32} /> : <Cpu className="text-cyan-400 animate-bounce" size={32} />}
              </div>
            </div>
            <h3 className="text-3xl font-black italic uppercase mb-3 tracking-tighter">
              {isOptimizing ? 'Extracting Data...' : 'Neural Processing...'}
            </h3>
            <p className="text-gray-500 text-sm font-medium uppercase tracking-widest animate-pulse">Aguarde a análise da técnica...</p>
          </div>
        )}

        {state === AppState.ERROR && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="bg-red-500/10 p-12 rounded-[3rem] border border-red-500/20 text-center max-w-md">
              <ShieldAlert className="text-red-500 mx-auto mb-6" size={56} />
              <h3 className="text-2xl font-black uppercase italic mb-4">Analysis Failed</h3>
              <p className="text-gray-400 text-sm mb-8 leading-relaxed">{errorMessage}</p>
              <button onClick={reset} className="w-full bg-white text-black py-4 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-500 hover:text-white transition-all">
                Try Again
              </button>
            </div>
          </div>
        )}

        {state === AppState.COMPLETED && analysis && videoUrl && <Dashboard data={analysis} videoUrl={videoUrl} />}
      </main>

      <footer className="border-t border-white/5 py-12 bg-black/50">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-cyan-500" size={16} />
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
              G3 Pro Core | Biomechanic Engine Active
            </p>
          </div>
          <p className="text-[10px] text-gray-700 font-bold uppercase tracking-[0.2em]">&copy; 2025 SurfCoach Intelligence.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
