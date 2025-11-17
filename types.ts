export enum VeoAspectRatio {
  ASPECT_RATIO_16_9 = '16:9',
  ASPECT_RATIO_9_16 = '9:16',
}

export enum VeoResolution {
  RESOLUTION_720P = '720p',
  RESOLUTION_1080P = '1080p',
}

export interface ImageFile {
  id: string;
  file: File;
  base64: string;
}

export interface VideoOperation {
  name: string;
  metadata: Record<string, unknown>;
  done: boolean;
  response?: {
    generatedVideos?: Array<{
      video?: {
        uri?: string;
        aspectRatio?: VeoAspectRatio;
        resolution?: VeoResolution;
      };
    }>;
  };
  error?: {
    code: number;
    message: string;
    details: Array<Record<string, unknown>>;
  };
}

// Fix: Define the AIStudio interface explicitly, as the error message indicates
// that `window.aistudio` is expected to be of type 'AIStudio'.
// This ensures type consistency across any implicit or explicit declarations.
interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

// Extend the Window interface to include aistudio property
declare global {
  interface Window {
    // Fix: Use the defined AIStudio interface for the 'aistudio' property.
    aistudio: AIStudio;
  }
}