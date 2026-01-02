
import React, { useState, useRef } from 'react';
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
  Activity
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

  // Função para garantir que o motor de IA está conectado
  const ensureAIConnected = async () => {
    if (!process.env.API_KEY && window.aistudio) {
      await window.aistudio.openSelectKey();
    }
  };

  const extractFrames = async (file: File, frameCount: number = 12): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      
      const timeout = setTimeout(() => {
        URL.revokeObjectURL(url);
        reject(new Error("Vídeo muito pesado ou formato incompatível."));
      }, 20000);

      video.onloadedmetadata = async () => {
        try {
          const frames: any[] = [];
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { alpha: false });
          canvas.width = 1024;
          canvas.height = 576;

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
      // Usando Flash para garantir que funcione sem restrições de cota ou barreiras de faturamento pesadas
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const modelName = 'gemini-3-flash-preview';

      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            { text: "Analise técnica de surf: avalie score (0-10), postura biomecânica, manobras executadas e sugira treinos. Responda APENAS em JSON." },
            ...contentParts
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
            required: ["score", "summary", "posture"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      setAnalysis(result);
      setState(AppState.COMPLETED);
    } catch (error: any) {
      console.error("Analysis Error:", error);
      const msg = error.message || "";
      if (msg.includes("API Key") || msg.includes("not found")) {
        setErrorMessage("O motor de IA precisa ser ativado. Clique no botão abaixo para conectar.");
      } else {
        setErrorMessage("Erro ao analisar o vídeo. Tente um clipe mais curto.");
      }
      setState(AppState.ERROR);
    }
  };

  const handleUploadClick = async () => {
    await ensureAIConnected();
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

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <nav className="border-b border-white/5 bg-black/80 backdrop-blur-2xl h-20 flex items-center px-8">
        <div className="flex items-center gap-4">
          <div className="bg-cyan-500 p-2 rounded-lg">
            <Waves className="text-black" size={20} />
          </div>
          <h1 className="text-xl italic font-black uppercase tracking-tighter">SurfCoach <span className="text-cyan-400">IA</span></h1>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-12">
        {state === AppState.IDLE && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
             <div className="bg-[#0c0c0e] p-12 rounded-[2.5rem] border border-white/5 max-w-lg w-full shadow-2xl">
                <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center mx-auto mb-8">
                  <Zap className="text-cyan-400" size={32} />
                </div>
                <h2 className="text-3xl font-black italic uppercase mb-4 tracking-tighter">Análise Profissional</h2>
                <p className="text-gray-500 text-sm mb-10">Envie seu vídeo e receba métricas biomecânicas instantâneas.</p>
                <button 
                  onClick={handleUploadClick}
                  className="w-full bg-white text-black py-5 rounded-xl font-black uppercase tracking-widest hover:bg-cyan-400 transition-all text-xs"
                >
                  Selecionar Vídeo
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="video/*" className="hidden" />
             </div>
          </div>
        )}

        {(state === AppState.UPLOADING || state === AppState.ANALYZING) && (
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <div className="w-20 h-20 rounded-full border-t-2 border-cyan-400 animate-spin mb-8"></div>
            <h3 className="text-2xl font-black italic uppercase tracking-tighter">Processando...</h3>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-2 animate-pulse">Inteligência Artificial Ativa</p>
          </div>
        )}

        {state === AppState.ERROR && (
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <div className="bg-red-500/10 p-10 rounded-[2rem] border border-red-500/20 text-center max-w-md">
              <ShieldAlert className="text-red-500 mx-auto mb-6" size={48} />
              <p className="text-gray-300 text-sm mb-8 leading-relaxed font-medium">{errorMessage}</p>
              <button 
                onClick={handleUploadClick}
                className="w-full bg-white text-black py-4 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-cyan-400 transition-all"
              >
                Conectar e Tentar Novamente
              </button>
            </div>
          </div>
        )}

        {state === AppState.COMPLETED && analysis && videoUrl && <Dashboard data={analysis} videoUrl={videoUrl} />}
      </main>
    </div>
  );
};

export default App;
