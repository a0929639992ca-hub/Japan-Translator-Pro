import React, { useMemo, useRef, useCallback } from 'react';
import { ArrowLeft, Receipt, Calendar, Download, Loader2, Trash2, Clock, AlertTriangle, Info, Utensils, Heart } from 'lucide-react';
import { ReceiptAnalysis, ReceiptItem, AnalysisMode } from '../types';
import { toBlob } from 'html-to-image';

interface ResultViewProps {
  originalImage?: string | null;
  data: ReceiptAnalysis;
  onRetake: () => void;
  onDelete?: (id: string) => void;
}

export const ResultView: React.FC<ResultViewProps> = ({ originalImage, data, onRetake, onDelete }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const mode = data.mode || AnalysisMode.RECEIPT;

  const handleSaveImage = useCallback(async () => {
    if (!contentRef.current) return;
    try {
      setIsSaving(true);
      await new Promise(resolve => setTimeout(resolve, 300));

      const options: any = {
        cacheBust: true,
        backgroundColor: '#f1f5f9', 
        style: { margin: '0', padding: '40px', transform: 'none' },
        width: contentRef.current.scrollWidth + 80, 
        height: contentRef.current.scrollHeight + 80, 
        filter: (node: any) => {
          if (node instanceof HTMLElement && node.hasAttribute('data-hide-on-save')) {
            return false;
          }
          return true;
        },
        onClone: (clonedNode: any) => {
          const node = clonedNode as HTMLElement;
          node.style.boxShadow = '0 20px 50px -10px rgba(0, 0, 0, 0.2)';
        }
      };

      const blob = await toBlob(contentRef.current, options);
      if (!blob) throw new Error('Image generation failed');

      const fileName = `japan-${mode.toLowerCase()}-${data.date}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `日本${mode === 'PRODUCT' ? '藥妝' : mode === 'MENU' ? '菜單' : '購物'}翻譯`,
          });
        } catch (err) {
          if ((err as Error).name !== 'AbortError') {
             const url = URL.createObjectURL(blob);
             const a = document.createElement('a');
             a.href = url;
             a.download = fileName;
             a.click();
             URL.revokeObjectURL(url);
          }
        }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to save image', err);
      alert('儲存圖片失敗，請重試');
    } finally {
      setIsSaving(false);
    }
  }, [data.date, mode]);

  const handleDeleteCurrent = () => {
    if (data.id && onDelete && confirm("確定要刪除此筆紀錄嗎？")) {
      onDelete(data.id);
    }
  };

  const renderContent = () => {
      switch (mode) {
          case AnalysisMode.PRODUCT:
              return <ProductResultView data={data} originalImage={originalImage} />;
          case AnalysisMode.MENU:
              return <MenuResultView data={data} originalImage={originalImage} />;
          case AnalysisMode.RECEIPT:
          default:
              return <ReceiptResultView data={data} originalImage={originalImage} />;
      }
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto animate-fade-in pb-24">
      <div className="flex items-center justify-between py-4 px-2 mb-2">
        <button
          onClick={onRetake}
          className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 bg-white/80 border border-slate-200/60 backdrop-blur px-4 py-2 rounded-full text-sm font-medium transition shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回</span>
        </button>
        {data.id && onDelete && (
            <button
            onClick={handleDeleteCurrent}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition"
            >
            <Trash2 className="w-5 h-5" />
            </button>
        )}
      </div>

      <div className="relative drop-shadow-xl px-2">
        <div ref={contentRef} className="rounded-2xl overflow-hidden bg-white">
            {renderContent()}
        </div>
      </div>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center" data-hide-on-save="true">
        <button
            onClick={handleSaveImage}
            disabled={isSaving}
            className="flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-full hover:bg-slate-800 transition shadow-2xl disabled:opacity-80 border border-slate-700"
        >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            <span className="font-bold tracking-wide">儲存/分享翻譯</span>
        </button>
      </div>
    </div>
  );
};

// --- 子組件：收據模式 (維持舊有設計) ---
const ReceiptResultView = ({ data, originalImage }: { data: ReceiptAnalysis, originalImage?: string | null }) => {
    const storeName = useMemo(() => {
        if (!data.items || !Array.isArray(data.items)) return 'JAPAN SHOPPING';
        const validItem = data.items.find(i => i.store && i.store !== '未知');
        return validItem ? validItem.store : 'JAPAN SHOPPING';
    }, [data.items]);

    const groupedItems = useMemo(() => {
        const groups: Record<string, ReceiptItem[]> = {};
        if (!data.items) return groups;
        data.items.forEach(item => {
            const cat = item.category || '其他';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(item);
        });
        return groups;
    }, [data.items]);

    return (
        <div className="bg-white relative overflow-hidden text-slate-800 receipt-paper pb-8">
            <div className="h-2 bg-indigo-600 w-full absolute top-0 left-0"></div>
            <div className="pt-8 pb-6 px-6 text-center border-b-2 border-dashed border-slate-200">
                <div className="inline-flex items-center justify-center p-3 bg-indigo-50 text-indigo-600 rounded-full mb-4">
                    <Receipt className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-1 line-clamp-2 uppercase">{storeName}</h2>
                <div className="flex justify-center gap-4 text-xs text-slate-500 font-mono mt-2">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {data.date}</span>
                </div>
            </div>
            <div className="bg-slate-50 p-6 text-center border-b-2 border-dashed border-slate-200">
                <div className="flex items-baseline justify-center gap-1 text-slate-900 mb-2">
                    <span className="text-xl font-medium">NT$</span>
                    <span className="text-5xl font-bold font-mono tracking-tighter">{(data.totalTwd || 0).toLocaleString()}</span>
                </div>
                {data.totalJpy && <p className="text-xs text-slate-500 font-mono">¥{data.totalJpy.toLocaleString()} (Rate: {data.exchangeRate})</p>}
            </div>
            <div className="p-6 space-y-8">
                {Object.keys(groupedItems).map((category) => (
                    <div key={category}>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>{category}
                        </h3>
                        <div className="space-y-3">
                            {groupedItems[category].map((item, idx) => (
                                <div key={idx} className="flex justify-between items-start">
                                    <div className="flex-1 pr-4">
                                        <div className="text-sm font-bold text-slate-800 leading-tight">{item.name}</div>
                                        <div className="text-[10px] text-slate-400 mt-0.5">{item.originalName}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-slate-700 font-mono">${(item.priceTwd || 0).toLocaleString()}</div>
                                        <div className="text-[10px] text-slate-400 font-mono">¥{(item.originalPriceJpy || 0).toLocaleString()}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            {originalImage && (
                <div className="px-6 pb-6 pt-4 border-t border-slate-100 mt-4">
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 text-center">Original Photo</p>
                     <img src={originalImage} className="w-full rounded-lg grayscale opacity-70" alt="Receipt" />
                </div>
            )}
            <style>{`
                .receipt-paper {
                    clip-path: polygon(0% 10px, 2% 0%, 4% 10px, 6% 0%, 8% 10px, 10% 0%, 12% 10px, 14% 0%, 16% 10px, 18% 0%, 20% 10px, 22% 0%, 24% 10px, 26% 0%, 28% 10px, 30% 0%, 32% 10px, 34% 0%, 36% 10px, 38% 0%, 40% 10px, 42% 0%, 44% 10px, 46% 0%, 48% 10px, 50% 0%, 52% 10px, 54% 0%, 56% 10px, 58% 0%, 60% 10px, 62% 0%, 64% 10px, 66% 0%, 68% 10px, 70% 0%, 72% 10px, 74% 0%, 76% 10px, 78% 0%, 80% 10px, 82% 0%, 84% 10px, 86% 0%, 88% 10px, 90% 0%, 92% 10px, 94% 0%, 96% 10px, 98% 0%, 100% 10px, 100% 100%, 0% 100%);
                }
            `}</style>
        </div>
    );
}

// --- 子組件：藥妝模式 ---
const ProductResultView = ({ data, originalImage }: { data: ReceiptAnalysis, originalImage?: string | null }) => {
    const detail = data.productDetail || { brand: '未知', productName: '未知商品', features: '', usage: '', ingredients: '', warnings: '' };
    
    return (
        <div className="bg-white">
            <div className="bg-gradient-to-r from-teal-500 to-emerald-500 p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 opacity-10"><Info className="w-32 h-32 -mr-8 -mt-8" /></div>
                <div className="relative z-10">
                    <p className="text-xs font-bold bg-white/20 inline-block px-2 py-1 rounded mb-2">{detail.brand}</p>
                    <h2 className="text-2xl font-bold leading-tight">{detail.productName}</h2>
                </div>
            </div>
            
            <div className="p-6 space-y-6">
                <section>
                    <h3 className="flex items-center gap-2 text-emerald-600 font-bold text-sm uppercase tracking-wide mb-2">
                        <Heart className="w-4 h-4" /> 功效特點
                    </h3>
                    <div className="bg-emerald-50 rounded-xl p-4 text-slate-700 text-sm leading-relaxed border border-emerald-100">
                        {detail.features}
                    </div>
                </section>

                <section>
                     <h3 className="flex items-center gap-2 text-slate-800 font-bold text-sm uppercase tracking-wide mb-2">
                        使用方法
                    </h3>
                    <p className="text-slate-600 text-sm">{detail.usage || "無特別說明"}</p>
                </section>

                <div className="grid grid-cols-1 gap-6 pt-4 border-t border-slate-100">
                     <section>
                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">主要成分</h3>
                        <p className="text-slate-600 text-xs leading-relaxed">{detail.ingredients || "無成分資訊"}</p>
                    </section>
                    
                    <section>
                        <h3 className="flex items-center gap-2 text-red-500 font-bold text-xs uppercase mb-2">
                            <AlertTriangle className="w-3 h-3" /> 注意事項
                        </h3>
                        <p className="text-red-600/80 text-xs leading-relaxed bg-red-50 p-3 rounded-lg">
                            {detail.warnings || "無特別警語，使用前請仍詳閱包裝。"}
                        </p>
                    </section>
                </div>
            </div>
            
            {originalImage && (
                <div className="p-6 pt-0">
                    <img src={originalImage} className="w-full h-48 object-cover rounded-xl shadow-inner opacity-90" alt="Product" />
                </div>
            )}
        </div>
    );
}

// --- 子組件：菜單模式 ---
const MenuResultView = ({ data, originalImage }: { data: ReceiptAnalysis, originalImage?: string | null }) => {
    const detail = data.menuDetail || { restaurantName: '美味餐廳', dishes: [] };
    
    return (
        <div className="bg-[#FFFBF5]">
             <div className="p-8 pb-4 text-center border-b border-amber-900/10">
                 <p className="text-amber-600 text-xs font-bold tracking-[0.2em] uppercase mb-2">Menu Translation</p>
                 <h2 className="text-2xl font-serif font-bold text-amber-900">{detail.restaurantName}</h2>
             </div>
             
             <div className="p-6 space-y-6">
                 {detail.dishes.map((dish, i) => (
                     <div key={i} className="flex justify-between gap-4 pb-4 border-b border-amber-900/5 last:border-0">
                         <div className="flex-1">
                             <div className="mb-1.5">
                                 <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                     <h3 className="text-lg font-bold text-slate-800 leading-tight">{dish.name}</h3>
                                     {dish.tags?.map(tag => (
                                         <span key={tag} className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200 whitespace-nowrap">{tag}</span>
                                     ))}
                                 </div>
                                 {dish.originalName && (
                                     <p className="text-sm text-amber-900/60 font-medium font-serif">{dish.originalName}</p>
                                 )}
                             </div>
                             <p className="text-sm text-slate-500 leading-relaxed font-serif opacity-90">{dish.description}</p>
                         </div>
                         {dish.priceJpy > 0 && (
                            <div className="text-right">
                                 <div className="text-base font-bold text-amber-700 font-mono">¥{dish.priceJpy.toLocaleString()}</div>
                                 <div className="text-[10px] text-amber-900/40">約 NT${Math.round(dish.priceJpy * (data.exchangeRate || 0.25))}</div>
                            </div>
                         )}
                     </div>
                 ))}
             </div>
             
             {originalImage && (
                 <div className="p-6 pt-0 opacity-80">
                      <div className="w-full h-1 border-t border-double border-amber-900/20 mb-4"></div>
                      <img src={originalImage} className="w-full rounded sepia-[.3]" alt="Menu" />
                 </div>
             )}
        </div>
    );
}