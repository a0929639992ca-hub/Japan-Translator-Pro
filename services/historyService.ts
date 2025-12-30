import { ReceiptAnalysis } from "../types";
import { getCurrentUser } from "./authService";

const STORAGE_KEYS = {
  CURRENT_LOCAL: 'japan_receipt_history_v1',
  LEGACY_LOCAL: ['japan_receipt_history', 'receipt_history'],
  CLOUD_PREFIX: 'japan_receipt_cloud_',
  VERSION: '1.3'
};

export const getHistory = (): ReceiptAnalysis[] => {
  const user = getCurrentUser();
  const storageKey = user ? `${STORAGE_KEYS.CLOUD_PREFIX}${user.id}` : STORAGE_KEYS.CURRENT_LOCAL;
  
  let history: ReceiptAnalysis[] = [];
  try {
    const json = localStorage.getItem(storageKey);
    history = json ? JSON.parse(json) : [];
    if (!Array.isArray(history)) history = [];
  } catch (e) {
    console.error("History Parse Error:", e);
    history = [];
  }

  if (!user && history.length === 0) {
    for (const legacyKey of STORAGE_KEYS.LEGACY_LOCAL) {
      try {
        const legacyData = localStorage.getItem(legacyKey);
        if (legacyData) {
          const parsedLegacy = JSON.parse(legacyData);
          if (Array.isArray(parsedLegacy)) {
            history = [...history, ...parsedLegacy];
          }
          localStorage.removeItem(legacyKey);
        }
      } catch (e) {}
    }
    if (history.length > 0) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_LOCAL, JSON.stringify(history));
    }
  }

  return history.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
};

export const syncLocalToCloud = async (userId: string): Promise<ReceiptAnalysis[]> => {
  await new Promise(resolve => setTimeout(resolve, 1500));
  const localData = getHistory(); 
  const cloudKey = `${STORAGE_KEYS.CLOUD_PREFIX}${userId}`;
  let cloudData: ReceiptAnalysis[] = [];
  try {
    const json = localStorage.getItem(cloudKey);
    cloudData = json ? JSON.parse(json) : [];
  } catch(e) {}
  
  const mergedMap = new Map<string, ReceiptAnalysis>();
  cloudData.forEach(item => { if (item.id) mergedMap.set(item.id, item); });
  localData.forEach(item => { if (item.id && !mergedMap.has(item.id)) mergedMap.set(item.id, { ...item, userId }); });
  
  const mergedList = Array.from(mergedMap.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  localStorage.setItem(cloudKey, JSON.stringify(mergedList));
  localStorage.removeItem(STORAGE_KEYS.CURRENT_LOCAL);
  
  return mergedList;
};

export const saveReceiptToHistory = (data: ReceiptAnalysis): ReceiptAnalysis => {
  const user = getCurrentUser();
  const storageKey = user ? `${STORAGE_KEYS.CLOUD_PREFIX}${user.id}` : STORAGE_KEYS.CURRENT_LOCAL;
  const history = getHistory();
  const newRecord: ReceiptAnalysis = {
    ...data,
    id: data.id || `rec_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    timestamp: Date.now(),
    userId: user?.id 
  };
  const updatedHistory = [newRecord, ...history];
  localStorage.setItem(storageKey, JSON.stringify(updatedHistory));
  return newRecord;
};

export const deleteFromHistory = (id: string): ReceiptAnalysis[] => {
  const user = getCurrentUser();
  const storageKey = user ? `${STORAGE_KEYS.CLOUD_PREFIX}${user.id}` : STORAGE_KEYS.CURRENT_LOCAL;
  const history = getHistory();
  const updated = history.filter(item => item.id !== id);
  localStorage.setItem(storageKey, JSON.stringify(updated));
  return updated;
};

export const exportToICloud = () => {
  const data = getHistory();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `JapanShop_Backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const importFromICloud = (file: File): Promise<ReceiptAnalysis[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!Array.isArray(data)) throw new Error("無效的備份檔案格式");
        const user = getCurrentUser();
        const storageKey = user ? `${STORAGE_KEYS.CLOUD_PREFIX}${user.id}` : STORAGE_KEYS.CURRENT_LOCAL;
        const current = getHistory();
        const mergedMap = new Map<string, ReceiptAnalysis>();
        current.forEach(i => mergedMap.set(i.id!, i));
        data.forEach(i => mergedMap.set(i.id!, { ...i, userId: user?.id }));
        const mergedList = Array.from(mergedMap.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        localStorage.setItem(storageKey, JSON.stringify(mergedList));
        resolve(mergedList);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(file);
  });
};