import { GoogleGenAI } from "@google/genai";
import { ReceiptAnalysis, AnalysisMode } from "../types";

// 改用 Gemini 3 Flash：這是最新的高效率模型，配額比 Pro 多，且比 2.5 更聰明
const MODEL_NAME = 'gemini-3-flash-preview';

const cleanJsonString = (text: string): string => {
  if (!text) return "";
  // 優先尋找 Markdown JSON 區塊
  const match = text.match(/```json([\s\S]*?)```/);
  if (match) return match[1].trim();
  
  // 次之尋找第一個 { 和最後一個 } 之間的內容
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    return text.substring(firstBrace, lastBrace + 1).trim();
  }
  
  return text.trim();
};

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  retries: number = 2, 
  delay: number = 2000 
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    const status = error?.status || error?.code;
    // 如果是 429 (Too Many Requests) 或 503 (Service Unavailable)，進行重試
    if (retries > 0 && (status === 429 || status === 503 || status === 500)) {
      console.warn(`API Error ${status}, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithBackoff(operation, retries - 1, delay * 1.5);
    }
    throw error;
  }
}

export const analyzeImage = async (
    base64Image: string, 
    mode: AnalysisMode = AnalysisMode.RECEIPT,
    mimeType: string = 'image/jpeg',
    manualRate?: number
): Promise<ReceiptAnalysis> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key 未設定，請檢查環境變數。");
    
    const ai = new GoogleGenAI({ apiKey });
    const targetRate = manualRate || 0.25;

    let prompt = "";

    if (mode === AnalysisMode.RECEIPT) {
        prompt = `你是一個收據辨識助手。請分析圖片中的日本收據，並嚴格依照以下 JSON 格式回傳報告（僅回傳 JSON）：
        {
          "exchangeRate": ${targetRate},
          "date": "YYYY-MM-DD",
          "time": "HH:MM",
          "totalJpy": 數字,
          "totalTwd": 數字,
          "items": [
            {
              "category": "精品香氛/伴手禮/美妝保養/藥品保健/食品調味/零食雜貨/服飾配件/3C家電/其他",
              "store": "商店名",
              "name": "中文品名",
              "originalName": "日文原名",
              "priceTwd": 數字,
              "originalPriceJpy": 數字,
              "note": ""
            }
          ]
        }`;
    } else if (mode === AnalysisMode.PRODUCT) {
        prompt = `你是一個專業的日本藥妝與商品翻譯專家。請分析圖片中的商品包裝或標籤（包含成分、功效、注意事項），並嚴格依照以下 JSON 格式回傳（僅回傳 JSON）：
        {
          "exchangeRate": ${targetRate},
          "date": "YYYY-MM-DD",
          "totalJpy": 0,
          "totalTwd": 0,
          "items": [],
          "productDetail": {
            "brand": "品牌名稱",
            "productName": "中文商品名",
            "features": "主要功效與產品特點 (請詳細翻譯)",
            "usage": "使用方法/服用劑量",
            "ingredients": "主要成分 (翻譯關鍵成分)",
            "warnings": "注意事項與禁忌 (例如：孕婦不宜、過敏原)"
          }
        }
        請將內容翻譯成通順的繁體中文 (台灣用語)。`;
    } else if (mode === AnalysisMode.MENU) {
        prompt = `你是一個日本美食導遊。請分析圖片中的菜單，並嚴格依照以下 JSON 格式回傳（僅回傳 JSON）：
        {
          "exchangeRate": ${targetRate},
          "date": "YYYY-MM-DD",
          "totalJpy": 0,
          "totalTwd": 0,
          "items": [],
          "menuDetail": {
            "restaurantName": "餐廳名稱 (若無則填未知)",
            "dishes": [
               {
                 "name": "中文菜名",
                 "description": "菜色介紹/食材/口感",
                 "priceJpy": 數字 (若無價格填 0),
                 "tags": ["推薦", "辣", "素食", "人氣"] (根據圖片判斷)
               }
            ]
          }
        }
        請將內容翻譯成通順的繁體中文 (台灣用語)，讓旅客能理解菜色。`;
    }

    const response = await retryWithBackoff(async () => {
        return await ai.models.generateContent({
            model: MODEL_NAME,
            contents: {
                parts: [
                  { inlineData: { mimeType, data: base64Image } }, 
                  { text: prompt }
                ],
            },
            config: {
                temperature: 0.1,
                responseMimeType: "application/json",
            }
        });
    });

    const text = response.text || "";
    const cleaned = cleanJsonString(text);
    if (!cleaned) throw new Error("AI 無法識別內容，請重拍或換個角度。");

    const parsed = JSON.parse(cleaned) as ReceiptAnalysis;
    
    // 防禦性與預設值修正
    parsed.mode = mode;
    parsed.exchangeRate = parsed.exchangeRate || targetRate;
    parsed.date = parsed.date || new Date().toISOString().split('T')[0];
    
    if (!parsed.items) parsed.items = [];
    
    if (mode === AnalysisMode.RECEIPT) {
        if (!parsed.totalTwd) {
            parsed.totalTwd = parsed.items.reduce((sum, item) => sum + (item.priceTwd || 0), 0);
        }
        if (!parsed.totalJpy) {
            parsed.totalJpy = parsed.items.reduce((sum, item) => sum + (item.originalPriceJpy || 0), 0);
        }
    } else {
        // 非收據模式，金額通常為 0 或僅供參考，不強制計算總額
        parsed.totalTwd = parsed.totalTwd || 0;
        parsed.totalJpy = parsed.totalJpy || 0;
    }

    return parsed;
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    
    if (error?.status === 429 || error?.code === 429) {
        throw new Error("API 使用量已達上限 (Quota Exceeded)。請稍等幾分鐘後再試。");
    }

    if (error instanceof SyntaxError) {
        throw new Error("格式解析錯誤。請嘗試重新拍攝更清晰的照片。");
    }
    throw error;
  }
};

export const generateShoppingReport = async (history: ReceiptAnalysis[]): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    // 只分析收據模式的消費
    const receipts = history.filter(h => h.mode === AnalysisMode.RECEIPT || !h.mode);
    const summary = receipts.slice(0, 5).map(h => `${h.date}: 消費 NT$${h.totalTwd}`).join('\n');
    const prompt = `基於以下消費紀錄，寫一段親切幽默的分析報告（100字內）：\n${summary}`;
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });
    return response.text || "無法生成報告";
  } catch (err) {
    return "分析暫時無法使用，請稍後再試。";
  }
};