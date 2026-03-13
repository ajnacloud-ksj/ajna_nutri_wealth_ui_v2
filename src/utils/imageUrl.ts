import { backendApi } from "@/lib/api/client";

const urlCache = new Map<string, { url: string; expires: number }>();
const CACHE_TTL = 50 * 60 * 1000; // 50 minutes (presigned URLs expire in 60)

/**
 * Resolve an image_url to a displayable URL.
 * - base64 data URLs: returned as-is
 * - http/https URLs: returned as-is
 * - S3 keys (uploads/...): resolved via backend presigned URL
 */
export async function resolveImageUrl(imageUrl: string): Promise<string> {
  if (!imageUrl) return "";

  // Already a displayable URL
  if (imageUrl.startsWith("data:") || imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  // Check cache
  const cached = urlCache.get(imageUrl);
  if (cached && cached.expires > Date.now()) {
    return cached.url;
  }

  // Resolve S3 key via backend
  try {
    const { data, error } = await backendApi.post("/v1/storage/download-url", {
      key: imageUrl,
    });

    if (data?.url) {
      urlCache.set(imageUrl, { url: data.url, expires: Date.now() + CACHE_TTL });
      return data.url;
    }
  } catch {
    // fall through
  }

  return "";
}
