'use client';

import { useState, useRef, useEffect } from 'react';

type InputMaskProps = {
  mask: string; // e.g., "99.99" for time format
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  maxLength?: number;
  type?: string;
};

export default function InputMask({
  mask,
  placeholder,
  value,
  onChange,
  className,
  maxLength,
  type = 'text',
}: InputMaskProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = useState(value);
  const cursorPositionRef = useRef<number>(0);

  // Apply mask to input value
  const applyMask = (inputValue: string, previousValue: string = ''): string => {
    // If empty, return empty
    if (!inputValue) return '';

    // Extract only digits
    const digits = inputValue.replace(/\D/g, '');

    if (!digits) return '';

    // If deleting (shorter than previous), allow partial deletion
    if (inputValue.length < previousValue.length) {
      // Allow deletion, format what remains
      if (digits.length === 0) return '';
      
      let result = '';
      let digitIndex = 0;
      
      for (let i = 0; i < mask.length && digitIndex < digits.length; i++) {
        if (mask[i] === '9') {
          result += digits[digitIndex];
          digitIndex++;
        } else {
          result += mask[i];
        }
      }
      
      return result;
    }

    // Apply mask for typing
    let result = '';
    let digitIndex = 0;

    for (let i = 0; i < mask.length && digitIndex < digits.length; i++) {
      if (mask[i] === '9') {
        result += digits[digitIndex];
        digitIndex++;
      } else {
        result += mask[i];
      }
    }

    return result;
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const previousValue = displayValue;
    const masked = applyMask(inputValue, previousValue);
    
    // Store cursor position before update
    cursorPositionRef.current = e.target.selectionStart || 0;
    
    setDisplayValue(masked);
    onChange(masked);
  };

  // Restore cursor position after state update
  useEffect(() => {
    if (inputRef.current && cursorPositionRef.current !== null) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        if (inputRef.current) {
          const pos = Math.min(cursorPositionRef.current, displayValue.length);
          inputRef.current.setSelectionRange(pos, pos);
        }
      }, 0);
    }
  }, [displayValue]);

  // Sync with external value changes
  useEffect(() => {
    if (value !== displayValue) {
      setDisplayValue(value);
    }
  }, [value]);

  return (
    <input
      ref={inputRef}
      type={type}
      placeholder={placeholder}
      value={displayValue}
      onChange={handleChange}
      onKeyDown={(e) => {
        // Allow navigation and deletion keys
        if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'].includes(e.key)) {
          return;
        }
        // Allow Ctrl/Cmd combinations
        if (e.ctrlKey || e.metaKey) {
          return;
        }
        // Only allow digits
        if (!/^\d$/.test(e.key)) {
          e.preventDefault();
        }
      }}
      maxLength={maxLength || mask.length}
      className={className}
    />
  );
}

