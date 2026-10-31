import { API_BASE_URL } from "./config";
import { fetchWithAuth } from "./auth";

export interface CloudinaryUploadOptions {
  cloudName?: string;
  uploadPreset?: string;
  folder?: string;
  assetType?: string;
}

export interface CloudinaryUploadResult {
  url: string;
  public_id?: string;
  format?: string;
}

/**
 * Uploads an image file directly to Cloudinary using the unsigned upload preset REST API.
 * Automatically falls back to the backend authenticated upload endpoint if the
 * client-side unsigned preset is unconfigured or rejected by Cloudinary.
 */
export async function uploadToCloudinary(
  file: File,
  options?: CloudinaryUploadOptions
): Promise<string> {
  if (!file) {
    throw new Error("No file provided for upload.");
  }

  // Validate file size (10 MB max)
  const maxBytes = 10 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error("File size exceeds 10 MB limit.");
  }

  const cloudName =
    options?.cloudName ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    "t6pf4kyu";
  const uploadPreset =
    options?.uploadPreset ||
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ||
    "school_preset";

  // 1. Attempt direct unsigned upload to Cloudinary REST API
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);
    if (options?.folder) {
      formData.append("folder", options.folder);
    }

    const cloudinaryEndpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    const res = await fetch(cloudinaryEndpoint, {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      const secureUrl = data.secure_url || data.url;
      if (secureUrl) {
        return secureUrl;
      }
    } else {
      const errData = await res.json().catch(() => null);
      console.warn(
        "Direct Cloudinary upload returned status",
        res.status,
        errData?.error?.message || "Falling back to backend authorized upload."
      );
    }
  } catch (directErr) {
    console.warn("Direct Cloudinary upload network error, falling back:", directErr);
  }

  // 2. Resilient fallback to backend authenticated endpoint
  try {
    const fallbackFormData = new FormData();
    fallbackFormData.append("file", file);
    if (options?.assetType) {
      fallbackFormData.append("asset_type", options.assetType);
    }

    const backendEndpoint = `${API_BASE_URL}/school-profile/upload-asset/`;
    const backendRes = await fetchWithAuth(backendEndpoint, {
      method: "POST",
      body: fallbackFormData,
    });

    if (backendRes.ok) {
      const backendData = await backendRes.json();
      const resolvedUrl = backendData.url || backendData.secure_url;
      if (resolvedUrl) {
        return resolvedUrl;
      }
    } else {
      const errorPayload = await backendRes.json().catch(() => ({}));
      const msg =
        errorPayload.detail ||
        errorPayload.error ||
        errorPayload.message ||
        `Backend upload failed with status ${backendRes.status}`;
      throw new Error(msg);
    }
  } catch (fallbackErr: any) {
    throw new Error(fallbackErr?.message || "Failed to upload image. Please try again.");
  }

  throw new Error("Unable to obtain secure image URL from Cloudinary.");
}

