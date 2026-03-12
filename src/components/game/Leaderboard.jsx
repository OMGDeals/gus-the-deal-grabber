import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const PLATFORM_ICONS = {
  'X / Twitter': '𝕏',
  'Instagram': '📸',
  'TikTok': '🎵',
  'Facebook': '👤',
  'YouTube': '▶️',
  'Reddit': '🤖',
  'LinkedIn': '💼',
};

const RANK_STYLES = [
  'bg-yellow-400 text-yellow-900',
  'bg-gray-300 text-gray-800',
  'bg-orange-400 text-white',
];

export default function Leaderboard({ onClose }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.LeaderboardEntry.list('-score', 20).then(data => {
      setEntries(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="p-5 border-b text-center">
          <h2 className="text-2xl font-black text-orange-500">🏆 Hall of Deal Hunters</h2>
          <p className="text-gray-400 text-xs">Top scores from the best deal hunters!</p>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {loading && (
            <div className="text-center py-10 text-gray-400 text-sm">Loading hunters...</div>
          )}
          {!loading && entries.length === 0 && (
            <div className="text-center py-10">
              <div className="text-4xl mb-2">🏷️</div>
              <p className="text-gray-400 text-sm">No scores yet. Be the first deal hunter!</p>
            </div>
          )}
          {entries.map((e, i) => (
            <div
              key={e.id}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                i < 3 ? 'border-2 border-orange-200 bg-orange-50' : 'bg-gray-50'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 ${
                RANK_STYLES[i] || 'bg-gray-200 text-gray-600'
              }`}>
                {i === 0 ? '👑' : `#${i + 1}`}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-sm truncate">{e.player_name}</p>
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <span>{PLATFORM_ICONS[e.platform] || '🌐'}</span>
                  <span>{e.platform}</span>
                  {e.deals_snagged > 0 && <span className="ml-1">· 🏷️ {e.deals_snagged} deals</span>}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-black text-orange-600 text-lg">{e.score.toLocaleString()}</p>
                <p className="text-xs text-gray-400">pts</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t">
          <button
            onClick={onClose}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-3 rounded-xl transition"
          >
            Back to Game
          </button>
        </div>
      </div>
    </div>
  );
}