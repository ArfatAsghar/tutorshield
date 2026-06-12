import { useEffect, useRef, useState, type ReactNode } from "react";

export function Reveal({ children, delay = 0, className = "", as: As = "div" }: { children: ReactNode; delay?: number; className?: string; as?: any }) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } });
    }, { threshold: 0.15 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return (
    <As
      ref={ref as any}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-[900ms] ease-[cubic-bezier(.2,.7,.2,1)] ${shown ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-6 blur-[6px]"} ${className}`}
    >
      {children}
    </As>
  );
}
