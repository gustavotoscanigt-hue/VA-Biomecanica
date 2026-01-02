
import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Upload, 
  Waves, 
  RefreshCcw, 
  Zap, 
  Search,
  AlertCircle,
  Play
} from 'lucide-react';
import { AppState, AnalysisResult } from './types';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentVideoRef = useRef<File | null>(null);

  const extractFrames = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      
      const timeout = setTimeout(() => {
        URL.revokeObjectURL(url);
        reject(new Error("Timeout no processamento do vídeo."));
      }, 30000);

      video.onloadedmetadata = async () => {
        const frames: any[] = [];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 640;
        canvas.height = 360;

        try {
          for (let i = 0; i < 12; i++) {
            video.currentTime = (video.duration / 13) * (i + 1);
            await new Promise(r => {
              const onSeeked = () => {
                ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
                frames.push({ 
                  inlineData: { 
                    data: canvas.toDataURL('image/jpeg', 0.5).split(',')[1], 
                    mimeType: 'image/jpeg' 
                  } 
                });
                video.removeEventListener('seeked', onSeeked);
                r(true);
              };
              video.addEventListener('seeked', onSeeked);
            });
          }
          clearTimeout(timeout);
          URL.revokeObjectURL(url);
          resolve(frames);
        } catch (e) {
          reject(e);
        }
      };
      video.onerror = () => reject("Erro ao carregar vídeo.");
    });
  };

  const runAnalysis = async (file: File) => {
    setError(null);
    setState(AppState.UPLOADING);
    currentVideoRef.current = file;
    
    try {
      const frames = await extractFrames(file);
      setState(AppState.ANALYZING);

      // Instanciação agressiva: cria uma nova conexão toda vez para evitar cache de erro
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { text: "Você é um analista de performance da WSL. Analise biomecânica, manobras e fluxo. Retorne RIGOROSAMENTE um JSON com score (0-10), postura, telemetria, manobras e 3 drills de treino." },
            ...frames
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

      const result = JSON.parse(response.text || '{}');
      setAnalysis(result);
      setState(AppState.COMPLETED);
    } catch (err: any) {
      console.error("Erro na análise:", err);
      const errorMsg = err.toString().toLowerCase();
      
      // Se for erro de chave ou entidade não encontrada, forçamos o seletor e voltamos ao IDLE
      if (errorMsg.includes("not found") || errorMsg.includes("api key") || errorMsg.includes("403") || errorMsg.includes("401")) {
        if (window.aistudio) {
          await window.aistudio.openSelectKey();
          setError("A conexão foi reiniciada. Por favor, tente o upload novamente agora que a chave foi validada.");
        } else {
          setError("Erro de autorização. Verifique sua chave no Google AI Studio.");
        }
      } else {
        setError("Não conseguimos analisar este vídeo. Tente um arquivo menor ou com mais luz.");
      }
      setState(AppState.IDLE);
    }
  };

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoUrl(URL.createObjectURL(file));
      runAnalysis(file);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <nav className="h-20 border-b border-white/5 flex items-center px-8 justify-between bg-black/80 backdrop-blur-2xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-500 p-2 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            <Waves className="text-black" size={20} />
          </div>
          <h1 className="font-black italic uppercase text-xl tracking-tighter">SurfCoach <span className="text-cyan-400">IA</span></h1>
        </div>
        {(state !== AppState.IDLE || analysis) && (
          <button 
            onClick={() => { setState(AppState.IDLE); setAnalysis(null); setError(null); }} 
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-white transition-all bg-white/5 px-4 py-2 rounded-full border border-white/10"
          >
            <RefreshCcw size={14} /> Novo Vídeo
          </button>
        )}
      </nav>

      <main className="max-w-7xl mx-auto p-8">
        {state === AppState.IDLE && !analysis && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full max-w-xl bg-gradient-to-b from-[#0c0c0e] to-black border border-white/5 rounded-[4rem] p-24 text-center cursor-pointer hover:border-cyan-500/30 transition-all group relative overflow-hidden shadow-2xl"
            >
              <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-24 h-24 bg-cyan-500/10 rounded-3xl flex items-center justify-center mx-auto mb-10 border border-cyan-500/20 group-hover:scale-110 transition-transform shadow-inner">
                <Zap className="text-cyan-400" size={40} />
              </div>
              <h2 className="text-5xl font-black italic uppercase tracking-tighter mb-4 leading-none">Surf <br /><span className="text-cyan-400">Intelligence</span></h2>
              <p className="text-gray-500 text-[10px] mb-12 font-black uppercase tracking-[0.4em]">Pronto para análise biomecânica</p>
              
              <div className="inline-flex items-center gap-4 bg-white text-black px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-cyan-400 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.5)] active:scale-95">
                <Upload size={18} /> Carregar Clip
              </div>
              <input type="file" ref={fileInputRef} onChange={onFileChange} accept="video/*" className="hidden" />
            </div>
            
            {error && (
              <div className="mt-10 flex flex-col items-center gap-4">
                <div className="flex items-center gap-3 bg-red-500/5 text-red-400 px-8 py-5 rounded-3xl border border-red-500/20 text-xs font-bold backdrop-blur-md">
                  <AlertCircle size={20} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[10px] font-black uppercase tracking-widest text-cyan-400 hover:text-white underline transition-all"
                >
                  Tentar upload novamente
                </button>
              </div>
            )}
          </div>
        )}

        {(state === AppState.UPLOADING || state === AppState.ANALYZING) && (
          <div className="flex flex-col items-center justify-center min-h-[55vh]">
            <div className="relative mb-12">
               <div className="w-32 h-32 border-[3px] border-cyan-500/10 border-t-cyan-400 rounded-full animate-spin"></div>
               <div className="absolute inset-0 flex items-center justify-center">
                 <Search className="text-cyan-400 animate-pulse" size={32} />
               </div>
            </div>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-4 text-center">
              {state === AppState.UPLOADING ? 'Extraindo Frames...' : 'Análise Biomecânica IA...'}
            </h2>
            <div className="flex items-center gap-3 opacity-50">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping"></span>
              <p className="text-[10px] font-black uppercase tracking-[0.5em]">Processando dados de elite</p>
            </div>
          </div>
        )}

        {state === AppState.COMPLETED && analysis && videoUrl && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <Dashboard data={analysis} videoUrl={videoUrl} />
          </div>
        )}
      </main>

      <footer className="py-12 border-t border-white/5 opacity-30 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.4em]">SurfCoach Neural Engine | 2025</p>
      </footer>
    </div>
  );
};

export default App;
