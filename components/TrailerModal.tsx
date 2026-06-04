/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useRef } from 'react';
import { Storyboard, StoryboardScene } from '../types';
import { 
  X, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX,
  Sparkles, Loader2, Download, AlertCircle, Film, RefreshCw, CheckCircle2, ChevronRight
} from 'lucide-react';
import { startVideoTrailerGeneration, checkVideoTrailerStatus, downloadVideoTrailerBlobUrl } from '../services/geminiService';

interface TrailerModalProps {
  storyboard: Storyboard;
  onClose: () => void;
  onUpdateStoryboard: (updated: Storyboard) => void;
}

// Simple browser Audio Synthesizer to create deep "Inception-like" trailer ambiance
class CinematicSynth {
  private ctx: AudioContext | null = null;
  private drone1: OscillatorNode | null = null;
  private drone2: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private gain: GainNode | null = null;

  start() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      
      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.setValueAtTime(100, this.ctx.currentTime);

      this.gain = this.ctx.createGain();
      this.gain.gain.setValueAtTime(0.06, this.ctx.currentTime); // Low background volume

      // Deep drone A0 (55Hz)
      this.drone1 = this.ctx.createOscillator();
      this.drone1.type = 'sawtooth';
      this.drone1.frequency.setValueAtTime(55, this.ctx.currentTime);

      // Warm third octave harmonic (82.4Hz - E2)
      this.drone2 = this.ctx.createOscillator();
      this.drone2.type = 'triangle';
      this.drone2.frequency.setValueAtTime(82.4, this.ctx.currentTime);

      this.drone1.connect(this.filter);
      this.drone2.connect(this.filter);
      this.filter.connect(this.gain);
      this.gain.connect(this.ctx.destination);

      this.drone1.start();
      this.drone2.start();
    } catch (e) {
      console.warn("Synth blocked or unsupported", e);
    }
  }

  triggerTransition() {
    if (!this.ctx || !this.filter || !this.gain) return;
    try {
      const now = this.ctx.currentTime;
      
      // Filter sweep to open up high harmonics temporarily
      this.filter.frequency.setValueAtTime(100, now);
      this.filter.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
      this.filter.frequency.exponentialRampToValueAtTime(110, now + 1.8);

      // Temporary volume bump for the impact beat
      this.gain.gain.setValueAtTime(0.06, now);
      this.gain.gain.linearRampToValueAtTime(0.18, now + 0.08);
      this.gain.gain.exponentialRampToValueAtTime(0.05, now + 1.5);

      // Deep sub impact
      const subBoom = this.ctx.createOscillator();
      subBoom.type = 'sine';
      subBoom.frequency.setValueAtTime(45, now);
      subBoom.frequency.exponentialRampToValueAtTime(10, now + 1.0);

      const boomGain = this.ctx.createGain();
      boomGain.gain.setValueAtTime(0.2, now);
      boomGain.gain.linearRampToValueAtTime(0.3, now + 0.05);
      boomGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

      subBoom.connect(boomGain);
      boomGain.connect(this.ctx.destination);
      subBoom.start();
      subBoom.stop(now + 2.1);
    } catch (e) {
      console.warn("Boom effect error", e);
    }
  }

  stop() {
    try {
      if (this.drone1) this.drone1.stop();
      if (this.drone2) this.drone2.stop();
      if (this.ctx) this.ctx.close();
    } catch (e) {}
    this.ctx = null;
  }
}

export const TrailerModal: React.FC<TrailerModalProps> = ({ storyboard, onClose, onUpdateStoryboard }) => {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSynthEnabled, setIsSynthEnabled] = useState(false);
  const synthRef = useRef<CinematicSynth | null>(null);
  
  // Video Generation States (Veo API)
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoStatus, setVideoStatus] = useState<'idle' | 'starting' | 'rendering' | 'downloading' | 'completed' | 'error'>('idle');
  const [videoError, setVideoError] = useState<string | null>(null);
  const [operationName, setOperationName] = useState<string>(storyboard.operationName || '');
  const [videoUrl, setVideoUrl] = useState<string>(storyboard.videoUrl || '');
  const [renderLogs, setRenderLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'cinematic' | 'ai-video'>('cinematic');

  const scenesWithImages = storyboard.scenes.filter(s => s.imageData);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const logTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize synth
  useEffect(() => {
    synthRef.current = new CinematicSynth();
    return () => {
      if (synthRef.current) {
        synthRef.current.stop();
      }
    };
  }, []);

  // Handle synth toggle
  const toggleSynth = () => {
    if (!synthRef.current) return;
    if (isSynthEnabled) {
      synthRef.current.stop();
      setIsSynthEnabled(false);
    } else {
      synthRef.current.start();
      synthRef.current.triggerTransition();
      setIsSynthEnabled(true);
    }
  };

  // Playback slideshow logic (5 seconds per frame)
  useEffect(() => {
    if (isPlaying && scenesWithImages.length > 0) {
      playbackIntervalRef.current = setInterval(() => {
        setCurrentSceneIndex(prev => {
          const next = prev >= scenesWithImages.length - 1 ? 0 : prev + 1;
          if (isSynthEnabled && synthRef.current) {
            synthRef.current.triggerTransition();
          }
          return next;
        });
      }, 5500);
    } else {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    }

    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, [isPlaying, scenesWithImages.length, isSynthEnabled]);

  // Reassuring status messages while generating long-running AI video
  const reassuringMessages = [
    "Iniciando Renderizador de Vídeos Avançado Google Veo Lite...",
    "Reunindo os prompts cinemáticos e estabelecendo correspondência estética...",
    "Vetorizando frames do storyboard para manter consistência física...",
    "Processando interpolação de quadros secundários e taxas de zoom...",
    "Sincronizando iluminação volumétrica dinâmica em cada segundo de animação...",
    "Comprimindo fluxo de bits MP4 de alta fidelidade cinematográfica...",
    "Quase pronto! Gravando metadados cinemáticos finais..."
  ];

  // Poll video status once we have an operation name
  useEffect(() => {
    let isMounted = true;
    let pollInterval: NodeJS.Timeout | null = null;

    if (operationName && !videoUrl && videoStatus !== 'completed' && videoStatus !== 'error') {
      setIsVideoLoading(true);
      setVideoStatus('rendering');
      
      // Simulated visual logs inside the rendering panel
      let logIndex = 0;
      setRenderLogs([reassuringMessages[0]]);
      
      logTimerRef.current = setInterval(() => {
        logIndex++;
        if (logIndex < reassuringMessages.length) {
          setRenderLogs(prev => [...prev, `${reassuringMessages[logIndex]}`]);
        }
      }, 10000);

      const checkStatus = async () => {
        try {
          const status = await checkVideoTrailerStatus(operationName);
          if (!isMounted) return;

          if (status.done) {
            if (status.error) {
              setVideoStatus('error');
              setVideoError(status.error);
              setIsVideoLoading(false);
              if (pollInterval) clearInterval(pollInterval);
              if (logTimerRef.current) clearInterval(logTimerRef.current);
            } else {
              setVideoStatus('downloading');
              setRenderLogs(prev => [...prev, "Download de arquivo MP4 em andamento..."]);
              
              // Download video blob and create a URL
              const url = await downloadVideoTrailerBlobUrl(operationName);
              if (!isMounted) return;

              setVideoUrl(url);
              setVideoStatus('completed');
              setIsVideoLoading(false);
              setRenderLogs(prev => [...prev, "Sucesso: O trailer cinemático de IA foi compilado e baixado!"]);
              
              // Persist to storyboard
              const updated = {
                ...storyboard,
                videoUrl: url,
                operationName: operationName
              };
              onUpdateStoryboard(updated);

              if (pollInterval) clearInterval(pollInterval);
              if (logTimerRef.current) clearInterval(logTimerRef.current);
            }
          }
        } catch (err: any) {
          console.error("Erro de polling:", err);
          // In case API returns 404 or auth issues
          if (isMounted) {
            setVideoStatus('error');
            setVideoError(err.message || "Erro inesperado na comunicação com o servidor de vídeo.");
            setIsVideoLoading(false);
            if (pollInterval) clearInterval(pollInterval);
            if (logTimerRef.current) clearInterval(logTimerRef.current);
          }
        }
      };

      // Run immediately first
      checkStatus();
      
      // Poll every 8 seconds
      pollInterval = setInterval(checkStatus, 8000);
    }

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
      if (logTimerRef.current) clearInterval(logTimerRef.current);
    };
  }, [operationName]);

  // Initiate AI Video Generation request
  const handleStartAiVideoGeneration = async () => {
    if (isVideoLoading) return;
    setIsVideoLoading(true);
    setVideoError(null);
    setVideoStatus('starting');
    setRenderLogs(["Iniciando solicitação de renderização ao modelo Veo..."]);

    const summaryPrompt = `Cinematic movie trailer, style: ${storyboard.style}. Visual narrative: ${
      storyboard.scenes.map(s => s.visualPrompt.substring(0, 50)).join(' transitioning into ')
    }. Dramatic camera motion with slow pan and volumetric lights, UHD definition, visual depth.`;

    try {
      // Find base64 of first storyboard image to guide keyframing
      const firstSceneWithImage = storyboard.scenes.find(s => s.imageData);
      const startImageBase64 = firstSceneWithImage?.imageData;

      const opName = await startVideoTrailerGeneration(summaryPrompt, startImageBase64);
      
      setOperationName(opName);
      
      // Update storyboard initially with operation info
      const updated = {
        ...storyboard,
        operationName: opName
      };
      onUpdateStoryboard(updated);
    } catch (err: any) {
      console.error(err);
      setIsVideoLoading(false);
      setVideoStatus('error');
      
      // Standard descriptive help message
      if (err.message && (err.message.includes("quota") || err.message.includes("billing") || err.message.includes("faturamento"))) {
        setVideoError("Esta operação exige uma chave de API paga ativa do Google Cloud. Seu plano atual foi bloqueado.");
      } else {
        setVideoError(err.message || "Não foi possível iniciar a IA de vídeo. Detalhes indisponíveis.");
      }
    }
  };

  const handleNextScene = () => {
    if (scenesWithImages.length === 0) return;
    setCurrentSceneIndex(prev => {
      const next = prev >= scenesWithImages.length - 1 ? 0 : prev + 1;
      if (isSynthEnabled && synthRef.current) {
        synthRef.current.triggerTransition();
      }
      return next;
    });
  };

  const handlePrevScene = () => {
    if (scenesWithImages.length === 0) return;
    setCurrentSceneIndex(prev => {
      const next = prev === 0 ? scenesWithImages.length - 1 : prev - 1;
      if (isSynthEnabled && synthRef.current) {
        synthRef.current.triggerTransition();
      }
      return next;
    });
  };

  const activeScene = scenesWithImages[currentSceneIndex];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/98 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none animate-in fade-in duration-300">
      
      {/* Cinematic Frame Border Wrapper */}
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden relative shadow-2xl">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-white/5 flex items-center justify-between shrink-0 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-cyan-500 to-indigo-500 p-2 rounded-xl text-white">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Sala de Edição de Trailer 
                <span className="text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">BETA MULTIPLEX</span>
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400 font-light truncate max-w-[280px] sm:max-w-md">Projeto: {storyboard.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View selectors */}
            <div className="bg-slate-900 p-1 rounded-lg border border-white/5 flex items-center text-xs">
              <button 
                onClick={() => setActiveTab('cinematic')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all ${
                  activeTab === 'cinematic' 
                    ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Trailer Interativo
              </button>
              <button 
                onClick={() => setActiveTab('ai-video')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1 ${
                  activeTab === 'ai-video' 
                    ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Vídeo Real (AI Veo)</span>
              </button>
            </div>

            <button 
              onClick={() => {
                if (synthRef.current) synthRef.current.stop();
                onClose();
              }}
              className="p-2 sm:p-2.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Tabs */}
        {activeTab === 'cinematic' ? (
          /* CINEMATIC INTERACTIVE SLIDESHOW PLAYER */
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row bg-slate-900 overflow-y-auto">
            
            {/* Left Portion: Cinema Screen */}
            <div className="flex-1 bg-black flex flex-col justify-between relative min-h-[300px] lg:min-h-0">
              
              {/* Subs or top markers */}
              <div className="absolute top-4 left-4 z-20 pointer-events-none">
                <span className="text-[10px] font-mono tracking-widest bg-black/60 backdrop-blur-sm border border-white/15 px-3 py-1.5 rounded-lg text-slate-300 font-semibold">
                  Cena {activeScene ? activeScene.number : '0'} de {scenesWithImages.length}
                </span>
              </div>

              {/* Central Screen with Ken Burns effect */}
              <div className="flex-1 w-full flex items-center justify-center relative overflow-hidden backdrop-blur-3xl">
                {activeScene ? (
                  <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
                    
                    {/* Blurred backing for immersive background expansion */}
                    <img 
                      src={activeScene.imageData} 
                      alt="" 
                      className="absolute inset-0 w-full h-full object-cover opacity-15 blur-2xl scale-125 select-none"
                    />

                    {/* True Ken burns zoom image */}
                    <img 
                      src={activeScene.imageData} 
                      alt={activeScene.title} 
                      className={`max-w-full max-h-full object-contain relative z-10 transition-transform shadow-2xl select-none ${
                        isPlaying ? 'animate-kenburns' : 'scale-100'
                      }`}
                      style={{
                        animationDuration: '6s',
                        transformOrigin: '50% 50%'
                      }}
                    />

                    {/* Movie Subtitles overlay */}
                    <div className="absolute bottom-6 left-4 right-4 sm:left-10 sm:right-10 z-20 text-center select-text">
                      <div className="bg-black/70 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/5 inline-block max-w-2xl mx-auto shadow-md">
                        <p className="text-[11px] font-mono text-cyan-400 font-bold uppercase tracking-wider mb-0.5">{activeScene.title}</p>
                        <p className="text-white text-xs sm:text-base font-medium tracking-wide drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,1)] text-center leading-normal">
                          {activeScene.dialogue || "- [Silêncio / Narração Instrumental] -"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-8 space-y-4">
                    <Film className="w-16 h-16 text-slate-700 animate-pulse" />
                    <div className="space-y-1">
                      <p className="text-white font-bold text-lg">Ilustrações Indisponíveis</p>
                      <p className="text-slate-400 text-sm max-w-sm">DICA: Feche esta janela, clique em "Ilustrar Storyboard" para renderizar as imagens e volte aqui para rodar o trailer!</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Timeline Progress Bar indicator */}
              <div className="w-full h-1.5 bg-slate-800 relative z-20 overflow-hidden shrink-0">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 transition-all duration-[5500ms] ease-linear"
                  style={{ 
                    width: isPlaying ? '100%' : `${((currentSceneIndex + 1) / scenesWithImages.length) * 100}%`,
                    key: `timeline-tick-${currentSceneIndex}-${isPlaying}` 
                  }}
                ></div>
              </div>
            </div>

            {/* Right Portion: Action Info Cue & Soundtrack Controls */}
            <div className="w-full lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l border-white/5 flex flex-col justify-between bg-slate-950 p-4 sm:p-5 space-y-5">
              
              {/* Scene cue card */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold font-mono tracking-wider uppercase text-slate-500">CENA ATUAL / DIREÇÃO</h3>
                
                {activeScene ? (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 font-mono tracking-wider uppercase bg-slate-900 border border-white/5 px-2.5 py-1 rounded-sm w-fit">
                        {activeScene.camera}
                      </div>
                      <h4 className="text-white font-bold text-sm sm:text-base leading-tight mt-1">{activeScene.title}</h4>
                    </div>

                    <div className="bg-slate-900/50 border border-white/5 p-3 rounded-xl space-y-1 text-xs">
                      <p className="font-bold text-cyan-400 font-mono uppercase text-[9px] tracking-widest">Ação Visual</p>
                      <p className="text-slate-300 leading-relaxed font-light">{activeScene.action}</p>
                    </div>

                    <div className="bg-slate-900/50 border border-white/5 p-3 rounded-xl space-y-1 text-xs">
                      <p className="font-bold text-purple-400 font-mono uppercase text-[9px] tracking-widest">Prompt de Imagem (AI)</p>
                      <p className="text-slate-400 italic leading-relaxed font-light line-clamp-3 select-all" title={activeScene.visualPrompt}>
                        "{activeScene.visualPrompt}"
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 font-light italic">Nenhuma cena disponível no momento.</p>
                )}
              </div>

              {/* Synthesis ambient sound track setting */}
              <div className="bg-slate-900 border border-white/5 p-3 rounded-xl flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <p className="text-white font-bold flex items-center gap-1.5">
                    Trilha Ambiência
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  </p>
                  <p className="text-[10px] text-slate-400">Sintetizador Web Audio API</p>
                </div>

                <button 
                  onClick={toggleSynth}
                  className={`p-2 rounded-xl transition-all border flex items-center gap-1.5 ${
                    isSynthEnabled 
                      ? 'bg-cyan-950 text-cyan-400 border-cyan-800' 
                      : 'bg-slate-800 text-slate-400 border-white/5 hover:text-white'
                  }`}
                  title={isSynthEnabled ? "Desativar Sintetizador" : "Ativar Sintetizador"}
                >
                  {isSynthEnabled ? (
                    <>
                      <Volume2 className="w-4 h-4" />
                      <span className="font-bold font-mono text-[10px]">Ligado</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-4 h-4" />
                      <span className="font-bold font-mono text-[10px]">Desligado</span>
                    </>
                  )}
                </button>
              </div>

              {/* Lower segment: Playback Control Bar */}
              <div className="flex flex-col gap-3 shrink-0 pt-4 border-t border-white/5">
                <div className="flex items-center justify-center gap-3">
                  <button 
                    onClick={handlePrevScene}
                    disabled={scenesWithImages.length === 0}
                    className="p-3 rounded-full bg-slate-900 border border-white/10 hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 transition-all text-xs"
                    title="Cena Anterior"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    disabled={scenesWithImages.length === 0}
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold transition-all transform hover:scale-105 shadow-lg ${
                      isPlaying 
                        ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-650/30' 
                        : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-650/30'
                    }`}
                    title={isPlaying ? "Pausar" : "Iniciar Slideshow Automático"}
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white translate-x-0.5" />}
                  </button>

                  <button 
                    onClick={handleNextScene}
                    disabled={scenesWithImages.length === 0}
                    className="p-3 rounded-full bg-slate-900 border border-white/10 hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 transition-all text-xs"
                    title="Próxima Cena"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-center text-[10px] text-slate-500 font-mono uppercase tracking-widest">Controles de Transição</p>
              </div>

            </div>
          </div>
        ) : (
          /* REAL AI MOVIE VIDEO GENERATOR PANEL - GOOGLE VEO */
          <div className="flex-1 min-h-0 flex flex-col md:flex-row bg-slate-900 overflow-y-auto">
            
            {/* Screen Box: Video Player */}
            <div className="flex-1 bg-black flex items-center justify-center relative min-h-[300px] md:min-h-0 p-4">
              
              {videoUrl ? (
                /* Completed HTML5 video playback */
                <div className="w-full h-full flex flex-col items-center justify-center relative max-w-4xl mx-auto space-y-4">
                  <div className="aspect-video w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative bg-black">
                    <video 
                      src={videoUrl} 
                      controls 
                      autoPlay 
                      loop
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex gap-3 justify-center">
                    <a 
                      href={videoUrl} 
                      download={`trailer-veo-${storyboard.title.replace(/\s+/g, '-').toLowerCase()}.mp4`}
                      className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold font-display flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>Baixar Vídeo MP4</span>
                    </a>
                    
                    <button 
                      onClick={handleStartAiVideoGeneration}
                      className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold font-display flex items-center gap-2 border border-white/5 transition-all"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Gerar Outro</span>
                    </button>
                  </div>
                </div>
              ) : videoStatus === 'idle' ? (
                /* Idle generate card setup */
                <div className="text-center p-8 space-y-6 max-w-md">
                  <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center text-cyan-400 mx-auto border border-cyan-500/30">
                    <Film className="w-8 h-8 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-white font-bold text-lg">Gerador de Vídeos Realistas</h3>
                    <p className="text-slate-400 text-xs sm:text-sm leading-relaxed font-light">
                      Crie uma prévia animada contínua de 16:9 de forma real baseada em seus prompts usando o modelo <b>Google Veo Lite 3.1</b> no servidor do Google Cloud.
                    </p>
                  </div>

                  <button 
                    onClick={handleStartAiVideoGeneration}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:brightness-110 text-white rounded-xl text-sm font-bold shadow-lg shadow-cyan-500/20 transition-all inline-flex items-center gap-2 animate-bounce mt-2"
                  >
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>Compilar Vídeo Trailer Real</span>
                  </button>
                </div>
              ) : videoStatus === 'error' ? (
                /* Error card with instructions */
                <div className="text-center p-8 space-y-6 max-w-md">
                  <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-400 mx-auto border border-red-500/30">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-white font-bold text-lg">Erro na Geração Comercial</h3>
                    <p className="text-red-300 text-xs leading-relaxed font-mono p-3 bg-red-950/40 rounded-xl border border-red-900">
                      {videoError}
                    </p>
                    <p className="text-slate-400 text-xs leading-relaxed font-light pt-2">
                      Dica: Geração de vídeo exige uma chave paga faturada ativada no Google Cloud Console. Você pode continuar visualizando a bela animação usando a aba <b>"Trailer Interativo"</b>!
                    </p>
                  </div>

                  <button 
                    onClick={handleStartAiVideoGeneration}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all border border-white/5 inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Tentar Novamente</span>
                  </button>
                </div>
              ) : (
                /* Render logging and progress */
                <div className="space-y-6 w-full max-w-lg p-6 bg-slate-900/60 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden backdrop-blur-xl">
                  
                  <div className="flex flex-col items-center space-y-4 text-center">
                    <span className="relative flex h-12 w-12">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-12 w-12 bg-cyan-600 flex items-center justify-center"><Loader2 className="w-6 h-6 text-white animate-spin" /></span>
                    </span>
                    <div className="space-y-1">
                      <h4 className="text-white font-bold text-base">Processo de Renderização Ativo</h4>
                      <p className="text-slate-400 text-xs font-light">Este processo de compilação cinemática pode levar alguns minutos.</p>
                    </div>
                  </div>

                  {/* Horizontal progress indicators */}
                  <div className="grid grid-cols-4 gap-2">
                    {['Iniciando', 'Texturização', 'Interpolação', 'Compressão'].map((step, idx) => {
                      const isActive = (videoStatus === 'starting' && idx === 0) || 
                                       (videoStatus === 'rendering' && idx >= 1 && idx <= 2) || 
                                       (videoStatus === 'downloading' && idx === 3);
                      return (
                        <div key={idx} className="space-y-1.5">
                          <div className={`h-1.5 rounded-full ${isActive ? 'bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'bg-slate-800'}`}></div>
                          <span className="text-[9px] font-mono tracking-wider font-bold text-center block text-slate-500 uppercase">{step}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Rendering incremental debug logger terminal */}
                  <div className="bg-black/80 rounded-xl p-4 font-mono text-[10px] text-emerald-400 border border-white/5 max-h-40 overflow-y-auto space-y-1 text-left select-text">
                    <div className="text-slate-500">--- INÍCIO DOS LOGS DE COMPILAÇÃO ---</div>
                    {renderLogs.map((log, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-emerald-600 font-bold">[{new Date().toLocaleTimeString()}]</span>
                        <span className="text-emerald-300 font-light">{log}</span>
                      </div>
                    ))}
                    <div className="text-cyan-500 flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                      <span>Aguardando resposta do servidor do Google Cloud...</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-center text-slate-500 italic">Sinta-se à vontade para alternar de aba para o trailer interativo enquanto aguarda.</p>
                </div>
              )}

            </div>

            {/* Sidebar Details for Video prompt */}
            <div className="w-full md:w-80 shrink-0 border-t md:border-t-0 md:border-l border-white/5 flex flex-col justify-between bg-slate-950 p-4 sm:p-5 space-y-5">
              
              <div className="space-y-4">
                <h3 className="text-xs font-bold font-mono tracking-wider uppercase text-slate-500">ROTEIRO MULTIPLEX (VEO V1)</h3>
                
                <div className="space-y-4">
                  <div className="space-y-1 bg-slate-900 p-3 rounded-xl border border-white/5 text-xs">
                    <p className="font-bold text-cyan-400 font-mono uppercase text-[9px] tracking-widest">Fórmula de Prompt Inteligente</p>
                    <p className="text-slate-300 font-light leading-relaxed pt-1.5">
                      Combina esteticamente a estampa do storyboard (<b>{storyboard.style}</b>) com a sequência narrativa de transições e enquadramentos de suas {storyboard.scenes.length} cenas em um único prompt de vídeo de altíssima definição.
                    </p>
                  </div>

                  <div className="space-y-1 bg-slate-900 p-3 rounded-xl border border-white/5 text-xs">
                    <p className="font-bold text-purple-400 font-mono uppercase text-[9px] tracking-widest">Modelo de Destino</p>
                    <p className="text-slate-400 pt-1 leading-relaxed font-light">
                      veo-3.1-lite-generate-preview (Lançamento Widescreen 16:9 - 720p).
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-amber-950/20 border border-amber-500/20 px-3.5 py-3 rounded-xl text-[11px] text-amber-200 leading-normal font-light">
                <span className="font-bold block mb-1">💡 Observações de Custo:</span>
                A geração de vídeos com o Google Veo consome cotas de chaves ativas cobradas por segundo criado. Certifique-se de configurar em sua conta.
              </div>

            </div>

          </div>
        )}

      </div>

      {/* Styled class injection for the Ken Burns animation */}
      <style>{`
        @keyframes kenburns {
          0% { transform: scale(1.02) translate(0, 0); }
          50% { transform: scale(1.11) translate(-0.8%, 0.4%); }
          100% { transform: scale(1.04) translate(0.4%, -0.4%); }
        }
        .animate-kenburns {
          animation: kenburns 6s ease-in-out infinite alternate !important;
        }
      `}</style>

    </div>
  );
};
