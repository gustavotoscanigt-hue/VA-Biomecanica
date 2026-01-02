
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
  Lock,
  ChevronRight
} from 'lucide-react';
import { AppState, AnalysisResult } from './types';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [isActivated, setIsActivated] = useState<boolean | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Verifica se o motor já está conectado ao iniciar
  useEffect(() => {
    const checkStatus = async () => {
      if (window.aistudio) {
        const active = await window.aistudio.hasSelectedApiKey();
        setIsActivated(active);
      } else {
        setIsActivated(!!process.env.API_KEY);
      }
    };
    checkStatus();
  }, []);

  const handleActivate = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setIsActivated(true);
    }
  };

  const extractFrames = async (file: File, frameCount: number = 15): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      
      const timeout = setTimeout(() => {
        URL.revokeObjectURL(url);
        reject(new Error("Processamento demorou muito. Tente um vídeo menor."));
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
          reject(err);
        }
      };
    });
  };

  const performAnalysis = async (contentParts: any[]) => {
    try {
      // Cria instância NO MOMENTO do uso para garantir que pegue a chave selecionada
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const modelName = 'gemini-3-flash-preview';

      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            { text: "Você é um juiz do CT da WSL e especialista em biomecânica. Analise os frames e forneça score técnico, telemetria de fluxo/power, identificação de manobras e 3 treinos específicos. Retorne RIGOROSAMENTE em JSON." },
            ...contentParts
          ]
        },
        config: {
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 0 },
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

      const result = JSON.parse(response.text || "{}");
      setAnalysis(result);
      setState(AppState.COMPLETED);
    } catch (error: any) {
      console.error("Critical Analysis Error:", error);
      const msg = error.toString().toLowerCase();
      if (msg.includes("not found") || msg.includes("api key")) {
        setIsActivated(false);
        setErrorMessage("Conexão com o motor de IA perdida. Por favor, reative o sistema.");
      } else {
        setErrorMessage("Falha no processamento neural. Tente um vídeo mais curto ou com melhor iluminação.");
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

  // TELA DE ATIVAÇÃO DE SISTEMA (CASO NÃO HAJA CHAVE)
  // Fix: Prevent narrowing isActivated to true|null by checking state !== AppState.ERROR
  // This allows the error message UI to render when isActivated is false due to an API error.
  if (isActivated === false && state !== AppState.ERROR) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#0c0c0e] rounded-[3rem] p-12 border border-cyan-500/20 text-center shadow-[0_0_50px_rgba(6,182,212,0.1)]">
          <div className="w-20 h-20 bg-cyan-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-cyan-500/20">
            <Lock className="text-cyan-400" size={32} />
          </div>
          <h2 className="text-3xl font-black italic uppercase mb-4 tracking-tighter">Ativação <br />do Motor IA</h2>
          <p className="text-gray-400 text-sm mb-10 leading-relaxed">
            Para iniciar análises profissionais, conecte seu projeto do Google AI Studio. Este passo é obrigatório para garantir o processamento biomecânico.
          </p>
          <button 
            onClick={handleActivate}
            className="w-full bg-cyan-500 text-black py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
          >
            Ativar Bio-Engine <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <nav className="border-b border-white/5 bg-black/80 backdrop-blur-2xl h-20 flex items-center px-8 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-cyan-500 p-2 rounded-xl">
              <Waves className="text-black" size={20} />
            </div>
            <div>
              <h1 className="text-xl italic font-black uppercase tracking-tighter leading-none">SurfCoach <span className="text-cyan-400">IA</span></h1>
              <span className="text-[8px] font-black text-gray-600 uppercase tracking-[0.3em]">Neural Engine Active</span>
            </div>
          </div>
          {state !== AppState.IDLE && (
            <button onClick={reset} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full transition-all">
              <RefreshCcw size={12} /> Novo Vídeo
            </button>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-12">
        {state === AppState.IDLE && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
             <div className="relative group cursor-pointer w-full max-w-lg" onClick={() => fileInputRef.current?.click()}>
                <div className="absolute -inset-2 bg-cyan-500/20 rounded-[4rem] blur-2xl opacity-0 group-hover:opacity-100 transition duration-500"></div>
                <div className="bg-[#0c0c0e] p-16 rounded-[3rem] border border-white/5 relative z-10 transition-all group-hover:border-cyan-500/30">
                   <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center mx-auto mb-10 border border-cyan-500/20 group-hover:scale-110 transition-transform">
                     <Zap className="text-cyan-400" size={32} />
                   </div>
                   <h2 className="text-4xl font-black italic uppercase mb-6 tracking-tighter">Performance <br /><span className="text-cyan-400">Elite</span></h2>
                   <p className="text-gray-500 text-sm mb-12 uppercase tracking-[0.2em] font-bold">Pronto para Análise Biomecânica</p>
                   <button className="w-full bg-white text-black py-6 rounded-2xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:bg-cyan-400 transition-all text-xs shadow-xl">
                     <Upload size={18} /> Carregar Vídeo
                   </button>
                   <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="video/*" className="hidden" />
                </div>
             </div>
          </div>
        )}

        {(state === AppState.UPLOADING || state === AppState.ANALYZING) && (
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <div className="relative mb-12">
               <div className="w-32 h-32 rounded-full border-2 border-cyan-500/10 border-t-cyan-400 animate-spin"></div>
               <div className="absolute inset-0 flex items-center justify-center">
                 {isOptimizing ? <Search className="text-cyan-400 animate-pulse" size={28} /> : <Cpu className="text-cyan-400 animate-bounce" size={28} />}
               </div>
            </div>
            <h3 className="text-2xl font-black italic uppercase tracking-tighter">
              {isOptimizing ? 'Otimizando Sequência...' : 'Processamento Neural...'}
            </h3>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mt-3 animate-pulse">Aguarde a resposta do servidor elite</p>
          </div>
        )}

        {state === AppState.ERROR && (
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <div className="bg-red-500/5 p-12 rounded-[3rem] border border-red-500/20 text-center max-w-md backdrop-blur-xl">
              <ShieldAlert className="text-red-500 mx-auto mb-6" size={48} />
              <h4 className="text-xl font-black uppercase italic mb-4">Falha no Sistema</h4>
              <p className="text-gray-400 text-sm mb-8 leading-relaxed font-medium">{errorMessage}</p>
              {/* Fix: isActivated is no longer narrowed here, so these comparisons are valid */}
              <button 
                onClick={isActivated === false ? handleActivate : reset}
                className="w-full bg-white text-black py-4 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-500 hover:text-white transition-all shadow-lg"
              >
                {isActivated === false ? 'Reativar Motor' : 'Tentar Novamente'}
              </button>
            </div>
          </div>
        )}

        {state === AppState.COMPLETED && analysis && videoUrl && <Dashboard data={analysis} videoUrl={videoUrl} />}
      </main>

      <footer className="border-t border-white/5 py-12 bg-black">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6 opacity-50">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-cyan-500" size={14} />
            <p className="text-[9px] font-black uppercase tracking-widest">Flash Engine Active | v6.1</p>
          </div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em]">&copy; 2025 SurfCoach Intelligence</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
