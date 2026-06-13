/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { Storyboard } from '../types';

// Initialize Firebase App and Auth
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request the Google Drive scopes requested by the user
provider.addScope('https://www.googleapis.com/auth/drive');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Start Google sign-in flow
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

/**
 * Check if the "StoryCreator Storyboards" folder exists on Drive; if not, create it.
 */
export const getOrCreateFolder = async (accessToken: string, folderName = 'StoryCreator Storyboards'): Promise<string> => {
  // Search for an existing folder with that name
  const query = encodeURIComponent(`name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const listUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;
  
  const searchRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  // If not found, create a new folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    })
  });

  if (!createRes.ok) {
    throw new Error('Failed to create storyboards folder in your Google Drive.');
  }

  const folder = await createRes.json();
  return folder.id;
};

/**
 * Upload a text script file to Google Drive.
 */
export const uploadScriptToDrive = async (
  accessToken: string,
  storyboard: Storyboard,
  folderId: string
): Promise<string> => {
  const header = `=========================================\n`;
  const titleText = `STORYBOARD: ${storyboard.title.toUpperCase()}\n`;
  const conceptText = `Conceito Original: ${storyboard.concept}\n`;
  const details = `Estilo Visual: ${storyboard.style} | Idioma: ${storyboard.language} | Formato: Storyboard ${storyboard.type}\n`;
  const line = `-----------------------------------------\n`;
  
  let content = header + titleText + conceptText + details + header + `\n`;

  storyboard.scenes.forEach(scene => {
    content += `CENA ${scene.number}: ${scene.title.toUpperCase()}\n`;
    content += `[Enquadramento]: ${scene.camera}\n`;
    content += `[Ação / Descrição]: ${scene.action}\n`;
    content += `[Diálogo / Voz]: ${scene.dialogue}\n`;
    content += `[AI Image Prompt (Inglês)]: ${scene.visualPrompt}\n`;
    content += line + `\n`;
  });

  const metadata = {
    name: `roteiro-${storyboard.title.replace(/\s+/g, '-').toLowerCase()}.txt`,
    mimeType: 'text/plain',
    parents: [folderId]
  };

  const boundary = 'foo_bar_boundary';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartBody = 
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: text/plain; charset=UTF-8\r\n\r\n' +
    content +
    closeDelimiter;

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartBody
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Drive upload failed:', errorText);
    throw new Error('Falha ao enviar script ao Google Drive.');
  }

  const result = await res.json();
  return result.id;
};

/**
 * Upload a fully-formatted, standalone HTML story report with illustrated frames embed.
 */
export const uploadHtmlReportToDrive = async (
  accessToken: string,
  storyboard: Storyboard,
  folderId: string
): Promise<string> => {
  let scenesHtml = '';
  
  storyboard.scenes.forEach(scene => {
    const imageTag = scene.imageData 
      ? `<img src="data:${scene.imageData.startsWith('data:') ? '' : 'image/jpeg;base64,'}${scene.imageData}" style="max-width: 100%; border-radius: 12px; border: 1px solid #e2e8f0; margin-top: 10px;" />`
      : `<div style="background: #f1f5f9; border-radius: 12px; padding: 40px; text-align: center; color: #94a3b8; font-family: monospace; border: 1px dashed #cbd5e1; margin-top: 10px;">Frame não ilustrado</div>`;

    scenesHtml += `
      <div style="background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 24px; margin-bottom: 24px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; margin-bottom: 16px;">
          <h3 style="margin: 0; font-size: 18px; color: #0f172a;">Cena ${scene.number}: ${scene.title}</h3>
          <span style="font-size: 11px; font-weight: bold; background: #ecfdf5; color: #047857; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; font-family: monospace;">${scene.camera}</span>
        </div>
        ${imageTag}
        <div style="margin-top: 16px; font-size: 14px; line-height: 1.6;">
          <p style="margin: 4px 0;"><strong style="color: #475569;">Ação:</strong> ${scene.action}</p>
          <p style="margin: 4px 0;"><strong style="color: #475569;">Diálogo:</strong> <span style="font-style: italic; color: #0284c7;">"${scene.dialogue}"</span></p>
          <p style="margin: 4px 0; font-size: 12px; color: #94a3b8;"><strong style="color: #94a3b8;">Visual Prompt:</strong> ${scene.visualPrompt}</p>
        </div>
      </div>
    `;
  });

  const content = `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="UTF-8">
      <title>Storyboard - ${storyboard.title}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; color: #1e293b; padding: 40px 20px; max-width: 800px; margin: 0 auto; }
        h1 { font-size: 32px; color: #0f172a; margin-bottom: 8px; }
        .meta-badges { margin-bottom: 20px; }
        .badge { display: inline-block; font-size: 12px; padding: 4px 12px; border-radius: 9999px; margin-right: 8px; font-weight: 500; }
        .badge-cyan { background: #ecfeff; color: #0891b2; border: 1px solid #cffafe; }
        .badge-purple { background: #faf5ff; color: #9333ea; border: 1px solid #f3e8ff; }
        .concept { font-size: 16px; color: #475569; line-height: 1.6; background: #fff; border-radius: 16px; padding: 20px; border: 1px solid #e2e8f0; margin-bottom: 30px; }
      </style>
    </head>
    <body>
      <h1>${storyboard.title}</h1>
      <div class="meta-badges">
        <span class="badge badge-cyan">Formato: ${storyboard.type}</span>
        <span class="badge badge-purple">Estilo: ${storyboard.style}</span>
      </div>
      <div class="concept">
        <strong>Conceito:</strong> ${storyboard.concept}
      </div>
      <h2>Lista de Quadros</h2>
      ${scenesHtml}
      <footer style="text-align: center; margin-top: 40px; font-size: 12px; color: #94a3b8; font-family: monospace;">
        Gerado por StoryCreator • ${new Date().toLocaleDateString('pt-BR')}
      </footer>
    </body>
    </html>
  `;

  const metadata = {
    name: `storyboard-${storyboard.title.replace(/\s+/g, '-').toLowerCase()}.html`,
    mimeType: 'text/html',
    parents: [folderId]
  };

  const boundary = 'foo_bar_boundary';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartBody = 
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: text/html; charset=UTF-8\r\n\r\n' +
    content +
    closeDelimiter;

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartBody
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Drive HTML upload failed:', errorText);
    throw new Error('Falha ao enviar storyboard HTML.');
  }

  const result = await res.json();
  return result.id;
};
