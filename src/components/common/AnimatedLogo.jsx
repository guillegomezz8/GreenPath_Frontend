import React from "react";

export function AnimatedLogo({ src, alt, size = "medium", className = "" }) {
  const sizeScale = {
    small: 0.7,
    medium: 1,
    large: 1.3
  };

  const currentScale = sizeScale[size];

  return (
    <div 
      className={`relative inline-block ${className}`}
      style={{ transform: `scale(${currentScale})` }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute border-4 border-transparent rounded-full"
          style={{
            inset: '-20px',
            borderColor: '#10b981',
            animation: 'rotate 20s linear infinite'
          }}
        />
        
        <div 
          className="absolute border-2 border-transparent rounded-full"
          style={{
            inset: '-10px',
            borderColor: 'rgba(16, 185, 129, 0.3)',
            animation: 'rotate 15s linear infinite reverse'
          }}
        />
      </div>

      <div 
        className="relative z-10 bg-white rounded-3xl transition-all duration-300 hover:shadow-2xl"
        style={{
          padding: '48px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          transform: 'translateY(0px)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-8px)';
          e.currentTarget.style.boxShadow = '0 35px 60px -12px rgba(0, 0, 0, 0.25)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0px)';
          e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
        }}
      >
        <img 
          src={src} 
          alt={alt} 
          className="block h-auto"
          style={{ maxWidth: '200px' }}
        />
      </div>

      <div 
        className="absolute w-8 h-8 rounded-full"
        style={{
          top: '-16px',
          right: '-16px',
          background: '#10b981',
          animation: 'bounce 2s infinite'
        }}
      />
      
      <div 
        className="absolute w-6 h-6 rounded-full"
        style={{
          bottom: '-16px',
          left: '-16px',
          background: '#059669',
          animation: 'bounce 2s infinite 1s'
        }}
      />

      <style>{`
        @keyframes rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        @media (max-height: 700px) {
          .relative.inline-block {
            transform: scale(0.8) !important;
          }
          
          .relative.z-10 {
            padding: 32px !important;
          }
          
          .block.h-auto {
            max-width: 160px !important;
          }
        }
      `}</style>
    </div>
  );
}