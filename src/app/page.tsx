"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function Home() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fireworkCount, setFireworkCount] = useState(40);
  const router = useRouter();

  const maxChars = 500;

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
          <p>Pháo hoa sẽ hiển thị ngay cả khi không có thông điệp</p>
        </footer>
      </div>
    </main>
  );
}
