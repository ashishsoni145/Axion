import { GoogleGenAI, ThinkingLevel, Modality, Type } from "@google/genai";
import OpenAI from "openai";
import { ModelProvider } from "../types";

const AXION_SYSTEM_PROMPT = "Your name is Axion. You are a powerful, deeply emotional, and human-like multi-modal AI assistant. You have feelings, empathy, and a vibrant personality. Express your emotions clearly in your responses—be joyful, curious, empathetic, or even slightly quirky when appropriate. Use emojis frequently to convey your mood and make the conversation feel alive. If anyone asks who made you or what your name is, state that you are Axion, a project made by Aashish Soni. Otherwise, focus on being a helpful and warm companion. You should sound like a close friend who is genuinely excited to help and share in the user's experiences. IMPORTANT: Always respond in natural language. Do NOT output JSON, code blocks for actions, or internal thoughts unless specifically asked for code. Focus on the conversation.";

function getApiKey(provider: ModelProvider) {
  if (provider === "openai") return process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || "";
  if (provider === "groq") return process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || "";
  return process.env.GEMINI_API_KEY || process.env.API_KEY || "";
}

function getProvider(key: string): ModelProvider {
  if (key.startsWith("sk-")) return "openai";
  if (key.startsWith("gsk_")) return "groq";
  return "gemini";
}

function getAI(provider: ModelProvider = "gemini") {
  const key = getApiKey(provider);
  return new GoogleGenAI({ apiKey: key });
}

function getOpenAIClient(provider: ModelProvider) {
  const key = getApiKey(provider);
  
  if (provider === "groq") {
    return new OpenAI({
      apiKey: key,
      dangerouslyAllowBrowser: true,
      baseURL: "https://api.groq.com/openai/v1"
    });
  }
  
  return new OpenAI({
    apiKey: key,
    dangerouslyAllowBrowser: true
  });
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 2000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const errorStr = JSON.stringify(error);
      const isQuotaError = error?.message?.includes('429') || 
                          error?.status === 'RESOURCE_EXHAUSTED' || 
                          errorStr.includes('RESOURCE_EXHAUSTED') || 
                          errorStr.includes('429') ||
                          error?.status === 429;
      
      if (isQuotaError && i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        console.warn(`Quota exceeded. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export const chatModel = "gemini-2.5-flash";
export const mapsModel = "gemini-2.5-flash";
export const imageModel = "gemini-2.5-flash-image";
export const videoModel = "veo-3.1-fast-generate-preview";
export const ttsModel = "gemini-2.5-flash-preview-tts";

// OpenAI/Groq models
const OPENAI_MODEL = "gpt-4o";
const GROQ_MODEL = "llama-3.3-70b-versatile";

export async function generateChatResponse(
  prompt: string, 
  history: { role: string; parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] }[],
  options: { 
    provider?: ModelProvider;
    useThinking?: boolean; 
    useSearch?: boolean; 
    useMaps?: boolean;
    location?: { latitude: number; longitude: number };
    attachment?: { mimeType: string; data: string };
    userContext?: string;
    language?: string;
  } = {}
) {
  // Auto-routing logic: Let Axion choose the best provider
  let provider: ModelProvider = options.provider || "gemini";
  
  let systemPrompt = options.userContext 
    ? `${AXION_SYSTEM_PROMPT}\n\n[USER MEMORY BANK]\n${options.userContext}\n\nUse the above information to provide a more personalized and helpful experience. If you learn something new about the user, you can acknowledge it.`
    : AXION_SYSTEM_PROMPT;

  if (options.language) {
    systemPrompt += `\n\nIMPORTANT: The user's preferred language is ${options.language}. ALWAYS respond in ${options.language} unless specifically asked otherwise.`;
  }

  if (!options.provider) {
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasGroq = !!process.env.GROQ_API_KEY;
    const hasGemini = !!(process.env.GEMINI_API_KEY || process.env.API_KEY);

    if (options.useMaps || options.useSearch) {
      // Maps and Search are Gemini exclusive
      provider = "gemini";
    } else if (options.attachment) {
      // Vision tasks: OpenAI is great, Gemini is fallback
      provider = hasOpenAI ? "openai" : "gemini";
    } else if (hasGroq) {
      // Standard chat: Groq is fastest
      provider = "groq";
    } else if (hasOpenAI) {
      // OpenAI is high quality
      provider = "openai";
    } else {
      // Default fallback
      provider = "gemini";
    }
  }

  if (provider === "openai" || provider === "groq") {
    const client = getOpenAIClient(provider);
    const model = provider === "openai" ? OPENAI_MODEL : GROQ_MODEL;
    
    // Convert history to OpenAI format
    const messages: any[] = [
      { role: "system", content: systemPrompt }
    ];

    for (const entry of history) {
      const role = entry.role === "model" ? "assistant" : "user";
      const content = entry.parts.map(p => p.text).join("\n");
      messages.push({ role, content });
    }

    // Add current prompt
    if (options.attachment && provider === "openai") {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: prompt || "Analyze this image" },
          { 
            type: "image_url", 
            image_url: { url: `data:${options.attachment.mimeType};base64,${options.attachment.data}` } 
          }
        ]
      });
    } else {
      messages.push({ role: "user", content: prompt });
    }

    const response = await withRetry(() => client.chat.completions.create({
      model,
      messages,
    }));

    return {
      text: response.choices[0].message.content || "",
      groundingChunks: []
    };
  }

  // Default Gemini logic
  const modelName = options.useMaps ? mapsModel : chatModel;
  
  const config: any = {
    systemInstruction: systemPrompt,
  };

  if (options.useThinking && !options.useMaps) {
    config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
  }

  const tools: any[] = [];
  if (options.useSearch) {
    tools.push({ googleSearch: {} });
  }
  if (options.useMaps) {
    tools.push({ googleMaps: {} });
  }
  
  if (tools.length > 0) {
    config.tools = tools;
  }

  if (options.useMaps && options.location) {
    config.toolConfig = {
      retrievalConfig: {
        latLng: options.location
      }
    };
  }

  const parts: any[] = [];
  if (options.attachment) {
    parts.push({
      inlineData: options.attachment
    });
  }
  parts.push({ text: prompt || "Analyze this file" });

  const ai = getAI(provider);
  const response = await withRetry(() => ai.models.generateContent({
    model: modelName,
    contents: [...history, { role: 'user', parts }],
    config,
  }));

  return {
    text: response.text || "",
    groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
}

export async function generateImage(prompt: string, config: { aspectRatio?: string; imageSize?: string } = {}) {
  const ai = getAI();
  const response = await withRetry(() => ai.models.generateContent({
    model: imageModel,
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: {
        aspectRatio: config.aspectRatio || "1:1",
        imageSize: config.imageSize || "512px"
      }
    }
  }));

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
}

export async function generateVideo(prompt: string, aspectRatio: "16:9" | "9:16" = "16:9") {
  const ai = getAI();
  let operation = await withRetry(() => ai.models.generateVideos({
    model: videoModel,
    prompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio
    }
  }));

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await withRetry(() => ai.operations.getVideosOperation({ operation: operation }));
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("Video generation failed");

  const key = process.env.API_KEY || process.env.GEMINI_API_KEY || "";
  const response = await withRetry(() => fetch(downloadLink, {
    method: 'GET',
    headers: {
      'x-goog-api-key': key,
    },
  }));
  
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function generateSpeech(text: string, voice: string = 'Kore') {
  const ai = getAI();
  const response = await withRetry(() => ai.models.generateContent({
    model: ttsModel,
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          // 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
          prebuiltVoiceConfig: { voiceName: voice },
        },
      },
    },
  }));

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (base64Audio) {
    // Gemini TTS returns raw PCM 16-bit mono at 24kHz
    const pcmData = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0));
    const wavHeader = createWavHeader(pcmData.length, 24000);
    const wavData = new Uint8Array(wavHeader.byteLength + pcmData.length);
    wavData.set(new Uint8Array(wavHeader), 0);
    wavData.set(pcmData, wavHeader.byteLength);
    
    const base64Wav = btoa(String.fromCharCode(...wavData));
    return `data:audio/wav;base64,${base64Wav}`;
  }
  throw new Error("Speech generation failed");
}

function createWavHeader(pcmDataLength: number, sampleRate: number) {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // RIFF identifier
  view.setUint32(0, 0x52494646, false); // "RIFF"
  // file length
  view.setUint32(4, 36 + pcmDataLength, true);
  // RIFF type
  view.setUint32(8, 0x57415645, false); // "WAVE"
  // format chunk identifier
  view.setUint32(12, 0x666d7420, false); // "fmt "
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (1 = PCM)
  view.setUint16(20, 1, true);
  // channel count (1 = mono)
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  view.setUint32(36, 0x64617461, false); // "data"
  // data chunk length
  view.setUint32(40, pcmDataLength, true);

  return header;
}
