import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Wifi, X, Plane, Copy, Check } from 'lucide-react';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverUrl: string;
  roomId: string;
}

export const QRModal: React.FC<QRModalProps> = ({
  isOpen,
  onClose,
  serverUrl,
  roomId,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const fullUrl = `${serverUrl}${serverUrl.includes('?') ? '&' : '?'}room=${roomId}`;

  useEffect(() => {
    if (isOpen && fullUrl) {
      QRCode.toDataURL(fullUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#081c15',
          light: '#ffffff',
        },
      })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('QR code error', err));
    }
  }, [isOpen, fullUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 flex flex-col shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <Plane className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">Połącz znajomych w samolocie</h2>
            <p className="text-xs text-slate-400">Tryb Offline Hotspot (Zero-Install)</p>
          </div>
        </div>

        {/* QR Code Container */}
        <div className="bg-white p-3 rounded-xl mx-auto my-3 shadow-inner border border-slate-200">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR Code" className="w-48 h-48 sm:w-56 sm:h-56" />
          ) : (
            <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center text-slate-400">
              Generowanie kodu QR...
            </div>
          )}
        </div>

        {/* URL Display */}
        <div className="flex items-center gap-2 p-2 bg-slate-950/70 border border-slate-800 rounded-lg mb-4">
          <span className="text-xs text-slate-300 font-mono truncate flex-1">{fullUrl}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
            title="Kopiuj link"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Airplane Mode Instructions */}
        <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3 text-xs text-slate-300 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-amber-400 mb-1">
            <Wifi className="w-4 h-4" />
            <span>Instrukcja krok po kroku:</span>
          </div>
          <p>1. <strong>Gospodarz:</strong> Włącz Hotspot osobisty w telefonie (dane komórkowe wyłączone).</p>
          <p>2. <strong>Współgracze:</strong> Połączcie się z siecią Wi-Fi telefonu gospodarza.</p>
          <p>3. <strong>Skanowanie:</strong> Skierujcie aparat iPhone/Android na ten kod QR.</p>
          <p>4. <strong>Gotowe:</strong> Gra uruchomi się w Safari/Chrome bez pobierania aplikacji!</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition shadow"
        >
          Wróć do gry
        </button>
      </div>
    </div>
  );
};
