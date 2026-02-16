"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function Home() {
  const [message, setMessage] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fireworkCount, setFireworkCount] = useState(40);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const maxChars = 500;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert("File quá lớn. Vui lòng chọn file nhỏ hơn 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      // Compress image
      compressImage(result, 400, 400).then(compressed => {
        setImage(compressed);
      });
    };
    reader.readAsDataURL(file);
  };

  const compressImage = (dataUrl: string, maxWidth: number, maxHeight: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.6));
      };
      img.src = dataUrl;
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      processFile(file);
    }
  };

  const removeImage = () => {
    setImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleStart = async () => {
    setIsLoading(true);
    try {
      // Save to API
      const response = await fetch("/api/firework", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message.trim(),
          image: image,
          fireworkCount: fireworkCount,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save");
      }

      const data = await response.json();
      router.push(`/show?id=${data.id}&count=${fireworkCount}`);
    } catch (error) {
      console.error("Error:", error);
      alert("Có lỗi xảy ra. Vui lòng thử lại!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>
            <span className={styles.fireworkIcon}>🎆</span>
            Firework Message
          </h1>
          <p className={styles.tagline}>
            Tạo màn pháo hoa tuyệt đẹp với thông điệp của bạn
          </p>
        </header>

        <div className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Thông điệp</label>
            <textarea
              className={styles.textarea}
              placeholder="Nhập thông điệp của bạn..."
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, maxChars))}
              maxLength={maxChars}
            />
            <span className={styles.charCount}>
              {message.length}/{maxChars}
            </span>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Ảnh (tùy chọn)</label>
            {!image ? (
              <div
                className={`${styles.dropZone} ${isDragging ? styles.dragging : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileChange}
                  className={styles.fileInput}
                />
                <div className={styles.dropContent}>
                  <span className={styles.dropIcon}>📷</span>
                  <p>Kéo thả ảnh vào đây hoặc bấm để chọn</p>
                  <span className={styles.dropHint}>JPG, PNG, GIF, WebP (tối đa 5MB)</span>
                </div>
              </div>
            ) : (
              <div className={styles.preview}>
                <img src={image} alt="Preview" className={styles.previewImage} />
                <button type="button" className={styles.removeBtn} onClick={removeImage}>
                  ✕
                </button>
              </div>
            )}
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Số lượng pháo hoa</label>
            <input
              type="number"
              className={styles.numberInput}
              value={fireworkCount}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 40;
                setFireworkCount(Math.min(100, Math.max(5, value)));
              }}
              min={5}
              max={100}
            />
          </div>

          <button 
            className={styles.startBtn} 
            onClick={handleStart}
            disabled={isLoading}
          >
            {isLoading ? (
              <span>⏳ Đang tạo...</span>
            ) : (
              <span>✨ Bắt đầu</span>
            )}
          </button>
        </div>

        <footer className={styles.footer}>
          <p>Để trống để xem pháo hoa mặc định</p>
        </footer>
      </div>
    </main>
  );
}
