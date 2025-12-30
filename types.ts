export enum AnalysisMode {
  RECEIPT = 'RECEIPT',
  PRODUCT = 'PRODUCT',
  MENU = 'MENU'
}

export interface ReceiptItem {
  category: string;      // 類別 (e.g. 藥妝, 食品)
  store: string;         // 商店/品牌
  name: string;          // 中文品名
  originalName: string;  // 日文原名
  priceTwd: number;      // 台幣單價
  originalPriceJpy: number; // 日幣原價
  note: string;          // 備註
}

// 藥妝/商品詳細資訊
export interface ProductDetail {
  brand: string;         // 品牌
  productName: string;   // 商品名
  features: string;      // 功效/特點
  usage: string;         // 使用方法
  ingredients: string;   // 主要成分
  warnings: string;      // 注意事項/禁忌
}

// 菜單詳細資訊
export interface MenuDetail {
  restaurantName: string;// 餐廳名稱
  dishes: {
    name: string;        // 菜名
    description: string; // 介紹
    priceJpy: number;    // 價格
    tags: string[];      // 標籤 (推薦/辣/素食)
  }[];
}

export interface ReceiptAnalysis {
  id?: string;           // 唯一識別碼
  userId?: string;       // 關聯的使用者 ID
  mode?: AnalysisMode;   // 分析模式 (預設為 RECEIPT)
  timestamp?: number;    // 建立時間
  exchangeRate: number;  // 匯率
  sourceUrl?: string;    // 匯率來源連結
  date: string;          // 日期
  time?: string;         // 購物時間
  totalTwd: number;      // 總台幣
  totalJpy?: number;     // 總日幣
  items: ReceiptItem[];  // 商品列表 (收據模式用)
  productDetail?: ProductDetail; // 藥妝模式用
  menuDetail?: MenuDetail;       // 菜單模式用
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export enum AppState {
  IDLE = 'IDLE',
  CAPTURING = 'CAPTURING',
  ANALYZING = 'ANALYZING',
  RESULT = 'RESULT',
  HISTORY = 'HISTORY',
  STATS = 'STATS',
  AUTH = 'AUTH',
  ERROR = 'ERROR'
}