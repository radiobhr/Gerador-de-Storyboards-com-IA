/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect } from 'react';
import { Storyboard, StoryboardType, VisualStyle, Language, UploadedFile } from './types';
import { generateStoryboardOutline } from './services/geminiService';
import StoryboardDisplay from './components/StoryboardDisplay';
import Loading from './components/Loading';
import IntroScreen from './components/IntroScreen';
import SearchResults from './components/SearchResults';
import { 
  Clapperboard, Upload, FileText, AudioLines, Table, ScrollText, 
  AlertCircle, History, Sparkles, Key, Sun, Moon, ExternalLink, 
  Trash2, Globe, Palette, Film, CheckCircle2, DollarSign, CreditCard
} from 'lucide-react';

const App: React.FC = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [topic, setTopic] = useState('');
  const [storyboardType, setStoryboardType] = useState<StoryboardType>('Curto');
  const [visualStyle, setVisualStyle] = useState<VisualStyle>('Default');
  const [language, setLanguage] = useState<Language>('Portuguese');
  const [selectedLlm, setSelectedLlm] = useState<string>('Google Gemini');
  
  // File Upload states
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Core App states
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingStep, setLoadingStep] = useState<number>(0);
  const [loadingFacts, setLoadingFacts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [storyboards, setStoryboards] = useState<Storyboard[]>([]);
  const [activeStoryboardId, setActiveStoryboardId] = useState<string | null>(null);
  const [currentSearchResults, setCurrentSearchResults] = useState<any[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // API Key State
  const [hasApiKey, setHasApiKey] = useState(false);
  const [checkingKey, setCheckingKey] = useState(true);

  // Load and apply dark mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Load storyboards from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('storyboards');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setStoryboards(parsed);
        if (parsed.length > 0) {
          setActiveStoryboardId(parsed[0].id);
        }
      } catch (e) {
        console.error("Erro ao carregar storyboards persistidos:", e);
      }
    }
  }, []);

  // Save storyboards to localStorage when updated
  const saveStoryboards = (updatedList: Storyboard[]) => {
    setStoryboards(updatedList);
    localStorage.setItem('storyboards', JSON.stringify(updatedList));
  };

  // Check for API Key on Mount
  useEffect(() => {
    const checkKey = async () => {
      try {
        if (window.aistudio && window.aistudio.hasSelectedApiKey) {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          setHasApiKey(hasKey);
        } else {
          setHasApiKey(true);
        }
      } catch (e) {
        console.error("Erro ao carregar chave de API:", e);
      } finally {
        setCheckingKey(false);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      try {
        await window.aistudio.openSelectKey();
        setHasApiKey(true);
        setError(null);
      } catch (e) {
        console.error("Falha ao abrir seletor de chaves:", e);
      }
    }
  };

  // Safe file reader to Base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: Let's limit to 8MB in preview for performance
    if (file.size > 8 * 1024 * 1024) {
      setUploadError("O tamanho do arquivo excede o limite tolerado (Máx: 8MB).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const dataUrl = reader.result as string;
        const commaIndex = dataUrl.indexOf(',');
        const base64Data = commaIndex !== -1 ? dataUrl.substring(commaIndex + 1) : dataUrl;

        setUploadedFile({
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          base64Data: base64Data,
          size: file.size
        });
      } catch (err) {
        setUploadError("Erro ao processar a leitura do arquivo.");
      }
    };
    
    reader.onerror = () => {
      setUploadError("Falha na decodificação do arquivo enviado.");
    };

    reader.readAsDataURL(file);
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    setUploadError(null);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (!topic.trim()) {
      setError("Por favor, forneça um conceito, ideia ou roteiro no campo de texto para orientar a IA.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingStep(1);
    setCurrentSearchResults([]);

    // Educational cinematic fun facts to display during loading state
    setLoadingFacts([
      "Os storyboards foram inventados na Walt Disney Productions na década de 1930 para visualizar animações antes de estruturar as filmagens.",
      "A proporção moderna 16:9 (usada neste gerador) foi projetada para unificar todos os formatos de tela widescreen em um único padrão internacional.",
      "A inteligência artificial do Gemini 3.5 processa roteiros nativamente em múltiplos idiomas, estruturando ações de vídeo e cortes de câmera perfeitamente.",
      "O diretor Alfred Hitchcock era famoso por criar storyboards tão detalhados que dizia que 'o filme já estava feito' antes de mesmo de começar a gravar.",
      "Ao enviar áudios, PDFs ou planilhas de cenas, o Gemini extrai cronologias e personagens, mantendo a coerência narrativa de suas cenas.",
      "Modelos de difusão conseguem traduzir prompts lidos em inglês em composições virtuais isométricas, realistas ou caricatas em questão de segundos."
    ]);

    setLoadingMessage("Analisando roteiro e arquivos fornecidos...");

    try {
      // Step 1: Research and structural generation of the storyboard scenes
      setLoadingStep(2);
      setLoadingMessage("Estruturando as cenas com a Inteligência Artificial...");
      
      const result = await generateStoryboardOutline(
        topic, 
        uploadedFile, 
        storyboardType, 
        visualStyle, 
        language,
        selectedLlm
      );
      
      // Create new full Storyboard object
      const newStoryboard: Storyboard = {
        ...result.storyboard,
        id: Date.now().toString(),
        timestamp: Date.now()
      };

      setCurrentSearchResults(result.searchResults);
      
      const updatedStoryboards = [newStoryboard, ...storyboards];
      saveStoryboards(updatedStoryboards);
      setActiveStoryboardId(newStoryboard.id);

      setLoadingStep(3);
      setLoadingMessage("Storyboard estruturado com sucesso!");
    } catch (err: any) {
      console.error(err);
      if (err.message && (err.message.includes("404") || err.message.includes("403") || err.message.includes("denied"))) {
        setError("Chave de API inválida ou faturamento não ativado. Por favor, selecione uma chave válida no AI Studio.");
        setHasApiKey(false);
      } else {
        setError("Não foi possível gerar este storyboard. Tente resumir a sua instrução ou remover arquivos corrompidos.");
      }
    } finally {
      setIsLoading(false);
      setLoadingStep(0);
    }
  };

  // Update a single storyboard (e.g. after adding artwork)
  const handleUpdateStoryboard = (updated: Storyboard) => {
    const list = storyboards.map(sb => sb.id === updated.id ? updated : sb);
    saveStoryboards(list);
  };

  const activeStoryboard = storyboards.find(sb => sb.id === activeStoryboardId);

  // Helper file uploader icons
  const getFileIcon = (mime: string) => {
    if (mime.includes('audio')) return <AudioLines className="w-8 h-8 text-emerald-500 shrink-0" />;
    if (mime.includes('csv') || mime.includes('sheet') || mime.includes('excel')) return <Table className="w-8 h-8 text-blue-500 shrink-0" />;
    if (mime.includes('pdf')) return <FileText className="w-8 h-8 text-red-500 shrink-0" />;
    return <ScrollText className="w-8 h-8 text-purple-500 shrink-0" />;
  };

  // Modal for API Key Selection
  const KeySelectionModal = () => (
    <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
        <div className="bg-white dark:bg-slate-900 border-2 border-cyan-500/30 rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500"></div>
            
            <div className="flex flex-col items-center text-center space-y-6">
                <div className="relative">
                    <div className="w-20 h-20 bg-cyan-100 dark:bg-cyan-950/40 rounded-full flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-2 border-4 border-white dark:border-slate-900 shadow-lg">
                        <CreditCard className="w-8 h-8" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-cyan-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm border-2 border-white dark:border-slate-900 uppercase tracking-wider">
                        Conta Ativa
                    </div>
                </div>
                
                <div className="space-y-3">
                    <h2 className="text-2xl font-display font-bold text-slate-900 dark:text-white">
                      Chave de API Necessária
                    </h2>
                    <p className="text-slate-600 dark:text-slate-350 text-sm leading-relaxed font-light">
                      Este gerador utiliza o Gemini Pro e modelos de Imagem do Google Cloud que exigem uma chave de faturamento ativa do AI Studio.
                    </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-xl p-4 w-full text-left">
                    <div className="flex items-start gap-3">
                         <div className="p-1.5 bg-cyan-100 dark:bg-cyan-950 rounded-lg text-cyan-600 dark:text-cyan-400 shrink-0">
                            <DollarSign className="w-4 h-4" />
                         </div>
                         <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-900 dark:text-slate-200">Prevenção de Falhas</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                              Gere uma chave de API paga habilitando o faturamento em seu console do Google AI Studio para evitar bloqueios de cota.
                            </p>
                            <a 
                                href="https://ai.google.dev/gemini-api/docs/billing" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-600 dark:text-cyan-400 hover:underline mt-1"
                            >
                                Ler Sobre Faturamento <ExternalLink className="w-3 h-3" />
                            </a>
                         </div>
                    </div>
                </div>

                <button 
                    onClick={handleSelectKey}
                    className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:brightness-110 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/20 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                    <Key className="w-4 h-4" />
                    <span>Conectar Chave AI Studio</span>
                </button>
            </div>
        </div>
    </div>
  );

  return (
    <>
    {!checkingKey && !hasApiKey && <KeySelectionModal />}

    {showIntro ? (
      <IntroScreen onComplete={() => setShowIntro(false)} />
    ) : (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-sans pb-20 relative overflow-x-hidden animate-in fade-in duration-1000 transition-colors">
      
      {/* Background design */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-100/10 via-slate-50 to-white dark:from-cyan-950/20 dark:via-slate-950 dark:to-black z-0 pointer-events-none transition-colors"></div>
      <div className="fixed inset-0 opacity-5 dark:opacity-25 z-0 pointer-events-none" style={{
          backgroundImage: `radial-gradient(currentColor 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
      }}></div>

      {/* Navegação Topo */}
      <header className="border-b border-slate-200 dark:border-white/10 sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-slate-950/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 md:h-20 flex items-center justify-between">
          <div 
            onClick={() => {
              setActiveStoryboardId(null);
              setTopic('');
            }}
            className="flex items-center gap-3 md:gap-4 cursor-pointer hover:opacity-90 select-none"
            title="Ir para a Tela Inicial / Nova Criação"
          >
            <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-2.5 rounded-xl border border-cyan-400/20 text-white shadow-md relative overflow-hidden">
               <Film className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg md:text-2xl tracking-tight text-slate-900 dark:text-white leading-none">
                Story<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-indigo-500 dark:from-cyan-400 dark:to-indigo-300">Creator</span>
              </span>
              <span className="text-[8px] md:text-[9px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 font-medium font-mono">Gerador de Storyboards Profissionais</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
              <button 
                onClick={handleSelectKey}
                className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2.5 rounded-xl bg-slate-950 text-white font-semibold tracking-wide transition-all border border-cyan-500/50 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] shadow-md group relative overflow-hidden text-xs md:text-sm"
                title="Configurações do Gemini Pro / Chave de API"
              >
                {/* Top gradient indicator line like image 2 */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500"></div>

                {/* Active beacon indicator */}
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500"></span>
                </span>

                <div className="flex items-center gap-1.5">
                  <span className="font-display font-bold text-slate-100 uppercase tracking-widest text-[9px] md:text-xs">Gemini Pro</span>
                  <span className="text-[8px] font-extrabold text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded-full border border-cyan-500/30 uppercase tracking-wide">Conta Ativa</span>
                </div>
              </button>

              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:text-cyan-500 transition-colors border border-slate-200 dark:border-white/5"
                title={isDarkMode ? "Modo Claro" : "Modo Escuro"}
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
          </div>
        </div>
      </header>

      <main className="px-3 sm:px-6 py-6 md:py-10 relative z-10">
        
        <div className={`max-w-6xl mx-auto transition-all duration-500 ${storyboards.length > 0 ? 'mb-10' : 'min-h-[60vh] flex flex-col justify-center'}`}>
          
          {/* Headline */}
          {!storyboards.length && (
            <div className="text-center mb-10 md:mb-16 space-y-4 animate-in slide-in-from-bottom-8 duration-700 fade-in">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/40 text-cyan-700 dark:text-cyan-300 text-[10px] md:text-xs font-bold tracking-widest uppercase shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-cyan-500 shrink-0 animate-spin-slow" />
                Dê vida virtual às suas melhores ideias e roteiros cinemáticos
              </div>
              <h1 className="text-3xl sm:text-5xl md:text-7xl font-display font-bold text-slate-900 dark:text-white tracking-tight leading-tighter">
                Roteirize e Ilustre <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 dark:from-cyan-400 dark:via-indigo-400 dark:to-purple-400">Em Segundos.</span>
              </h1>
              <p className="text-sm md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-light leading-relaxed px-4">
                Envie seus arquivos de texto, áudios brutais ou tabelas de personagens e veja a Inteligência Artificial moldar o projeto visual ideal.
              </p>
            </div>
          )}

          {/* Formulário Multimídia Principal */}
          <form onSubmit={handleGenerate} className={`relative z-20 transition-all duration-300 ${isLoading ? 'opacity-40 pointer-events-none scale-95 blur-sm' : 'scale-100'} max-w-4xl mx-auto`}>
            
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 rounded-3xl opacity-5 dark:opacity-15 group-hover:opacity-20 transition duration-500 blur-2xl"></div>
                
                <div className="relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-5 md:p-6 rounded-3xl shadow-2xl space-y-6">
                    
                    {/* TODAS FERRAMENTAS GRATUITAS DE IA - SELETOR INSPIRADO NA IMAGEM 1 */}
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                          <label className="text-xs font-bold font-mono text-slate-500 dark:text-slate-400 uppercase tracking-widest block">
                            Ferramentas Gratuitas de Inteligência Artificial (Selecione o Motor)
                          </label>
                          <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-wide bg-cyan-150/50 dark:bg-cyan-950/40 px-2 py-0.5 rounded-full border border-cyan-300/30 w-fit">
                            Foco: Roteiro e Diálogos
                          </span>
                        </div>

                        {/* Bento Grid inspired by image 1 with tall movie poster design */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
                            {[
                              {
                                id: 'OpenAI GPT-5.5',
                                name: 'GPT-5.5',
                                publisher: 'OpenAI Series',
                                desc: 'Modelo avançado de conversação de super-precisão.',
                                badge: 'Conversacional',
                                color: 'emerald',
                                ringColor: 'group-hover:border-emerald-500/40',
                                activeBg: 'bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.2)] border-emerald-500 dark:border-emerald-400',
                                inactiveBg: 'bg-slate-50/50 dark:bg-slate-950/55 border-slate-200 dark:border-white/5 hover:scale-[1.02] hover:border-slate-350 dark:hover:border-white/15',
                                textGradient: 'from-emerald-400 via-teal-500 to-green-400 font-bold'
                              },
                              {
                                id: 'Google Gemini',
                                name: 'Gemini Pro',
                                publisher: 'Google Cloud API',
                                desc: 'Nativo ultra-veloz com buscas de grounding em tempo real.',
                                badge: 'NATIVO / ATIVO',
                                color: 'cyan',
                                ringColor: 'group-hover:border-cyan-500/40',
                                activeBg: 'bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.2)] border-cyan-500 dark:border-cyan-400',
                                inactiveBg: 'bg-slate-50/50 dark:bg-slate-950/55 border-slate-200 dark:border-white/5 hover:scale-[1.02] hover:border-slate-350 dark:hover:border-white/15',
                                textGradient: 'from-cyan-400 via-blue-500 to-indigo-400 font-bold'
                              },
                              {
                                id: 'Anthropic Claude',
                                name: 'Claude 3.5',
                                publisher: 'Anthropic Group',
                                desc: 'Nuances detalhadas com interpretação filosófica.',
                                badge: 'LITERÁRIO',
                                color: 'amber',
                                ringColor: 'group-hover:border-amber-500/40',
                                activeBg: 'bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.2)] border-amber-500 dark:border-amber-400',
                                inactiveBg: 'bg-slate-50/50 dark:bg-slate-950/55 border-slate-200 dark:border-white/5 hover:scale-[1.02] hover:border-slate-350 dark:hover:border-white/15',
                                textGradient: 'from-amber-400 via-orange-500 to-red-400 font-bold'
                              },
                              {
                                id: 'Meta Llama',
                                name: 'Llama 3.1',
                                publisher: 'Meta OpenSource',
                                desc: 'Desempenho ágil, com estilo de filmagem direta.',
                                badge: 'Cotas Livres',
                                color: 'blue',
                                ringColor: 'group-hover:border-blue-500/40',
                                activeBg: 'bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.2)] border-blue-500 dark:border-blue-400',
                                inactiveBg: 'bg-slate-50/50 dark:bg-slate-950/55 border-slate-200 dark:border-white/5 hover:scale-[1.02] hover:border-slate-350 dark:hover:border-white/15',
                                textGradient: 'from-blue-400 via-indigo-500 to-purple-400 font-bold'
                              },
                              {
                                id: 'Mistral AI Mistral',
                                name: 'Mistral Large',
                                publisher: 'Mistral AI Team',
                                desc: 'Lógica refinada com coesão cinematográfica européia.',
                                badge: 'Estruturado',
                                color: 'pink',
                                ringColor: 'group-hover:border-pink-500/40',
                                activeBg: 'bg-pink-500/10 shadow-[0_0_20px_rgba(236,72,153,0.2)] border-pink-500 dark:border-pink-400',
                                inactiveBg: 'bg-slate-50/50 dark:bg-slate-950/55 border-slate-200 dark:border-white/5 hover:scale-[1.02] hover:border-slate-350 dark:hover:border-white/15',
                                textGradient: 'from-pink-400 via-rose-500 to-purple-500 font-bold'
                              }
                            ].map((item) => {
                              const isActive = selectedLlm === item.id;
                              return (
                                <div 
                                  key={item.id}
                                  onClick={() => setSelectedLlm(item.id)}
                                  className={`group cursor-pointer rounded-2xl overflow-hidden border p-3.5 flex flex-col justify-between transition-all duration-300 relative select-none h-40 md:h-48 ${
                                    isActive ? item.activeBg : item.inactiveBg
                                  }`}
                                >
                                  {/* Glassy Overlay for ambient visuals like the game cards in image 1 */}
                                  <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(6,182,212,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.15)_1px,transparent_1px)] bg-[size:10px_10px]"></div>
                                  <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-slate-950/20 to-transparent pointer-events-none"></div>
                                  
                                  <div className="space-y-1 relative z-10">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[7.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
                                        {item.publisher}
                                      </span>
                                      {isActive && (
                                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,1)] animate-ping"></span>
                                      )}
                                    </div>
                                    <h3 className={`text-base md:text-lg font-black tracking-tight text-slate-800 dark:text-white`}>
                                      {item.name}
                                    </h3>
                                  </div>

                                  <div className="space-y-2 relative z-10 mt-auto">
                                    <p className="text-[9px] md:text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight font-light">
                                      {item.desc}
                                    </p>
                                    
                                    {/* Action sticker inspired by "Deals Unlocked" stickers with high contrast visual design */}
                                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/5 pt-2">
                                      <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wide ${
                                        isActive 
                                        ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950' 
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                      }`}>
                                        {item.badge}
                                      </span>
                                      <span className="text-[9px] font-mono text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-tight">
                                        {isActive ? 'Ativo' : 'Grátis'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                    </div>

                    {/* Input Campo Texto Conceito */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold font-mono text-slate-500 dark:text-slate-400 uppercase tracking-widest block">
                          1. Descreva a Ideia Geral ou Insira o Roteiro
                        </label>
                        <textarea
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="Exemplo: 'Um astronauta descobre um portal místico brilhante no polo norte de Marte, aproximando-se com curiosidade...'"
                            className="w-full h-24 md:h-28 px-4 py-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/5 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 text-sm md:text-base focus:ring-1 focus:ring-cyan-500 outline-none resize-none"
                        />
                    </div>

                    {/* Área Interativa de Upload de Arquivos */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold font-mono text-slate-500 dark:text-slate-400 uppercase tracking-widest block">
                          2. Enviar Arquivo de Suporte (Roteiro, Áudio, Planilha ou PDF)
                        </label>

                        {!uploadedFile ? (
                          <div className="relative border-2 border-dashed border-slate-200 dark:border-white/5 hover:border-cyan-500/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-950/20 group/upload">
                            <input 
                              type="file"
                              accept=".pdf,.txt,.doc,.docx,.csv,.xlsx,.xls,.mp3,.wav,.ogg,.m4a"
                              onChange={handleFileChange}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 group-hover/upload:text-cyan-500 group-hover/upload:scale-110 shadow-sm border border-slate-200 dark:border-white/5 transition-all">
                              <Upload className="w-6 h-6" />
                            </div>
                            <p className="mt-3 text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-200">
                              Clique para escolher ou arraste o arquivo aqui
                            </p>
                            <p className="mt-1 text-[10px] text-slate-400">
                              Formatos suportados: PDF, TXT, Áudio, Planilhas (CSV/XLSX), DOC / DOCX (Máx. 8MB)
                            </p>

                            {uploadError && (
                              <div className="mt-3 text-[10px] text-red-500 bg-red-100/50 dark:bg-red-950/20 px-3 py-1 rounded-full border border-red-200 dark:border-red-900/50 font-medium">
                                {uploadError}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-cyan-50/30 dark:bg-cyan-950/15 border border-cyan-200 dark:border-cyan-800/40 rounded-2xl p-4 flex items-center justify-between gap-4 animate-in zoom-in duration-300">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm">
                                {getFileIcon(uploadedFile.mimeType)}
                              </div>
                              <div className="flex flex-col text-left overflow-hidden">
                                <span className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-100 truncate pr-4">
                                  {uploadedFile.name}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB • {uploadedFile.mimeType || 'Arquivo'}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Carregado</span>
                              </div>
                              <button 
                                type="button"
                                onClick={removeUploadedFile}
                                className="p-2 bg-white dark:bg-slate-800/60 text-slate-400 hover:text-red-500 rounded-xl border border-slate-200 dark:border-white/5 transition-colors shadow-sm shrink-0"
                                title="Remover Arquivo"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                    </div>

                    {/* Menu de Configurações das Cenas */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* Tipo / Comprimento do Storyboard */}
                      <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-white/5 p-4 flex items-center gap-3.5 hover:border-cyan-500/30 transition-colors relative overflow-hidden group/item">
                        <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl text-cyan-600 dark:text-cyan-400 shrink-0 shadow-sm border border-slate-200 dark:border-white/5">
                            <Film className="w-4.5 h-4.5" />
                        </div>
                        <div className="flex flex-col z-10 w-full overflow-hidden">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Duração / Quadros</label>
                            <select 
                                value={storyboardType} 
                                onChange={(e) => setStoryboardType(e.target.value as StoryboardType)}
                                className="bg-transparent border-none text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-0 cursor-pointer p-0 w-full hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors truncate pr-4 outline-none [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-slate-950 dark:[&>option]:text-slate-100"
                            >
                                <option value="Curto">Curto (3 quadros)</option>
                                <option value="Longo">Longo (6 quadros)</option>
                            </select>
                        </div>
                      </div>

                      {/* VisualStyle Selector */}
                      <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-white/5 p-4 flex items-center gap-3.5 hover:border-purple-500/30 transition-colors relative overflow-hidden group/item">
                        <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl text-purple-600 dark:text-purple-400 shrink-0 shadow-sm border border-slate-200 dark:border-white/5">
                            <Palette className="w-4.5 h-4.5" />
                        </div>
                        <div className="flex flex-col z-10 w-full overflow-hidden">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Estética Visual</label>
                            <select 
                                value={visualStyle} 
                                onChange={(e) => setVisualStyle(e.target.value as VisualStyle)}
                                className="bg-transparent border-none text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-0 cursor-pointer p-0 w-full hover:text-purple-600 dark:hover:text-purple-300 transition-colors truncate pr-4 outline-none [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-slate-950 dark:[&>option]:text-slate-100"
                            >
                                <option value="Default">Padrão Cinematográfico</option>
                                <option value="Minimalist">Vetor Minimalista</option>
                                <option value="Realistic">Fotorrealista 4K</option>
                                <option value="Cartoon">Desenho Animado / HQ</option>
                                <option value="Vintage">Litografia Gravada</option>
                                <option value="Futuristic">HUD Cyberpunk</option>
                                <option value="3D Render">Render 3D Isométrico</option>
                                <option value="Sketch">Esboço / Technical Drawn</option>
                            </select>
                        </div>
                      </div>

                      {/* Language Selection */}
                      <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-white/5 p-4 flex items-center gap-3.5 hover:border-emerald-500/30 transition-colors relative overflow-hidden group/item">
                        <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl text-emerald-600 dark:text-emerald-400 shrink-0 shadow-sm border border-slate-200 dark:border-white/5">
                            <Globe className="w-4.5 h-4.5" />
                        </div>
                        <div className="flex flex-col z-10 w-full overflow-hidden">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Idioma das Descrições</label>
                            <select 
                                value={language} 
                                onChange={(e) => setLanguage(e.target.value as Language)}
                                className="bg-transparent border-none text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-0 cursor-pointer p-0 w-full hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors truncate pr-4 outline-none [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-slate-950 dark:[&>option]:text-slate-100"
                            >
                                <option value="Portuguese">Português</option>
                                <option value="English">Inglês</option>
                                <option value="Spanish">Espanhol</option>
                                <option value="French">Francês</option>
                                <option value="German">Alemão</option>
                                <option value="Mandarin">Mandarim</option>
                                <option value="Japanese">Japonês</option>
                                <option value="Hindi">Híndi</option>
                                <option value="Arabic">Árabe</option>
                                <option value="Russian">Russo</option>
                            </select>
                        </div>
                      </div>

                    </div>

                    {/* Botão de Envio */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-2">
                        <p className="text-[10px] md:text-xs text-slate-550 dark:text-slate-400 max-w-sm md:max-w-xl text-center md:text-left leading-relaxed">
                          *A IA do Gemini irá estruturar o roteiro, as falas, os enquadramentos de câmera e detalhar visuais propícios em formato widescreen 16:9.
                        </p>
                        
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full md:w-auto bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white px-8 py-4 rounded-2xl font-bold font-display tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(6,182,212,0.35)] whitespace-nowrap flex items-center justify-center gap-2"
                        >
                            <Sparkles className="w-5 h-5 animate-pulse" />
                            <span>GERAR STORYBOARD</span>
                        </button>
                    </div>

                </div>
            </div>
          </form>
        </div>

        {/* Loading Spinner with Facts & dynamic milestones */}
        {isLoading && <Loading status={loadingMessage} step={loadingStep} facts={loadingFacts} />}

        {/* Action errors display block */}
        {error && (
          <div className="max-w-2xl mx-auto mt-8 p-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl flex items-center gap-4 text-red-850 dark:text-red-200 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 shadow-md">
            <AlertCircle className="w-6 h-6 flex-shrink-0 text-red-500 dark:text-red-400" />
            <div className="flex-1">
                <p className="font-semibold text-sm">{error}</p>
                {(error.includes("Chave") || error.includes("faturamento")) && (
                    <button 
                        onClick={handleSelectKey}
                        className="mt-2 text-xs font-bold text-red-700 dark:text-red-300 underline hover:text-red-900 dark:hover:text-red-100 block"
                    >
                        Trocar/Conectar chave de API ativa
                    </button>
                )}
            </div>
          </div>
        )}

        {/* Active Board Display Component */}
        {activeStoryboard && !isLoading && (
            <div className="space-y-6">
              <StoryboardDisplay 
                storyboard={activeStoryboard} 
                onUpdateStoryboard={handleUpdateStoryboard}
              />
              <SearchResults results={currentSearchResults} />
            </div>
        )}

        {/* History panel and session archives */}
        {storyboards.length > 0 && (
            <div className="max-w-6xl mx-auto mt-16 md:mt-24 border-t border-slate-200 dark:border-white/10 pt-12 transition-colors">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.25em] mb-8 flex items-center gap-3">
                    <History className="w-4 h-4 text-cyan-500" />
                    Histórico de Storyboards Criados
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {storyboards.map((sb) => {
                      const scenesCount = sb.scenes.length;
                      const illustratedCount = sb.scenes.filter(s => s.imageData).length;
                      const hasImagePreview = sb.scenes.find(s => s.imageData)?.imageData;

                      return (
                        <div 
                            key={sb.id} 
                            onClick={() => setActiveStoryboardId(sb.id)}
                            className={`group cursor-pointer rounded-2xl overflow-hidden border transition-all shadow-md bg-white dark:bg-slate-900/50 backdrop-blur-sm flex flex-col ${
                              sb.id === activeStoryboardId 
                              ? 'border-cyan-500 ring-2 ring-cyan-500/20' 
                              : 'border-slate-200 dark:border-white/5 hover:border-cyan-500/40'
                            }`}
                        >
                            <div className="aspect-video bg-slate-100 dark:bg-slate-950 relative overflow-hidden flex items-center justify-center">
                              {hasImagePreview ? (
                                <img src={hasImagePreview} alt={sb.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              ) : (
                                <div className="space-y-2 text-center p-4">
                                  <Clapperboard className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
                                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">Sem visuais gerados</p>
                                </div>
                              )}
                              
                              {/* Overlay counter badge */}
                              <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md rounded-lg px-2 py-1 text-[9px] font-mono text-white flex items-center gap-1 border border-white/10">
                                <Film className="w-3 h-3 text-cyan-400" />
                                <span>{illustratedCount}/{scenesCount} Frames</span>
                              </div>
                            </div>
                            
                            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                                <div>
                                  <h4 className="font-display font-bold text-slate-800 dark:text-slate-100 text-sm line-clamp-1 group-hover:text-cyan-500 transition-colors">
                                    {sb.title}
                                  </h4>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-normal font-light">
                                    {sb.concept}
                                  </p>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono border-t border-slate-100 dark:border-white/5 pt-2.5">
                                    <span>{sb.style} • {sb.type}</span>
                                    <span>{new Date(sb.timestamp).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                      );
                    })}
                </div>
            </div>
        )}

      </main>
    </div>
    )}
    </>
  );
};

export default App;
