import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Lock, Eye, AlertCircle } from 'lucide-react';

const API_BASE = '/api/shares/public';

export default function SharedNotePage() {
  const { token } = useParams();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`${API_BASE}/${token}`)
      .then(r => r.json())
      .then(res => {
        if (res.code !== 200) throw new Error(res.message || '加载失败');
        if (res.data.requiresPassword) {
          setNeedsPassword(true);
          setLoading(false);
        } else {
          setNote(res.data);
          setLoading(false);
        }
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, [token]);

  const handleVerify = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch(`${API_BASE}/${token}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const res = await resp.json();
      if (res.code !== 200) throw new Error(res.message || '密码错误');
      setNote(res.data);
      setNeedsPassword(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Password gate
  if (needsPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm mx-4 text-center">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-5 h-5 text-indigo-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">此笔记已加密</h2>
          <p className="text-sm text-gray-400 mb-5">需要密码才能查看</p>
          <input type="password" value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleVerify()}
            placeholder="请输入密码"
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl
                       focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 mb-3"
            autoFocus />
          <button onClick={handleVerify}
            className="w-full py-2.5 text-sm font-medium text-white bg-indigo-500
                       hover:bg-indigo-600 rounded-xl transition-colors cursor-pointer">
            验证
          </button>
          {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
        </div>
      </div>
    );
  }

  // Display shared note
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header bar */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Eye className="w-4 h-4" />
            <span>只读分享</span>
          </div>
          <a href="/login"
            className="text-xs text-indigo-500 hover:text-indigo-600 font-medium">
            AI-Note
          </a>
        </div>
      </div>

      {/* Note content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div
          className="prose max-w-none
            [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-gray-900 [&_h1]:mb-6
            [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-gray-800 [&_h2]:mt-8 [&_h2]:mb-4
            [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-gray-700 [&_h3]:mt-6 [&_h3]:mb-3
            [&_p]:text-gray-600 [&_p]:leading-7 [&_p]:mb-4
            [&_pre]:bg-[#1e293b] [&_pre]:text-[#e2e8f0] [&_pre]:p-5 [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_pre]:my-6
            [&_code]:font-mono [&_code]:text-sm
            [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit
            [&_blockquote]:border-l-4 [&_blockquote]:border-indigo-300 [&_blockquote]:pl-4 [&_blockquote]:py-1 [&_blockquote]:my-4 [&_blockquote]:text-gray-500 [&_blockquote]:bg-indigo-50/50 [&_blockquote]:rounded-r-lg
            [&_table]:border-collapse [&_table]:w-full [&_table]:my-6
            [&_th]:border [&_th]:border-gray-200 [&_th]:px-4 [&_th]:py-2 [&_th]:bg-gray-50 [&_th]:font-semibold [&_th]:text-left
            [&_td]:border [&_td]:border-gray-200 [&_td]:px-4 [&_td]:py-2
            [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-6
            [&_hr]:border-gray-200 [&_hr]:my-10
            [&_ul]:pl-6 [&_ol]:pl-6 [&_li]:text-gray-600 [&_li]:mb-1"
          dangerouslySetInnerHTML={{ __html: note?.contentHtml || '' }}
        />
      </div>
    </div>
  );
}
