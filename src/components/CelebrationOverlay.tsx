import { useEffect, useState } from 'react';
import { cn } from '../utils/cn';

interface PodiumEntry { name: string; points: number; emoji?: string; color?: string; }

export default function CelebrationOverlay({
  podium,
  onDismiss,
}: {
  podium: PodiumEntry[];
  onDismiss: () => void;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 50); return () => clearTimeout(t); }, []);

  const medals = ['🥇', '🥈', '🥉'];
  const podiumOrder = [1, 0, 2]; // visual: 2nd | 1st | 3rd
  const heights = ['h-36', 'h-28', 'h-20'];
  const colors  = ['bg-yellow-400', 'bg-gray-400', 'bg-amber-600'];
  const txtClrs = ['text-yellow-900', 'text-gray-900', 'text-amber-100'];

  return (
    <div className={cn(
      'fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm transition-opacity duration-500 px-4',
      visible ? 'opacity-100' : 'opacity-0'
    )}>
      <div className="text-center mb-2">
        <div className="text-8xl mb-2 inline-block" style={{ animation: 'trophyBounce 0.8s ease-in-out infinite alternate' }}>
          🏆
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-1">Tournament Over!</h1>
        <p className="text-purple-300 text-base sm:text-lg">Here are your champions</p>
      </div>

      <div className="flex items-end justify-center gap-3 mt-6 mb-8 w-full max-w-sm">
        {podiumOrder.map((idx) => {
          const player = podium[idx];
          if (!player) return null;
          return (
            <div key={idx} className="flex flex-col items-center flex-1">
              <div className="text-2xl mb-1">{medals[idx]}</div>
              {player.emoji && <div className="text-xl mb-0.5">{player.emoji}</div>}
              <div className="text-white text-xs font-bold text-center mb-1 px-1 leading-tight">{player.name}</div>
              <div className="text-purple-300 text-xs mb-2">{player.points} pts</div>
              <div className={cn('w-full rounded-t-lg flex items-center justify-center font-black text-xl', heights[idx], colors[idx], txtClrs[idx])}>
                {idx + 1}
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={onDismiss} className="mt-2 px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors text-base">
        🎮 Keep Playing
      </button>

      <style>{`@keyframes trophyBounce { from { transform:translateY(0) rotate(-5deg); } to { transform:translateY(-12px) rotate(5deg); } }`}</style>
    </div>
  );
}
