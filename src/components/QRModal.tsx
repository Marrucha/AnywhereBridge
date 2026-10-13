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
  // Determine default host:
  // In airplane mode, Android hotspot is always 192.168.43.1:8080
  const initialHost = detectedIps.length > 0 ? `${detectedIps[0]}:8080` : '192.168.43.1:8080';
  const [selectedHost, setSelectedHost] = useState<string>(initialHost);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (detectedIps.length > 0 && selectedHost === '192.168.43.1:8080' && !detectedIps.includes('192.168.43.1')) {
      setSelectedHost(`${detectedIps[0]}:8080`);
    }
  }, [detectedIps]);

  const fullUrl = `http://${selectedHost}?room=${roomId}`;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border-2 border-emerald-500/60 rounded-2xl w-full max-w-md p-5 flex flex-col shadow-2xl relative max-h-[95vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-2">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">Dołącz do gry (Pokój {roomId})</h2>
            <p className="text-xs text-slate-400">Pokaż ten kod QR współgraczom</p>
          </div>
        </div>

        {/* QR Code Container */}
        <div className="bg-white p-3 rounded-2xl mx-auto my-2 shadow-2xl border-2 border-slate-300">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR Code" className="w-52 h-52 sm:w-60 sm:h-60" />
          ) : (
            <div className="w-52 h-52 sm:w-60 sm:h-60 flex items-center justify-center text-slate-400">
              Generowanie kodu QR...
            </div>
          )}
        </div>

        {/* IP Presets Selector */}
        <div className="space-y-1.5 my-2">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
            Wybierz adres Hotspotu dla graczy:
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedHost('192.168.43.1:8080')}
              className={`px-2.5 py-1 text-xs rounded-lg font-bold border transition flex items-center gap-1 ${
                selectedHost === '192.168.43.1:8080'
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-1 ring-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
              }`}
            >
              <Plane className="w-3 h-3" />
              <span>Samolot (192.168.43.1)</span>
            </button>

            {detectedIps.filter(ip => ip !== '192.168.43.1').map(ip => (
              <button
                key={ip}
                type="button"
                onClick={() => setSelectedHost(`${ip}:8080`)}
                className={`px-2.5 py-1 text-xs rounded-lg font-bold border transition flex items-center gap-1 ${
                  selectedHost === `${ip}:8080`
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-1 ring-emerald-400'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
                }`}
              >
                <Globe className="w-3 h-3" />
                <span>Wi-Fi ({ip})</span>
              </button>
            ))}
          </div>
        </div>

        {/* URL Display */}
        <div className="flex items-center gap-2 p-2 bg-slate-950/80 border border-slate-800 rounded-lg mb-3">
          <span className="text-xs text-emerald-400 font-mono truncate flex-1 font-bold">{fullUrl}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
            title="Kopiuj link"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3 text-xs text-slate-300 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-amber-400 mb-0.5">
            <Wifi className="w-4 h-4" />
            <span>Instrukcja dla 3 współgraczy:</span>
          </div>
          <p>1. Włącz Hotspot w telefonie (dane komórkowe wyłączone).</p>
          <p>2. Znajomi łączą się z Wi-Fi Twojego telefonu.</p>
          <p>3. Skanują ten kod QR aparatem iPhone/Android.</p>
          <p>4. Gra ładuje się w przeglądarce bez instalacji aplikacji!</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition shadow"
        >
          Gotowe, wróć do stołu
        </button>
      </div>
    </div>
  );
};
