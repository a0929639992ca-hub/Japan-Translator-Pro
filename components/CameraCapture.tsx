import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, Upload, RefreshCw } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 }, // 提升至 1280px 確保 OCR 精度
          height: { ideal: 720 }
        }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (err) {
      setError("無法啟動相機，請檢查權限或使用上傳功能。");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const capturePhoto = () => {
    if (videoRef.current && isStreaming) {
      const canvas = document.createElement('canvas');
      const video = videoRef.current;
      
      // 保持原始比例但限制寬度
      const maxWidth = 1280;
      let width = video.videoWidth;
      let height = video.videoHeight;
      
      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        onCapture(dataUrl); // 先傳出資料，App.tsx 狀態切換後 useEffect 會自動 stopCamera
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxWidth = 1280;
            let width = img.width;
            let height = img.height;
            if (width > maxWidth) {
                height = (maxWidth / width) * height;
                width = maxWidth;
            }
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
            onCapture(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full aspect-[3/4] bg-slate-900 rounded-3xl overflow-hidden relative shadow-2xl">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${!isStreaming ? 'hidden' : 'block'}`}
      />

      {isStreaming && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-4/5 h-2/3 border-2 border-white/30 rounded-2xl relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500 -mt-1 -ml-1 rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500 -mt-1 -mr-1 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500 -mb-1 -ml-1 rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500 -mb-1 -mr-1 rounded-br-lg"></div>
                <div className="absolute inset-x-0 h-0.5 bg-indigo-500/50 shadow-[0_0_15px_indigo] animate-scan-line"></div>
            </div>
        </div>
      )}

      <div className="absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-black/80 to-transparent flex flex-col items-center gap-6">
        {isStreaming && (
          <button onClick={capturePhoto} className="w-16 h-16 bg-white rounded-full border-4 border-white/30 shadow-xl active:scale-90 transition-transform"></button>
        )}
        <label className="flex items-center gap-2 text-white/90 bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/20 cursor-pointer hover:bg-white/20 transition">
            <Upload className="w-4 h-4" />
            <span className="text-sm font-bold">上傳照片</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        </label>
      </div>

      {!isStreaming && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-400">
              {error ? (
                  <div className="flex flex-col items-center gap-4">
                      <p className="text-red-400 text-sm font-bold">{error}</p>
                      <button onClick={startCamera} className="bg-indigo-600 text-white px-6 py-2 rounded-full text-xs font-bold flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" /> 重新啟動相機
                      </button>
                  </div>
              ) : (
                  <div className="animate-pulse flex flex-col items-center gap-3">
                      <Camera className="w-10 h-10 opacity-50" />
                      <p className="text-sm">正在啟動相機元件...</p>
                  </div>
              )}
          </div>
      )}

      <style>{`
        @keyframes scan-line {
            0% { top: 10%; opacity: 0; }
            50% { opacity: 1; }
            100% { top: 90%; opacity: 0; }
        }
        .animate-scan-line {
            animation: scan-line 3s linear infinite;
            position: absolute;
        }
      `}</style>
    </div>
  );
};