import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'full';
  showCloseButton?: boolean;
  closeOnOverlay?: boolean;
  closeOnEsc?: boolean;
  footer?: React.ReactNode;
}

const sizeStyles: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  full: 'max-w-[95vw] max-h-[95vh]',
};

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  size = 'md',
  showCloseButton = true,
  closeOnOverlay = true,
  closeOnEsc = true,
  footer,
}) => {
  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEsc) {
        onClose();
      }
    },
    [onClose, closeOnEsc]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEsc]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={closeOnOverlay ? onClose : undefined}
      />

      {/* Modal Content */}
      <div
        className={`
          relative w-full ${sizeStyles[size]}
          bg-surface border border-border rounded-xl
          shadow-2xl shadow-black/50
          animate-fade-in
          flex flex-col max-h-[90vh]
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            {title && (
              <h2 id="modal-title" className="text-lg font-semibold text-text-primary">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-light transition-colors ml-auto"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
