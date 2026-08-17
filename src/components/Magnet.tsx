import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface MagnetProps {
  children: ReactNode;
  /** مسافة التقاط المؤشر بالبكسل حول حدود العنصر */
  padding?: number;
  /** قوة الانجذاب — 0 لا حركة، 1 يتبع المؤشر بالكامل */
  strength?: number;
  disabled?: boolean;
  className?: string;
}

/**
 * تأثير مغناطيسي خفيف: يتحرك العنصر باتجاه المؤشر عند اقترابه.
 * يستخدم `translate3d` لتشغيل الحركة على الـ GPU، ويُعطّل تلقائيًا
 * على الأجهزة التي لا تدعم التأشير الدقيق (اللمس) أو عند تقليل الحركة.
 */
export function Magnet({
  children,
  padding = 90,
  strength = 0.32,
  disabled = false,
  className,
}: MagnetProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    const sync = () => setEnabled(fine.matches && !reduced.matches);
    sync();

    fine.addEventListener('change', sync);
    reduced.addEventListener('change', sync);
    return () => {
      fine.removeEventListener('change', sync);
      reduced.removeEventListener('change', sync);
    };
  }, []);

  const handleMove = useCallback(
    (event: MouseEvent) => {
      const node = ref.current;
      if (!node) return;

      const rect = node.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const withinX = Math.abs(event.clientX - centerX) < rect.width / 2 + padding;
      const withinY = Math.abs(event.clientY - centerY) < rect.height / 2 + padding;

      if (withinX && withinY) {
        setActive(true);
        setOffset({
          x: (event.clientX - centerX) * strength,
          y: (event.clientY - centerY) * strength,
        });
      } else if (active) {
        setActive(false);
        setOffset({ x: 0, y: 0 });
      }
    },
    [active, padding, strength],
  );

  useEffect(() => {
    if (disabled || !enabled) return;
    window.addEventListener('mousemove', handleMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMove);
  }, [disabled, enabled, handleMove]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        display: 'inline-block',
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
        transition: active
          ? 'transform 0.3s ease-out'
          : 'transform 0.6s ease-in-out',
        willChange: 'transform',
      }}
    >
      {children}
    </div>
  );
}

export default Magnet;
