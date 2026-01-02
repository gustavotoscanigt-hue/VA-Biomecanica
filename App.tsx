
import React, { useState, useRef } from 'react';
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
  Search
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
        reject(new Error("Erro ao processar vídeo. Tente um arquivo menor ou outro formato."));
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
                frames.push({ 
                  inlineData: { 
                    data: dataUrl.split(',')[1], 
                    mimeType: 'image/jpeg' 
                  } 
                });
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
      video.onerror = () => reject(new Error("Formato de vídeo não suportado."));
    });
  };

  const performAnalysis = async (contentParts: any[]) => {
    try {
      // Inicialização direta usando a chave do ambiente, sem perguntas ao usuário
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const modelName = 'gemini-3-pro-preview';

      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            { 
              text: "Você é um técnico de surf de elite. Analise biomecanicamente estes quadros. Foque em: base, centro de gravidade, projeção de braços e compressão nas curvas. Forneça o resultado rigorosamente no esquema JSON definido." 
            },
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
      console.error("Critical Neural Error:", error);
      setErrorMessage(error.message || "Falha na conexão neural. Tente novamente.");
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
    setIsOptimizing(false);
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
              <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.3em] mt-1">Direct Engine v5.0</p>
            </div>
          </div>
          {state !== AppState.IDLE && (
            <button onClick={reset} className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors flex items-center gap-2 px-6 py-2 bg-white/5 rounded-full hover:bg-white/10">
              <RefreshCcw size={14} /> New Session
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
                   <div className="w-20 h-20 bg-cyan-500/10 rounded-3xl flex items-center justify-center mx-auto mb-10 border border-cyan-500/20 group-hover:scale-110 transition-transform">
                     <Zap className="text-cyan-400" size={40} />
                   </div>
                   <h2 className="text-4xl font-black italic uppercase mb-6 tracking-tighter">
                     Surf <br /><span className="text-cyan-400">Intelligence</span>
                   </h2>
                   <p className="text-gray-500 text-sm mb-12 uppercase tracking-widest font-medium leading-relaxed">
                     Analise sua performance biomecânica <br /> instantaneamente.
                   </p>
                   <button className="w-full bg-white text-black py-6 rounded-2xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:bg-cyan-400 transition-all shadow-xl text-xs active:scale-95">
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
            <h3 className="text-3xl font-black italic uppercase mb-3 tracking-tighter text-center">
              {isOptimizing ? 'Extracting Frames...' : 'Processing Biomechanics...'}
            </h3>
            <p className="text-gray-500 text-sm font-medium uppercase tracking-widest animate-pulse text-center">
              Aguarde enquanto nossa IA avalia seu surf profissional...
            </p>
          </div>
        )}

        {state === AppState.ERROR && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="bg-red-500/10 p-12 rounded-[3rem] border border-red-500/20 text-center max-w-md backdrop-blur-md">
              <ShieldAlert className="text-red-500 mx-auto mb-6" size={56} />
              <h3 className="text-2xl font-black uppercase italic mb-4 tracking-tighter">Engine Error</h3>
              <p className="text-gray-400 text-sm mb-8 leading-relaxed font-medium">
                {errorMessage}
              </p>
              <button 
                onClick={reset}
                className="w-full bg-white text-black py-4 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-500 hover:text-white transition-all shadow-lg active:scale-95"
              >
                Restart Analysis
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
            <CheckCircle2 className="text-cyan-500" size={16} />
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
              G3 Pro Core | Biomechanic Engine Active
            </p>
          </div>
          <p className="text-[10px] text-gray-700 font-bold uppercase tracking-[0.2em]">
            &copy; 2025 SurfCoach Intelligence. No Barriers Mode.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
