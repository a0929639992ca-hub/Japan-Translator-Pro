import React, { useState } from 'react';
import { User as UserIcon, Lock, Mail, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { login } from '../services/authService';
import { User } from '../types';

interface AuthViewProps {
  onLoginSuccess: (user: User) => void;
  onBack: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLoginSuccess, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    try {
      const user = await login(email, password);
      onLoginSuccess(user);
    } catch (err) {
      alert('登入失敗，請重試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-6 py-12 animate-fade-in">
      <div className="text-center mb-10">
        <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-indigo-200 mx-auto mb-6 transform -rotate-6">
          <UserIcon className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          {isLogin ? '歡迎回來' : '建立帳號'}
        </h2>
        <p className="text-slate-400 text-sm">登入後即可雲端同步您的日本購物明細</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="email"
            placeholder="電子郵件"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700"
            required
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="password"
            placeholder="密碼"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-70 mt-6"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              {isLogin ? '登入帳號' : '註冊帳號'}
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 text-center space-y-4">
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          {isLogin ? '還沒有帳號？立即註冊' : '已有帳號？返回登入'}
        </button>
        
        <div className="pt-6">
          <button
            onClick={onBack}
            className="text-xs text-slate-400 underline underline-offset-4"
          >
            先不登入，直接開始使用
          </button>
        </div>
      </div>

      <div className="mt-12 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
        <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
        <p className="text-xs text-amber-700 leading-relaxed">
          <b>提示：</b> 登入後系統將自動將目前的本地紀錄同步至雲端，確保出國期間更換手機資料也不會遺失。
        </p>
      </div>
    </div>
  );
};