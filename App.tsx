
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
  Zap,
  CheckCircle2,
  ShieldAlert
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

  // Função robusta para extrair quadros mantendo a compatibilidade com arquivos gigantes
  const extractFrames = async (file: File, frameCount: number = 12): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const videoUrl = URL.createObjectURL(file);
      video.src = videoUrl;
      video.muted = true;
      video.playsInline = true;
      
      video.onloadedmetadata = async () => {
        try {
          const frames: any[] = [];
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { alpha: false });
          const duration = video.duration;
          
          // Resolução otimizada para Gemini Vision (proporção 16:9)
          canvas.width = 720;
          canvas.height = 405;

          for (let i = 0; i < frameCount; i++) {
            const time = (duration / (frameCount + 1)) * (i + 1);
            video.currentTime = time;
            
            await new Promise((res) => {
              const onSeeked = () => {
                ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
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
          URL.revokeObjectURL(videoUrl);
          resolve(frames);
        } catch (err) {
          reject(err);
        }
      };
      video.onerror = () => reject(new Error("Falha ao carregar codec de vídeo."));
    });
  };

  const performAnalysis = async (contentParts: any[]) => {
    try {
      // Fix: Use process.env.API_KEY directly in the constructor as per guidelines
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      
      // Fix: Upgraded to gemini-3-pro-preview for complex biomechanical reasoning tasks
      const modelName = 'gemini-3-pro-preview';

      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            { 
              text: `Atue como um juiz técnico da WSL. Analise esta sequência de surf e retorne um diagnóstico biomecânico de alta performance. Importante: Se houver apenas imagens, analise a progressão do movimento entre elas.` 
            },
            ...contentParts
          ]
        },
        config: {
          responseMimeType: "application/json",
          // Fix: Removed undocumented and incorrectly typed safetySettings. 
          // Recommended: Use responseSchema for robust JSON structure as per guidelines.
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

      // Fix: Extract text directly using .text property as per guidelines
      const rawText = response.text || "";
      if (!rawText) {
        throw new Error("O conteúdo foi bloqueado pelos filtros de segurança da API ou retornou vazio.");
      }

      const result = JSON.parse(rawText.trim());
      
      setAnalysis(result);
      setState(AppState.COMPLETED);
    } catch (error: any) {
      console.error("Critical Analysis Error:", error);
      
      let msg = "Erro no processamento neural. Tente um vídeo com melhor iluminação.";
      if (error.message?.includes("segurança") || error.message?.includes("blocked")) {
        msg = "O vídeo foi sinalizado pelos filtros de segurança. Tente outro ângulo.";
      } else if (error instanceof SyntaxError) {
        msg = "Falha na estrutura de dados da IA. Tente novamente.";
      }
      
      setErrorMessage(msg);
      setState(AppState.ERROR);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setState(AppState.UPLOADING);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);

    try {
      let contentParts = [];

      // Sempre otimizamos vídeos maiores que 10MB para garantir estabilidade absoluta
      if (file.size > 10 * 1024 * 1024) {
        setIsOptimizing(true);
        const frames = await extractFrames(file);
        contentParts = frames;
        setIsOptimizing(false);
      } else {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
        contentParts = [{ inlineData: { data: base64, mimeType: file.type } }];
      }

      setState(AppState.ANALYZING);
      await performAnalysis(contentParts);
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao carregar o arquivo de vídeo.");
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
              <div className="flex items-center gap-2 mt-1">
                 <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></div>
                 <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.3em]">Precision Core v3.0</p>
              </div>
            </div>
          </div>
          
          {state !== AppState.IDLE && (
            <button 
              onClick={reset}
              className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors flex items-center gap-2"
            >
              <RefreshCcw size={14} />
              Reset System
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
                     Universal <br /><span className="text-cyan-400">Surf Analysis</span>
                   </h2>
                   <p className="text-gray-500 text-sm mb-12 leading-relaxed font-medium uppercase tracking-widest px-6">
                     Suporte a arquivos de qualquer tamanho via Biomechanic Sampling.
                   </p>
                   <button className="w-full bg-white text-black py-6 rounded-2xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:bg-cyan-400 transition-all shadow-xl text-xs">
                     <Upload size={20} />
                     Upload Video
                   </button>
                   <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="video/*" className="hidden" />
                </div>
             </div>
          </div>
        )}

        {(state === AppState.UPLOADING || state === AppState.ANALYZING) && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="relative mb-12">
              <div className="w-32 h-32 rounded-full border-[2px] border-cyan-500/10 border-t-cyan-400 animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                {isOptimizing ? <Cpu className="text-cyan-400 animate-pulse" size={40} /> : <BarChart3 className="text-cyan-400 animate-pulse" size={40} />}
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-3xl font-black italic uppercase mb-3 tracking-tighter">
                {isOptimizing ? 'Optimizing Data...' : 'Neural Processing...'}
              </h3>
              <p className="text-gray-500 text-sm font-medium uppercase tracking-widest animate-pulse max-w-md mx-auto">
                {isOptimizing 
                  ? 'Preparando frames para análise de alta fidelidade sem limites...' 
                  : 'O modelo está avaliando seu posicionamento e manobras...'}
              </p>
            </div>
          </div>
        )}

        {state === AppState.ERROR && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="bg-red-500/10 p-12 rounded-[3rem] border border-red-500/20 text-center max-w-md">
              <ShieldAlert className="text-red-500 mx-auto mb-6" size={48} />
              <h3 className="text-2xl font-black uppercase italic mb-4">Neural Error</h3>
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
            <CheckCircle2 className="text-cyan-500" size={16} />
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
              Gemini 3 Pro | Robust Integration Enabled
            </p>
          </div>
          <p className="text-[10px] text-gray-700 font-bold uppercase tracking-[0.2em]">
            &copy; 2025 SurfCoach Intelligence.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
