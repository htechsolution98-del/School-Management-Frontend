import { API_BASE_URL } from "./config";
import { fetchWithAuth } from "./auth";

export const MAX_ASSET_SIZE_BYTES = 200 * 1024; // 204,800 bytes (200 KB)

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

export const ALLOWED_FAVICON_MIME_TYPES = [
  ...ALLOWED_IMAGE_MIME_TYPES,
  "image/x-icon",
  "image/vnd.microsoft.icon",
];

export const ALLOWED_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];
export const ALLOWED_FAVICON_EXTENSIONS = [...ALLOWED_IMAGE_EXTENSIONS, ".ico"];

export interface AssetValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates file size and format before uploading.
 * Max size: 200 KB (204,800 bytes).
 * Formats: PNG, JPG, JPEG, WEBP (and ICO for favicons).
 */
export function validateAssetFile(
  file: File,
  isFavicon: boolean = false
): AssetValidationResult {
  if (!file) {
    return { valid: false, error: "No file selected." };
  }

  // 1. Strict Size Check (200 KB = 204,800 bytes)
  if (file.size > MAX_ASSET_SIZE_BYTES) {
    return {
      valid: false,
      error: "File size exceeds 200 KB. Please compress and upload a smaller file.",
    };
  }

  // 2. Format & MIME Restriction
  const allowedMimes = isFavicon ? ALLOWED_FAVICON_MIME_TYPES : ALLOWED_IMAGE_MIME_TYPES;
  const allowedExts = isFavicon ? ALLOWED_FAVICON_EXTENSIONS : ALLOWED_IMAGE_EXTENSIONS;

  const fileName = file.name.toLowerCase();
  const hasValidExt = allowedExts.some((ext) => fileName.endsWith(ext));
  const hasValidMime = !file.type || allowedMimes.includes(file.type.toLowerCase());

  if (!hasValidExt || !hasValidMime) {
    return {
      valid: false,
      error: isFavicon
        ? "Invalid image format. Allowed formats: PNG, JPG, WEBP, or ICO."
        : "Invalid image format. Allowed formats: PNG, JPG, or WEBP.",
    };
  }

  return { valid: true };
}

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
 * Strictly enforces a 200 KB max limit and restricts formats to PNG, JPG, JPEG, WEBP (and ICO for favicons).
 */
export async function uploadToCloudinary(
  file: File,
  options?: CloudinaryUploadOptions
): Promise<string> {
  const isFavicon =
    options?.assetType === "favicon_url" ||
    Boolean(options?.folder && options.folder.includes("favicon"));

  const validation = validateAssetFile(file, isFavicon);
  if (!validation.valid) {
    throw new Error(validation.error || "File validation failed.");
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
      const fileErr = Array.isArray(errorPayload.file)
        ? errorPayload.file[0]
        : errorPayload.file;
      const msg =
        fileErr ||
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
