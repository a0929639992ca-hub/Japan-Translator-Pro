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
    mode: AnalysisMode = AnalysisMode.AUTO,
    mimeType: string = 'image/jpeg',
    manualRate?: number
): Promise<ReceiptAnalysis> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key 未設定，請檢查環境變數。");
    
    const ai = new GoogleGenAI({ apiKey });
    const targetRate = manualRate || 0.25;

    let prompt = "";

    // 定義各模式的 JSON 結構片段，供 AUTO 模式組合使用
    const receiptSchema = `
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
    `;

    const productSchema = `
      "productDetail": {
        "brand": "品牌名稱",
        "productName": "中文商品名",
        "features": "主要功效與產品特點 (請詳細翻譯)",
        "usage": "使用方法/服用劑量",
        "ingredients": "主要成分 (翻譯關鍵成分)",
        "warnings": "注意事項與禁忌 (例如：孕婦不宜、過敏原)"
      }
    `;

    const menuSchema = `
      "menuDetail": {
        "restaurantName": "餐廳名稱 (若無則填未知)",
        "dishes": [
           {
             "name": "中文菜名",
             "originalName": "日文菜名原文 (請務必辨識)",
             "description": "菜色介紹/食材/口感",
             "priceJpy": 數字 (若無價格填 0),
             "tags": ["推薦", "辣", "素食", "人氣"] (根據圖片判斷)
           }
        ]
      }
    `;

    const generalSchema = `
      "generalDetail": {
        "title": "圖片主題/標題",
        "summary": "一句話重點摘要",
        "translatedContent": "完整翻譯內容 (若是路標/公告請翻成指示，若是文章請翻成繁體中文)"
      }
    `;

    if (mode === AnalysisMode.AUTO) {
        prompt = `你是一個全能的日本旅遊助手。請先判斷圖片的類型，並依據類型提取資料。
        圖片類型判斷規則：
        1. 若是購物收據/發票，類型為 "RECEIPT"。
        2. 若是藥妝/商品包裝背後的說明標籤，類型為 "PRODUCT"。
        3. 若是餐廳菜單，類型為 "MENU"。
        4. 其他情況（路牌、公告、說明書、景點介紹等），類型為 "GENERAL"。

        請嚴格依照以下 JSON 格式回傳（僅回傳 JSON）：
        {
          "detectedMode": "RECEIPT" | "PRODUCT" | "MENU" | "GENERAL",
          "exchangeRate": ${targetRate},
          "date": "YYYY-MM-DD",
          "totalJpy": 0,
          "totalTwd": 0,
          // 若 detectedMode 為 RECEIPT，請填寫 items，其他欄位留空或 null
          ${receiptSchema},
          // 若 detectedMode 為 PRODUCT，請填寫 productDetail，其他欄位留空或 null
          ${productSchema},
          // 若 detectedMode 為 MENU，請填寫 menuDetail，其他欄位留空或 null
          ${menuSchema},
          // 若 detectedMode 為 GENERAL，請填寫 generalDetail，其他欄位留空或 null
          ${generalSchema}
        }
        請確保所有中文翻譯皆為台灣繁體中文用語。`;
    } else if (mode === AnalysisMode.RECEIPT) {
        prompt = `你是一個收據辨識助手。請分析圖片中的日本收據，並嚴格依照以下 JSON 格式回傳報告（僅回傳 JSON）：
        {
          "exchangeRate": ${targetRate},
          "date": "YYYY-MM-DD",
          "time": "HH:MM",
          "totalJpy": 數字,
          "totalTwd": 數字,
          ${receiptSchema}
        }`;
    } else if (mode === AnalysisMode.PRODUCT) {
        prompt = `你是一個專業的日本藥妝與商品翻譯專家。請分析圖片中的商品包裝或標籤（包含成分、功效、注意事項），並嚴格依照以下 JSON 格式回傳（僅回傳 JSON）：
        {
          "exchangeRate": ${targetRate},
          "date": "YYYY-MM-DD",
          "totalJpy": 0,
          "totalTwd": 0,
          "items": [],
          ${productSchema}
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
          ${menuSchema}
        }
        請將內容翻譯成通順的繁體中文 (台灣用語)，讓旅客能理解菜色。`;
    } else if (mode === AnalysisMode.GENERAL) {
        prompt = `你是一個隨身翻譯助手。請分析圖片內容（如路牌、公告、說明書、海報等），並嚴格依照以下 JSON 格式回傳（僅回傳 JSON）：
        {
          "exchangeRate": ${targetRate},
          "date": "YYYY-MM-DD",
          "totalJpy": 0,
          "totalTwd": 0,
          "items": [],
          ${generalSchema}
        }
        請將內容翻譯成通順的繁體中文 (台灣用語)。`;
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

    const parsed: any = JSON.parse(cleaned);
    
    // 決定最終模式
    let finalMode = mode;
    if (mode === AnalysisMode.AUTO && parsed.detectedMode) {
        finalMode = parsed.detectedMode as AnalysisMode;
    } else if (mode === AnalysisMode.AUTO) {
        // Fallback if detectedMode is missing but AUTO was requested
        if (parsed.items && parsed.items.length > 0) finalMode = AnalysisMode.RECEIPT;
        else if (parsed.productDetail) finalMode = AnalysisMode.PRODUCT;
        else if (parsed.menuDetail) finalMode = AnalysisMode.MENU;
        else finalMode = AnalysisMode.GENERAL;
    }

    const result: ReceiptAnalysis = {
        ...parsed,
        mode: finalMode,
        exchangeRate: parsed.exchangeRate || targetRate,
        date: parsed.date || new Date().toISOString().split('T')[0],
        items: parsed.items || []
    };
    
    if (finalMode === AnalysisMode.RECEIPT) {
        if (!result.totalTwd) {
            result.totalTwd = result.items.reduce((sum, item) => sum + (item.priceTwd || 0), 0);
        }
        if (!result.totalJpy) {
            result.totalJpy = result.items.reduce((sum, item) => sum + (item.originalPriceJpy || 0), 0);
        }
    } else {
        // 非收據模式，金額通常為 0 或僅供參考
        result.totalTwd = result.totalTwd || 0;
        result.totalJpy = result.totalJpy || 0;
    }

    return result;
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