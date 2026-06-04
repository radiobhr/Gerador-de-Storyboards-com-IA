/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { Storyboard, StoryboardScene, VisualStyle } from '../types';
import { 
  Download, Sparkles, Camera, Film, MessageSquare, 
  Maximize2, X, ZoomIn, ZoomOut, RefreshCw, 
  Clapperboard, FileText, Check, Loader2, ArrowRight
} from 'lucide-react';
import { generateStoryboardFrame, editStoryboardFrame } from '../services/geminiService';
import { TrailerModal } from './TrailerModal';

interface StoryboardDisplayProps {
  storyboard: Storyboard;
  onUpdateStoryboard: (updated: Storyboard) => void;
}

const StoryboardDisplay: React.FC<StoryboardDisplayProps> = ({ storyboard, onUpdateStoryboard }) => {
  const [fullscreenImage, setFullscreenImage] = useState<{ src: string; alt: string } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showTrailer, setShowTrailer] = useState(false);
  
  // Track visual states for each panel
  const [loadingScenes, setLoadingScenes] = useState<{ [key: number]: boolean }>({});
  const [errorScenes, setErrorScenes] = useState<{ [key: number]: string }>({});
  const [editPrompts, setEditPrompts] = useState<{ [key: number]: string }>({});
  const [activeEditPanel, setActiveEditPanel] = useState<number | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.5, 0.5));
  const handleResetZoom = () => setZoomLevel(1);

  // Generate image for a single scene
  const handleGenerateFrame = async (sceneNumber: number) => {
    const sceneIndex = storyboard.scenes.findIndex(s => s.number === sceneNumber);
    if (sceneIndex === -1) return;

    setLoadingScenes(prev => ({ ...prev, [sceneNumber]: true }));
    setErrorScenes(prev => ({ ...prev, [sceneNumber]: '' }));

    try {
      const visualPrompt = storyboard.scenes[sceneIndex].visualPrompt;
      const base64Data = await generateStoryboardFrame(visualPrompt, storyboard.style);
      
      const updatedScenes = [...storyboard.scenes];
      updatedScenes[sceneIndex] = {
        ...updatedScenes[sceneIndex],
        imageData: base64Data
      };

      onUpdateStoryboard({
        ...storyboard,
        scenes: updatedScenes
      });
    } catch (err: any) {
      console.error(err);
      setErrorScenes(prev => ({ 
        ...prev, 
        [sceneNumber]: 'Ocorreu um erro ao tentar ilustrar esta cena.' 
      }));
    } finally {
      setLoadingScenes(prev => ({ ...prev, [sceneNumber]: false }));
    }
  };

  // Generate ALL frames sequentially
  const handleGenerateAllFrames = async () => {
    if (isGeneratingAll) return;
    setIsGeneratingAll(true);

    for (const scene of storyboard.scenes) {
      if (!scene.imageData) {
        await handleGenerateFrame(scene.number);
      }
    }
    setIsGeneratingAll(false);
  };

  // Edit/Enhance a single frame with text instruction
  const handleEditFrameSubmit = async (e: React.FormEvent, sceneNumber: number) => {
    e.preventDefault();
    const prompt = editPrompts[sceneNumber]?.trim();
    if (!prompt) return;

    const sceneIndex = storyboard.scenes.findIndex(s => s.number === sceneNumber);
    if (sceneIndex === -1 || !storyboard.scenes[sceneIndex].imageData) return;

    setLoadingScenes(prev => ({ ...prev, [sceneNumber]: true }));
    setErrorScenes(prev => ({ ...prev, [sceneNumber]: '' }));

    try {
      const currentImage = storyboard.scenes[sceneIndex].imageData!;
      const base64Data = await editStoryboardFrame(currentImage, prompt, storyboard.style);
      
      const updatedScenes = [...storyboard.scenes];
      updatedScenes[sceneIndex] = {
        ...updatedScenes[sceneIndex],
        imageData: base64Data
      };

      onUpdateStoryboard({
        ...storyboard,
        scenes: updatedScenes
      });

      setEditPrompts(prev => ({ ...prev, [sceneNumber]: '' }));
      setActiveEditPanel(null);
    } catch (err: any) {
      console.error(err);
      setErrorScenes(prev => ({ 
        ...prev, 
        [sceneNumber]: 'Ocorreu um erro ao atualizar o visual.' 
      }));
    } finally {
      setLoadingScenes(prev => ({ ...prev, [sceneNumber]: false }));
    }
  };

  // Download entire script as a beautiful TXT file
  const handleDownloadScript = () => {
    const header = `=========================================\n`;
    const titleText = `STORYBOARD: ${storyboard.title.toUpperCase()}\n`;
    const conceptText = `Conceito Original: ${storyboard.concept}\n`;
    const details = `Estilo Visual: ${storyboard.style} | Idioma: ${storyboard.language} | Formato: Storyboard ${storyboard.type}\n`;
    const line = `-----------------------------------------\n`;
    
    let contents = header + titleText + conceptText + details + header + `\n`;

    storyboard.scenes.forEach(scene => {
      contents += `CENA ${scene.number}: ${scene.title.toUpperCase()}\n`;
      contents += `[Enquadramento]: ${scene.camera}\n`;
      contents += `[Ação / Descrição]: ${scene.action}\n`;
      contents += `[Diálogo / Voz]: ${scene.dialogue}\n`;
      contents += `[AI Image Prompt (Inglês)]: ${scene.visualPrompt}\n`;
      contents += line + `\n`;
    });

    const blob = new Blob([contents], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `roteiro-${storyboard.title.replace(/\s+/g, '-').toLowerCase()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const countGenerated = storyboard.scenes.filter(s => s.imageData).length;
  const isComplete = countGenerated === storyboard.scenes.length;

  return (
    <div id="storyboard-root" className="w-full max-w-7xl mx-auto space-y-10 animate-in fade-in zoom-in duration-700 mt-6">
      
      {/* Board Header Dashboard */}
      <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 dark:bg-cyan-500/5 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-10 w-48 h-48 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-3xl"></div>
        
        <div className="space-y-3 max-w-3xl z-10">
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase font-mono tracking-widest px-2.5 py-1 rounded-full bg-cyan-50 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
              Formato: {storyboard.type === 'Curto' ? 'Curto (3 cenas)' : 'Longo (6 cenas)'}
            </span>
            <span className="text-[10px] uppercase font-mono tracking-widest px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              Estampa: {storyboard.style}
            </span>
          </div>
          
          <h1 className="text-2xl md:text-4xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
            {storyboard.title}
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base leading-relaxed font-light">
            {storyboard.concept}
          </p>

          <div className="flex items-center gap-2 pt-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
            <Clapperboard className="w-4 h-4 text-cyan-500 shrink-0" />
            <span>Progresso da Ilustração: {countGenerated} de {storyboard.scenes.length} frames</span>
            <div className="w-24 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden ml-2">
              <div 
                className="h-full bg-cyan-500 transition-all duration-500" 
                style={{ width: `${(countGenerated / storyboard.scenes.length) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap gap-3 shrink-0 z-10">
          <button
            onClick={handleDownloadScript}
            className="px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border border-slate-200 dark:border-white/10 transition-all"
            title="Baixar Roteiro Completo"
          >
            <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Baixar Roteiro</span>
          </button>

          <button
            onClick={() => setShowTrailer(true)}
            className="px-4 py-3 bg-slate-900 border border-cyan-500/40 hover:border-cyan-300 text-cyan-400 hover:text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] shadow-md"
            title="Visualizar e Criar Trailer Animado ou Filme do Storyboard"
          >
            <Film className="w-4 h-4 text-cyan-500" />
            <span>Gerar Trailer</span>
          </button>

          {!isComplete && (
            <button
              onClick={handleGenerateAllFrames}
              disabled={isGeneratingAll}
              className="px-5 py-3 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:brightness-110 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/10 transition-all disabled:opacity-50"
            >
              {isGeneratingAll ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Ilustrando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Ilustrar Storyboard</span>
                </>
              )}
            </button>
          )}

          {isComplete && (
            <div className="px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 text-green-700 dark:text-green-300 rounded-xl text-sm font-bold flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Ilustrado Completo</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid of Storyboard Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {storyboard.scenes.map((scene) => {
          const isLoading = loadingScenes[scene.number] || false;
          const sceneError = errorScenes[scene.number] || '';
          const currentEditPrompt = editPrompts[scene.number] || '';
          const isEditing = activeEditPanel === scene.number;

          return (
            <div 
              key={scene.number} 
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all flex flex-col group relative"
            >
              {/* Scene Number Label */}
              <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 bg-cyan-600 text-white rounded-full flex items-center justify-center text-xs font-bold leading-none font-mono">
                    {scene.number}
                  </div>
                  <h3 className="font-display font-bold text-slate-800 dark:text-slate-100 text-sm truncate max-w-[180px]">
                    {scene.title}
                  </h3>
                </div>
                {scene.imageData && (
                  <button 
                    onClick={() => handleGenerateFrame(scene.number)}
                    disabled={isLoading}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Regerar Frame com IA"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                )}
              </div>

              {/* Scene Visual Panel (Frame) */}
              <div className="aspect-video bg-slate-100 dark:bg-slate-950 relative overflow-hidden flex items-center justify-center border-b border-slate-100 dark:border-white/5">
                {scene.imageData ? (
                  <>
                    <img 
                      src={scene.imageData} 
                      alt={scene.title} 
                      className="w-full h-full object-cover select-none"
                    />
                    
                    {/* Hover Floating Controls */}
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 z-10">
                      <button 
                        onClick={() => setFullscreenImage({ src: scene.imageData!, alt: scene.title })}
                        className="p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white rounded-xl transition-colors shadow-lg"
                        title="Tela Cheia"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                      
                      <a 
                        href={scene.imageData} 
                        download={`cena-${scene.number}-${storyboard.title.replace(/\s+/g, '-').toLowerCase()}.png`}
                        className="p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white rounded-xl transition-colors shadow-lg"
                        title="Baixar Frame"
                      >
                        <Download className="w-4 h-4" />
                      </a>

                      <button 
                        onClick={() => setActiveEditPanel(isEditing ? null : scene.number)}
                        className="p-2.5 bg-cyan-600 hover:bg-cyan-500 border border-cyan-500 text-white rounded-xl transition-colors shadow-lg"
                        title="Refinar Frame"
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 p-4 flex flex-col items-center justify-center text-center space-y-4">
                    {isLoading ? (
                      <div className="flex flex-col items-center space-y-3">
                        <span className="relative flex h-8 w-8">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-8 w-8 bg-cyan-600 flex items-center justify-center"><Loader2 className="w-4 h-4 text-white animate-spin" /></span>
                        </span>
                        <div className="space-y-1">
                          <p className="text-xs font-bold font-mono tracking-wider text-cyan-600 dark:text-cyan-400 animate-pulse">DESENHANDO FRAME</p>
                          <p className="text-[10px] text-slate-400">Gemini está compondo os visuais...</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Clapperboard className="w-8 h-8 text-slate-350 dark:text-slate-600 mx-auto opacity-50" />
                        <button
                          onClick={() => handleGenerateFrame(scene.number)}
                          className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:brightness-110 text-white rounded-xl text-xs font-bold shadow-md transition-all inline-flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Ilustrar Quadro</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Individual panel inline errors */}
                {sceneError && (
                  <div className="absolute inset-x-2 bottom-2 bg-red-100 dark:bg-red-950/95 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-[10px] p-2 rounded-lg text-center z-10 font-medium">
                    {sceneError}
                  </div>
                )}
              </div>

              {/* Interactive Refinement Pane */}
              {isEditing && scene.imageData && (
                <form 
                  onSubmit={(e) => handleEditFrameSubmit(e, scene.number)}
                  className="p-3.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-white/5 flex gap-2 items-center animate-in slide-in-from-top duration-300"
                >
                  <input 
                    type="text"
                    value={currentEditPrompt}
                    onChange={(e) => setEditPrompts(prev => ({ ...prev, [scene.number]: e.target.value }))}
                    placeholder="Pedir modificação (Ex: 'adicione chuva...')"
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-medium"
                    disabled={isLoading}
                  />
                  <button 
                    type="submit"
                    disabled={isLoading || !currentEditPrompt.trim()}
                    className="p-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg disabled:opacity-50 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              {/* Scene Description and Details Card */}
              <div className="p-5 flex-1 flex flex-col space-y-4 text-xs">
                
                {/* Camera / Shot Indicator */}
                <div className="flex items-center gap-2 font-semibold text-slate-500 dark:text-slate-400 font-mono tracking-wider uppercase text-[9px] bg-slate-100 dark:bg-slate-800/30 px-2 py-1 rounded-md self-start border border-slate-200/50 dark:border-white/5">
                  <Camera className="w-3 h-3 text-cyan-500" />
                  <span>{scene.camera}</span>
                </div>

                {/* Action Frame details */}
                <div className="space-y-1 bg-slate-50/50 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300 font-display">
                    <Film className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Ação de Vídeo</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-350 leading-relaxed font-light">
                    {scene.action}
                  </p>
                </div>

                {/* Dialogue/Narration Frame details */}
                <div className="space-y-1 bg-slate-50/50 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-100 dark:border-white/5 flex-1 select-text">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300 font-display">
                    <MessageSquare className="w-3.5 h-3.5 text-purple-500" />
                    <span>Diálogo / Narração</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-350 leading-relaxed italic font-light">
                    {scene.dialogue || <span className="opacity-40 italic font-mono">- Sem falas / Silencioso -</span>}
                  </p>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* Fullscreen Viewer Modal */}
      {fullscreenImage && (
        <div className="fixed inset-0 z-[100] bg-slate-100/95 dark:bg-slate-950/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-300">
          {/* Toolbar */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 pointer-events-none">
            <div className="flex gap-2 pointer-events-auto bg-white/10 backdrop-blur-md p-1 rounded-lg border border-black/5 dark:border-white/10">
              <button onClick={handleZoomOut} className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-slate-200 transition-colors" title="Diminuir Zoom">
                <ZoomOut className="w-5 h-5" />
              </button>
              <button onClick={handleResetZoom} className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-slate-200 transition-colors" title="Redefinir Zoom">
                <span className="text-xs font-bold">{Math.round(zoomLevel * 100)}%</span>
              </button>
              <button onClick={handleZoomIn} className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-md text-slate-800 dark:text-slate-200 transition-colors" title="Aumentar Zoom">
                <ZoomIn className="w-5 h-5" />
              </button>
            </div>

            <button 
              onClick={() => { setFullscreenImage(null); setZoomLevel(1); }}
              className="pointer-events-auto p-3 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white rounded-full hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors shadow-lg animate-in"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-auto flex items-center justify-center p-4 sm:p-8">
            <img 
              src={fullscreenImage.src} 
              alt={fullscreenImage.alt}
              style={{ 
                transform: `scale(${zoomLevel})`,
                transition: 'transform 0.2s ease-out'
              }}
              className="max-w-full max-h-full object-contain shadow-2xl rounded-lg origin-center"
            />
          </div>
        </div>
      )}

      {showTrailer && (
        <TrailerModal 
          storyboard={storyboard}
          onClose={() => setShowTrailer(false)}
          onUpdateStoryboard={onUpdateStoryboard}
        />
      )}

    </div>
  );
};

export default StoryboardDisplay;
