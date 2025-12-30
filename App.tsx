
import React, { useState, useCallback, useRef } from 'react';
import { 
  Upload, 
  ChevronRight, 
  Waves, 
  Activity, 
  CheckCircle, 
  AlertCircle,
  Cpu,
  Target
} from 'lucide-react';
import { AppState, AnalysisResult } from './types';
import { analyzeSurfVideo } from './services/geminiService';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Aumentado o limite de tamanho para ~100MB para suportar vídeos de até 1 minuto
    if (file.size > 100 * 1024 * 1024) {
      setErrorMessage('O arquivo é muito grande. Use vídeos menores que 100MB (aprox. 1 minuto).');
      setState(AppState.ERROR);
      return;
    }

    setState(AppState.UPLOADING);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);

    try {
      // Validar duração se necessário (opcional, mas o usuário pediu especificamente "tempo")
      const videoElement = document.createElement('video');
      videoElement.src = url;
      videoElement.onloadedmetadata = () => {
        if (videoElement.duration > 65) { // Tolerância de 5s
           setErrorMessage('O vídeo excede o limite de 1 minuto permitido para análise.');
           setState(AppState.ERROR);
           return;
        }
        
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          setState(AppState.ANALYZING);
          
          try {
            const result = await analyzeSurfVideo(base64Data, file.type);
            setAnalysis(result);
            setState(AppState.COMPLETED);
          } catch (error) {
            console.error(error);
            setErrorMessage('Erro ao analisar vídeo. Verifique sua chave de API ou conexão.');
            setState(AppState.ERROR);
          }
        };
      };
    } catch (err) {
      setErrorMessage('Falha ao processar arquivo.');
      setState(AppState.ERROR);
    }
  };

  const reset = () => {
    setState(AppState.IDLE);
    setAnalysis(null);
    setVideoUrl(null);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-[#050505] selection:bg-cyan-500/30">
      {/* NAVBAR */}
      <nav className="border-b border-white/5 bg-black/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-500 p-2 rounded-lg rotate-12">
              <Waves className="text-black" size={24} />
            </div>
            <div>
              <h1 className="text-xl wsl-italic tracking-tighter uppercase leading-none">
                SurfCoach <span className="text-cyan-400">IA</span>
              </h1>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">High Performance Lab</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#" className="text-xs font-bold text-cyan-400 uppercase tracking-widest border-b-2 border-cyan-400 pb-1">Dashboard</a>
            <a href="#" className="text-xs font-bold text-gray-500 uppercase tracking-widest hover:text-white transition-colors">Academy</a>
            <a href="#" className="text-xs font-bold text-gray-500 uppercase tracking-widest hover:text-white transition-colors">Compare</a>
          </div>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-white text-black px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-cyan-400 transition-all flex items-center gap-2"
          >
            <Upload size={14} />
            Analyze New Session
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="video/mp4,video/quicktime" 
            className="hidden" 
          />
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {state === AppState.IDLE && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="mb-10 relative">
               <div className="absolute inset-0 bg-cyan-500 blur-[80px] opacity-20"></div>
               <div className="bg-[#0c0c0e] p-8 rounded-3xl border border-white/10 relative z-10">
                  <Cpu className="text-cyan-400 mx-auto mb-6" size={48} />
                  <h2 className="text-3xl font-black wsl-italic uppercase mb-4 max-w-lg leading-tight">
                    Elite Biomechanical Analysis <span className="text-cyan-400">Powered by Gemini 3</span>
                  </h2>
                  <p className="text-gray-500 text-sm max-w-md mx-auto mb-8">
                    Upload your raw footage (up to 1 minute). Get WSL-grade metrics, postural correction data, and AI-curated training drills in seconds.
                  </p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-cyan-500 hover:bg-cyan-400 text-black py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all"
                  >
                    <Upload size={20} />
                    Start Video Upload
                  </button>
               </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
              {[
                { icon: <Activity />, title: "Flow Telemetry", desc: "Track speed maintenance through maneuvers" },
                { icon: <Target />, title: "Posture Radar", desc: "Shoulder, hips and chest alignment analysis" },
                { icon: <CheckCircle />, title: "Drill Generation", desc: "Personalized exercises based on your flaws" }
              ].map((feature, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="bg-white/5 p-4 rounded-2xl mb-4 text-cyan-400">
                    {feature.icon}
                  </div>
                  <h4 className="font-bold uppercase text-xs text-white mb-2">{feature.title}</h4>
                  <p className="text-gray-500 text-[11px] leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {(state === AppState.UPLOADING || state === AppState.ANALYZING) && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="relative mb-10">
              <div className="w-24 h-24 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Waves className="text-cyan-400 animate-pulse" size={32} />
              </div>
            </div>
            <h3 className="text-2xl font-black wsl-italic uppercase mb-2">
              {state === AppState.UPLOADING ? 'Uploading Footage...' : 'Analyzing Biomechanics...'}
            </h3>
            <p className="text-gray-500 text-sm animate-pulse">
              Gemini 3 Flash is processing frames for elite metrics
            </p>
          </div>
        )}

        {state === AppState.ERROR && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="bg-red-500/10 p-4 rounded-full mb-6">
              <AlertCircle className="text-red-500" size={48} />
            </div>
            <h3 className="text-2xl font-black wsl-italic uppercase mb-2 text-red-500">Analysis Failed</h3>
            <p className="text-gray-500 text-sm max-w-md mb-8">{errorMessage}</p>
            <button 
              onClick={reset}
              className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest transition-all"
            >
              Try Again
            </button>
          </div>
        )}

        {state === AppState.COMPLETED && analysis && videoUrl && (
          <Dashboard data={analysis} videoUrl={videoUrl} />
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/5 bg-[#080808] py-12 mt-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3 opacity-50">
            <Waves className="text-cyan-400" size={20} />
            <span className="text-sm font-black wsl-italic uppercase tracking-tighter">
              SurfCoach <span className="text-cyan-400">IA</span>
            </span>
          </div>
          <div className="text-gray-600 text-[10px] font-bold uppercase tracking-[0.3em]">
            Elite Performance Labs © 2024 • Powered by Google Gemini
          </div>
          <div className="flex gap-6">
            {['Instagram', 'Twitter', 'WSL', 'Support'].map(item => (
              <a key={item} href="#" className="text-gray-600 hover:text-cyan-400 text-[10px] font-black uppercase tracking-widest transition-colors">
                {item}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
