/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI, Modality, Type, GenerateVideosOperation } from "@google/genai";
import { Storyboard, StoryboardScene, StoryboardType, VisualStyle, Language, UploadedFile, ResearchResult } from "../types";

// Create a client instance using the injected API Key
const getAi = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const TEXT_MODEL = 'gemini-3.5-flash';
const IMAGE_MODEL = 'gemini-2.5-flash-image';

const getStyleInstruction = (style: VisualStyle): string => {
  switch (style) {
    case 'Minimalist': 
      return "Estética: Flat Vector Art / Bauhaus Minimalista. Cores limitadas, traço limpo, foco em formas geométricas simples e espaço negativo.";
    case 'Realistic': 
      return "Estética: Fotorrealista / Cinema 4K. Iluminação dramática (Chiaroscuro), texturas de alta definição, profundidade de campo suave.";
    case 'Cartoon': 
      return "Estética: Quadrinhos / Ilustração 2D / Cel Shaded. Cores vibrantes, contornos definidos, estilo de storyboard de animação profissional.";
    case 'Vintage': 
      return "Estética: Litografia Histórica / Gravura Vintage. Linhas hachuradas finas, tons sépia ou papel envelhecido, gravura científica clássica.";
    case 'Futuristic': 
      return "Estética: Cyberpunk / HUD Holográfico / Ficção Científica. Brilho neon de luzes azuis e cianas em fundo preto, elementos virtuais de alta tecnologia.";
    case '3D Render': 
      return "Estética: Render 3D Isométrico / Blender / Claymorphism. Sombras suaves, superfícies plásticas ou de argila fosca, visual de miniatura tridimensional.";
    case 'Sketch': 
      return "Estética: Desenho de Caderno de Esboços / Da Vinci Blueprint. Traço de caneta nanquim ou carvão bruto sobre papel de linho ou pardo.";
    default: 
      return "Estética: Ilustração clássica de Storyboard Digital. Traços modernos, claros e expressivos, de alto contraste visual.";
  }
};

/**
 * Generates the structural script outline of the storyboard based on user prompt and uploaded file.
 */
export const generateStoryboardOutline = async (
  topic: string,
  file: UploadedFile | null,
  type: StoryboardType,
  style: VisualStyle,
  language: Language,
  llmEngine: string = 'Google Gemini'
): Promise<ResearchResult> => {
  const numScenes = type === 'Curto' ? 3 : 6;
  const styleInstr = getStyleInstruction(style);

  let contents: any[] = [];

  // If we have a file, add it as inlineData
  if (file) {
    contents.push({
      inlineData: {
        data: file.base64Data,
        mimeType: file.mimeType
      }
    });
  }

  let enginePrompt = "";
  if (llmEngine === 'OpenAI GPT-5.5') {
    enginePrompt = "\nESTILO DO MOTOR DE INSTRUÇÃO (OpenAI GPT-5.5 modelo de inteligência conversacional avançada): Escreva as ações e diálogos com profundidade filosófica, riqueza de raciocínio lógico e detalhes minuciosos de caracterização.";
  } else if (llmEngine === 'Google Gemini') {
    enginePrompt = "\nESTILO DO MOTOR DE INSTRUÇÃO (Google Gemini Pro): Priorize enquadramentos de câmera cinematográficos modernos, dinamismo visual e integração fluida de dados de áudio ou PDFs.";
  } else if (llmEngine === 'Anthropic Claude') {
    enginePrompt = "\nESTILO DO MOTOR DE INSTRUÇÃO (Anthropic Claude 3.5 Sonnet): Escreva diálogos refinados, prosa fluida e de alta complexidade literária, com rica expressão dos sentimentos dos personagens.";
  } else if (llmEngine === 'Meta Llama') {
    enginePrompt = "\nESTILO DO MOTOR DE INSTRUÇÃO (Meta Llama 3.1): Crie ritmos de ação eletrizantes, foco em sequências empolgantes e ganchos dinâmicos para cada um dos quadros.";
  } else if (llmEngine === 'Mistral AI Mistral') {
    enginePrompt = "\nESTILO DO MOTOR DE INSTRUÇÃO (Mistral Large): Crie composições concisas, com direções de filmagem precisas, lógicas e ricas em coesão europeia clássica.";
  }

  const promptText = `
    Você é um diretor de cinema e roteirista profissional especialista em Storyboarding.
    Seu objetivo é analisar as instruções e qualquer arquivo fornecido (texto, roteiro, áudio, PDF ou planilha) e criar um roteiro estruturado com exatamente ${numScenes} cenas (painéis) para um Storyboard de alta qualidade sobre o tema: "${topic}".
    ${enginePrompt}

    Estilo Estético Visual Solicitado:
    ${styleInstr}

    Idioma das cenas: ${language}

    OBSERVAÇÕES CRUCIALMENTE IMPORTANTES para a geração de imagens:
    - O campo "visualPrompt" é usado diretamente por uma IA Geradora de Imagens. Escreva-o SEMPRE EM INGLÊS com detalhes precisos para obter os melhores resultados.
    - O "visualPrompt" deve focar na composição da imagem, na iluminação, nas cores, nos personagens, no plano de fundo e nos objetos de forma literal e realista. Evite textos abstratos ou metáforas poéticas.
    - Aplique o estilo visual solicitado ("${style}") em cada instrução de imagem em inglês do "visualPrompt", por exemplo: "Professional storyboard sketch of...", "Minimalist flat vector of...", "Faux-photorealistic cinematic shot of...".

    Os campos de texto ("title", "action" [Ação], "dialogue" [Diálogo/Narração], "camera" [Enquadramento]) devem estar escritos no idioma solicitado: ${language}.
  `;

  contents.push({ text: promptText });

  const ai = getAi();
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: contents,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { 
            type: Type.STRING, 
            description: "Título geral do storyboard em " + language 
          },
          concept: { 
            type: Type.STRING, 
            description: "Resumo do conceito do storyboard em " + language 
          },
          scenes: {
            type: Type.ARRAY,
            description: `Lista de exatamente ${numScenes} cenas listadas sequencialmente.`,
            items: {
              type: Type.OBJECT,
              properties: {
                number: { type: Type.INTEGER, description: "Número sequencial da cena (ex: 1, 2, 3...)" },
                title: { type: Type.STRING, description: "Nome curto ou foco da cena em " + language },
                visualPrompt: { 
                  type: Type.STRING, 
                  description: "Prompt descritivo super detalhado focado em enquadramento e visuais, ESCRITO EM INGLÊS, com no máximo 250 caracteres, otimizado para IA geradora." 
                },
                action: { type: Type.STRING, description: "O que acontece visualmente nesta cena (detalhado em " + language + ")" },
                dialogue: { type: Type.STRING, description: "Diálogos falados ou voz de narração de fundo nesta cena (em " + language + ")" },
                camera: { type: Type.STRING, description: "Ângulo de câmera ou enquadramento, ex: 'Plano Médio', 'Close-Up', 'Plano Geral', 'Contra-plongée' (em " + language + ")" }
              },
              required: ["number", "title", "visualPrompt", "action", "dialogue", "camera"]
            }
          }
        },
        required: ["title", "concept", "scenes"]
      }
    }
  });

  const text = response.text || "{}";
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    console.warn("Retornando dados em formato inválido; tentando reparar correspondência", err);
    // Fallback if parsing fails - create a structured outline manually or throw error
    throw new Error("Não foi possível gerar um roteiro de storyboard válido com a estrutura JSON.");
  }

  // Pre-populate scenes as an array
  const scenes = (parsed.scenes || []).map((scene: any, index: number) => ({
    ...scene,
    number: scene.number || (index + 1)
  }));

  const storyboardData: Omit<Storyboard, 'id' | 'timestamp'> = {
    title: parsed.title || `Storyboard: ${topic}`,
    concept: parsed.concept || `Criação visual interativa sobre ${topic}`,
    type: type,
    scenes: scenes,
    style: style,
    language: language
  };

  // Extract Web Search Grounding results if available
  const searchResults: SearchResultItem[] = [];
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (chunks) {
    chunks.forEach(chunk => {
      if (chunk.web?.uri && chunk.web?.title) {
        searchResults.push({
          title: chunk.web.title,
          url: chunk.web.uri
        });
      }
    });
  }
  const uniqueResults = Array.from(new Map(searchResults.map(item => [item.url, item])).values());

  return {
    storyboard: storyboardData,
    searchResults: uniqueResults
  };
};

/**
 * Generates an image frame for a storyboard scene.
 */
export const generateStoryboardFrame = async (prompt: string, style: VisualStyle): Promise<string> => {
  const styleStr = getStyleInstruction(style);
  const refinedPrompt = `Cinematic storyboard shot, aspect ratio 16:9, ${styleStr}. Scene visual details: ${prompt}`;

  const ai = getAi();
  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: {
      parts: [{ text: refinedPrompt }]
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9",
        imageSize: "1K"
      },
      responseModalities: [Modality.IMAGE],
    }
  });

  // Find the generated image part
  const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (part && part.inlineData && part.inlineData.data) {
    return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("Ocorreu uma falha ao gerar a imagem para este painel do Storyboard.");
};

/**
 * Refines/edits an existing frame base64 image using a text instruction from the user.
 */
export const editStoryboardFrame = async (
  currentImageBase64: string, 
  editInstruction: string,
  style: VisualStyle
): Promise<string> => {
  const cleanBase64 = currentImageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
  const styleStr = getStyleInstruction(style);

  const promptText = `
    Refine this storyboard frame (16:9 aspect ratio, styled as: ${styleStr}).
    Instruction details for refinement: "${editInstruction}".
    Preserve key subjects but modify their appearance, lighting, or background elements as requested.
  `;

  const ai = getAi();
  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
        { text: promptText }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9"
      },
      responseModalities: [Modality.IMAGE],
    }
  });

  const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (part && part.inlineData && part.inlineData.data) {
    return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("Ocorreu uma falha ao aprimorar este frame do Storyboard.");
};

/**
 * Starts a video trailer generation using veo-3.1-lite-generate-preview.
 */
export const startVideoTrailerGeneration = async (
  prompt: string,
  firstFrameBase64?: string
): Promise<string> => {
  const ai = getAi();
  
  const configPayload: any = {
    numberOfVideos: 1,
    resolution: '720p',
    aspectRatio: '16:9'
  };

  const modelInput: any = {
    model: 'veo-3.1-lite-generate-preview',
    prompt: prompt,
    config: configPayload
  };

  if (firstFrameBase64) {
    const cleanBase64 = firstFrameBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
    modelInput.image = {
      imageBytes: cleanBase64,
      mimeType: 'image/png'
    };
  }

  const operation = await ai.models.generateVideos(modelInput);
  if (!operation.name) {
    throw new Error("Não foi possível iniciar a geração de vídeo. Tente novamente.");
  }
  return operation.name;
};

/**
 * Checks the status of an ongoing video generation operation.
 */
export const checkVideoTrailerStatus = async (
  operationName: string
): Promise<{ done: boolean; error?: string }> => {
  const ai = getAi();
  const op = new GenerateVideosOperation();
  op.name = operationName;
  
  const updated = await ai.operations.getVideosOperation({ operation: op });
  
  if (updated.error) {
    return { done: true, error: updated.error.message || "Erro desconhecido ao renderizar vídeo." };
  }
  
  return { done: !!updated.done };
};

/**
 * Downloads the video content base64 from a completed operation.
 */
export const downloadVideoTrailerBlobUrl = async (
  operationName: string
): Promise<string> => {
  const ai = getAi();
  const op = new GenerateVideosOperation();
  op.name = operationName;
  
  const updated = await ai.operations.getVideosOperation({ operation: op });
  const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
  
  if (!uri) {
    throw new Error("URI de download do vídeo indisponível.");
  }

  const apiKey = process.env.API_KEY || '';
  const videoRes = await fetch(uri, {
    headers: { 'x-goog-api-key': apiKey },
  });
  
  if (!videoRes.ok) {
    throw new Error("Falha ao baixar o arquivo de vídeo do servidor do Google.");
  }

  const blob = await videoRes.blob();
  return URL.createObjectURL(blob);
};
