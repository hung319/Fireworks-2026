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
  maxLife: number;
  color: string;
  size: number;
  type: 'peony' | 'willow' | 'chrysanthemum';
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
  type: 'peony' | 'willow' | 'chrysanthemum';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [data, setData] = useState<{ msg: string; img: string | null }>({ msg: "", img: null });
  const [fireworkCount, setFireworkCount] = useState(40);

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      const id = searchParams.get("id");
      const countParam = searchParams.get("count");
      if (countParam) {
        const count = parseInt(countParam);
        if (!isNaN(count) && count > 0) {
          setFireworkCount(count);
        }
      }
      
      if (id) {
        try {
          const response = await fetch(`/api/firework/${id}`);
          if (!response.ok) {
            const err = await response.json();
            setError(err.error || "Không tìm thấy");
            setLoading(false);
            return;
          }
          const result = await response.json();
          setData({
            msg: result.message || "",
            img: result.image || null
          });
        } catch (e) {
          setError("Có lỗi xảy ra");
        }
      }
      setLoading(false);
    };

    fetchData();
  }, [searchParams]);

  const { msg, img: imageData } = data;
  const hasContent = msg;

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
        const imgData = ctx.getImageData(0, 0, 30, 30);
        const pixels = imgData.data;
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
    const delay = hasContent ? 3500 : 500;
    const timer = setTimeout(() => {
      setShowMessage(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [msg]);

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

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth || 800;
    canvas.height = window.innerHeight || 600;

    let animationId: number;
    let fireworks: Firework[] = [];
    let colors = defaultColors;
    let isRunning = true;

    const maxFireworks = fireworkCount;
    const launchProbability = 0.4;

    // Firework types: peony (round burst), willow (drooping trails), chrysanthemum (multi-stream)
    const fireworkTypes: ('peony' | 'willow' | 'chrysanthemum')[] = ['peony', 'willow', 'chrysanthemum'];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createFirework = (customColors?: string[]): Firework => {
      const colorArray = customColors || colors;
      const startX = canvas.width * 0.1 + Math.random() * canvas.width * 0.8;
      const type = fireworkTypes[Math.floor(Math.random() * fireworkTypes.length)];
      return {
        x: startX,
        y: canvas.height,
        targetY: canvas.height * 0.1 + Math.random() * canvas.height * 0.35,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -Math.random() * 6 - 11,
        color: colorArray[Math.floor(Math.random() * colorArray.length)],
        exploded: false,
        particles: [],
        type,
      };
    };

    const explode = (firework: Firework, customColors?: string[]) => {
      const colorArray = customColors || colors;
      const type = firework.type;
      
      if (type === 'peony') {
        // Peony: Uniform circular burst, forming a spherical light
        const count = 80;
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * i) / count + Math.random() * 0.15;
          const speed = Math.random() * 4 + 2;
          const particle: Particle = {
            x: firework.x,
            y: firework.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            maxLife: 1,
            color: colorArray[Math.floor(Math.random() * colorArray.length)],
            size: Math.random() * 2.5 + 1.5,
            type: 'peony',
          };
          firework.particles.push(particle);
        }
      } else if (type === 'willow') {
        // Willow: Drooping trails like a weeping willow tree
        const count = 60;
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
          const speed = Math.random() * 2.5 + 1;
          const particle: Particle = {
            x: firework.x,
            y: firework.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 0.5,
            life: 1,
            maxLife: 1.8,
            color: colorArray[Math.floor(Math.random() * colorArray.length)],
            size: Math.random() * 1.5 + 0.8,
            type: 'willow',
          };
          firework.particles.push(particle);
        }
      } else if (type === 'chrysanthemum') {
        // Chrysanthemum: Multiple streams with trails
        const count = 100;
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
          const speed = Math.random() * 4.5 + 1.5;
          const particle: Particle = {
            x: firework.x,
            y: firework.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            maxLife: 1.2,
            color: colorArray[Math.floor(Math.random() * colorArray.length)],
            size: Math.random() * 2 + 1,
            type: 'chrysanthemum',
          };
          firework.particles.push(particle);
        }
        // Secondary burst
        for (let i = 0; i < count / 3; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 2 + 0.5;
          const particle: Particle = {
            x: firework.x,
            y: firework.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1,
            life: 1,
            maxLife: 1,
            color: colorArray[Math.floor(Math.random() * colorArray.length)],
            size: Math.random() * 1 + 0.5,
            type: 'chrysanthemum',
          };
          firework.particles.push(particle);
        }
      }
    };

    const drawDashedLine = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, width: number, life: number) => {
      // Use a crisp, consistent dashed pattern to mimic real fireworks trails
      const dashLength = 6;
      const gapLength = 4;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ux = dx / (dist || 1);
      const uy = dy / (dist || 1);
      const dashes = Math.floor(dist / (dashLength + gapLength));
      if (dashes <= 0) return;
      ctx.beginPath();
      let traveled = 0;
      let sx = x1;
      let sy = y1;
      for (let i = 0; i < dashes; i++) {
        const segmentLength = Math.min(dashLength, dist - traveled);
        const ex = sx + ux * segmentLength;
        const ey = sy + uy * segmentLength;
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        traveled += dashLength + gapLength;
        sx = x1 + ux * traveled;
        sy = y1 + uy * traveled;
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.globalAlpha = life * 0.6;
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    const update = () => {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Launch new fireworks
      if (fireworks.length < maxFireworks && Math.random() < launchProbability) {
        fireworks.push(createFirework(colors.length > 0 ? colors : undefined));
      }

      for (let i = fireworks.length - 1; i >= 0; i--) {
        const fw = fireworks[i];

        if (!fw.exploded) {
          const alpha = Math.min(1, (fw.y - fw.targetY) / 200);
          
          if (fw.y > fw.targetY + 20) {
            drawDashedLine(
              ctx, 
              fw.x, fw.y, 
              fw.x - fw.vx * 3, fw.y - fw.vy * 3, 
              fw.color, 1.5, alpha
            );
          }
          
          ctx.beginPath();
          ctx.arc(fw.x, fw.y, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = fw.color;
          ctx.fill();

          fw.x += fw.vx;
          fw.vy += 0.08;
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
            
            let gravity = 0.025;
            let drag = 0.985;
            let decay = 0.012;
            
            if (p.type === 'willow') {
              gravity = 0.015;
              drag = 0.992;
              decay = 0.006;
            } else if (p.type === 'chrysanthemum') {
              gravity = 0.03;
              drag = 0.98;
              decay = 0.015;
            }
            
            p.x += p.vx;
            p.y += p.vy;
            p.vy += gravity;
            p.vx *= drag;
            p.vy *= drag;
            p.life -= decay / p.maxLife;

            if (p.life > 0.15) {
              drawDashedLine(ctx, prevX, prevY, p.x, p.y, p.color, p.size * 0.6, p.life);
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * Math.min(1, p.life * 1.5), 0, Math.PI * 2);
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
  }, [msg, fireworkCount, hasContent, imageData]);

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

  if (loading) {
    return (
      <main className={styles.main}>
        <div style={{ 
          color: "#fff", 
          fontSize: "1.5rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          gap: "16px"
        }}>
          <span>⏳ Đang tải...</span>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles.main}>
        <div style={{ 
          color: "#ff6b6b", 
          fontSize: "1.5rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          gap: "16px"
        }}>
          <span>😢 {error}</span>
          <button 
            onClick={handleBack}
            style={{
              padding: "12px 24px",
              fontSize: "1rem",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "50px",
              color: "#fff",
              cursor: "pointer"
            }}
          >
            ← Quay về
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main} ref={containerRef} onClick={toggleControls}>
      <canvas ref={canvasRef} className={styles.canvas} />
      
      {msg && showMessage && (
        <div className={`${styles.messageContainer} ${showMessage ? styles.visible : ""}`}>
          <h1 className={styles.message}>{decodeURIComponent(msg)}</h1>
        </div>
      )}

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
