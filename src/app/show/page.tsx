"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "./show.module.css";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
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
  m?: string;
  i?: string | null;
  msg?: string;
  img?: string | null;
}

const defaultColors = [
  "#ff2d75", "#ffd700", "#00f5ff", "#ff6b35", 
  "#a855f7", "#22c55e", "#f43f5e", "#3b82f6",
  "#ec4899", "#f97316", "#84cc16", "#06b6d4"
];

function ShowContent() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [showMessage, setShowMessage] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  const [data, setData] = useState<{ msg: string; img: string | null }>({ msg: "", img: null });

  useEffect(() => {
    // Try URL params first (for sharing)
    const encoded = searchParams.get("d");
    if (encoded) {
      try {
        const json = decodeURIComponent(atob(encoded));
        const parsed = JSON.parse(json) as FireworkData;
        setData({
          msg: parsed.m || "",
          img: parsed.i || null
        });
        return;
      } catch (e) {
        console.error("Failed to parse URL data");
      }
    }
    
    // Fallback to localStorage (for direct access)
    const stored = localStorage.getItem("fireworkData");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as FireworkData;
        setData({
          msg: parsed.msg || parsed.m || "",
          img: parsed.img || parsed.i || null
        });
      } catch (e) {
        console.error("Failed to parse stored data");
      }
    }
  }, [searchParams]);

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
        
        canvas.width = 30;
        canvas.height = 30;
        ctx.drawImage(img, 0, 0, 30, 30);
        
        const imageData = ctx.getImageData(0, 0, 30, 30);
        const pixels = imageData.data;
        const colorCounts: { [key: string]: number } = {};
        
        for (let i = 0; i < pixels.length; i += 12) {
          const r = Math.round(pixels[i] / 32) * 32;
          const g = Math.round(pixels[i + 1] / 32) * 32;
          const b = Math.round(pixels[i + 2] / 32) * 32;
          if (pixels[i + 3] > 128) {
            const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
            colorCounts[hex] = (colorCounts[hex] || 0) + 1;
          }
        }
        
        const sortedColors = Object.entries(colorCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([color]) => color);
        
        resolve(sortedColors.length > 0 ? sortedColors : defaultColors);
      };
      img.onerror = () => resolve(defaultColors);
      img.src = imgSrc;
    });
  };

  useEffect(() => {
    const hasContent = msg || imageData;
    const delay = hasContent ? 3500 : 2500;
    const timer = setTimeout(() => {
      setShowMessage(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [msg, imageData]);

  useEffect(() => {
    if (showMessage) {
      const timer = setTimeout(() => {
        setShowControls(false);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [showMessage]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animationId: number;
    let fireworks: Firework[] = [];
    let colors = defaultColors;
    let isRunning = true;

    const hasContent = msg || imageData;
    const maxFireworks = hasContent ? 8 : 5;
    const launchProbability = hasContent ? 0.08 : 0.04;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createFirework = (customColors?: string[]): Firework => {
      const colorArray = customColors || colors;
      const startX = canvas.width * 0.15 + Math.random() * canvas.width * 0.7;
      return {
        x: startX,
        y: canvas.height,
        targetY: canvas.height * 0.15 + Math.random() * canvas.height * 0.35,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -Math.random() * 6 - 11,
        color: colorArray[Math.floor(Math.random() * colorArray.length)],
        exploded: false,
        particles: [],
      };
    };

    const explode = (firework: Firework, customColors?: string[]) => {
      const colorArray = customColors || colors;
      const count = hasContent ? 50 : 35;
      
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const speed = Math.random() * 4 + 1.5;
        const particle: Particle = {
          x: firework.x,
          y: firework.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          color: colorArray[Math.floor(Math.random() * colorArray.length)],
          size: Math.random() * 2 + 1,
        };
        firework.particles.push(particle);
      }

      // Secondary burst
      for (let i = 0; i < count / 2; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2.5 + 0.5;
        const particle: Particle = {
          x: firework.x,
          y: firework.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.5,
          life: 1,
          color: colorArray[Math.floor(Math.random() * colorArray.length)],
          size: Math.random() * 1.2 + 0.4,
        };
        firework.particles.push(particle);
      }
    };

    const drawDashedLine = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, width: number, life: number) => {
      const dashLength = 4 + life * 4;
      const gapLength = 3 + life * 3;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const dashes = Math.floor(dist / (dashLength + gapLength));
      
      if (dashes <= 0) return;
      
      const ux = dx / dist;
      const uy = dy / dist;
      
      ctx.beginPath();
      let currentX = x1;
      let currentY = y1;
      let drawn = 0;
      
      for (let i = 0; i < dashes && drawn < dist; i++) {
        const segmentLength = Math.min(dashLength, dist - drawn);
        ctx.moveTo(currentX, currentY);
        ctx.lineTo(currentX + ux * segmentLength, currentY + uy * segmentLength);
        currentX += ux * (dashLength + gapLength);
        currentY += uy * (dashLength + gapLength);
        drawn += dashLength + gapLength;
      }
      
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.globalAlpha = life * 0.7;
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    const update = () => {
      // Simple clear for better performance
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Launch new fireworks
      if (fireworks.length < maxFireworks && Math.random() < launchProbability) {
        fireworks.push(createFirework(colors.length > 0 ? colors : undefined));
      }

      for (let i = fireworks.length - 1; i >= 0; i--) {
        const fw = fireworks[i];

        if (!fw.exploded) {
          // Draw rocket with trail
          const trailLength = 25;
          const alpha = Math.min(1, (fw.y - fw.targetY) / 200);
          
          // Dashed trail
          if (fw.y > fw.targetY + 30) {
            drawDashedLine(
              ctx, 
              fw.x, fw.y, 
              fw.x - fw.vx * 4, fw.y - fw.vy * 4, 
              fw.color, 2, alpha
            );
          }
          
          // Rocket dot
          ctx.beginPath();
          ctx.arc(fw.x, fw.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = fw.color;
          ctx.fill();

          // Physics
          fw.x += fw.vx;
          fw.vy += 0.1;
          fw.y += fw.vy;

          if (fw.y <= fw.targetY || fw.vy >= 0) {
            fw.exploded = true;
            explode(fw, colors.length > 0 ? colors : undefined);
          }
        } else {
          for (let j = fw.particles.length - 1; j >= 0; j--) {
            const p = fw.particles[j];
            
            const prevX = p.x;
            const prevY = p.y;
            
            // Update physics
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.04;
            p.vx *= 0.98;
            p.vy *= 0.98;
            p.life -= 0.012;

            // Draw dashed trail
            if (p.life > 0.3) {
              drawDashedLine(ctx, prevX, prevY, p.x, p.y, p.color, p.size * 0.6, p.life);
            }

            // Draw particle
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fill();
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
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext("2d");
      
      if (!tempCtx) return;

      tempCtx.fillStyle = "#000000";
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      tempCtx.drawImage(canvas, 0, 0);

      if (showMessage && msg) {
        const fontSize = Math.min(56, tempCanvas.width / 12);
        tempCtx.font = `bold ${fontSize}px var(--font-playfair), Georgia, serif`;
        tempCtx.textAlign = "center";
        tempCtx.textBaseline = "middle";
        
        tempCtx.shadowColor = "rgba(255, 45, 117, 0.9)";
        tempCtx.shadowBlur = 25;
        tempCtx.fillStyle = "#f5f5f5";
        tempCtx.fillText(decodeURIComponent(msg), tempCanvas.width / 2, tempCanvas.height / 2);
      }

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
