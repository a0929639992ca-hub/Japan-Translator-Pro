import React, { useRef } from 'react';
import { ReceiptAnalysis, AnalysisMode } from '../types';
import { Trash2, ShoppingBag, Clock, Cloud, Loader2, Download, UploadCloud, ShieldCheck, Pill, UtensilsCrossed, FileText } from 'lucide-react';
import { deleteFromHistory, exportToICloud, importFromICloud } from '../services/historyService';

interface HistoryListProps {
  history: ReceiptAnalysis[];
  onSelect: (item: ReceiptAnalysis) => void;
  onUpdateHistory: (newHistory: ReceiptAnalysis[]) => void;
  onBack: () => void;
  isSyncing?: boolean;
}

export const HistoryList: React.FC<HistoryListProps> = ({ history, onSelect, onUpdateHistory, onBack, isSyncing }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('確定要刪除這筆紀錄嗎？雲端備份也將同步刪除。')) {
      const updated = deleteFromHistory(id);
      onUpdateHistory(updated);
    }
  };

  const getStoreName = (item: ReceiptAnalysis) => {
    if (item.mode === AnalysisMode.PRODUCT) {
        return item.productDetail?.productName || item.items?.[0]?.name || '未知藥妝';
    }
    if (item.mode === AnalysisMode.MENU) {
        return item.menuDetail?.restaurantName || '未知餐廳';
    }
    const firstItem = item.items?.find(i => i.store && i.store !== '未知');
    return firstItem ? firstItem.store : 'Store';
  };

  const getModeIcon = (mode?: AnalysisMode) => {
      switch (mode) {
          case AnalysisMode.PRODUCT: return <Pill className="w-3 h-3" />;
          case AnalysisMode.MENU: return <UtensilsCrossed className="w-3 h-3" />;
          default: return <FileText className="w-3 h-3" />;
      }
  };

  const getModeLabel = (mode?: AnalysisMode) => {
      switch (mode) {
          case AnalysisMode.PRODUCT: return "藥妝";
          case AnalysisMode.MENU: return "菜單";
          default: return "收據";
      }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const newList = await importFromICloud(file);
        onUpdateHistory(newList);
        alert('還原成功！');
      } catch (err) {
        alert('匯入失敗，請確認檔案格式是否正確。');
      }
    }
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in pb-20">
      <div className="px-2 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-slate-800">歷史紀錄</h2>
          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md">共 {history.length} 筆</span>
        </div>
        
        {/* iCloud 雲端同步區塊 */}
        <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-2xl p-4 shadow-sm mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white rounded-lg shadow-sm">
                <Cloud className="w-4 h-4 text-indigo-600" />
              </div>
              <span className="text-xs font-bold text-slate-700">iCloud 備份管理</span>
            </div>
            {isSyncing ? (
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-500 bg-white px-2 py-0.5 rounded-full border border-indigo-100 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" /> 同步中
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-green-500 bg-white px-2 py-0.5 rounded-full border border-green-100">
                <ShieldCheck className="w-3 h-3" /> 已加密備份
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={exportToICloud}
              className="flex items-center justify-center gap-2 py-2.5 bg-white border border-indigo-100 rounded-xl text-xs font-bold text-indigo-600 shadow-sm active:scale-95 transition"
            >
              <Download className="w-3.5 h-3.5" /> 備份至 iCloud
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 py-2.5 bg-white border border-indigo-100 rounded-xl text-xs font-bold text-indigo-600 shadow-sm active:scale-95 transition"
            >
              <UploadCloud className="w-3.5 h-3.5" /> 從 iCloud 還原
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImport} />
          </div>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
            <ShoppingBag className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-base font-bold text-slate-700 mb-1">目前沒有紀錄</h3>
          <button onClick={onBack} className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-full text-sm font-bold shadow-lg">去掃描</button>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((record) => (
            <div 
              key={record.id}
              onClick={() => onSelect(record)}
              className="group bg-white rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 hover:border-indigo-300 transition-all cursor-pointer relative overflow-hidden"
            >
              <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1.5 overflow-hidden">
                      <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md font-mono flex items-center gap-1 ${
                              record.mode === AnalysisMode.PRODUCT ? 'bg-emerald-100 text-emerald-700' :
                              record.mode === AnalysisMode.MENU ? 'bg-amber-100 text-amber-700' :
                              'bg-indigo-100 text-indigo-700'
                          }`}>
                              {getModeIcon(record.mode)} {getModeLabel(record.mode)}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                               {record.date.slice(5)}
                          </span>
                      </div>
                      <div className="text-sm font-bold text-slate-700 truncate max-w-[180px]">{getStoreName(record)}</div>
                  </div>

                  <div className="flex flex-col items-end">
                      {(!record.mode || record.mode === AnalysisMode.RECEIPT) ? (
                          <>
                            <div className="text-lg font-bold text-slate-800 font-mono">NT$ {record.totalTwd.toLocaleString()}</div>
                            {record.totalJpy && <div className="text-[10px] text-slate-400 font-mono">¥{record.totalJpy.toLocaleString()}</div>}
                          </>
                      ) : (
                          <div className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded">純翻譯</div>
                      )}
                  </div>
              </div>
                
              <button
                  onClick={(e) => handleDelete(e, record.id!)}
                  className="absolute bottom-2 right-2 p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                  <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};