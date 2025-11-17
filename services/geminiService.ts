import { GoogleGenAI, VideoGenerationReferenceImage, VideoGenerationReferenceType } from '@google/genai';
import { VeoAspectRatio, VeoResolution, VideoOperation, ImageFile } from '../types';

let isApiKeySelectionOpen = false; // Flag to prevent multiple dialogs

/**
 * Initializes the GoogleGenAI client after ensuring an API key is selected.
 * Prompts the user to select an API key if none is available.
 * @returns A new GoogleGenAI instance or null if API key selection fails.
 */
export const initGeminiApi = async (): Promise<GoogleGenAI | null> => {
  // Ensure process.env.API_KEY is available before proceeding
  if (!process.env.API_KEY) {
    console.error('API_KEY is not set in environment variables.');
    return null;
  }

  // Check if a key is already selected
  let hasKey = false;
  try {
    // Only check if window.aistudio exists
    if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
      hasKey = await window.aistudio.hasSelectedApiKey();
    } else {
      console.warn("window.aistudio.hasSelectedApiKey not found. Assuming API_KEY is set externally or not required.");
      hasKey = true; // Assume true if the aistudio API is not available
    }
  } catch (error) {
    console.error("Error checking API key selection:", error);
    // If there's an error checking, assume no key is selected or aistudio is unavailable
    hasKey = false;
  }

  // If no key is selected and a dialog is not already open, open the selection dialog
  if (!hasKey && window.aistudio && typeof window.aistudio.openSelectKey === 'function' && !isApiKeySelectionOpen) {
    console.log("No API key selected, opening selection dialog...");
    isApiKeySelectionOpen = true; // Set flag
    try {
      await window.aistudio.openSelectKey();
      // Assume key selection was successful after dialog closes
      // The process.env.API_KEY will be updated automatically by the platform
      console.log("API key selection dialog closed. Proceeding with generation.");
      hasKey = true; // Optimistically assume success
    } catch (error) {
      console.error("API key selection failed:", error);
      alert('API key selection failed. Please try again or check the billing documentation: ai.google.dev/gemini-api/docs/billing');
      isApiKeySelectionOpen = false; // Reset flag
      return null;
    } finally {
      isApiKeySelectionOpen = false; // Reset flag
    }
  } else if (!hasKey && (!window.aistudio || typeof window.aistudio.openSelectKey !== 'function')) {
    console.warn("Could not prompt for API key. window.aistudio.openSelectKey not available. Please ensure API_KEY is set.");
    // If we can't open the dialog, but the key isn't there, we can't proceed.
    if (!process.env.API_KEY) {
      alert("API Key is not configured. Please ensure it's set in your environment.");
      return null;
    }
  }

  // Re-check API_KEY after potential selection, or proceed if it was already there
  if (process.env.API_KEY) {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  } else {
    console.error("API_KEY is still not available after selection process.");
    alert("API Key is not available. Video generation cannot proceed. Please select an API key or ensure it's configured.");
    return null;
  }
};


/**
 * Generates a video using the Veo 3.1 model.
 * Handles polling for operation completion.
 * @param prompt The text prompt for video generation.
 * @param aspectRatio The desired aspect ratio.
 * @param resolution The desired video resolution.
 * @param referenceImages Optional array of ImageFile for reference.
 * @param onProgress Callback for progress updates during polling.
 * @returns The URL of the generated video or null if an error occurs.
 */
export const generateVeoVideo = async (
  prompt: string,
  aspectRatio: VeoAspectRatio,
  resolution: VeoResolution,
  referenceImages: ImageFile[],
  onProgress: (message: string) => void,
): Promise<string | null> => {
  const ai = await initGeminiApi();
  if (!ai) {
    throw new Error('GoogleGenAI client could not be initialized. API key might be missing or invalid.');
  }

  onProgress('Initiating video generation...');

  const referenceImagesPayload: VideoGenerationReferenceImage[] = referenceImages.map(img => ({
    image: {
      imageBytes: img.base64,
      mimeType: img.file.type,
    },
    referenceType: VideoGenerationReferenceType.ASSET,
  }));

  const model = 'veo-3.1-generate-preview'; // Using the more capable model for reference images

  try {
    let operation = await ai.models.generateVideos({
      model,
      prompt,
      config: {
        numberOfVideos: 1,
        resolution,
        aspectRatio,
        referenceImages: referenceImagesPayload.length > 0 ? referenceImagesPayload : undefined,
      },
    });

    onProgress('Video generation started. Waiting for completion...');
    const startTime = Date.now();
    let lastLogTime = startTime;

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
      operation = await ai.operations.getVideosOperation({ operation: operation });

      const currentTime = Date.now();
      if (currentTime - lastLogTime > 10000) { // Log every 10 seconds
        onProgress(`Still generating... ${Math.floor((currentTime - startTime) / 1000)}s elapsed.`);
        lastLogTime = currentTime;
      }
    }

    if (operation.error) {
      console.error('Video generation failed:', operation.error);
      if (operation.error.message.includes("Requested entity was not found.")) {
        alert("API Key might be invalid or has issues. Please re-select your API key through the dialog.");
        // Attempt to re-open the key selector. This is a best effort attempt.
        if (window.aistudio && typeof window.aistudio.openSelectKey === 'function' && !isApiKeySelectionOpen) {
          isApiKeySelectionOpen = true;
          try {
            await window.aistudio.openSelectKey();
          } finally {
            isApiKeySelectionOpen = false;
          }
        }
      }
      throw new Error(`Video generation failed: ${operation.error.message}`);
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
      throw new Error('Generated video URI not found in the response.');
    }

    // Append API key for fetching the video
    return `${downloadLink}&key=${process.env.API_KEY}`;
  } catch (error) {
    console.error('Error in generateVeoVideo:', error);
    throw error; // Re-throw to be caught by the component
  }
};
