import { useEffect, useState } from "react";

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const container = document.getElementById("main-scroll-container");
    if (!container) return;

    const toggleVisibility = () => {
      setIsVisible(container.scrollTop > 300);
    };

    container.addEventListener("scroll", toggleVisibility);

    return () => container.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    const container = document.getElementById("main-scroll-container");
    if (container) {
      container.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  return (
    <>
      {isVisible && (
        <button
          onClick={scrollToTop}
          aria-label="Back to top"
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            border: "1px solid #333",
            background: "#111",
            color: "#fff",
            cursor: "pointer",
            fontSize: "22px",
            fontWeight: "bold",
            boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
            transition: "all 0.3s ease",
            zIndex: 999,
          }}
          onMouseEnter={(e) => {
            e.target.style.background = "#222";
            e.target.style.transform = "translateY(-3px)";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "#111";
            e.target.style.transform = "translateY(0)";
          }}
        >
          ↑
        </button>
      )}
    </>
  );
}