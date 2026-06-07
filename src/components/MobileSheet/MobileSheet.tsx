import React, { useEffect, useRef } from "react";
import "./MobileSheet.scss";

interface MobileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const MobileSheet: React.FC<MobileSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background body scrolling when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop overlay - clicking triggers onClose */}
      <div
        className={`mobile-sheet-backdrop ${isOpen ? "active" : ""}`}
        onClick={onClose}
      />

      {/* Bottom Sheet Drawer container */}
      <div className={`mobile-sheet ${isOpen ? "active" : ""}`} ref={contentRef}>
        {/* Touch gesture drag handle visual indicator */}
        <div className="mobile-sheet-drag-handle" onClick={onClose} />

        <div className="mobile-sheet-header">
          <h2>{title}</h2>
          <button className="sheet-close-btn" onClick={onClose} aria-label="Close sheet">
            ✕
          </button>
        </div>

        <div className="mobile-sheet-content">{children}</div>
      </div>
    </>
  );
};

export default MobileSheet;
