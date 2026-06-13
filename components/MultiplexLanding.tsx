/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useRef, useState } from 'react';
import { 
  ChevronLeft, ChevronRight, Sparkles, Key, Film, 
  Settings, Play, PlayCircle, Star, ArrowRight, ShieldCheck, Gamepad2, Info,
  LogOut, Cloud
} from 'lucide-react';

interface MultiplexLandingProps {
  selectedLlm: string;
  onSelectLlm: (id: string) => void;
  onNavigate: (page: 'landing' | 'creator') => void;
  onSelectKey: () => void;
  hasApiKey: boolean;
  storyboardsCount: number;
  googleUser: any;
  isLoggingIn: boolean;
  onGoogleLogin: () => void;
  onGoogleLogout: () => void;
}

export const MultiplexLanding: React.FC<MultiplexLandingProps> = ({
  selectedLlm,
  onSelectLlm,
  onNavigate,
  onSelectKey,
  hasApiKey,
  storyboardsCount,
  googleUser,
  isLoggingIn,
  onGoogleLogin,
  onGoogleLogout
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  const llmModels = [
    {
      id: 'Google Gemini',
      title: 'Gemini Pro',
      publisher: 'Google Cloud native',
      category: 'Nativo / Ativo',
      rating: '5.0',
      description: 'Direção cinematográfica moderna com enquadramentos premium e grounding de IA em tempo real.',
      themeColor: 'from-cyan-500 via-blue-600 to-indigo-600',
      badgeBg: 'bg-cyan-950 text-cyan-300 border-cyan-800',
      glowColor: 'shadow-cyan-500/20',
      neonText: 'text-cyan-400',
      bgPattern: 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-950/40 via-slate-950 to-black',
      posterText: 'NATIVO'
    },
    {
      id: 'OpenAI GPT-5.5',
      title: 'GPT-5.5 Pro',
      publisher: 'OpenAI Series',
      category: 'Conversacional',
      rating: '4.9',
      description: 'Modelo de super-precisão focado em diálogos, caracterização literária e roteiro profundo.',
      themeColor: 'from-emerald-500 via-green-600 to-teal-600',
      badgeBg: 'bg-emerald-950 text-emerald-300 border-emerald-800',
      glowColor: 'shadow-emerald-500/20',
      neonText: 'text-emerald-400',
      bgPattern: 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-950/40 via-slate-950 to-black',
      posterText: 'SUPER AI'
    },
    {
      id: 'Anthropic Claude',
      title: 'Claude 3.5',
      publisher: 'Anthropic Group',
      category: 'Prosa Literária',
      rating: '4.9',
      description: 'Refinamento supremo de diálogos teatrais e escrita descritiva com rica inteligibilidade emocional.',
      themeColor: 'from-amber-500 via-orange-600 to-red-600',
      badgeBg: 'bg-amber-950 text-amber-300 border-amber-800',
      glowColor: 'shadow-amber-500/20',
      neonText: 'text-amber-400',
      bgPattern: 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-950/40 via-slate-950 to-black',
      posterText: 'POESIA'
    },
    {
      id: 'Meta Llama',
      title: 'Llama 3.1',
      publisher: 'Meta OpenSource',
      category: 'Ação e Ritmo',
      rating: '4.8',
      description: 'Gera ganchos dinâmicos e ritmos de ação sequencial eletrizantes para storyboards de alto impacto.',
      themeColor: 'from-blue-500 via-indigo-600 to-purple-600',
      badgeBg: 'bg-blue-950 text-blue-300 border-blue-800',
      glowColor: 'shadow-blue-500/20',
      neonText: 'text-blue-400',
      bgPattern: 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-950/40 via-slate-950 to-black',
      posterText: 'KINETIC'
    },
    {
      id: 'Mistral AI Mistral',
      title: 'Mistral Large',
      publisher: 'Mistral AI Team',
      category: 'Estruturação',
      rating: '4.7',
      description: 'Composições concisas com lógica de enquadramentos precisa e ricas em coesão europeia clássica.',
      themeColor: 'from-pink-500 via-rose-600 to-purple-600',
      badgeBg: 'bg-pink-950 text-pink-300 border-pink-800',
      glowColor: 'shadow-pink-500/20',
      neonText: 'text-pink-400',
      bgPattern: 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-pink-950/40 via-slate-950 to-black',
      posterText: 'SIMÉTRICO'
    }
  ];

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const { scrollLeft, clientWidth } = scrollContainerRef.current;
      const scrollTo = direction === 'left' 
        ? scrollLeft - clientWidth * 0.5 
        : scrollLeft + clientWidth * 0.5;
      
      scrollContainerRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  const selectAndGo = (id: string) => {
    onSelectLlm(id);
    onNavigate('creator');
  };

  return (
    <div className="min-h-screen bg-[#030712] text-white overflow-x-hidden p-3 sm:p-6 md:p-8 relative select-none font-sans">
      
      {/* Absolute futuristic ambient styling */}
      <div className="absolute inset-x-0 top-0 h-[500px] bg-gradient-to-b from-indigo-950/20 via-slate-950/10 to-transparent pointer-events-none z-0"></div>
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-purple-500/5 blur-[120px] rounded-full pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 relative z-10">
        
        {/* Custom Top Navigation header matched to image 1 & 2 styles */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2 border-b border-white/5 pb-5">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 p-2.5 rounded-2xl border border-cyan-400/30 text-white shadow-lg relative overflow-hidden">
              <Film className="w-5.5 h-5.5 text-white active:scale-95 transition-transform" />
              <div className="absolute inset-0 bg-white/10 blur-[2px] hover:blur-none transition-all"></div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-black text-xl sm:text-2xl tracking-tight uppercase">
                  Story<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400">Creator</span>
                </h1>
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/40 uppercase tracking-widest">
                  Multiplex Hub
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 font-mono tracking-wide">Plataforma de Roteiros Cinematográficos & Criação de Consistência</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Google Drive Status Button/Profile */}
            {googleUser ? (
              <div className="flex items-center gap-2 bg-slate-900/90 border border-cyan-500/30 pl-2 pr-3 py-1.5 rounded-xl">
                {googleUser.photoURL ? (
                  <img src={googleUser.photoURL} alt={googleUser.displayName || 'Google'} className="w-6 h-6 rounded-lg pointer-events-none" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-6 h-6 bg-cyan-700 rounded-lg flex items-center justify-center font-bold text-[10px]">{(googleUser.displayName || 'G')[0]}</div>
                )}
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-bold text-slate-200 leading-none block truncate max-w-[90px]">{googleUser.displayName}</span>
                  <span className="text-[8px] font-mono text-cyan-400 leading-none mt-0.5">@ Google Drive</span>
                </div>
                <button 
                  onClick={onGoogleLogout} 
                  className="ml-1 p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                  title="Desconectar do Google"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button 
                onClick={onGoogleLogin}
                disabled={isLoggingIn}
                className="px-4 py-2 bg-slate-900/90 border border-white/10 hover:border-cyan-400/50 hover:bg-slate-800 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-xl tracking-wide transition-all flex items-center gap-2 shadow-lg"
              >
                <Cloud className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isLoggingIn ? 'Conectando...' : 'Conectar Google Drive'}</span>
              </button>
            )}

            {/* Status Beacon based on API key state like Image 2 */}
            <div className="hidden md:flex items-center gap-2 bg-slate-900/80 border border-white/10 px-3 py-1.5 rounded-xl">
              <span className="relative flex h-1.5 w-1.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${hasApiKey ? 'bg-cyan-400' : 'bg-amber-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${hasApiKey ? 'bg-cyan-500' : 'bg-amber-500'}`}></span>
              </span>
              <span className="text-[10px] font-mono text-slate-300 font-semibold uppercase">
                {hasApiKey ? 'Status: Faturamento Ativo' : 'Status: Aguardando Chave'}
              </span>
            </div>

            <button 
              onClick={() => onNavigate('creator')}
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] text-white text-xs font-bold rounded-xl tracking-wider transition-all border border-cyan-400/30 flex items-center gap-1.5"
            >
              <span>ABRIR ESTÚDIO</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Multiplex Cinema Grid - MAIN GRID BLOCK */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6">
          
          {/* Left Block (Columns 1 to 9): Model Library with Horizontal Slider and bottom Deals Unlocked Banner */}
          <div className="lg:col-span-9 flex flex-col justify-between gap-5 md:gap-6 min-h-[500px]">
            
            {/* Horizontal Slider Header and Slides */}
            <div className="space-y-3 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-sm sm:text-base font-extrabold uppercase font-mono tracking-widest text-slate-200">
                    Motores Gratuitos de Escrita (LLM AI)
                  </h2>
                </div>
                
                {/* Horizontal slider controllers matched to Image 1 */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleScroll('left')}
                    className="p-1.5 rounded-full bg-slate-900 border border-white/10 hover:bg-slate-800 text-slate-300 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleScroll('right')}
                    className="p-1.5 rounded-full bg-slate-900 border border-white/10 hover:bg-slate-800 text-slate-300 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Horizontal Scroll container containing the beautiful movie-poster styled cards */}
              <div 
                ref={scrollContainerRef}
                className="flex items-center overflow-x-auto gap-4 scrollbar-none pb-4 relative scroll-smooth overflow-y-hidden"
              >
                {llmModels.map((item) => {
                  const isCurrentlySelected = selectedLlm === item.id;
                  return (
                    <div 
                      key={item.id}
                      onClick={() => selectAndGo(item.id)}
                      className={`group flex-shrink-0 w-44 sm:w-52 h-72 sm:h-80 rounded-2xl relative overflow-hidden cursor-pointer border transition-all duration-300 flex flex-col justify-between p-4 ${
                        isCurrentlySelected 
                        ? 'border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.3)] ring-1 ring-cyan-500/30' 
                        : 'border-white/5 bg-slate-900/60 hover:border-white/20 hover:scale-[1.02]'
                      }`}
                    >
                      {/* Ambient background grid + patterns inspired by 1.png */}
                      <div className="absolute inset-0 z-0 opacity-15 bg-[radial-gradient(#0891b2_1px,transparent_1px)] [background-size:16px_16px]"></div>
                      <div className={`absolute inset-0 z-0 opacity-30 ${item.bgPattern}`}></div>
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent z-10"></div>
                      
                      {/* Top elements */}
                      <div className="relative z-20 flex justify-between items-start">
                        <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-slate-400">
                          {item.publisher}
                        </span>
                        
                        <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded px-1.5 py-0.5 border border-white/5 text-[9px]">
                          <Star className="w-2.5 h-2.5 text-amber-400 fill-current" />
                          <span className="font-bold text-white">{item.rating}</span>
                        </div>
                      </div>

                      {/* Poster Art Graphic in the middle */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-30 group-hover:opacity-40 transition-opacity pointer-events-none">
                        <span className="text-3xl md:text-4xl font-black tracking-widest text-white/5 select-none font-mono uppercase">
                          {item.posterText}
                        </span>
                      </div>

                      {/* Highlighted top colored bar when active */}
                      {isCurrentlySelected && (
                        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 animate-pulse"></div>
                      )}

                      {/* Content on bottom segment */}
                      <div className="relative z-20 space-y-2 mt-auto">
                        <div className="space-y-0.5">
                          <h3 className="font-display font-extrabold text-sm sm:text-base leading-tight tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                            {item.title}
                          </h3>
                          <div className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border leading-none inline-block ${item.badgeBg}`}>
                            {item.category}
                          </div>
                        </div>

                        <p className="text-[10px] text-slate-400 font-light leading-relaxed line-clamp-2">
                          {item.description}
                        </p>

                        <div className="flex items-center justify-between border-t border-white/5 pt-2 text-[10px] font-mono">
                          <span className={`${item.neonText} font-bold`}>
                            {isCurrentlySelected ? '● ATIVO' : 'DISPONÍVEL'}
                          </span>
                          <span className="text-slate-550 group-hover:text-white transition-colors flex items-center gap-0.5">
                            Começar <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DEALS UNLOCKED BANNER AT THE BOTTOM-LEFT (Styled exactly like the banner in 1.png) */}
            <div 
              onClick={() => onNavigate('creator')}
              className="bg-gradient-to-r from-red-600 via-pink-600 to-indigo-600 rounded-3xl p-5 md:p-6 relative overflow-hidden cursor-pointer shadow-xl border border-white/10 group flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Halftone dot pattern background */}
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
              <div className="absolute inset-0 bg-black/10 mix-blend-overlay"></div>
              
              <div className="space-y-1 relative z-10">
                <div className="flex items-center gap-2">
                  {/* Glowing action sticker tag */}
                  <span className="bg-slate-950 text-white font-extrabold text-[9px] md:text-[10px] tracking-widest uppercase px-3 py-1 rounded shadow-md border border-white/10">
                    DEALS UNLOCKED
                  </span>
                  <span className="text-[10px] font-mono text-pink-300 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 animate-pulse" />
                    Cotas Livres Ativadas
                  </span>
                </div>
                
                <h3 className="text-2xl md:text-3.5xl font-black tracking-tight text-white uppercase leading-none pt-1">
                  Crie Storyboards Sem Custos
                </h3>
                
                <p className="text-[11px] md:text-xs text-white/80 font-light max-w-xl">
                  Utilize qualquer uma de nossas inteligências gratuitas de alto gabarito técnico para rascunhar, formatar e criar roteiros ilimitados com consistência 16:9 de cinema!
                </p>
              </div>

              {/* Large high-contrast action button */}
              <div className="shrink-0 relative z-10 self-end md:self-auto">
                <button className="px-6 py-3 bg-slate-950 text-white border border-white/15 hover:border-cyan-400 font-extrabold text-xs tracking-widest rounded-xl transition-all shadow-lg group-hover:scale-105 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] uppercase flex items-center gap-1.5">
                  <span>Criar Storyboard</span>
                  <Play className="w-3 h-3 fill-current" />
                </button>
              </div>
            </div>

          </div>

          {/* Right Block (Columns 10 to 12): Taller Flagship Cards mimicking Subnautica 2 and Microsoft Jewel */}
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-5 md:gap-6">
            
            {/* FLAGSHIP CARD 1: GOOGLE VEO CINEMATIC VIDEO TRAILER (Inspired by the Subnautica 2 layout) */}
            <div 
              onClick={() => onNavigate('creator')}
              className="bg-slate-900 border border-cyan-500/30 rounded-3xl relative overflow-hidden cursor-pointer group flex flex-col justify-between p-5 min-h-[250px] shadow-lg hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-all duration-300"
            >
              {/* Rich glowing graphic background imitating underwater/deep sea glows of Subnautica 2 screenshot */}
              <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#022329]_10% via-[#030712]_70% to-[#030712] opacity-80"></div>
              <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_bottom,_var(--tw-gradient-stops))] from-cyan-950/60 via-transparent to-transparent"></div>
              
              {/* Dynamic abstract animation grid */}
              <div className="absolute inset-0 opacity-15 bg-[linear-gradient(rgba(6,182,212,0.1)_1px,transparent_1px)] bg-[size:15px_15px] z-0"></div>
              
              {/* Neon cyan water particles / lights */}
              <div className="absolute bottom-10 right-10 w-24 h-24 bg-cyan-400/15 blur-2xl rounded-full animate-pulse"></div>
              <div className="absolute bottom-6 left-12 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping"></div>

              <div className="relative z-10 space-y-1">
                <span className="text-[8px] font-mono font-bold tracking-widest bg-cyan-950 text-cyan-400 border border-cyan-900 px-2.5 py-1 rounded uppercase">
                  VEO ENGINE
                </span>
                <p className="text-[10px] text-slate-400 font-mono pt-1">Google Generative Video</p>
              </div>

              {/* Central glowing logotype mimicking SUBNAUTICA 2 style */}
              <div className="relative z-10 py-6 text-center">
                <h3 className="font-display font-black text-xl md:text-2xl leading-none uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-100 to-cyan-400 drop-shadow-[0_2px_10px_rgba(6,182,212,0.3)]">
                  VEO VIDEO
                </h3>
                <span className="text-[9px] font-extrabold uppercase text-cyan-300 tracking-[0.25em] bg-cyan-950/60 border border-cyan-500/20 px-2 py-0.5 rounded-full mt-1.5 inline-block">
                  TRAILER 3.1
                </span>
              </div>

              <div className="relative z-10 space-y-2 border-t border-white/5 pt-3">
                <p className="text-[10px] text-slate-350 leading-relaxed font-light">
                  Transforme os quadros gerados do seu storyboard em animações MP4 contínuas e hiper-realistas de 16:9.
                </p>
                <div className="flex items-center justify-between text-[10px] font-bold text-cyan-400">
                  <span>GERAR PREVIA VEO</span>
                  <PlayCircle className="w-4 h-4 fill-cyan-950 animate-bounce" />
                </div>
              </div>
            </div>

            {/* FLAGSHIP CARD 2: API KEY CONFIGURATION (Inspired by Microsoft Jewel screen design with neon crystals) */}
            <div 
              onClick={onSelectKey}
              className="bg-slate-900 border border-purple-500/30 rounded-3xl relative overflow-hidden cursor-pointer group flex flex-col justify-between p-5 min-h-[250px] shadow-lg hover:border-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.25)] transition-all duration-300"
            >
              {/* Colorful gradient representing glowing gem crystals of Microsoft Jewel */}
              <div className="absolute inset-0 z-0 bg-gradient-to-t from-purple-950/40 via-slate-950/70 to-slate-950"></div>
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-fuchsia-500/10 to-transparent blur-xl"></div>
              
              {/* Jewel vector lines overlay */}
              <div className="absolute inset-0 opacity-10 bg-[linear-gradient(45deg,rgba(168,85,247,0.2)_1px,transparent_1px)] bg-[size:20px_20px]"></div>

              <div className="relative z-10 space-y-1">
                <span className="text-[8px] font-mono font-bold tracking-widest bg-purple-950 text-purple-400 border border-purple-900 px-2.5 py-1 rounded uppercase">
                  CONFIGURAÇÕES
                </span>
                <p className="text-[10px] text-slate-400 font-mono pt-1">Faturamento Studio</p>
              </div>

              {/* Jewel Glowing diamond representation */}
              <div className="relative z-10 py-6 text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 border border-white/20 flex items-center justify-center rotate-45 group-hover:rotate-90 transition-transform duration-700 shadow-lg shadow-purple-500/20 mb-2">
                  <Key className="w-5 h-5 text-white -rotate-45 group-hover:-rotate-90 transition-transform duration-700" />
                </div>
                <h3 className="font-display font-black text-sm tracking-widest text-slate-200 uppercase mt-1">
                  Multiplex API
                </h3>
              </div>

              <div className="relative z-10 space-y-2 border-t border-white/5 pt-3">
                <p className="text-[10px] text-slate-350 leading-relaxed font-light">
                  {hasApiKey ? 'Chave de faturamento conectada com sucesso!' : 'Prevenção de limites: Adicione sua chave e evite as cotas grátis do Google Cloud.'}
                </p>
                <div className="flex items-center justify-between text-[10px] font-bold text-purple-400">
                  <span>{hasApiKey ? 'CONTA CONECTADA' : 'CONECTAR CHAVE'}</span>
                  <Settings className="w-4 h-4 text-purple-400 shrink-0" />
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Footer info tip matching image 2 guidelines */}
        <footer className="pt-4 border-t border-white/5 text-center flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-slate-500 font-mono">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
            <span className="text-left font-light-leading-normal">
              Selecione o modelo desejado clicando no painel das ferramentas de IA para ir à segunda página e estruturar o seu roteiro completo.
            </span>
          </div>
          <div>
            <span>Multiplex v2.26 • {storyboardsCount} Projetos em Memória</span>
          </div>
        </footer>

      </div>
    </div>
  );
};
