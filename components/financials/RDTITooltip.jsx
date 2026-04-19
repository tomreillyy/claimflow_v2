'use client';
import { useState, useRef, useEffect } from 'react';
import { RDTI_TOOLTIPS } from '@/lib/rdtiTooltips';

/**
 * RDTI term tooltip — hover or keyboard focus to show explanation.
 * Usage: <RDTITooltip term="associate">Associates</RDTITooltip>
 * Or with custom copy: <RDTITooltip text="Custom explanation">Label</RDTITooltip>
 */
export default function RDTITooltip({ term, text, children, style = {} }) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef(null);
  const tooltipRef = useRef(null);

  const copy = text || RDTI_TOOLTIPS[term] || '';
  if (!copy) return <span style={style}>{children}</span>;

  const show = () => {
    timeoutRef.current = setTimeout(() => setVisible(true), 300);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  return (
    <span
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      tabIndex={0}
      style={{
        position: 'relative',
        cursor: 'help',
        borderBottom: '1px dotted #9ca3af',
        ...style,
      }}
    >
      {children}
      {visible && (
        <span
          ref={tooltipRef}
          role="tooltip"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 8,
            padding: '10px 14px',
            backgroundColor: '#1e3a5f',
            color: 'white',
            fontSize: 12,
            lineHeight: '1.5',
            borderRadius: 6,
            width: 300,
            maxWidth: '90vw',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            pointerEvents: 'none',
            whiteSpace: 'normal',
          }}
        >
          {copy}
        </span>
      )}
    </span>
  );
}
