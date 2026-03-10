import { useEffect, useRef, useCallback } from 'react';

export function useAutoScroll(dependency) {
  const containerRef = useRef(null);
  const shouldAutoScroll = useRef(true);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    // Auto-scroll if user is near the bottom (within 100px)
    shouldAutoScroll.current = scrollHeight - scrollTop - clientHeight < 100;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  useEffect(() => {
    if (shouldAutoScroll.current && containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [dependency]);

  return containerRef;
}
