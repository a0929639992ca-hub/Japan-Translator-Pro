import React from 'react';
import { Loader2, Calculator, Globe, Tags } from 'lucide-react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-center p-6">
      <div className="relative">
        <div className="absolute inset-0 bg-indigo-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
        <div className="relative bg-white p-4 rounded-2xl shadow-xl mb-6">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
        </div>
      </div>
      
      <h2 className="text-2xl font-bold text-slate-800 mb-2">正在分析購物明細...</h2>
      <div className="flex flex-col gap-3 mt-2 max-w-xs mx-auto">
        <div className="flex items-center gap-3 text-slate-600 text-sm animate-pulse" style={{ animationDelay: '0s' }}>
            <Globe className="w-4 h-4 text-blue-500" />
            <span>查詢匯率與換算台幣</span>
        </div>
        <div className="flex items-center gap-3 text-slate-600 text-sm animate-pulse" style={{ animationDelay: '0.5s' }}>
            <Tags className="w-4 h-4 text-amber-500" />
            <span>商品智慧分類 (藥妝/零食/精品)</span>
        </div>
        <div className="flex items-center gap-3 text-slate-600 text-sm animate-pulse" style={{ animationDelay: '1s' }}>
            <Calculator className="w-4 h-4 text-green-500" />
            <span>計算折扣與平均單價</span>
        </div>
      </div>
    </div>
  );
};