/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { 
  getFirestore, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocFromServer 
} from 'firebase/firestore';
import { app, auth } from './googleDriveService';
import firebaseConfig from '../firebase-applet-config.json';
import { Storyboard } from '../types';

// Initialize Cloud Firestore with dedicated Database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

/**
 * Operation Types matching the Firebase Integration skill
 */
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

/**
 * Structure of errors matching specifications in SKILL.md
 */
export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Handle and structure Firestore Permission and CRUD errors as stringified JSONs
 */
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Detailed Context: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Verify connectivity on boot to satisfy the skill design guidelines
 */
export async function testConnection(): Promise<boolean> {
  const testPath = 'test/connection';
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Successfully validated live connection to Firestore.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Firestore connection diagnostic: Client is offline.');
    } else {
      console.warn('Firestore connection diagnostic: test document read failed.', error);
    }
    return false;
  }
}

/**
 * Save or completely update a storyboard in Cloud Firestore under 'storyboards'
 */
export const saveStoryboardToFirestore = async (storyboard: Storyboard, userId: string): Promise<void> => {
  const docPath = `storyboards/${storyboard.id}`;
  try {
    const docRef = doc(db, 'storyboards', storyboard.id);
    const docPayload = {
      ...storyboard,
      userId,
    };
    await setDoc(docRef, docPayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
};

/**
 * Fetch all storyboards belonging to the authenticated User from Firestore
 */
export const getUserStoryboardsFromFirestore = async (userId: string): Promise<Storyboard[]> => {
  const collectionPath = 'storyboards';
  try {
    const q = query(
      collection(db, 'storyboards'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    const snap = await getDocs(q);
    const results: Storyboard[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      // Exclude mapping properties that might exist on document levels
      const { userId: _, ...storyboardData } = data;
      results.push(storyboardData as Storyboard);
    });
    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionPath);
  }
};

/**
 * Delete a specific storyboard document from Firestore
 */
export const deleteStoryboardFromFirestore = async (storyboardId: string): Promise<void> => {
  const docPath = `storyboards/${storyboardId}`;
  try {
    const docRef = doc(db, 'storyboards', storyboardId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
};
