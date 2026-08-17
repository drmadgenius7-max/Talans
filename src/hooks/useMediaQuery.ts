import { useEffect, useState } from 'react';

/**
 * يتابع استعلام وسائط CSS ويعيد ما إذا كان مُحقّقًا.
 * يُستخدم لتفعيل التأثيرات الثقيلة على الشاشات الكبيرة فقط.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);

    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);

  return matches;
}

/** الشاشات الكبيرة (lg وما فوق) مع مؤشر دقيق */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}

/** المستخدم يفضّل تقليل الحركة */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

export default useMediaQuery;
