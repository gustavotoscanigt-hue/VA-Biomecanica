
import React from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import { 
  TrendingUp, Activity, Target, Zap, Waves, Award, 
  ChevronRight, Play, Info, Layers
} from 'lucide-react';
import { AnalysisResult } from '../types';

interface DashboardProps {
  data: AnalysisResult;
  videoUrl: string;
}

const Dashboard: React.FC<DashboardProps> = ({ data, videoUrl }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
      {/* HEADER SECTION: VIDEO & SCORE */}
      <div className="lg:col-span-8 space-y-6">
        <div className="bg-black/40 rounded-2xl overflow-hidden neon-border relative group">
          <video 
            src={videoUrl} 
            controls 
            className="w-full aspect-video object-cover"
          />
          <div className="absolute top-4 left-4 bg-cyan-500/20 backdrop-blur-md border border-cyan-500/40 px-3 py-1 rounded-full flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-400">Analysis Active</span>
          </div>
        </div>

        {/* FLOW TELEMETRY */}
        <div className="bg-[#0c0c0e] rounded-2xl p-6 neon-border">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-cyan-500/20 p-2 rounded-lg">
                <Waves className="text-cyan-400" size={20} />
              </div>
              <div>
                <h3 className="text-white font-bold tracking-tight uppercase text-sm">Flow Telemetry</h3>
                <p className="text-gray-500 text-xs">Real-time speed and power projection</p>
              </div>
            </div>
            <div className="flex gap-4">
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                 <span className="text-[10px] text-gray-400 font-bold uppercase">Flow</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-white/40"></div>
                 <span className="text-[10px] text-gray-400 font-bold uppercase">Power</span>
               </div>
            </div>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.telemetry}>
                <defs>
                  <linearGradient id="colorFlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" />
                <XAxis dataKey="time" stroke="#444" fontSize={10} tickLine={false} />
                <YAxis stroke="#444" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="flow" stroke="#22d3ee" fillOpacity={1} fill="url(#colorFlow)" strokeWidth={2} />
                <Area type="monotone" dataKey="power" stroke="rgba(255,255,255,0.4)" fill="transparent" strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TIMELINE OF MANEUVERS */}
        <div className="bg-[#0c0c0e] rounded-2xl p-6 neon-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-cyan-500/20 p-2 rounded-lg">
              <Layers className="text-cyan-400" size={20} />
            </div>
            <h3 className="text-white font-bold tracking-tight uppercase text-sm">Maneuver Breakdown</h3>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {data.maneuvers.map((m, idx) => (
              <div key={idx} className="flex-shrink-0 min-w-[140px] bg-white/5 border border-white/10 p-4 rounded-xl hover:bg-white/10 transition-colors group cursor-default">
                <p className="text-[10px] text-cyan-400 font-black mb-1">{m.time}</p>
                <p className="text-white font-bold text-xs uppercase mb-3 leading-tight">{m.name}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-400" style={{ width: `${m.execution * 10}%` }}></div>
                  </div>
                  <span className="text-[10px] font-bold text-white italic">{m.execution}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SIDEBAR: SCORE, RADAR & DRILLS */}
      <div className="lg:col-span-4 space-y-6">
        {/* TOTAL SCORE CARD */}
        <div className="bg-[#0c0c0e] rounded-2xl p-6 neon-border flex flex-col items-center justify-center text-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Award size={80} className="text-cyan-400" />
          </div>
          <span className="text-[10px] uppercase font-black tracking-[0.2em] text-cyan-400 mb-2">Performance Score</span>
          <div className="flex items-baseline gap-1">
            <span className="text-7xl wsl-italic cyan-glow">{data.score.toFixed(1)}</span>
            <span className="text-xl text-gray-500 font-bold">/10</span>
          </div>
          <p className="text-gray-400 text-xs mt-4 leading-relaxed max-w-[200px]">
            {data.summary}
          </p>
        </div>

        {/* BIOMECHANIC RADAR */}
        <div className="bg-[#0c0c0e] rounded-2xl p-6 neon-border">
          <h3 className="text-white font-bold tracking-tight uppercase text-[11px] mb-4 flex items-center gap-2">
            <Target className="text-cyan-400" size={14} /> Biomechanic Posture
          </h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data.posture}>
                <PolarGrid stroke="#333" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 10]} axisLine={false} tick={false} />
                <Radar
                  name="Posture"
                  dataKey="value"
                  stroke="#22d3ee"
                  fill="#22d3ee"
                  fillOpacity={0.4}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TRAINING PLAN */}
        <div className="bg-cyan-900/10 rounded-2xl p-6 border border-cyan-500/20">
          <h3 className="text-white font-bold tracking-tight uppercase text-[11px] mb-4 flex items-center gap-2">
            <Zap className="text-cyan-400" size={14} /> Training Drills
          </h3>
          <div className="space-y-4">
            {data.drills.map((drill, i) => (
              <div key={i} className="bg-black/40 rounded-xl p-4 border border-white/5 group hover:border-cyan-500/40 transition-all">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-white font-bold text-sm">{drill.title}</h4>
                  <ChevronRight size={14} className="text-gray-600 group-hover:text-cyan-400" />
                </div>
                <p className="text-gray-500 text-[11px] leading-relaxed mb-2">
                  {drill.description}
                </p>
                <div className="inline-flex items-center gap-1.5 bg-cyan-500/10 px-2 py-0.5 rounded text-[9px] font-bold text-cyan-400 uppercase">
                   Focus: {drill.focus}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
