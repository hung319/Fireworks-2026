"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./show.module.css";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  trail: { x: number; y: number }[];
  decay: number;
}

interface Firework {
  x: number;
  y: number;
  targetY: number;
  vy: number;
  vx: number;
  color: string;
  exploded: boolean;
  particles: Particle[];
}

interface FireworkData {
  msg: string;
  img: string | null;
}

const defaultColors = ["#ff2d75", "#ffd700", "#00f5ff", "#ff6b35", "#a855f7", "#22c55e", "#f43f5e", "#3b82f6", "#ec4899", "#f97316"];

function ShowContent() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  const [showMessage, setShowMessage] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  const [data, setData] = useState<FireworkData>({ msg: "", img: null });

  useEffect(() => {
    // Read from localStorage
    const stored = localStorage.getItem("fireworkData");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as FireworkData;
        setData(parsed);
      } catch (e) {
        console.error("Failed to parse stored data");
      }
    }
  }, []);

  const { msg, img: imageData } = data;

  const extractColorsFromImage = (imgSrc: string): Promise<string[]> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(defaultColors);
          return;
        }
        
        canvas.width = 50;
        canvas.height = 50;
        ctx.drawImage(img, 0, 0, 50, 50);
        
        const imageData = ctx.getImageData(0, 0, 50, 50);
        const pixels = imageData.data;
        const colorCounts: { [key: string]: number } = {};
        
        for (let i = 0; i < pixels.length; i += 16) {
          const r = Math.round(pixels[i] / 32) * 32;
          const g = Math.round(pixels[i + 1] / 32) * 32;
          const b = Math.round(pixels[i + 2] / 32) * 32;
          if (pixels[i + 3] > 128) { // Only count non-transparent pixels
            const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
            colorCounts[hex] = (colorCounts[hex] || 0) + 1;
          }
        }
        
        const sortedColors = Object.entries(colorCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([color]) => color);
        
        resolve(sortedColors.length > 0 ? sortedColors : defaultColors);
      };
      img.onerror = () => resolve(defaultColors);
      img.src = imgSrc;
    });
  };

  // Show message after delay - longer if there's content
  useEffect(() => {
    const hasContent = msg || imageData;
    const delay = hasContent ? 3000 : 2000;
    const timer = setTimeout(() => {
      setShowMessage(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [msg, imageData]);

  // Hide controls after showing message
  useEffect(() => {
    if (showMessage) {
      const timer = setTimeout(() => {
        setShowControls(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showMessage]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let fireworks: Firework[] = [];
    let colors = defaultColors;
    let isRunning = true;

    // Determine firework intensity based on content
    const hasContent = msg || imageData;
    const maxFireworks = hasContent ? 12 : 6;
    const launchProbability = hasContent ? 0.12 : 0.06;
    const particleCount = hasContent ? 120 : 80;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createFirework = (customColors?: string[]): Firework => {
      const colorArray = customColors || colors;
      return {
        x: Math.random() * canvas.width * 0.8 + canvas.width * 0.1,
        y: canvas.height,
        targetY: Math.random() * (canvas.height * 0.45) + canvas.height * 0.1,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 7 - 12,
        color: colorArray[Math.floor(Math.random() * colorArray.length)],
        exploded: false,
        particles: [],
      };
    };

    const explode = (firework: Firework, customColors?: string[]) => {
      const colorArray = customColors || colors;
      const count = Math.floor(Math.random() * 40) + particleCount;
      
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
        const speed = Math.random() * 5 + 2;
        const particle: Particle = {
          x: firework.x,
          y: firework.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          maxLife: Math.random() * 0.4 + 0.6,
          color: colorArray[Math.floor(Math.random() * colorArray.length)],
          size: Math.random() * 2.5 + 1.5,
          trail: [],
          decay: Math.random() * 0.008 + 0.008,
        };
        firework.particles.push(particle);
      }

      // Add secondary explosion particles
      for (let i = 0; i < count / 3; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        const particle: Particle = {
          x: firework.x,
          y: firework.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          life: 1,
          maxLife: Math.random() * 0.3 + 0.4,
          color: colorArray[Math.floor(Math.random() * colorArray.length)],
          size: Math.random() * 1.5 + 0.5,
          trail: [],
          decay: Math.random() * 0.01 + 0.012,
        };
        firework.particles.push(particle);
      }
    };

    const update = () => {
      // Dark trail effect for smooth fading
      ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Launch new fireworks
      if (fireworks.length < maxFireworks && Math.random() < launchProbability) {
        fireworks.push(createFirework(colors.length > 0 ? colors : undefined));
      }

      for (let i = fireworks.length - 1; i >= 0; i--) {
        const fw = fireworks[i];

        if (!fw.exploded) {
          // Draw firework rocket
          ctx.beginPath();
          ctx.arc(fw.x, fw.y, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = fw.color;
          ctx.shadowBlur = 15;
          ctx.shadowColor = fw.color;
          ctx.fill();
          ctx.shadowBlur = 0;

          // Draw trail
          ctx.beginPath();
          ctx.moveTo(fw.x, fw.y);
          ctx.lineTo(fw.x - fw.vx * 2, fw.y - fw.vy * 2);
          ctx.strokeStyle = fw.color;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Update physics for rocket
          fw.vx += (Math.random() - 0.5) * 0.3;
          fw.x += fw.vx;
          fw.vy += 0.12;
          fw.y += fw.vy;

          if (fw.y <= fw.targetY || fw.vy >= 0) {
            fw.exploded = true;
            explode(fw, colors.length > 0 ? colors : undefined);
          }
        } else {
          for (let j = fw.particles.length - 1; j >= 0; j--) {
            const p = fw.particles[j];
            
            // Store trail
            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > 15) p.trail.shift();

            // Draw trail with dashed effect
            if (p.trail.length > 1) {
              ctx.beginPath();
              for (let k = 0; k < p.trail.length; k++) {
                const t = p.trail[k];
                if (k === 0) {
                  ctx.moveTo(t.x, t.y);
                } else {
                  // Add some randomness for dashed effect
                  if (k % 2 === 0) {
                    ctx.lineTo(t.x, t.y);
                  } else {
                    ctx.moveTo(t.x, t.y);
                  }
                }
              }
              ctx.strokeStyle = p.color;
              ctx.lineWidth = p.size * 0.8 * p.life;
              ctx.globalAlpha = p.life * 0.4;
              ctx.stroke();
              ctx.globalAlpha = 1;
            }

            // Update physics
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.06; // gravity
            p.vx *= 0.97;
            p.vy *= 0.97;
            p.life -= p.decay;

            // Draw particle with glow
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.shadowBlur = 10;
            ctx.shadowColor = p.color;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;

            if (p.life <= 0) {
              fw.particles.splice(j, 1);
            }
          }

          if (fw.particles.length === 0) {
            fireworks.splice(i, 1);
          }
        }
      }

      if (isRunning) {
        animationId = requestAnimationFrame(update);
      }
    };

    const init = async () => {
      resize();
      window.addEventListener("resize", resize);
      
      if (imageData) {
        colors = await extractColorsFromImage(imageData);
      }
      
      update();
    };

    init();

    return () => {
      isRunning = false;
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, [imageData, msg]);

  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Firework Message",
          text: msg || "Xem màn pháo hoa tuyệt đẹp!",
          url,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy");
      }
    }
  };

  const handleBack = () => {
    router.push("/");
  };

  const handleSaveScreenshot = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      // Create a temporary canvas without controls
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext("2d");
      
      if (!tempCtx) return;

      // Fill black background
      tempCtx.fillStyle = "#000000";
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      
      // Draw current canvas content
      tempCtx.drawImage(canvas, 0, 0);

      // Draw message if visible
      if (showMessage && msg) {
        tempCtx.font = `bold ${Math.min(64, tempCanvas.width / 10)}px var(--font-playfair), serif`;
        tempCtx.textAlign = "center";
        tempCtx.textBaseline = "middle";
        
        // Text shadow
        tempCtx.shadowColor = "rgba(255, 45, 117, 0.8)";
        tempCtx.shadowBlur = 30;
        tempCtx.fillStyle = "#f5f5f5";
        tempCtx.fillText(decodeURIComponent(msg), tempCanvas.width / 2, tempCanvas.height / 2);
      }

      // Convert to blob and download
      tempCanvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `firework-${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }, "image/png");
    } catch (err) {
      console.error("Failed to save screenshot:", err);
    }
  };

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  return (
    <main className={styles.main} ref={containerRef} onClick={toggleControls}>
      <canvas ref={canvasRef} className={styles.canvas} />
      
      <div className={`${styles.messageContainer} ${showMessage ? styles.visible : ""}`}>
        {msg && (
          <h1 className={styles.message}>{decodeURIComponent(msg)}</h1>
        )}
        {!msg && (
          <h1 className={styles.message}>🎆</h1>
        )}
      </div>

      <div className={`${styles.actions} ${showControls ? styles.visible : styles.hidden}`}>
        <button className={styles.backBtn} onClick={handleBack}>
          ← Quay về
        </button>
        <button className={styles.saveBtn} onClick={handleSaveScreenshot}>
          📷 Lưu ảnh
        </button>
        <button className={styles.shareBtn} onClick={handleShare}>
          {copied ? "✓ Đã copy!" : " Chia sẻ"}
        </button>
      </div>
    </main>
  );
}

function Loading() {
  return (
    <main style={{ 
      background: "#000", 
      width: "100vw", 
      height: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center" 
    }}>
      <div style={{ color: "#fff", fontSize: "1.5rem" }}>Loading...</div>
    </main>
  );
}

export default function Show() {
  return (
    <Suspense fallback={<Loading />}>
      <ShowContent />
    </Suspense>
  );
}
