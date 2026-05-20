import { useState, useEffect, useRef } from 'react';

export default function usePanelResize() {
  const [leftPanelWidth, setLeftPanelWidth] = useState(() => {
    const saved = localStorage.getItem('leftPanelWidth');
    return saved ? parseInt(saved, 10) : 256;
  });
  const [rightPanelWidth, setRightPanelWidth] = useState(() => {
    const saved = localStorage.getItem('rightPanelWidth');
    return saved ? parseInt(saved, 10) : 288;
  });
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const leftResizeRef = useRef(null);
  const rightResizeRef = useRef(null);

  useEffect(() => {
    const onMove = (e) => {
      if (isDraggingLeft) {
        setLeftPanelWidth(Math.max(180, Math.min(400, e.clientX)));
      } else if (isDraggingRight) {
        setRightPanelWidth(Math.max(200, Math.min(500, window.innerWidth - e.clientX)));
      }
    };
    const onUp = () => {
      setIsDraggingLeft(false);
      setIsDraggingRight(false);
    };

    if (isDraggingLeft || isDraggingRight) {
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'ew-resize';
    }

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDraggingLeft, isDraggingRight]);

  useEffect(() => {
    if (!isDraggingLeft) localStorage.setItem('leftPanelWidth', String(leftPanelWidth));
  }, [leftPanelWidth, isDraggingLeft]);

  useEffect(() => {
    if (!isDraggingRight) localStorage.setItem('rightPanelWidth', String(rightPanelWidth));
  }, [rightPanelWidth, isDraggingRight]);

  return {
    leftPanelWidth,
    rightPanelWidth,
    isDraggingLeft,
    isDraggingRight,
    leftResizeRef,
    rightResizeRef,
    handleLeftResizerMouseDown: (e) => { e.preventDefault(); setIsDraggingLeft(true); },
    handleRightResizerMouseDown: (e) => { e.preventDefault(); setIsDraggingRight(true); },
  };
}
