export type MessageRole = 'user' | 'model';
export type MessageType = 'text' | 'image' | 'video' | 'audio';
export type ModelProvider = 'gemini' | 'openai' | 'groq';

export interface Message {
  id?: string;
  sessionId: string;
  userId: string;
  role: MessageRole;
  content: string;
  type: MessageType;
  mediaUrl?: string;
  createdAt: any;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: any;
  updatedAt: any;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: any;
}
