
export interface PostureMetric {
  subject: string;
  value: number;
  fullMark: number;
}

export interface TelemetryData {
  time: string;
  flow: number;
  power: number;
}

export interface Maneuver {
  time: string;
  name: string;
  execution: number; // 0-10
}

export interface Drill {
  title: string;
  description: string;
  focus: string;
}

export interface AnalysisResult {
  score: number;
  summary: string;
  posture: PostureMetric[];
  telemetry: TelemetryData[];
  maneuvers: Maneuver[];
  drills: Drill[];
}

export enum AppState {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  ANALYZING = 'ANALYZING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}
