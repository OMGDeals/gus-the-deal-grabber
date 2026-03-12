import { useState } from 'react';
import { base44 } from '@/api/base44Client';

const PLATFORMS = ['X / Twitter', 'Instagram', 'TikTok', 'Facebook', 'YouTube', 'Reddit', 'LinkedIn'];

const PLATFORM_ICONS = {
  'X / Twitter': '𝕏',
  'Instagram': '📸',
  'TikTok': '🎵',
  'Facebook': '👤',
  'YouTube': '▶️',
  'Reddit': '🤖',
  'LinkedIn': '💼',
};

export default function SubmitScoreModal({ score, dealsCount, onClose, onSubmitted }) {
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Enter your social media name!'); return; }
    if (!platform) { setError('Pick your platform!'); return; }
    setError('');
    setLoading(true);
    await base44.entities.LeaderboardEntry.create({
      player_name: name.trim(),
      platform,
      score,
      deals_snagged: dealsCount,
    });
    setLoading(false);
    onSubmitted();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="text-center mb-4">
          <div className="text-4xl mb-1">🏆</div>
          <h2 className="text-2xl font-black text-orange-500">Submit Your Score!</h2>
          <p className="text-gray-400 text-sm">Brag to the world, Gus would be proud!</p>
        </div>

        <div className="bg-orange-50 rounded-xl p-3 mb-4 text-center">
          <p className="text-3xl font-black text-orange-600">{score.toLocaleString()}</p>
          <p className="text-sm text-gray-500">🏷️ {dealsCount} deals snagged</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Your Handle / Name</label>
            <input
              type="text"
              placeholder="e.g. @GusDealHunter"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border-2 border-gray-200 focus:border-orange-400 rounded-xl px-4 py-2.5 outline-none text-sm font-medium transition"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Platform</label>
            <div className="grid grid-cols-2 gap-2">
              {PLATFORMS.map(p => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-semibold transition ${
                    platform === p
                      ? 'border-orange-500 bg-orange-50 text-orange-600'
                      : 'border-gray-200 text-gray-600 hover:border-orange-300'
                  }`}
                >
                  <span>{PLATFORM_ICONS[p]}</span> {p}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-500 text-xs font-semibold">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              tabIndex={-1}
              className="flex-1 border-2 border-gray-200 text-gray-500 font-bold py-2.5 rounded-xl hover:bg-gray-50 transition text-sm"
            >
              Skip
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-black py-2.5 rounded-xl transition text-sm shadow disabled:opacity-60"
            >
              {loading ? 'Submitting...' : '🏷️ Submit!'}
            </button>
          </div>

          <div className="border-t pt-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide text-center mb-2">Share your score!</p>
            <div className="flex gap-2">
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(`🏷️ I scored ${score.toLocaleString()} pts and snagged ${dealsCount} deals in GUS: DEAL HUNTER! Can you beat me? 🏃`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition text-sm"
              >
                👤 Facebook
              </a>
              <a
                href={`https://www.instagram.com/`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  navigator.clipboard.writeText(`🏷️ I scored ${score.toLocaleString()} pts and snagged ${dealsCount} deals in GUS: DEAL HUNTER! Can you beat me? 🏃`);
                  alert('Caption copied! Paste it into your Instagram post 📸');
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-2.5 rounded-xl transition text-sm"
              >
                📸 Instagram
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}