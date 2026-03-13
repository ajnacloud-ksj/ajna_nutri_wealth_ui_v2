import { useState, useEffect } from "react";
import { resolveImageUrl } from "@/utils/imageUrl";

/**
 * Hook to resolve an image_url (which may be an S3 key) to a displayable URL.
 */
export function useImageUrl(imageUrl: string | undefined): string {
  const [resolved, setResolved] = useState(() => {
    if (!imageUrl) return "";
    // Instantly return data URLs and http URLs without async
    if (imageUrl.startsWith("data:") || imageUrl.startsWith("http")) return imageUrl;
    return "";
  });

  useEffect(() => {
    if (!imageUrl) {
      setResolved("");
      return;
    }

    // Skip resolution for already-displayable URLs
    if (imageUrl.startsWith("data:") || imageUrl.startsWith("http")) {
      setResolved(imageUrl);
      return;
    }

    let cancelled = false;
    resolveImageUrl(imageUrl).then((url) => {
      if (!cancelled) setResolved(url);
    });

    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  return resolved;
}
