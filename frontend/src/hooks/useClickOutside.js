import { useEffect } from 'react';

/** Close a panel when clicking outside its ref element */
export default function useClickOutside(ref, isOpen, onClose) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleMouseDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [ref, isOpen, onClose]);
}
