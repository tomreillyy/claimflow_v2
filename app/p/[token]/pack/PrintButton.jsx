'use client';

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        padding: '8px 16px',
        backgroundColor: '#021048',
        color: 'white',
        border: 'none',
        borderRadius: 6,
        fontSize: 14,
        fontWeight: 500,
        cursor: 'pointer',
        fontFamily: 'system-ui'
      }}
    >
      Print to PDF
    </button>
  );
}
