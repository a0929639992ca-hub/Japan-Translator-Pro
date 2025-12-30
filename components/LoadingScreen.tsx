import React from 'react';
import { Loader2, Sparkles, ScanLine, Languages } from 'lucide-react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-center p-6">
      <div className="relative">
        <div className="absolute inset-0 bg-indigo-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
        <div className="relative bg-white p-4 rounded-2xl shadow-xl mb-6">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
        </div>
      </div>
      
      <h2 className="text-2xl font-bold text-slate-800 mb-2">正在分析圖片內容...</h2>
      <div className="flex flex-col gap-3 mt-2 max-w-xs mx-auto">
        <div className="flex items-center gap-3 text-slate-600 text-sm animate-pulse" style={{ animationDelay: '0s' }}>
            <ScanLine className="w-4 h-4 text-blue-500" />
            <span>識別圖片類型與文字內容</span>
        </div>
        <div className="flex items-center gap-3 text-slate-600 text-sm animate-pulse" style={{ animationDelay: '0.5s' }}>
            <Languages className="w-4 h-4 text-amber-500" />
            <span>進行智慧翻譯與匯率換算</span>
        </div>
        <div className="flex items-center gap-3 text-slate-600 text-sm animate-pulse" style={{ animationDelay: '1s' }}>
            <Sparkles className="w-4 h-4 text-green-500" />
            <span>整理資訊並生成分析報告</span>
        </div>
      </div>
    </div>
  );
};