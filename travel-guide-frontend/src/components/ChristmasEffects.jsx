// components/ChristmasEffects.jsx
import { useEffect, useState } from 'react';

export default function ChristmasEffects() {
  const [snowflakes, setSnowflakes] = useState([]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Generate more snowflakes - 80 snowflakes
    const flakes = Array.from({ length: 80 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      animationDuration: 5 + Math.random() * 3, // 5-8 seconds
      animationDelay: Math.random() * 10,
      fontSize: 10 + Math.random() * 15,
      opacity: 0.5 + Math.random() * 0.5,
    }));
    setSnowflakes(flakes);

    // Hide effects after 10 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <>
      {/* Falling Snow */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden animate-fadeOut" style={{ animationDelay: '9s', animationDuration: '1s' }}>
        {snowflakes.map((flake) => (
          <div
            key={flake.id}
            className="absolute animate-snowfall"
            style={{
              left: `${flake.left}%`,
              fontSize: `${flake.fontSize}px`,
              opacity: flake.opacity,
              animationDuration: `${flake.animationDuration}s`,
              animationDelay: `${flake.animationDelay}s`,
              top: '-20px',
            }}
          >
            ❄️
          </div>
        ))}
      </div>

      {/* Falling Christmas Trees */}
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden animate-fadeOut" style={{ animationDelay: '9s', animationDuration: '1s' }}>
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className="absolute animate-snowfall"
            style={{
              left: `${(i * 10 + 5) % 100}%`, // Spread evenly: 5%, 15%, 25%, etc.
              fontSize: `${20 + (i % 3) * 8}px`,
              opacity: 0.5 + (i % 3) * 0.15,
              animationDuration: `${7 + (i % 3) * 2}s`,
              animationDelay: `${i * 1}s`, // Stagger by 1 second each
              top: '-30px',
            }}
          >
            🎄
          </div>
        ))}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes snowfall {
          0% {
            transform: translateY(-20px) translateX(0) rotate(0deg);
          }
          100% {
            transform: translateY(100vh) translateX(100px) rotate(360deg);
          }
        }

        @keyframes twinkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0.5);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }

        @keyframes fadeOut {
          0% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }

        .animate-snowfall {
          animation: snowfall linear infinite;
        }

        .animate-twinkle {
          animation: twinkle ease-in-out infinite;
        }

        .animate-fadeOut {
          animation: fadeOut ease-out forwards;
        }
      `}</style>
    </>
  );
}
