import { useState, useEffect } from 'react';
import { createShare, listShares, revokeShare } from '../api/shares';
import { X, Link, Copy, Check, Trash2, Lock } from 'lucide-react';

export default function ShareModal({ noteId, onClose }) {
  const [shares, setShares] = useState([]);
  const [password, setPassword] = useState('');
  const [expiresIn, setExpiresIn] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [error, setError] = useState('');

  const BASE = window.location.origin;

  useEffect(() => {
    listShares().then(setShares).catch(() => {});
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    setError('');
    try {
      const data = {
        noteId,
        password: password || undefined,
        expiresInHours: expiresIn ? Number(expiresIn) : undefined,
      };
      const share = await createShare(data);
      setShares(prev => [share, ...prev]);
      setPassword('');
      setExpiresIn('');
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (shareId) => {
    try {
      await revokeShare(shareId);
      setShares(prev => prev.filter(s => s.id !== shareId));
    } catch (e) {
      setError(e.message);
    }
  };

  const handleCopy = (token) => {
    const url = `${BASE}/shared/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(token);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
         onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
           onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Link className="w-4 h-4 text-indigo-500" />
            <span className="font-semibold text-gray-900">分享笔记</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 cursor-pointer">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Create new share */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                密码保护 <span className="text-gray-300">（可选）</span>
              </label>
              <input type="text" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="留空则无需密码"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                过期时间 <span className="text-gray-300">（可选）</span>
              </label>
              <select value={expiresIn} onChange={e => setExpiresIn(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300">
                <option value="">永不过期</option>
                <option value="1">1 小时后</option>
                <option value="6">6 小时后</option>
                <option value="24">24 小时后</option>
                <option value="72">3 天后</option>
                <option value="168">7 天后</option>
              </select>
            </div>
            <button onClick={handleCreate} disabled={creating}
              className="w-full py-2 text-sm font-medium text-white bg-indigo-500
                         hover:bg-indigo-600 disabled:bg-indigo-300 rounded-lg
                         transition-colors cursor-pointer">
              {creating ? '创建中...' : '生成分享链接'}
            </button>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          {/* Existing shares */}
          {shares.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                已分享
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {shares.map(share => (
                  <div key={share.id}
                    className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-lg text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-700 truncate text-xs">
                        {share.hasPassword && <Lock className="w-3 h-3 inline mr-1 text-gray-400" />}
                        {BASE}/shared/{share.token}
                      </p>
                      {share.expiresAt && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          过期: {new Date(share.expiresAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <button onClick={() => handleCopy(share.token)}
                      className="p-1.5 rounded-md hover:bg-white transition-colors cursor-pointer"
                      title="复制链接">
                      {copiedId === share.token
                        ? <Check className="w-3.5 h-3.5 text-green-500" />
                        : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                    </button>
                    <button onClick={() => handleRevoke(share.id)}
                      className="p-1.5 rounded-md hover:bg-white transition-colors cursor-pointer"
                      title="取消分享">
                      <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
