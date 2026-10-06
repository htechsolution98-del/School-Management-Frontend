import { fetchWithAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { toast } from "sonner";

/**
 * Returns the full Django stream URL for a syllabus document.
 */
export function getSyllabusStreamUrl(id: number | string): string {
  const base = API_BASE_URL.replace(/\/+$/, "");
  if (base.endsWith("/api")) {
    return `${base}/syllabus/${id}/file/`;
  }
  return `${base}/api/syllabus/${id}/file/`;
}

/**
 * Checks if a given URL is a local/Django API endpoint.
 */
export function isApiEndpoint(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  if (url.startsWith(API_BASE_URL)) return true;
  return false;
}

export interface DocumentBlobResult {
  objectUrl: string;
  contentType: string;
  isImage: boolean;
}

/**
 * Fetches a document via authenticated streaming or direct fetch,
 * detects the actual response Content-Type dynamically,
 * and creates a Blob with the matching dynamic MIME type.
 */
export async function getDocumentBlob(
  url: string,
  fallbackUrl?: string
): Promise<DocumentBlobResult> {
  const isApi = isApiEndpoint(url);

  // 1. Fetch document stream
  const res = isApi
    ? await fetchWithAuth(url)
    : await fetch(url, { mode: "cors" });

  // 2. Strict response check - do NOT wrap error payloads into file blobs
  if (!res.ok) {
    let errorDetail = `HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson.error) errorDetail = String(errJson.error);
      else if (errJson.message) errorDetail = String(errJson.message);
      else if (errJson.detail) errorDetail = String(errJson.detail);
    } catch {
      // not JSON
    }
    throw new Error(`Failed to load document: ${errorDetail}`);
  }

  // 3. Read actual Content-Type from fetch response headers
  const rawContentType = res.headers.get("Content-Type") || "";
  let contentType = rawContentType.split(";")[0].trim();

  // If response is HTML or JSON despite ok status, it's not a valid document
  if (contentType.includes("html") || (contentType.includes("json") && !rawContentType.includes("pdf"))) {
    let message = "Document format not supported or invalid response from server";
    try {
      const errJson = await res.json();
      if (errJson.error) message = String(errJson.error);
      else if (errJson.detail) message = String(errJson.detail);
    } catch {}
    throw new Error(message);
  }

  const blobData = await res.blob();

  // Sniff magic bytes if generic/missing, or to guard against misidentified images
  if (
    !contentType ||
    contentType === "application/octet-stream" ||
    contentType === "binary/octet-stream" ||
    contentType === "application/pdf"
  ) {
    try {
      const headerSlice = await blobData.slice(0, 16).arrayBuffer();
      const bytes = new Uint8Array(headerSlice);
      if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
        contentType = "image/png";
      } else if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
        contentType = "image/jpeg";
      } else if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
        contentType = "application/pdf";
      } else if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
        contentType = "image/gif";
      } else if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
        contentType = "image/webp";
      }
    } catch {
      // ignore slice error
    }
  }

  // Fallback to URL extension inference or application/pdf
  if (!contentType || contentType === "application/octet-stream") {
    const lower = (url || fallbackUrl || "").toLowerCase();
    if (lower.includes(".png")) contentType = "image/png";
    else if (lower.includes(".jpg") || lower.includes(".jpeg")) contentType = "image/jpeg";
    else if (lower.includes(".webp")) contentType = "image/webp";
    else if (lower.includes(".gif")) contentType = "image/gif";
    else contentType = "application/pdf";
  }

  // 4. Create Blob using the dynamic Content-Type
  const blob = new Blob([blobData], { type: contentType });
  const objectUrl = URL.createObjectURL(blob);
  const isImage = contentType.startsWith("image/");

  return { objectUrl, contentType, isImage };
}

/**
 * Returns a localized object URL for the requested document.
 */
export async function getDocumentBlobUrl(
  url: string,
  fallbackUrl?: string
): Promise<string> {
  const { objectUrl } = await getDocumentBlob(url, fallbackUrl);
  return objectUrl;
}

/**
 * Fetches a document via authenticated streaming or direct fetch,
 * creates an application/pdf or image Blob object URL, and opens it safely in a new browser tab.
 */
export async function openAuthenticatedDocument(
  url: string,
  title?: string,
  fallbackUrl?: string
): Promise<void> {
  // Pre-open tab synchronously on user action to bypass strict popup blockers
  let newTab: Window | null = null;
  try {
    newTab = window.open("about:blank", "_blank");
    if (newTab) {
      newTab.document.title = title ? `Loading ${title}...` : "Loading Document...";
      newTab.document.body.innerHTML = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc;">
          <div style="width: 44px; height: 44px; border: 3px solid #334155; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <p style="margin-top: 18px; font-size: 14px; font-weight: 500;">Loading document securely...</p>
          <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
        </div>
      `;
    }
  } catch {
    // ignore
  }

  try {
    const { objectUrl, isImage } = await getDocumentBlob(url, fallbackUrl);

    if (newTab && !newTab.closed) {
      if (isImage) {
        newTab.document.title = title || "Document Image";
        newTab.document.body.innerHTML = `
          <div style="margin: 0; background: #0f172a; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; box-sizing: border-box;">
            <div style="margin-bottom: 16px; display: flex; gap: 12px; align-items: center;">
              <span style="color: #94a3b8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 500;">${title || "Image Preview"}</span>
              <a href="${objectUrl}" download="${title || "document"}" style="color: #38bdf8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; text-decoration: none; padding: 4px 10px; border: 1px solid #38bdf8; border-radius: 4px; transition: background 0.2s;">Download</a>
            </div>
            <img src="${objectUrl}" alt="${title || "Document"}" style="max-width: 95vw; max-height: 85vh; object-fit: contain; border-radius: 6px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" />
          </div>
        `;
      } else {
        newTab.location.href = objectUrl;
      }
    } else {
      window.open(objectUrl, "_blank");
    }
  } catch (err) {
    console.error("Document viewer error:", err);
    if (newTab && !newTab.closed) {
      newTab.close();
    }
    const message = err instanceof Error ? err.message : "Failed to load document";
    toast.error(message);
  }
}
