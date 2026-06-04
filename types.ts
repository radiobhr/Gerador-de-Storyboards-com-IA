/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type StoryboardType = 'Curto' | 'Longo';

export type VisualStyle = 'Default' | 'Minimalist' | 'Realistic' | 'Cartoon' | 'Vintage' | 'Futuristic' | '3D Render' | 'Sketch';

export type Language = 'English' | 'Spanish' | 'French' | 'German' | 'Mandarin' | 'Japanese' | 'Hindi' | 'Arabic' | 'Portuguese' | 'Russian';

export interface UploadedFile {
  name: string;
  mimeType: string;
  base64Data: string; // Base64 raw string without prefix
  size: number;
}

export interface StoryboardScene {
  number: number;
  title: string;
  visualPrompt: string; // The detailed visual description in English for the AI image generator
  action: string;      // Action / Video composition details in selected language
  dialogue: string;    // Narration or Dialogue in selected language
  camera: string;      // Camera shot/angle in selected language
  imageData?: string;  // Base64 data of the generated frame
}

export interface Storyboard {
  id: string;
  title: string;
  concept: string;
  type: StoryboardType;
  scenes: StoryboardScene[];
  timestamp: number;
  style: VisualStyle;
  language: Language;
  videoUrl?: string;
  operationName?: string;
}

export interface SearchResultItem {
  title: string;
  url: string;
}

export interface ResearchResult {
  storyboard: Omit<Storyboard, 'id' | 'timestamp'>;
  searchResults: SearchResultItem[];
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}
