import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FiX, FiZoomIn } from 'react-icons/fi';
import './ImagePreviewModal.css';

// ── Modal rendered at document.body level via Portal ──────────
// This prevents the dark overlay from being clipped inside cards
export const ImagePreviewModal = ({ src, name, onClose }) => {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // Render directly into document.body — not inside the card DOM
  return ReactDOM.createPortal(
    <div className="img-modal-overlay" onClick={onClose}>
      <div className="img-modal-box" onClick={e => e.stopPropagation()}>
        <button className="img-modal-close" onClick={onClose} title="Close (Esc)">
          <FiX />
        </button>
        <img
          src={src || '/placeholder.jpg'}
          alt={name}
          className="img-modal-img"
        />
        {name && <p className="img-modal-name">{name}</p>}
      </div>
    </div>,
    document.body   // ← renders outside all cards/sections
  );
};

// ── ZoomableImage — clickable image wrapper ───────────────────
export const ZoomableImage = ({ src, name, alt, className, style }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <div
        className="zoomable-wrap"
        style={style}
        onClick={() => setOpen(true)}
        title="Click to view full image"
      >
        <img
          src={src || '/placeholder.jpg'}
          alt={alt || name}
          className={className}
        />
        <div className="zoomable-hint">
          <FiZoomIn />
        </div>
      </div>

      {/* Portal renders at body level — no blinking! */}
      {open && (
        <ImagePreviewModal
          src={src}
          name={name}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
};

export default ImagePreviewModal;