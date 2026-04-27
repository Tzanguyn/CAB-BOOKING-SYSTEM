import React, { useEffect, useRef, useState, useCallback } from 'react';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  snapPoints?: number[]; // percentages: [30, 60, 90]
  initialSnap?: number;
}

const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  title,
  snapPoints = [50],
  initialSnap = 0,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [currentHeight, setCurrentHeight] = useState(snapPoints[initialSnap] || 50);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentHeight(snapPoints[initialSnap] || 50);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, snapPoints, initialSnap]);

  const handleDragStart = useCallback((clientY: number) => {
    setIsDragging(true);
    dragStartY.current = clientY;
    dragStartHeight.current = currentHeight;
  }, [currentHeight]);

  const handleDragMove = useCallback((clientY: number) => {
    if (!isDragging) return;
    const deltaY = dragStartY.current - clientY;
    const deltaPercent = (deltaY / window.innerHeight) * 100;
    const newHeight = Math.max(10, Math.min(95, dragStartHeight.current + deltaPercent));
    setCurrentHeight(newHeight);
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    if (currentHeight < 15) {
      onClose();
      return;
    }
    // Snap to nearest snap point
    const nearest = snapPoints.reduce((prev, curr) =>
      Math.abs(curr - currentHeight) < Math.abs(prev - currentHeight) ? curr : prev
    );
    setCurrentHeight(nearest);
  }, [currentHeight, snapPoints, onClose]);

  const handleTouchStart = (e: React.TouchEvent) => handleDragStart(e.touches[0].clientY);
  const handleTouchMove = (e: React.TouchEvent) => handleDragMove(e.touches[0].clientY);
  const handleMouseDown = (e: React.MouseEvent) => handleDragStart(e.clientY);

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => handleDragMove(e.clientY);
    const handleMouseUp = () => handleDragEnd();
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`fixed bottom-0 left-0 right-0 bg-surface rounded-t-2xl z-50 ${
          isDragging ? '' : 'transition-all duration-300 ease-out'
        }`}
        style={{ height: `${currentHeight}vh` }}
      >
        {/* Drag handle */}
        <div
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleDragEnd}
        >
          <div className="w-10 h-1 bg-surface-lighter rounded-full" />
        </div>

        {/* Title */}
        {title && (
          <div className="px-4 pb-3 border-b border-border">
            <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto px-4 py-3" style={{ maxHeight: `calc(${currentHeight}vh - 60px)` }}>
          {children}
        </div>
      </div>
    </>
  );
};

export default BottomSheet;
