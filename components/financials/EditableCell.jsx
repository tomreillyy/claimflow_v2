'use client';
import { useState, useRef, useEffect } from 'react';

/**
 * Shared inline-editable cell pattern.
 * Appears as plain text by default, editable on click.
 * Supports: text, number, money, select, date.
 */
export default function EditableCell({
  value,
  onChange,
  type = 'text',
  options = [],         // for select: [{ value, label }]
  placeholder = '',
  formatDisplay,        // optional (val) => string
  style = {},
  disabled = false,
  min,
  max,
  step,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const inputRef = useRef(null);

  useEffect(() => {
    setDraft(value ?? '');
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (type !== 'select' && type !== 'date' && inputRef.current.select) {
        inputRef.current.select();
      }
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    let parsed = draft;
    if (type === 'number' || type === 'money') {
      parsed = parseFloat(draft);
      if (isNaN(parsed)) parsed = 0;
    }
    if (parsed !== value) {
      onChange(parsed);
    }
  };

  const cancel = () => {
    setEditing(false);
    setDraft(value ?? '');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  };

  if (disabled) {
    return (
      <span style={{ fontSize: 13, color: '#6b7280', ...style }}>
        {formatDisplay ? formatDisplay(value) : displayValue(value, type)}
      </span>
    );
  }

  if (!editing) {
    return (
      <span
        onClick={() => setEditing(true)}
        tabIndex={0}
        onFocus={() => setEditing(true)}
        style={{
          cursor: 'pointer',
          display: 'block',
          padding: '4px 6px',
          borderRadius: 4,
          border: '1px solid transparent',
          fontSize: 13,
          color: '#1a1a1a',
          minHeight: 24,
          transition: 'border-color 0.15s',
          ...style,
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#d1d5db'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
      >
        {formatDisplay ? formatDisplay(value) : displayValue(value, type)}
        {!value && value !== 0 && placeholder && (
          <span style={{ color: '#9ca3af' }}>{placeholder}</span>
        )}
      </span>
    );
  }

  if (type === 'select') {
    return (
      <select
        ref={inputRef}
        value={draft}
        onChange={e => { setDraft(e.target.value); }}
        onBlur={() => { commit(); }}
        onKeyDown={handleKeyDown}
        style={{
          width: '100%',
          padding: '4px 6px',
          fontSize: 13,
          border: '1px solid #1e3a5f',
          borderRadius: 4,
          outline: 'none',
          backgroundColor: 'white',
          color: '#1a1a1a',
          boxShadow: '0 0 0 2px rgba(30, 58, 95, 0.15)',
          ...style,
        }}
      >
        <option value="">-- Select --</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
  }

  return (
    <input
      ref={inputRef}
      type={type === 'money' ? 'number' : type === 'date' ? 'date' : type}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step ?? (type === 'money' ? '0.01' : undefined)}
      style={{
        width: '100%',
        padding: '4px 6px',
        fontSize: 13,
        border: '1px solid #1e3a5f',
        borderRadius: 4,
        outline: 'none',
        color: '#1a1a1a',
        boxShadow: '0 0 0 2px rgba(30, 58, 95, 0.15)',
        fontFamily: (type === 'number' || type === 'money') ? 'monospace' : 'inherit',
        textAlign: (type === 'number' || type === 'money') ? 'right' : 'left',
        ...style,
      }}
    />
  );
}

function displayValue(val, type) {
  if (val === null || val === undefined || val === '') return '';
  if (type === 'money') {
    return '$' + Number(val).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  if (type === 'number') {
    return Number(val).toLocaleString('en-AU');
  }
  return String(val);
}
