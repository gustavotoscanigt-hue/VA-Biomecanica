
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Upload, 
  Waves, 
  Cpu, 
  RefreshCcw, 
  Zap, 
  CheckCircle2, 
  ShieldAlert, 
  Search,
  ChevronRight,
  Play
} from 'lucide-react';
import { AppState, AnalysisResult } from './types';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tenta garantir a conexão no momento do upload
  const prepareAI = async () => {
    if (window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
      }
    }
  };

  const extractFrames = async (file: File, frameCount: number = 18): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      
      const timeout = setTimeout(() => {
        URL.revokeObjectURL(url);
        reject(new Error("Vídeo muito longo. Use um clipe de até 15 segundos."));
      }, 40000);

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
                const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
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
          reject(err);
        }
      };
    });
  };

  const performAnalysis = async (contentParts: any[]) => {
    try {
      // Criamos a instância no exato momento da análise para evitar tokens expirados
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      
      // Upgrade para o modelo Pro conforme solicitado para plataforma de elite
      const modelName = 'gemini-3-pro-preview';

      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            { text: "Analise técnica profissional de surf. Avalie biomecânica (0-10), manobras, flow e power. Sugira 3 treinos de solo. Responda estritamente em JSON." },
            ...contentParts
          ]
        },
        config: {
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 4000 }, // Adicionada capacidade de raciocínio para análise profunda
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              summary: { type: Type.STRING },
              posture: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: { subject: { type: Type.STRING }, value: { type: Type.NUMBER }, fullMark: { type: Type.NUMBER } },
                  required: ["subject", "value", "fullMark"]
                }
              },
              telemetry: {
                type: Type.ARRAY,
                items: { type: Type.OBJECT, properties: { time: { type: Type.STRING }, flow: { type: Type.NUMBER }, power: { type: Type.NUMBER } } }
              },
              maneuvers: {
                type: Type.ARRAY,
                items: { type: Type.OBJECT, properties: { time: { type: Type.STRING }, name: { type: Type.STRING }, execution: { type: Type.NUMBER } } }
              },
              drills: {
                type: Type.ARRAY,
                items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, focus: { type: Type.STRING } } }
              }
            },
            required: ["score", "summary", "posture", "telemetry", "maneuvers", "drills"]
          }
        }
      });

      const text = response.text || "{}";
      const result = JSON.parse(text);
      setAnalysis(result);
      setState(AppState.COMPLETED);
    } catch (error: any) {
      console.error("Analysis Failure:", error);
      const msg = error.toString().toLowerCase();
      
      if (msg.includes("api key") || msg.includes("not found")) {
        setErrorMessage("Erro de conexão com o motor Google. Clique no botão abaixo para forçar a autorização.");
      } else {
        setErrorMessage("O vídeo não pôde ser analisado. Tente um ângulo mais aberto da onda.");
      }
      setState(AppState.ERROR);
    }
  };

  const handleUploadClick = async () => {
    await prepareAI();
    fileInputRef.current?.click();
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

  const resetApp = () => {
    setState(AppState.IDLE);
    setAnalysis(null);
    setVideoUrl(null);
    setErrorMessage('');
  };

  const forceReconnection = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setState(AppState.IDLE);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-cyan-500 selection:text-black">
      {/* NAVBAR */}
      <nav className="border-b border-white/5 bg-black/80 backdrop-blur-3xl h-20 flex items-center px-8 sticky top-0 z-[100]">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-cyan-500 p-2.5 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <Waves className="text-black" size={24} />
            </div>
            <div>
              <h1 className="text-2xl italic font-black uppercase tracking-tighter leading-none">SurfCoach <span className="text-cyan-400">IA</span></h1>
              <p className="text-[9px] font-black text-cyan-500/50 uppercase tracking-[0.4em] mt-1">Elite Performance Suite</p>
            </div>
          </div>
          
          {state !== AppState.IDLE && (
            <button 
              onClick={resetApp}
              className="group flex items-center gap-3 bg-white/5 hover:bg-white/10 px-6 py-3 rounded-2xl border border-white/10 transition-all active:scale-95"
            >
              <RefreshCcw size={16} className="group-hover:rotate-180 transition-transform duration-500 text-cyan-400" />
              <span className="text-[10px] font-black uppercase tracking-widest">Novo Treino</span>
            </button>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-12">
        {state === AppState.IDLE && (
          <div className="flex flex-col items-center justify-center min-h-[65vh] text-center">
             <div className="relative group w-full max-w-xl">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-[3.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                <div className="bg-[#0c0c0e] p-20 rounded-[3rem] border border-white/5 relative z-10">
                   <div className="w-20 h-20 bg-cyan-500/10 rounded-3xl flex items-center justify-center mx-auto mb-10 border border-cyan-500/20 shadow-inner">
                     <Zap className="text-cyan-400" size={40} />
                   </div>
                   <h2 className="text-5xl font-black italic uppercase mb-4 tracking-tighter leading-[0.9]">Análise<br /><span className="text-cyan-400">Pro-Level</span></h2>
                   <p className="text-gray-500 text-xs mb-14 uppercase tracking-[0.3em] font-bold">Inicie o diagnóstico neural biomecânico</p>
                   
                   <button 
                    onClick={handleUploadClick}
                    className="w-full bg-white text-black py-7 rounded-2xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:bg-cyan-400 transition-all text-xs shadow-2xl active:scale-[0.98]"
                   >
                     <Upload size={20} /> Upload do Vídeo
                   </button>
                   <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="video/*" className="hidden" />
                </div>
             </div>
          </div>
        )}

        {(state === AppState.UPLOADING || state === AppState.ANALYZING) && (
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <div className="relative mb-12">
               <div className="w-40 h-40 rounded-full border-[3px] border-cyan-500/10 border-t-cyan-400 animate-spin"></div>
               <div className="absolute inset-0 flex items-center justify-center">
                 {isOptimizing ? <Search className="text-cyan-400 animate-pulse" size={40} /> : <Cpu className="text-cyan-400 animate-bounce" size={40} />}
               </div>
            </div>
            <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-4">
              {isOptimizing ? 'Otimizando Frames...' : 'Processamento Neural Gemini 3 Pro...'}
            </h3>
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 bg-cyan-500 rounded-full animate-ping"></span>
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em]">Sincronizando com Servidores de Elite</p>
            </div>
          </div>
        )}

        {state === AppState.ERROR && (
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <div className="bg-red-500/5 p-16 rounded-[4rem] border border-red-500/20 text-center max-w-lg backdrop-blur-2xl shadow-2xl">
              <ShieldAlert className="text-red-500 mx-auto mb-8" size={64} />
              <h4 className="text-2xl font-black uppercase italic mb-6 tracking-tight text-white">Falha Crítica no Motor</h4>
              <p className="text-gray-400 text-sm mb-12 leading-relaxed font-medium">{errorMessage}</p>
              
              <div className="space-y-4">
                <button 
                  onClick={forceReconnection}
                  className="w-full bg-cyan-500 text-black py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-white transition-all shadow-lg active:scale-95"
                >
                  Forçar Reconexão Google
                </button>
                <button 
                  onClick={resetApp}
                  className="w-full bg-white/5 text-gray-400 py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:text-white transition-all"
                >
                  Tentar Outro Vídeo
                </button>
              </div>
            </div>
          </div>
        )}

        {state === AppState.COMPLETED && analysis && videoUrl && <Dashboard data={analysis} videoUrl={videoUrl} />}
      </main>

      <footer className="border-t border-white/5 py-16 bg-black/50">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-1.5 bg-cyan-500/10 rounded-full border border-cyan-500/20">
              <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">Gemini 3 Pro Active</p>
            </div>
          </div>
          <div className="flex gap-8 items-center">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">v7.2 Stable Production</p>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">&copy; 2025 SURFCOACH INTELLIGENCE</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
