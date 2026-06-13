/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { Storyboard, StoryboardScene, VisualStyle } from '../types';
import { 
  Download, Sparkles, Camera, Film, MessageSquare, 
  Maximize2, X, ZoomIn, ZoomOut, RefreshCw, 
  Clapperboard, FileText, Check, Loader2, ArrowRight,
  Cloud
} from 'lucide-react';
import { generateStoryboardFrame, editStoryboardFrame } from '../services/geminiService';
import { TrailerModal } from './TrailerModal';
import { getOrCreateFolder, uploadScriptToDrive, uploadHtmlReportToDrive } from '../services/googleDriveService';

interface StoryboardDisplayProps {
  storyboard: Storyboard;
  onUpdateStoryboard: (updated: Storyboard) => void;
  googleUser: any;
  googleToken: string | null;
  isLoggingInGoogle: boolean;
  onGoogleLogin: () => void;
}

const StoryboardDisplay: React.FC<StoryboardDisplayProps> = ({ 
  storyboard, 
  onUpdateStoryboard,
  googleUser,
  googleToken,
  isLoggingInGoogle,
  onGoogleLogin
}) => {
  const [fullscreenImage, setFullscreenImage] = useState<{ src: string; alt: string } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showTrailer, setShowTrailer] = useState(false);
  
  // Track visual states for each panel
  const [loadingScenes, setLoadingScenes] = useState<{ [key: number]: boolean }>({});
  const [errorScenes, setErrorScenes] = useState<{ [key: number]: string }>({});
  const [editPrompts, setEditPrompts] = useState<{ [key: number]: string }>({});
  const [activeEditPanel, setActiveEditPanel] = useState<number | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  // Google Drive Upload states
  const [showDriveOptions, setShowDriveOptions] = useState(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [driveSuccessMsg, setDriveSuccessMsg] = useState<string | null>(null);
  const [driveErrorMsg, setDriveErrorMsg] = useState<string | null>(null);
  const [driveFileUrl, setDriveFileUrl] = useState<string | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

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

  // Export entire illustrated storyboard with scenes and descriptions to an organized PDF
  const handleExportPDF = async () => {
    if (isExportingPDF) return;
    setIsExportingPDF(true);

    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageHeight = 297;
      const pageWidth = 210;
      const marginX = 15;
      const contentWidth = pageWidth - (marginX * 2); // 180mm
      let currentY = 20;

      // Header function for additional pages
      const addPageHeader = (pageNum: number) => {
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(`Storyboard: ${storyboard.title}`, marginX, 10);
        doc.text(`Página ${pageNum}`, pageWidth - marginX, 10, { align: 'right' });
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.2);
        doc.line(marginX, 12, pageWidth - marginX, 12);
      };

      const ensureSpace = (neededHeight: number) => {
        if (currentY + neededHeight > pageHeight - 20) {
          doc.addPage();
          currentY = 20;
          addPageHeader(doc.getNumberOfPages());
        }
      };

      // --- PAGE 1: TITLE & COVER INFO ---
      // Style accent top bar
      doc.setFillColor(8, 145, 178); // cyan-600
      doc.rect(0, 0, pageWidth, 5, 'F');

      // Title
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(15, 23, 42); // slate-900
      const titleLines = doc.splitTextToSize(storyboard.title, contentWidth);
      ensureSpace(titleLines.length * 8 + 5);
      titleLines.forEach((line: string) => {
        doc.text(line, marginX, currentY);
        currentY += 8;
      });
      currentY += 3;

      // Badges (Type and Style)
      ensureSpace(12);
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(marginX, currentY, 48, 6, 'F');
      doc.rect(marginX + 53, currentY, 48, 6, 'F');
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text(`FORMATO: Storyboard ${storyboard.type}`, marginX + 3, currentY + 4);
      doc.text(`ESTILO VISUAL: ${storyboard.style}`, marginX + 56, currentY + 4);
      
      currentY += 12;

      // Concept box
      ensureSpace(15);
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.3);
      
      const conceptHeader = "CONCEITO ORIGINAL:";
      const conceptBodyLines = doc.splitTextToSize(storyboard.concept, contentWidth - 10);
      const boxHeight = 12 + conceptBodyLines.length * 5;
      
      ensureSpace(boxHeight + 5);
      doc.rect(marginX, currentY, contentWidth, boxHeight, 'FD');
      
      // Concept label
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(8, 145, 178); // cyan-600
      doc.text(conceptHeader, marginX + 5, currentY + 6);
      
      // Concept text
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85); // slate-700
      let textY = currentY + 11;
      conceptBodyLines.forEach((line: string) => {
        doc.text(line, marginX + 5, textY);
        textY += 5;
      });
      
      currentY += boxHeight + 10;

      // --- SCENES LIST ---
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42); // slate-900
      ensureSpace(10);
      doc.text("ROTEIRO & QUADROS ILUSTRADOS", marginX, currentY);
      currentY += 8;

      for (const scene of storyboard.scenes) {
        const sceneTitle = `Cena ${scene.number}: ${scene.title}`;
        const cameraText = `Enquadramento: ${scene.camera}`;
        
        const actionLines = doc.splitTextToSize(`Ação: ${scene.action}`, contentWidth);
        const dialogueLines = doc.splitTextToSize(`Diálogo: "${scene.dialogue}"`, contentWidth);
        const promptLines = doc.splitTextToSize(`Prompt Visual: ${scene.visualPrompt}`, contentWidth);
        
        const imageSize = 65; // A4 width is 180 printable, image is e.g. 115mm x 65mm (16:9 approx)
        const textHeight = (actionLines.length + dialogueLines.length + promptLines.length) * 5 + 12;
        const sceneNeededHeight = 10 + (scene.imageData ? imageSize : 25) + textHeight + 15;
        
        ensureSpace(sceneNeededHeight);

        // Scene Divider Line
        doc.setDrawColor(241, 245, 249); // slate-100
        doc.setLineWidth(0.8);
        doc.line(marginX, currentY, pageWidth - marginX, currentY);
        currentY += 6;

        // Title & Camera tag
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(sceneTitle, marginX, currentY);
        
        doc.setFont('Helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(8, 145, 178); // cyan-600
        doc.text(cameraText, pageWidth - marginX, currentY, { align: 'right' });
        currentY += 6;

        // Render Image frame
        if (scene.imageData) {
          try {
            let base64 = scene.imageData;
            if (!base64.startsWith('data:')) {
              base64 = `data:image/jpeg;base64,${base64}`;
            }
            
            // Centered 16:9 image
            const imgW = 120;
            const imgH = 67.5; // (120 * 9 / 16)
            const imgX = marginX + (contentWidth - imgW) / 2;
            
            doc.setFillColor(241, 245, 249);
            doc.rect(imgX - 0.5, currentY - 0.5, imgW + 1, imgH + 1, 'F');
            
            doc.addImage(base64, 'JPEG', imgX, currentY, imgW, imgH);
            currentY += imgH + 6;
          } catch (imgError) {
            console.error("PDF image embedding failed:", imgError);
            doc.setFillColor(241, 245, 249);
            doc.rect(marginX, currentY, contentWidth, 20, 'F');
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(148, 163, 184);
            doc.text("Frame Ilustrado (Erro de renderização do PDF)", marginX + 10, currentY + 11);
            currentY += 25;
          }
        } else {
          // Unillustrated box
          doc.setFillColor(248, 250, 252);
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.4);
          doc.rect(marginX, currentY, contentWidth, 20, 'FD');
          
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(148, 163, 184);
          doc.text("Frame não ilustrado", marginX + contentWidth / 2, currentY + 11, { align: 'center' });
          currentY += 25;
        }

        // Texts (Action, Dialogue, Prompt)
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85); // slate-700
        
        // Action
        actionLines.forEach((line: string, lIdx: number) => {
          if (lIdx === 0) {
            doc.setFont('Helvetica', 'bold');
            doc.setTextColor(71, 85, 105); // slate-600
            doc.text("Ação: ", marginX, currentY);
            doc.setFont('Helvetica', 'normal');
            doc.setTextColor(51, 65, 85);
            doc.text(line.replace(/^Ação:\s*/i, ''), marginX + 11, currentY);
          } else {
            doc.text(line, marginX, currentY);
          }
          currentY += 4.5;
        });
        currentY += 1.5;

        // Dialogue
        dialogueLines.forEach((line: string, lIdx: number) => {
          if (lIdx === 0) {
            doc.setFont('Helvetica', 'bold');
            doc.setTextColor(71, 85, 105);
            doc.text("Diálogo: ", marginX, currentY);
            doc.setFont('Helvetica', 'oblique');
            doc.setTextColor(2, 132, 199); // sky-600
            doc.text(line.replace(/^Diálogo:\s*/i, ''), marginX + 15, currentY);
          } else {
            doc.setFont('Helvetica', 'oblique');
            doc.setTextColor(2, 132, 199);
            doc.text(line, marginX, currentY);
          }
          currentY += 4.5;
        });
        currentY += 1.5;

        // Prompt
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // slate-400
        promptLines.forEach((line: string) => {
          doc.text(line, marginX, currentY);
          currentY += 3.8;
        });

        currentY += 6;
      }

      // Footer stamp
      ensureSpace(12);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Documento gerado por StoryCreator • ${new Date().toLocaleDateString('pt-BR')}`, marginX, currentY + 5);

      const filename = `storyboard-${storyboard.title.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error("Incapaz de gerar o PDF:", err);
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Google Drive Upload Handler for script (.txt)
  const handleSendScriptToDrive = async () => {
    if (!googleToken) return;
    setIsUploadingToDrive(true);
    setDriveSuccessMsg(null);
    setDriveErrorMsg(null);
    
    try {
      const folderId = await getOrCreateFolder(googleToken);
      await uploadScriptToDrive(googleToken, storyboard, folderId);
      setDriveSuccessMsg('Roteiro salvo com sucesso!');
      setDriveFileUrl(`https://drive.google.com/drive/u/0/folders/${folderId}`);
    } catch (err: any) {
      console.error(err);
      setDriveErrorMsg('Erro ao exportar arquivo para o seu Drive.');
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  // Google Drive Upload Handler for illustrated presentation (.html)
  const handleSendHtmlToDrive = async () => {
    if (!googleToken) return;
    setIsUploadingToDrive(true);
    setDriveSuccessMsg(null);
    setDriveErrorMsg(null);
    
    try {
      const folderId = await getOrCreateFolder(googleToken);
      await uploadHtmlReportToDrive(googleToken, storyboard, folderId);
      setDriveSuccessMsg('Storyboard HTML salvo com sucesso!');
      setDriveFileUrl(`https://drive.google.com/drive/u/0/folders/${folderId}`);
    } catch (err: any) {
      console.error(err);
      setDriveErrorMsg('Erro ao exportar storyboard HTML para o seu Drive.');
    } finally {
      setIsUploadingToDrive(false);
    }
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
            onClick={handleExportPDF}
            disabled={isExportingPDF}
            className="px-4 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-cyan-500/10 transition-all border border-cyan-500/20 disabled:opacity-50"
            title="Exportar Storyboard Completo como PDF Organizado"
          >
            {isExportingPDF ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{isExportingPDF ? 'Gerando PDF...' : 'Exportar PDF'}</span>
          </button>

          {/* Google Drive Status & Uploads */}
          {!googleToken ? (
            <button
              onClick={onGoogleLogin}
              disabled={isLoggingInGoogle}
              className="px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border border-slate-200 dark:border-white/10 transition-all"
              title="Conectar ao Google Drive para exportação em nuvem"
            >
              <Cloud className="w-4 h-4 text-cyan-500" />
              <span>{isLoggingInGoogle ? 'Conectando...' : 'Conectar Drive'}</span>
            </button>
          ) : (
            <div className="relative">
              <button
                onClick={() => setShowDriveOptions(!showDriveOptions)}
                className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all border border-emerald-500/20"
                title="Salvar ou Exportar diretamente para o seu Google Drive"
              >
                <Cloud className="w-4 h-4 text-white" />
                <span>Salvar no Drive</span>
              </button>
              
              {showDriveOptions && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-30 p-3 animate-in fade-in zoom-in-95 duration-150 text-left">
                  <div className="px-1 py-1 border-b border-slate-100 dark:border-white/5 mb-2 flex justify-between items-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Exportadores Drive</span>
                    <span className="text-[8px] font-mono text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/10">Ativo</span>
                  </div>
                  
                  <div className="space-y-1.5">
                    <button
                      onClick={handleSendScriptToDrive}
                      disabled={isUploadingToDrive}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all flex items-center gap-2.5 disabled:opacity-50"
                    >
                      <FileText className="w-4 h-4 text-cyan-500 shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-slate-800 dark:text-slate-200 leading-normal">Texto do Roteiro (.txt)</span>
                        <span className="text-[9px] text-slate-400 font-light font-mono">Formato roteiro padrão</span>
                      </div>
                    </button>

                    <button
                      onClick={handleSendHtmlToDrive}
                      disabled={isUploadingToDrive}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all flex items-center gap-2.5 disabled:opacity-50"
                    >
                      <Film className="w-4 h-4 text-purple-500 shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-slate-800 dark:text-slate-200 leading-normal">Storyboard Interativo (.html)</span>
                        <span className="text-[9px] text-slate-400 font-light font-mono">Showcase com ilustrações</span>
                      </div>
                    </button>
                  </div>

                  {isUploadingToDrive && (
                    <div className="mt-3 text-center py-2 flex items-center justify-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-500" />
                      <span className="text-[10px] text-slate-400 font-mono">Salvando arquivo...</span>
                    </div>
                  )}
                  
                  {driveSuccessMsg && (
                    <div className="mt-3 p-2 bg-gradient-to-br from-green-500/10 to-emerald-500/5 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/40 rounded-xl text-[10px] font-medium text-center space-y-1">
                      <p className="flex items-center gap-1.5 justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        {driveSuccessMsg}
                      </p>
                      {driveFileUrl && (
                        <a 
                          href={driveFileUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="block text-center text-[10px] text-cyan-600 dark:text-cyan-400 underline font-semibold font-mono hover:text-cyan-550"
                        >
                          Abrir no Google Drive ↗
                        </a>
                      )}
                    </div>
                  )}

                  {driveErrorMsg && (
                    <div className="mt-2.5 p-2 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/40 rounded-xl text-[10px] text-center font-semibold">
                      {driveErrorMsg}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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
