
import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Upload, 
  Waves, 
  Activity, 
  AlertCircle,
  Cpu,
  BarChart3
} from 'lucide-react';
import { AppState, AnalysisResult } from './types';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const performAnalysis = async (base64Data: string, mimeType: string) => {
    try {
      // Inicialização direta usando a chave do ambiente, sem verificações de UI
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const model = 'gemini-3-flash-preview';

      const response = await ai.models.generateContent({
        model: model,
        contents: {
          parts: [
            { 
              text: `Professional Surf Biometrics Analysis.
              Analyze the video and provide high-performance metrics.
              Return ONLY a JSON object with: 
              - score (0-10)
              - summary (one sentence elite coach style)
              - posture (array of 5 metrics: subject, value, fullMark)
              - telemetry (array of 10 points: time, flow, power)
              - maneuvers (array of detected tricks: time, name, execution)
              - drills (array of 3 suggested training exercises: title, description, focus)` 
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

      const result = JSON.parse(response.text) as AnalysisResult;
      setAnalysis(result);
      setState(AppState.COMPLETED);
    } catch (error: any) {
      console.error("Analysis Failure:", error);
      setErrorMessage("Ocorreu um erro técnico ao processar a biomecânica. Certifique-se de que o arquivo é um vídeo válido.");
      setState(AppState.ERROR);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setState(AppState.UPLOADING);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = (reader.result as string).split(',')[1];
      setState(AppState.ANALYZING);
      performAnalysis(base64Data, file.type);
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
      {/* PROFESSIONAL NAV */}
      <nav className="border-b border-white/5 bg-black/80 backdrop-blur-2xl sticky top-0 z-50 h-20">
        <div className="max-w-7xl mx-auto px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-cyan-500 p-2.5 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <Waves className="text-black" size={24} />
            </div>
            <div>
              <h1 className="text-2xl wsl-italic uppercase tracking-tighter leading-none">
                SurfCoach <span className="text-cyan-400">IA</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                 <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></div>
                 <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.3em]">System Online</p>
              </div>
            </div>
          </div>
          
          {state !== AppState.IDLE && (
            <button 
              onClick={reset}
              className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
            >
              Reset Session
            </button>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-12">
        {state === AppState.IDLE && (
          <div className="flex flex-col items-center justify-center min-h-[65vh] text-center">
             <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-[3rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <div className="bg-[#0c0c0e] p-12 rounded-[3rem] border border-white/10 relative z-10 max-w-lg">
                   <Cpu className="text-cyan-400 mx-auto mb-8" size={64} />
                   <h2 className="text-4xl font-black wsl-italic uppercase mb-6 tracking-tighter">
                     Professional <span className="text-cyan-400">Analysis</span>
                   </h2>
                   <p className="text-gray-500 text-sm mb-12 leading-relaxed font-medium uppercase tracking-wide">
                     Upload de vídeos MP4/MOV para avaliação biomecânica de elite e telemetria de fluxo.
                   </p>
                   <div className="space-y-4">
                     <button className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:bg-cyan-400 transition-all shadow-xl">
                       <Upload size={24} />
                       Upload Footage
                     </button>
                     <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Supports up to 4K resolution</p>
                   </div>
                </div>
             </div>
          </div>
        )}

        {(state === AppState.UPLOADING || state === AppState.ANALYZING) && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="relative mb-12">
              <div className="w-32 h-32 rounded-full border-[3px] border-cyan-500/10 border-t-cyan-400 animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <BarChart3 className="text-cyan-400 animate-pulse" size={40} />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-3xl font-black wsl-italic uppercase mb-3 tracking-tighter">
                {state === AppState.UPLOADING ? 'Uploading...' : 'Processing Biometrics...'}
              </h3>
              <p className="text-gray-500 text-[11px] font-black uppercase tracking-[0.4em] animate-pulse">
                Neural Analysis Core Active
              </p>
            </div>
          </div>
        )}

        {state === AppState.ERROR && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="bg-red-500/10 p-6 rounded-full mb-8 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
              <AlertCircle className="text-red-500" size={64} />
            </div>
            <h3 className="text-3xl font-black wsl-italic uppercase mb-4 text-red-500 tracking-tighter">Analysis Failed</h3>
            <p className="text-gray-400 text-sm max-w-md mb-12 leading-relaxed font-medium uppercase">
              {errorMessage}
            </p>
            <button 
              onClick={reset}
              className="bg-white text-black px-12 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-lg"
            >
              Try Again
            </button>
          </div>
        )}

        {state === AppState.COMPLETED && analysis && videoUrl && (
          <Dashboard data={analysis} videoUrl={videoUrl} />
        )}
      </main>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept="video/mp4,video/quicktime" 
        className="hidden" 
      />

      <footer className="border-t border-white/5 bg-[#080808] py-16 text-center">
          <p className="text-gray-600 text-[10px] font-black uppercase tracking-[0.5em]">
            SurfCoach IA • Elite Performance Training • v2.0
          </p>
      </footer>
    </div>
  );
};

export default App;
