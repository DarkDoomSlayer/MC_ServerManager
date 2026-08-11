"use client";

import { useEffect, useState } from "react";

const FALLBACK_BACKGROUNDS = [
  "/minecraft_bg.png",
  "/minecraft_bg_2.png",
  "/minecraft_bg_3.png"
];

export default function RotatingBackground() {
  const [backgrounds, setBackgrounds] = useState<string[]>(FALLBACK_BACKGROUNDS);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Fetch real high-res Minecraft wallpapers from online API
    fetch('/api/wallpapers/minecraft')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setBackgrounds(data);
        }
      })
      .catch(err => console.error("Failed to load online wallpapers:", err));
  }, []);

  useEffect(() => {
    if (backgrounds.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % backgrounds.length);
    }, 12000); // Change image every 12 seconds

    return () => clearInterval(timer);
  }, [backgrounds]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {backgrounds.map((bg, idx) => (
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
