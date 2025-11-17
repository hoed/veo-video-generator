import React, { useState, useEffect, useCallback, useRef } from 'react';
import Button from './components/Button';
import Select from './components/Select';
import ImageUploadPreview from './components/ImageUploadPreview';
import LoadingSpinner from './components/LoadingSpinner';
import { generateVeoVideo, initGeminiApi } from './services/geminiService';
import { ImageFile, VeoAspectRatio, VeoResolution } from './types';

// Define options for Aspect Ratio and Resolution
const aspectRatioOptions = [
  { value: VeoAspectRatio.ASPECT_RATIO_16_9, label: '16:9 (Landscape)' },
  { value: VeoAspectRatio.ASPECT_RATIO_9_16, label: '9:16 (Portrait)' },
];

const resolutionOptions = [
  { value: VeoResolution.RESOLUTION_720P, label: '720p' },
  { value: VeoResolution.RESOLUTION_1080P, label: '1080p' },
];

function App() {
  const [prompt, setPrompt] = useState<string>('');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<VeoAspectRatio>(VeoAspectRatio.ASPECT_RATIO_16_9);
  const [selectedResolution, setSelectedResolution] = useState<VeoResolution>(VeoResolution.RESOLUTION_720P);
  const [referenceImages, setReferenceImages] = useState<ImageFile[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [isApiKeySet, setIsApiKeySet] = useState<boolean>(false);

  // Use a ref to store the latest loading message, to avoid stale closures in useEffect
  const loadingMessageRef = useRef(loadingMessage);
  loadingMessageRef.current = loadingMessage;

  // Function to check and select API key
  const checkAndSelectApiKey = useCallback(async () => {
    setIsLoading(true);
    setLoadingMessage('Checking API key...');
    setError(null);
    try {
      const ai = await initGeminiApi();
      if (ai) {
        setIsApiKeySet(true);
        setError(null);
      } else {
        setIsApiKeySet(false);
        setError('API Key is not configured. Please select your API key.');
      }
    } catch (err: unknown) {
      console.error('API key check failed:', err);
      setIsApiKeySet(false);
      setError(`Failed to initialize API key: ${(err as Error).message}. Please ensure you select a valid API key.`);
    } finally {
      setIsLoading(false);
      setLoadingMessage('Initializing...');
    }
  }, []);

  useEffect(() => {
    checkAndSelectApiKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount to initialize API key state

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!prompt.trim() && referenceImages.length === 0) {
      setError('Please provide a text prompt or at least one reference image.');
      return;
    }
    if (!isApiKeySet) {
      setError('API Key is not configured. Please select your API key before generating video.');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Starting video generation...');
    setVideoUrl(null);
    setError(null);

    try {
      const generatedVideoUrl = await generateVeoVideo(
        prompt,
        selectedAspectRatio,
        selectedResolution,
        referenceImages,
        (message) => setLoadingMessage(message)
      );
      setVideoUrl(generatedVideoUrl);
      setPrompt(''); // Clear prompt after successful generation
      setReferenceImages([]); // Clear reference images after successful generation
    } catch (err: unknown) {
      console.error('Video generation error:', err);
      const errorMessage = (err as Error).message || 'An unknown error occurred during video generation.';
      setError(`Generation failed: ${errorMessage}`);

      // If the error indicates an API key issue, reset the key state
      if (errorMessage.includes("API key might be invalid")) {
        setIsApiKeySet(false);
        // Prompt user to select API key again.
        // The service function already tries to open the dialog, but if it fails, the user needs to know.
        setError(`${errorMessage} Please try selecting your API key again.`);
      }

    } finally {
      setIsLoading(false);
      setLoadingMessage('Initializing...');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl bg-white shadow-xl rounded-xl p-6 sm:p-8 lg:p-10 mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-center text-indigo-800 mb-6">
          Veo Video Generator
        </h1>

        {!isApiKeySet && !isLoading && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded-md" role="alert">
            <p className="font-bold">API Key Required</p>
            <p className="text-sm">Please select your Google Gemini API Key to use this application.</p>
            <p className="text-xs mt-2">
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-yellow-800">
                Billing information
              </a>
            </p>
            <Button
              onClick={checkAndSelectApiKey}
              className="mt-4"
              variant="primary"
              size="sm"
            >
              Select API Key
            </Button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-1">
              Video Prompt (Text or JSON string)
            </label>
            <textarea
              id="prompt"
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3"
              placeholder="Describe the video you want to generate, e.g., 'A cat playing with a red ball in a sunny garden.' or 'A futuristic cityscape at sunset, with flying cars.'"
              disabled={isLoading || !isApiKeySet}
            ></textarea>
          </div>

          <ImageUploadPreview
            onImagesChange={setReferenceImages}
            maxImages={3}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Select
              label="Aspect Ratio"
              options={aspectRatioOptions}
              value={selectedAspectRatio}
              onChange={(e) => setSelectedAspectRatio(e.target.value as VeoAspectRatio)}
              disabled={isLoading || !isApiKeySet}
            />
            <Select
              label="Resolution"
              options={resolutionOptions}
              value={selectedResolution}
              onChange={(e) => setSelectedResolution(e.target.value as VeoResolution)}
              disabled={isLoading || !isApiKeySet}
            />
          </div>

          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}
        </form>
      </div>

      <div className="sticky bottom-0 w-full max-w-4xl bg-white shadow-2xl rounded-t-xl p-4 sm:p-6 border-t border-gray-200">
        <Button
          onClick={handleSubmit}
          type="submit"
          fullWidth
          size="lg"
          disabled={isLoading || !isApiKeySet || (!prompt.trim() && referenceImages.length === 0)}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {loadingMessageRef.current}
            </span>
          ) : (
            'Generate Video'
          )}
        </Button>
      </div>

      {videoUrl && (
        <div className="mt-8 w-full max-w-4xl bg-white shadow-xl rounded-xl p-6 sm:p-8 lg:p-10">
          <h2 className="text-2xl font-bold text-indigo-800 mb-4">Generated Video</h2>
          <div className="aspect-w-16 aspect-h-9 bg-gray-900 rounded-lg overflow-hidden mb-4">
            <video
              key={videoUrl} // Use key to force re-render when videoUrl changes
              controls
              src={videoUrl}
              className="w-full h-full object-contain"
              preload="auto"
            >
              Your browser does not support the video tag.
            </video>
          </div>
          <a
            href={videoUrl}
            download={`veo_video_${Date.now()}.mp4`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Video
          </a>
        </div>
      )}
    </div>
  );
}

export default App;
