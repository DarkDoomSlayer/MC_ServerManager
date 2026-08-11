"use client";

import { useEffect, useState } from "react";

const BACKGROUNDS = [
  "/minecraft_bg.png",
  "/minecraft_bg_2.png",
  "/minecraft_bg_3.png"
];

export default function RotatingBackground() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % BACKGROUNDS.length);
    }, 10000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {BACKGROUNDS.map((bg, idx) => (
        <div
          key={bg}
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${
            idx === currentIndex ? "opacity-100" : "opacity-0"
          }`}
          style={{ backgroundImage: `url('${bg}')` }}
        />
      ))}
      {/* Light gradient overlay for clarity without heavy blur */}
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/60 via-neutral-950/40 to-neutral-950/70 backdrop-blur-[2px]" />
    </div>
  );
}
