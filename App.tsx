
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

  // Sistema de extração de frames aprimorado com verificação de prontidão
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
        reject(new Error("Timeout ao processar vídeo. Tente um arquivo menor ou outro formato."));
      }, 30000);

      video.onloadedmetadata = async () => {
        try {
          const frames: any[] = [];
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
          const duration = video.duration;
          
          // Resolução HD para clareza biomecânica
          canvas.width = 1280;
          canvas.height = 720;

          for (let i = 0; i < frameCount; i++) {
            // Distribuição linear dos frames ignorando o início/fim extremo
            const time = (duration / (frameCount + 1)) * (i + 1);
            video.currentTime = time;
            
            await new Promise((res) => {
              const onSeeked = () => {
                ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
                // Qualidade 0.7 para manter detalhes sem estourar o limite de payload
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
      video.onerror = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(url);
        reject(new Error("O formato do vídeo não é suportado pelo seu navegador."));
      };
    });
  };

  const performAnalysis = async (contentParts: any[]) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      
      // Gemini 3 Pro é essencial para raciocínio biomecânico complexo
      const modelName = 'gemini-3-pro-preview';

      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            { 
              text: "Analise a técnica de surf nestes quadros/vídeo. Identifique o surfista, avalie o posicionamento do tronco, compressão de pernas e projeção de manobras. Seja crítico e técnico como um treinador olímpico." 
            },
            ...contentParts
          ]
        },
        config: {
          systemInstruction: `Você é o SurfCoach AI, um sistema de elite para análise de performance da WSL.
          Sua tarefa é analisar sequências de surf e fornecer dados precisos.
          REGRAS CRÍTICAS:
          1. SEMPRE responda em formato JSON puro.
          2. Use o esquema fornecido rigorosamente.
          3. Em 'posture', avalie: 'Base', 'Tronco', 'Braços', 'Olhar', 'Compressão'.
          4. Em 'telemetry', crie 10 pontos de dados baseados na fluidez do movimento observado.
          5. Ignore qualquer conteúdo não relacionado a surf, mas seja permissivo com esportes aquáticos legítimos.`,
          responseMimeType: "application/json",
          // Adicionamos thinkingBudget para permitir que o modelo 'pense' antes de gerar o JSON biomecânico
          thinkingConfig: { thinkingBudget: 16384 },
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER, description: "Nota de 0.0 a 10.0" },
              summary: { type: Type.STRING, description: "Feedback técnico executivo" },
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
      if (!rawText) {
        throw new Error("A IA não conseguiu processar os quadros. Tente um vídeo com o surfista mais próximo da câmera.");
      }

      // Extrator de JSON ultra-robusto: busca o primeiro '{' e o último '}' 
      // para evitar falhas caso a IA retorne markdown acidentalmente
      let jsonContent = rawText.trim();
      const firstBrace = jsonContent.indexOf('{');
      const lastBrace = jsonContent.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonContent = jsonContent.substring(firstBrace, lastBrace + 1);
      }

      try {
        const result = JSON.parse(jsonContent);
        setAnalysis(result);
        setState(AppState.COMPLETED);
      } catch (e) {
        console.error("JSON Parse Error. Raw text:", rawText);
        throw new Error("Falha na sincronização de dados. O motor neural gerou uma resposta malformada.");
      }
      
    } catch (error: any) {
      console.error("Neural Processing Error:", error);
      
      let msg = "Erro no motor neural. Certifique-se de que o vídeo mostra claramente as manobras.";
      
      const errorStr = error.toString().toLowerCase();
      if (errorStr.includes("safety") || errorStr.includes("blocked") || errorStr.includes("candidate")) {
        msg = "Análise interrompida por filtros de segurança. Tente um vídeo puramente esportivo.";
      } else if (errorStr.includes("quota") || errorStr.includes("limit")) {
        msg = "Limite de análise atingido para este período. Tente novamente em alguns instantes.";
      } else if (errorStr.includes("api key") || errorStr.includes("unauthorized")) {
        msg = "Chave de acesso inválida ou expirada. Verifique as configurações.";
      } else if (error.message) {
        msg = error.message;
      }
      
      setErrorMessage(msg);
      setState(AppState.ERROR);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset de estados anteriores
    setAnalysis(null);
    setErrorMessage('');
    setIsOptimizing(false);
    
    setState(AppState.UPLOADING);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);

    try {
      let contentParts = [];

      // Otimização forçada para todos os vídeos via frames para garantir sucesso em 100% dos casos
      setIsOptimizing(true);
      const frames = await extractFrames(file);
      contentParts = frames;
      setIsOptimizing(false);

      setState(AppState.ANALYZING);
      await performAnalysis(contentParts);
    } catch (err: any) {
      console.error("File Upload Handling Error:", err);
      setErrorMessage(err.message || "Erro crítico ao preparar o vídeo para análise.");
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
                 <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.3em]">PRO ENGINE ACTIVE</p>
              </div>
            </div>
          </div>
          
          {state !== AppState.IDLE && (
            <button 
              onClick={reset}
              className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full hover:bg-white/10"
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
                <div className="bg-[#0c0c0e] p-16 rounded-[3rem] border border-white/5 relative z-10 neon-border group-hover:border-cyan-500/30 transition-all">
                   <div className="w-20 h-20 bg-cyan-500/10 rounded-3xl flex items-center justify-center mx-auto mb-10 border border-cyan-500/20 group-hover:scale-110 transition-transform">
                     <Zap className="text-cyan-400" size={40} />
                   </div>
                   <h2 className="text-4xl font-black italic uppercase mb-6 tracking-tighter">
                     Biomechanic <br /><span className="text-cyan-400">Analysis</span>
                   </h2>
                   <p className="text-gray-500 text-sm mb-12 leading-relaxed font-medium uppercase tracking-widest px-6">
                     Powered by Gemini 3 Pro with Thinking Reasoning.
                   </p>
                   <button className="w-full bg-white text-black py-6 rounded-2xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:bg-cyan-400 transition-all shadow-xl text-xs active:scale-95">
                     <Upload size={20} />
                     Upload Any Clip
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
                {isOptimizing ? (
                  <Search className="text-cyan-400 animate-pulse mb-1" size={32} />
                ) : (
                  <Cpu className="text-cyan-400 animate-bounce mb-1" size={32} />
                )}
                <span className="text-[10px] font-black text-cyan-400 tracking-tighter uppercase">AI Active</span>
              </div>
            </div>
            <div className="text-center max-w-xl">
              <h3 className="text-3xl font-black italic uppercase mb-3 tracking-tighter">
                {isOptimizing ? 'Extracting Frames...' : 'Analyzing Posture...'}
              </h3>
              <div className="flex flex-col gap-2">
                <p className="text-gray-500 text-sm font-medium uppercase tracking-widest animate-pulse px-10">
                  {isOptimizing 
                    ? 'Preparando quadros de alta fidelidade para o motor de biomecânica...' 
                    : 'A IA está processando as imagens para identificar centro de gravidade e ângulos de manobra...'}
                </p>
                <div className="mt-6 flex gap-2 justify-center">
                   <div className="h-1 w-12 bg-cyan-500/20 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500 animate-[loading_1.5s_infinite_ease-in-out]"></div>
                   </div>
                   <div className="h-1 w-12 bg-cyan-500/20 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500 animate-[loading_1.5s_infinite_0.2s_infinite_ease-in-out]"></div>
                   </div>
                   <div className="h-1 w-12 bg-cyan-500/20 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500 animate-[loading_1.5s_infinite_0.4s_infinite_ease-in-out]"></div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {state === AppState.ERROR && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="bg-red-500/10 p-12 rounded-[3rem] border border-red-500/20 text-center max-w-md backdrop-blur-md">
              <ShieldAlert className="text-red-500 mx-auto mb-6" size={56} />
              <h3 className="text-2xl font-black uppercase italic mb-4 tracking-tighter">Analysis Interrupted</h3>
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
              G3 Pro Core | Biomechanic Engine v4.2 Ready
            </p>
          </div>
          <p className="text-[10px] text-gray-700 font-bold uppercase tracking-[0.2em]">
            &copy; 2025 SurfCoach Intelligence. All Rights Reserved.
          </p>
        </div>
      </footer>
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default App;
