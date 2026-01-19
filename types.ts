export interface MemeTemplate {
  id: string;
  url: string;
  name: string;
}

export interface TextOverlay {
  id: string;
  text: string;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  fontSize: number;
  color: string;
  isUppercase: boolean;
}

export interface AnalysisResult {
  text: string;
  model: string;
}

export enum LoadingState {
  IDLE,
  GENERATING_CAPTIONS,
  EDITING_IMAGE,
  ANALYZING,
}

export interface GeneratedCaption {
  text: string;
  category: 'Funny' | 'Sarcastic' | 'Wholesome' | 'Dark' | 'Viral';
}