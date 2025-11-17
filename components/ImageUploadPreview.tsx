import React from 'react';
import { ImageFile } from '../types';

interface ImageUploadPreviewProps {
  onImagesChange: (images: ImageFile[]) => void;
  maxImages?: number;
}

const ImageUploadPreview: React.FC<ImageUploadPreviewProps> = ({
  onImagesChange,
  maxImages = 3,
}) => {
  const [images, setImages] = React.useState<ImageFile[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      const currentCount = images.length;
      const filesToAdd = newFiles.slice(0, maxImages - currentCount);

      const newImagePromises = filesToAdd.map(async (file) => {
        const base64 = await convertFileToBase64(file);
        return {
          id: Math.random().toString(36).substring(7), // Unique ID for keying
          file,
          base64,
        };
      });

      const newImageFiles = await Promise.all(newImagePromises);
      const updatedImages = [...images, ...newImageFiles];
      setImages(updatedImages);
      onImagesChange(updatedImages);

      // Clear the file input to allow re-uploading the same file if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (id: string) => {
    const updatedImages = images.filter((img) => img.id !== id);
    setImages(updatedImages);
    onImagesChange(updatedImages);
  };

  return (
    <div className="w-full">
      <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-1">
        Reference Images (Max {maxImages})
      </label>
      <input
        id="file-upload"
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="block w-full text-sm text-gray-500
                   file:mr-4 file:py-2 file:px-4
                   file:rounded-md file:border-0
                   file:text-sm file:font-semibold
                   file:bg-indigo-50 file:text-indigo-600
                   hover:file:bg-indigo-100 mb-4"
        disabled={images.length >= maxImages}
      />
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {images.map((image) => (
          <div key={image.id} className="relative group w-full h-40 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
            <img
              src={`data:${image.file.type};base64,${image.base64}`}
              alt={`Preview ${image.file.name}`}
              className="object-contain w-full h-full"
            />
            <button
              onClick={() => handleRemoveImage(image.id)}
              className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              aria-label={`Remove ${image.file.name}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      {images.length >= maxImages && (
        <p className="text-sm text-gray-500 mt-2">Maximum {maxImages} images uploaded.</p>
      )}
    </div>
  );
};

export default ImageUploadPreview;
