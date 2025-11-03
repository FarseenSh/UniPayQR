'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { ArrowLeft, Camera, Upload, Loader, CheckCircle } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

type ScanMode = 'camera' | 'gallery' | 'manual';

export default function ScanPage() {
  const router = useRouter();
  const setScannedUPI = useAppStore((state) => state.setScannedUPI);
  
  const [vpa, setVpa] = useState('');
  const [mode, setMode] = useState<ScanMode>('camera');
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'pending'>('pending');
  const [scannedData, setScannedData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (mode !== 'camera' || !cameraPermission) return;

    const initCamera = async () => {
      try {
        scannerRef.current = new Html5QrcodeScanner(
          'qr-reader',
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1
          },
          false
        );

        scannerRef.current.render(
          (decodedText) => {
            const upiMatch = decodedText.match(/pa=([^&]+)/);
            if (upiMatch) {
              const vpaValue = decodeURIComponent(upiMatch[1]);
              setVpa(vpaValue);
              setScannedData({ vpa: vpaValue });
            } else if (decodedText.includes('@')) {
              setVpa(decodedText.trim());
              setScannedData({ vpa: decodedText.trim() });
            }
          },
          () => {}
        );

        setCameraPermission('granted');
      } catch (error) {
        setCameraPermission('denied');
      }
    };

    initCamera();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, [mode, cameraPermission]);

  const handleGalleryUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image');
      return;
    }

    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const img = new Image();
        img.onload = async () => {
          try {
            const { Html5Qrcode } = await import('html5-qrcode');
            const qrDecoder = new Html5Qrcode('qr-reader');
            const result = await qrDecoder.scanFile(file, true);
            
            const upiMatch = result.match(/pa=([^&]+)/);
            if (upiMatch) {
              const vpaValue = decodeURIComponent(upiMatch[1]);
              setVpa(vpaValue);
              setScannedData({ vpa: vpaValue });
            } else if (result.includes('@')) {
              setVpa(result.trim());
              setScannedData({ vpa: result.trim() });
            }
          } catch {
            alert('Could not decode QR');
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContinue = () => {
    if (vpa.trim()) {
      setScannedUPI({
        payeeAddress: vpa.trim(),
        payeeName: 'Merchant',
        amount: '900'
      });
      router.push('/create-payment');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50 p-4">
      <nav className="glass border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <button 
            onClick={() => router.push('/dashboard')} 
            className="text-gray-700 hover:text-blue-600 flex items-center gap-2 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-black text-gray-900 mb-2">Scan UPI QR</h1>
        <p className="text-gray-600 mb-8 text-lg">Choose your preferred scanning method</p>

        <div className="glass rounded-2xl p-6 shadow-xl border-2 border-gray-200">
          {/* Mode Selector */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { id: 'camera', label: 'Camera', icon: Camera },
              { id: 'gallery', label: 'Gallery', icon: Upload },
              { id: 'manual', label: 'Manual', icon: null }
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setMode(m.id as ScanMode);
                  setScannedData(null);
                  setVpa('');
                }}
                className={`py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
                  mode === m.id
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                }`}
              >
                {m.icon && <m.icon className="w-4 h-4" />}
                {m.label}
              </button>
            ))}
          </div>

          {/* Camera Mode */}
          {mode === 'camera' && (
            <div>
              {cameraPermission === 'pending' ? (
                <div className="h-72 bg-blue-50 rounded-xl flex items-center justify-center border-2 border-blue-200">
                  <Loader className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              ) : cameraPermission === 'denied' ? (
                <div className="h-72 bg-red-50 rounded-xl flex items-center justify-center border-2 border-red-200">
                  <p className="text-red-700 font-medium">Camera access denied. Use gallery or manual.</p>
                </div>
              ) : (
                <div id="qr-reader" style={{ width: '100%' }}></div>
              )}
            </div>
          )}

          {/* Gallery Mode */}
          {mode === 'gallery' && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleGalleryUpload(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="w-full h-72 border-2 border-dashed border-blue-400 rounded-xl flex items-center justify-center hover:bg-blue-50 transition"
              >
                <div className="text-center">
                  <Upload className="w-12 h-12 text-blue-600 mx-auto mb-2" />
                  <p className="text-gray-700 font-medium">Click to upload QR image</p>
                  <p className="text-gray-500 text-sm mt-1">Supports JPG, PNG</p>
                </div>
              </button>
            </div>
          )}

          {/* Manual Mode */}
          {mode === 'manual' && (
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3">Enter UPI ID</label>
              <input
                type="text"
                value={vpa}
                onChange={(e) => setVpa(e.target.value)}
                placeholder="merchant@paytm"
                className="w-full px-4 py-3 glass border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
              />
              <p className="text-xs text-gray-600 mb-3">Quick options:</p>
              <div className="grid grid-cols-2 gap-2">
                {['merchant@paytm', 'shop@upi', 'cafe@ybl', '9876543210@upi'].map((id) => (
                  <button
                    key={id}
                    onClick={() => setVpa(id)}
                    className="p-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-gray-700 text-sm font-medium"
                  >
                    {id}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Scanned VPA Display */}
          {vpa.trim() && (
            <div className="mt-4 p-4 bg-green-50 border-2 border-green-300 rounded-xl">
              <p className="text-xs text-green-700 font-medium mb-1">UPI ID Detected:</p>
              <p className="text-lg font-bold text-green-900">{vpa}</p>
            </div>
          )}

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={!vpa.trim()}
            className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transform hover:scale-105 transition-all shadow-lg"
          >
            {vpa.trim() && <CheckCircle className="w-5 h-5" />}
            Continue to Payment
          </button>
        </div>
      </main>
    </div>
  );
}

