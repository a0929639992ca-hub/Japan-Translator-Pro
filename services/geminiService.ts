import { GoogleGenAI } from "@google/genai";
import { ReceiptAnalysis, AnalysisMode } from "../types";

// 定義模型池：依序嘗試不同模型以避開單一模型的配額限制
// 策略：優先使用 2.0 Flash 系列，若皆忙碌則回退至 1.5 Flash (獨立配額) 以確保服務可用性
const MODELS = [
  'gemini-2.0-flash',                    // Attempt 0: 首選正式版 (速度快、品質好)
  'gemini-2.0-flash-lite-preview-02-05', // Attempt 1: 輕量化預覽版 (配額分流)
  'gemini-2.0-flash-exp',                // Attempt 2: 實驗版 (可能有不同配額池)
  'gemini-1.5-flash'                     // Attempt 3: 舊版穩定 Flash (獨立配額，最後防線)
];

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

/**
 * 帶有模型輪替與指數避讓的請求函數
 * @param ai GoogleGenAI 實例
 * @param config 生成設定
 * @param attempt 當前重試次數 (0-based)
 */
async function generateWithRobustRetry(
  ai: GoogleGenAI,
  promptParams: any,
  attempt: number = 0
): Promise<any> {
  // 確保索引不超出範圍
  const modelIndex = attempt % MODELS.length;
  const modelToUse = MODELS[modelIndex];

  try {
    // 若是重試，進行等待 (Exponential Backoff)
    // 增加等待時間以提高成功率
    if (attempt > 0) {
      const delay = [0, 2000, 4000, 6000][Math.min(attempt, 3)];
      console.log(`[Retry ${attempt}/${MODELS.length - 1}] Switching to ${modelToUse}, waiting ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    return await ai.models.generateContent({
      ...promptParams,
      model: modelToUse
    });

  } catch (error: any) {
    const status = error?.status || error?.code;
    const message = error?.message || "";
    // 判斷是否為配額或伺服器錯誤 (包含 429, 503, 500)
    const isQuotaError = status === 429 || message.includes('429') || message.includes('Quota');
    const isServerBusy = status === 503 || status === 500 || message.includes('Overloaded');

    // 只要還有模型可以嘗試，就繼續重試
    if ((isQuotaError || isServerBusy) && attempt < MODELS.length - 1) {
      console.warn(`Model ${modelToUse} failed (${status}). Trying next model...`);
      return generateWithRobustRetry(ai, promptParams, attempt + 1);
    }
    
    // 若所有模型都嘗試失敗，或遇到非重試類型的錯誤，則拋出
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

    let systemInstruction = "";
    let prompt = "";

    // 定義各模式的 JSON 結構片段
    const receiptSchema = `
      "items": [
        {
          "category": "精品香氛/伴手禮/美妝保養/藥品保健/食品調味/零食雜貨/服飾配件/3C家電/其他",
          "store": "商店名",
          "name": "中文品名 (翻譯)",
          "originalName": "日文原名 (OCR辨識)",
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
             "originalName": "日文菜名原文 (OCR辨識)",
             "description": "菜色介紹/食材/口感 (生動描述)",
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

    // 根據模式設定 System Instruction (角色) 與 Prompt (任務)
    if (mode === AnalysisMode.AUTO) {
        systemInstruction = "你是一個全能的日本旅遊助手。你的專長是精準辨識日本收據、藥妝說明、菜單以及一般路標公告。請將所有內容翻譯成台灣繁體中文。";
        prompt = `請先判斷圖片的類型，並依據類型提取資料。
        
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
          ${receiptSchema},
          ${productSchema},
          ${menuSchema},
          ${generalSchema}
        }
        注意：根據 detectedMode 填寫對應欄位，其餘欄位請留空或 null。`;

    } else if (mode === AnalysisMode.RECEIPT) {
        systemInstruction = "你是一個專業的記帳與收據辨識助手。請專注於金額與品項的精確 OCR 辨識。";
        prompt = `請分析圖片中的日本收據，並嚴格依照以下 JSON 格式回傳：
        {
          "exchangeRate": ${targetRate},
          "date": "YYYY-MM-DD",
          "time": "HH:MM",
          "totalJpy": 數字,
          "totalTwd": 數字,
          ${receiptSchema}
        }`;

    } else if (mode === AnalysisMode.PRODUCT) {
        systemInstruction = "你是一個專業的日本藥妝與商品翻譯專家。請幫助使用者理解商品的功效、成分與禁忌。";
        prompt = `請分析圖片中的商品包裝或標籤，並嚴格依照以下 JSON 格式回傳：
        {
          "exchangeRate": ${targetRate},
          "date": "YYYY-MM-DD",
          "totalJpy": 0,
          "totalTwd": 0,
          "items": [],
          ${productSchema}
        }`;

    } else if (mode === AnalysisMode.MENU) {
        systemInstruction = "你是一個熱情的日本美食導遊。請用令人垂涎的文字翻譯菜單，讓使用者理解菜色特色。";
        prompt = `請分析圖片中的菜單，並嚴格依照以下 JSON 格式回傳：
        {
          "exchangeRate": ${targetRate},
          "date": "YYYY-MM-DD",
          "totalJpy": 0,
          "totalTwd": 0,
          "items": [],
          ${menuSchema}
        }`;

    } else if (mode === AnalysisMode.GENERAL) {
        systemInstruction = "你是一個隨身翻譯助手。請用清晰易懂的台灣繁體中文翻譯圖片內容。";
        prompt = `請分析圖片內容，並嚴格依照以下 JSON 格式回傳：
        {
          "exchangeRate": ${targetRate},
          "date": "YYYY-MM-DD",
          "totalJpy": 0,
          "totalTwd": 0,
          "items": [],
          ${generalSchema}
        }`;
    }

    // 使用新的 robust retry 機制
    const response = await generateWithRobustRetry(ai, {
        contents: {
            parts: [
              { inlineData: { mimeType, data: base64Image } }, 
              { text: prompt }
            ],
        },
        config: {
            systemInstruction: systemInstruction,
            temperature: mode === AnalysisMode.MENU ? 0.3 : 0.1,
            responseMimeType: "application/json",
        }
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
    
    // 金額補正邏輯
    if (finalMode === AnalysisMode.RECEIPT) {
        if (!result.totalTwd) {
            result.totalTwd = result.items.reduce((sum: number, item: any) => sum + (item.priceTwd || 0), 0);
        }
        if (!result.totalJpy) {
            result.totalJpy = result.items.reduce((sum: number, item: any) => sum + (item.originalPriceJpy || 0), 0);
        }
    } else {
        result.totalTwd = result.totalTwd || 0;
        result.totalJpy = result.totalJpy || 0;
    }

    return result;
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    
    // 檢查是否有 429 或配額錯誤
    const message = error?.message || "";
    if (error?.status === 429 || error?.code === 429 || message.includes('429') || message.includes('Quota')) {
        throw new Error("所有 AI 模型目前皆滿載。我們已嘗試 4 種不同的模型通道但皆無回應，請等待約 1 分鐘後再試。");
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
    const receipts = history.filter(h => h.mode === AnalysisMode.RECEIPT || !h.mode);
    const summary = receipts.slice(0, 5).map(h => `${h.date}: 消費 NT$${h.totalTwd}`).join('\n');
    const prompt = `基於以下消費紀錄，寫一段親切幽默的分析報告（100字內）：\n${summary}`;
    
    // 報告生成也使用 retry 機制，確保體驗
    const response = await generateWithRobustRetry(ai, {
      contents: prompt,
    });
    return response.text || "無法生成報告";
  } catch (err) {
    return "分析暫時無法使用，請稍後再試。";
  }
};