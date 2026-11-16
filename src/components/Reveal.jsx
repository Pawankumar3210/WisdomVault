import { useEffect, useRef, useState } from "react";

export default function Reveal({ children, delay = 0, y = 22, style = {} }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return true;
    return (
      typeof window.matchMedia !== "function" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    );
  });

  useEffect(() => {
    if (visible) return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : `translateY(${y}px)`,
        transition: `opacity 0.55s ease ${delay}ms, transform 0.55s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
