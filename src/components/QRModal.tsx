import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Wifi, X, Plane, Copy, Check, QrCode, Globe } from 'lucide-react';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  detectedIps: string[];
  roomId: string;
}

export const QRModal: React.FC<QRModalProps> = ({
  isOpen,
  onClose,
  detectedIps,
  roomId,
}) => {
  // Mode: 'hotspot' (Offline z telefonu) or 'online' (Firebase)
  const isWebHosted = window.location.hostname.includes('web.app') || window.location.hostname.includes('firebaseapp');
  const [mode, setMode] = useState<'hotspot' | 'online'>(isWebHosted ? 'online' : 'hotspot');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Single phone IP: either detected from device or default hotspot IP 192.168.43.1
  const phoneIp = detectedIps.length > 0 ? detectedIps[0] : '192.168.43.1';
  const hotspotUrl = `http://${phoneIp}:8080?room=${roomId}`;
  const onlineUrl = `https://anywherebridge.web.app?room=${roomId}`;

  const currentUrl = mode === 'hotspot' ? hotspotUrl : onlineUrl;

  useEffect(() => {
    if (isOpen && currentUrl) {
      QRCode.toDataURL(currentUrl, {
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
  }, [isOpen, currentUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border-2 border-emerald-500/60 rounded-2xl w-full max-w-md p-5 flex flex-col shadow-2xl relative max-h-[95vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">Dołącz do gry (Pokój {roomId})</h2>
            <p className="text-xs text-slate-400">Pokaż ten kod QR współgraczom</p>
          </div>
        </div>

        {/* 2 Clean Modes: Hotspot vs Online */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/80 border border-slate-800 rounded-xl mb-3">
          <button
            type="button"
            onClick={() => setMode('hotspot')}
            className={`py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              mode === 'hotspot'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plane className="w-4 h-4" />
            <span>Hotspot z telefonu</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('online')}
            className={`py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              mode === 'online'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Wersja online</span>
          </button>
        </div>

        {/* QR Code Container */}
        <div className="bg-white p-3 rounded-2xl mx-auto my-1 shadow-2xl border-2 border-slate-300">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR Code" className="w-52 h-52 sm:w-60 sm:h-60" />
          ) : (
            <div className="w-52 h-52 sm:w-60 sm:h-60 flex items-center justify-center text-slate-400">
              Generowanie kodu QR...
            </div>
          )}
        </div>

        {/* URL Display */}
        <div className="flex items-center gap-2 p-2 bg-slate-950/80 border border-slate-800 rounded-lg my-3">
          <span className="text-xs text-emerald-400 font-mono truncate flex-1 font-bold">{currentUrl}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
            title="Kopiuj link"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Instructions based on mode */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3 text-xs text-slate-300 space-y-1.5">
          {mode === 'hotspot' ? (
            <>
              <div className="flex items-center gap-1.5 font-bold text-emerald-400 mb-0.5">
                <Wifi className="w-4 h-4" />
                <span>Gra offline na pokładzie samolotu:</span>
              </div>
              <p>1. Włącz <strong>Hotspot osobisty</strong> w telefonie (dane komórkowe wyłączone).</p>
              <p>2. Znajomi łączą się z siecią Wi-Fi Twojego telefonu.</p>
              <p>3. Skanują ten kod QR aparatem iPhone/Android.</p>
              <p>4. Gra ładuje się w ich przeglądarce bez instalowania czegokolwiek!</p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 font-bold text-amber-400 mb-0.5">
                <Globe className="w-4 h-4" />
                <span>Gra przez Internet (Firebase):</span>
              </div>
              <p>1. Wszyscy gracze muszą mieć połączenie z Internetem.</p>
              <p>2. Znajomi skanują ten kod QR lub otwierają link w przeglądarce.</p>
              <p>3. Dołączają do tego samego pokoju <strong>{roomId}</strong>.</p>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-3.5 w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-white font-bold text-sm rounded-xl transition shadow"
        >
          Zamknij
        </button>
      </div>
    </div>
  );
};
