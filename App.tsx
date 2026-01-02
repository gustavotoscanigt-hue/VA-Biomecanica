
import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Upload, 
  Waves, 
  Cpu, 
  RefreshCcw, 
  Zap, 
  Search,
  AlertCircle
} from 'lucide-react';
import { AppState, AnalysisResult } from './types';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractFrames = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      
      video.onloadedmetadata = async () => {
        const frames: any[] = [];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 640; // Otimizado para velocidade
        canvas.height = 360;

        for (let i = 0; i < 10; i++) {
          video.currentTime = (video.duration / 11) * (i + 1);
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
        URL.revokeObjectURL(url);
        resolve(frames);
      };
      video.onerror = () => reject("Erro ao carregar vídeo.");
    });
  };

  const startAnalysis = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setVideoUrl(URL.createObjectURL(file));
    setState(AppState.UPLOADING);

    try {
      const frames = await extractFrames(file);
      setState(AppState.ANALYZING);

      // Verificação proativa de chave apenas no momento do uso
      if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
        await window.aistudio.openSelectKey();
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { text: "Analise técnica de surf: Score (0-10), biomecânica, manobras e 3 treinos. Retorne em JSON." },
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

      setAnalysis(JSON.parse(response.text || '{}'));
      setState(AppState.COMPLETED);
    } catch (err: any) {
      console.error(err);
      setError("Falha na conexão. Certifique-se de que a chave API está ativa no Google AI Studio.");
      setState(AppState.IDLE);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <nav className="h-20 border-b border-white/5 flex items-center px-8 justify-between bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Waves className="text-cyan-400" size={24} />
          <h1 className="font-black italic uppercase text-xl tracking-tighter">SurfCoach <span className="text-cyan-400">IA</span></h1>
        </div>
        {state !== AppState.IDLE && (
          <button onClick={() => { setState(AppState.IDLE); setAnalysis(null); }} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-all">
            <RefreshCcw size={14} /> Reiniciar
          </button>
        )}
      </nav>

      <main className="max-w-6xl mx-auto p-8">
        {state === AppState.IDLE && !analysis && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full max-w-lg bg-[#0c0c0e] border-2 border-dashed border-white/10 rounded-[3rem] p-20 text-center cursor-pointer hover:border-cyan-500/50 transition-all group"
            >
              <div className="w-20 h-20 bg-cyan-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-cyan-500/20 group-hover:scale-110 transition-transform">
                <Upload className="text-cyan-400" size={32} />
              </div>
              <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-4">Análise Elite</h2>
              <p className="text-gray-500 text-sm mb-10 font-bold uppercase tracking-widest">Selecione seu vídeo de surf</p>
              <button className="bg-white text-black px-12 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-cyan-400 transition-all">
                Abrir Arquivo
              </button>
              <input type="file" ref={fileInputRef} onChange={startAnalysis} accept="video/*" className="hidden" />
            </div>
            
            {error && (
              <div className="mt-8 flex items-center gap-3 bg-red-500/10 text-red-400 px-6 py-4 rounded-2xl border border-red-500/20 text-xs font-bold animate-pulse">
                <AlertCircle size={18} /> {error}
                <button onClick={() => window.aistudio?.openSelectKey()} className="underline ml-2">Reconectar</button>
              </div>
            )}
          </div>
        )}

        {(state === AppState.UPLOADING || state === AppState.ANALYZING) && (
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <div className="w-24 h-24 border-4 border-cyan-500/10 border-t-cyan-400 rounded-full animate-spin mb-8"></div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter animate-pulse">
              {state === AppState.UPLOADING ? 'Lendo Bio-Dados...' : 'Processando com Gemini 3...'}
            </h2>
          </div>
        )}

        {state === AppState.COMPLETED && analysis && videoUrl && (
          <Dashboard data={analysis} videoUrl={videoUrl} />
        )}
      </main>
    </div>
  );
};

export default App;
