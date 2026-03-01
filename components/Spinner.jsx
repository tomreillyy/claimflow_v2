'use client';

export function Spinner({ size = 36, color = '#021048', className = '' }) {
  return (
    <>
      <svg
        className={`spinner ${className}`}
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="18"
          cy="18"
          r="15"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.12"
        />
        <path
          d="M18 3a15 15 0 0 1 15 15"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <style jsx>{`
        .spinner {
          animation: spin 0.7s linear infinite, fadeIn 0.3s ease-out;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}
