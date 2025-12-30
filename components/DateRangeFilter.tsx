import React from 'react';
import { CalendarRange, X } from 'lucide-react';

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onRangeChange: (start: string, end: string) => void;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ startDate, endDate, onRangeChange }) => {
  const [isCustom, setIsCustom] = React.useState(false);

  const presets = [
    { label: '全部', start: '', end: '' },
    { label: '今天', start: new Date().toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] },
    { label: '近 7 日', start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] },
  ];

  const handlePresetClick = (start: string, end: string) => {
    setIsCustom(false);
    onRangeChange(start, end);
  };

  const isActive = (start: string, end: string) => startDate === start && endDate === end && !isCustom;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => handlePresetClick(p.start, p.end)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
              isActive(p.start, p.end)
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                : 'bg-white border-slate-200 text-slate-500'
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setIsCustom(true)}
          className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 ${
            isCustom
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
              : 'bg-white border-slate-200 text-slate-500'
          }`}
        >
          <CalendarRange className="w-3 h-3" />
          自訂範圍
        </button>
      </div>

      {isCustom && (
        <div className="bg-indigo-50/50 border border-indigo-100 p-3 rounded-2xl animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => onRangeChange(e.target.value, endDate)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <span className="text-slate-400 font-bold">至</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => onRangeChange(startDate, e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <button 
              onClick={() => { setIsCustom(false); onRangeChange('', ''); }}
              className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};