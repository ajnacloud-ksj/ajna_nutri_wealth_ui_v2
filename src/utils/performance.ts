/**
 * Performance utility functions for optimization
 */

/**
 * Debounce function to limit how often a function can be called
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return function debounced(...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}

/**
 * Throttle function to ensure a function is called at most once per interval
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  let lastFunc: NodeJS.Timeout;
  let lastRan: number;

  return function throttled(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      lastRan = Date.now();
      inThrottle = true;
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(() => {
        if (Date.now() - lastRan >= limit) {
          func(...args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
}

/**
 * Memoize function results for expensive computations
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  getKey?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = func(...args);
    cache.set(key, result);

    // Optional: Limit cache size
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    return result;
  }) as T;
}

/**
 * Check if code is running in browser
 */
export const isBrowser = typeof window !== 'undefined';

/**
 * Check if device has low memory
 */
export function isLowMemoryDevice(): boolean {
  if (!isBrowser) return false;

  // @ts-ignore - navigator.deviceMemory is not in TypeScript types yet
  const deviceMemory = navigator.deviceMemory;

  // If API is not available, assume not low memory
  if (!deviceMemory) return false;

  // Consider devices with less than 4GB RAM as low memory
  return deviceMemory < 4;
}

/**
 * Check if device has slow network
 */
export function isSlowNetwork(): boolean {
  if (!isBrowser) return false;

  // @ts-ignore - navigator.connection is not in TypeScript types yet
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  if (!connection) return false;

  // Check effective connection type
  if (connection.effectiveType) {
    return ['slow-2g', '2g'].includes(connection.effectiveType);
  }

  // Check if save data mode is enabled
  return connection.saveData === true;
}

/**
 * Lazy load images with intersection observer
 */
export function lazyLoadImage(
  element: HTMLImageElement,
  src: string,
  placeholder?: string
): void {
  if (placeholder) {
    element.src = placeholder;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          element.src = src;
          observer.disconnect();
        }
      });
    },
    {
      rootMargin: '50px',
    }
  );

  observer.observe(element);
}

/**
 * Batch DOM updates using requestAnimationFrame
 */
export function batchUpdate(callback: () => void): void {
  if (!isBrowser) {
    callback();
    return;
  }

  requestAnimationFrame(callback);
}

/**
 * Measure performance of a function
 */
export function measurePerformance<T extends (...args: any[]) => any>(
  name: string,
  func: T
): T {
  return ((...args: Parameters<T>) => {
    if (!isBrowser || !performance) {
      return func(...args);
    }

    const startMark = `${name}-start`;
    const endMark = `${name}-end`;
    const measureName = `${name}-duration`;

    performance.mark(startMark);
    const result = func(...args);
    performance.mark(endMark);
    performance.measure(measureName, startMark, endMark);

    const measure = performance.getEntriesByName(measureName)[0];
    console.log(`Performance [${name}]: ${measure.duration.toFixed(2)}ms`);

    // Clean up marks and measures
    performance.clearMarks(startMark);
    performance.clearMarks(endMark);
    performance.clearMeasures(measureName);

    return result;
  }) as T;
}