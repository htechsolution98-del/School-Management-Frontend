"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { uploadToCloudinary, CloudinaryUploadOptions } from "@/lib/cloudinary-upload";

export interface UseCloudinaryUploadReturn {
  isUploading: boolean;
  activeKey: string | null;
  error: string | null;
  uploadFile: (file: File, assetKey?: string, options?: CloudinaryUploadOptions) => Promise<string | null>;
}

export function useCloudinaryUpload(): UseCloudinaryUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(
    async (
      file: File,
      assetKey?: string,
      options?: CloudinaryUploadOptions
    ): Promise<string | null> => {
      setIsUploading(true);
      if (assetKey) setActiveKey(assetKey);
      setError(null);

      const toastId = toast.loading(`Uploading ${file.name} to Cloudinary...`);

      try {
        const secureUrl = await uploadToCloudinary(file, {
          ...options,
          assetType: assetKey || options?.assetType,
        });

        toast.success("Image uploaded successfully!", { id: toastId });
        return secureUrl;
      } catch (err: any) {
        const msg = err?.message || "Failed to upload image. Please try again.";
        setError(msg);
        toast.error(msg, { id: toastId });
        return null;
      } finally {
        setIsUploading(false);
        setActiveKey(null);
      }
    },
    []
  );

  return {
    isUploading,
    activeKey,
    error,
    uploadFile,
  };
}

