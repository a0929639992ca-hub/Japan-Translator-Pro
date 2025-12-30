import React, { useMemo } from 'react';
import { ReceiptAnalysis, AnalysisMode } from '../types';
import { PieChart, ShoppingBag, Gift, Shirt, Pill, Smartphone, Utensils, Sparkles, Package, TrendingUp } from 'lucide-react';

interface StatsViewProps {
  history: ReceiptAnalysis[];
}

export const StatsView: React.FC<StatsViewProps> = ({ history }) => {
  // 核心計算邏輯 (僅計算收據模式，避免翻譯功能影響記帳)
  const stats = useMemo(() => {
    // 過濾出收據模式
    const receipts = history.filter(h => h.mode === AnalysisMode.RECEIPT || !h.mode);
    
    const totalSpent = receipts.reduce((sum, record) => sum + (record.totalTwd || 0), 0);
    const categoryMap: Record<string, number> = {};

    receipts.forEach(record => {
      record.items.forEach(item => {
        const cat = item.category || '其他';
        categoryMap[cat] = (categoryMap[cat] || 0) + (item.priceTwd || 0);
      });
    });

    const categoryList = Object.entries(categoryMap)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    return { totalSpent, categoryList, count: receipts.length };
  }, [history]);

  const getCategoryIcon = (category: string) => {
    const c = category.toLowerCase();
    if (c.includes('精品') || c.includes('香氛')) return { icon: Sparkles, color: 'text-purple-500', bg: 'bg-purple-50', bar: 'bg-purple-500' };
    if (c.includes('伴手禮')) return { icon: Gift, color: 'text-pink-500', bg: 'bg-pink-50', bar: 'bg-pink-500' };
    if (c.includes('藥妝') || c.includes('保養') || c.includes('美妝')) return { icon: Pill, color: 'text-rose-500', bg: 'bg-rose-50', bar: 'bg-rose-500' };
    if (c.includes('食品') || c.includes('美食') || c.includes('調味')) return { icon: Utensils, color: 'text-orange-500', bg: 'bg-orange-50', bar: 'bg-orange-500' };
    if (c.includes('零食') || c.includes('雜貨')) return { icon: Package, color: 'text-amber-500', bg: 'bg-amber-50', bar: 'bg-amber-500' };
    if (c.includes('服飾') || c.includes('配件')) return { icon: Shirt, color: 'text-blue-500', bg: 'bg-blue-50', bar: 'bg-blue-500' };
    if (c.includes('3c') || c.includes('家電')) return { icon: Smartphone, color: 'text-cyan-500', bg: 'bg-cyan-50', bar: 'bg-cyan-500' };
    return { icon: ShoppingBag, color: 'text-slate-400', bg: 'bg-slate-50', bar: 'bg-slate-400' };
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 animate-fade-in pb-24">
      <div className="mb-8 pt-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6">
          <PieChart className="w-6 h-6 text-indigo-600" />
          消費分類統計
        </h2>

        {/* 總消費卡片 */}
        <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden mb-8">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">總累積消費</p>
          <div className="flex items-baseline gap-1 font-mono text-4xl font-bold tracking-tight">
            <span className="text-lg opacity-80 text-indigo-400">NT$</span> {stats.totalSpent.toLocaleString()}
          </div>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-indigo-300 font-bold bg-indigo-500/10 w-fit px-2 py-1 rounded-lg">
            <TrendingUp className="w-3 h-3" /> 共 {stats.count} 筆收據紀錄
          </div>
        </div>

        {/* 長條圖列表 */}
        <div className="space-y-6">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest px-1">支出分佈</h3>
          
          {stats.categoryList.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
              <p className="text-sm text-slate-400">尚無消費資料，快去掃描收據吧！</p>
            </div>
          ) : (
            <div className="space-y-5">
              {stats.categoryList.map((cat, idx) => {
                const style = getCategoryIcon(cat.name);
                return (
                  <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm transition-transform active:scale-[0.98]">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${style.bg}`}>
                          <style.icon className={`w-4 h-4 ${style.color}`} />
                        </div>
                        <span className="text-sm font-bold text-slate-700">{cat.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-800 font-mono">NT$ {cat.amount.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-400 font-bold">{cat.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                    {/* 視覺化長條圖 */}
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${style.bar} rounded-full transition-all duration-1000 ease-out`} 
                        style={{ width: `${cat.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};