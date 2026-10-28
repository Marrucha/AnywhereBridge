import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Seat } from '../types/bridge';
import { MessageSquare, Send, X } from 'lucide-react';

interface TableChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  mySeat: Seat | null;
  myName: string;
}

const QUICK_PHRASES = [
  '👍 Dobra gra!',
  '👏 Brawo partnerze!',
  '🙏 Przepraszam',
  '🍀 Powodzenia!',
  '🤝 Dzięki za partię!',
  '☕ Chwila przerwy',
];

const SEAT_COLORS: Record<string, string> = {
  N: 'bg-emerald-950 text-emerald-300 border-emerald-500/50',
  S: 'bg-emerald-950 text-emerald-300 border-emerald-500/50',
  E: 'bg-amber-950 text-amber-300 border-amber-500/50',
  W: 'bg-amber-950 text-amber-300 border-amber-500/50',
};

export const TableChatModal: React.FC<TableChatModalProps> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  mySeat,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg h-[540px] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">Czat Stołu Brydżowego</h2>
              <p className="text-[11px] text-slate-400">Wiadomości widoczne dla wszystkich przy stole</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-950/40">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-4">
              <MessageSquare className="w-8 h-8 mb-2 opacity-40 text-emerald-400" />
              <p className="text-xs">Brak wiadomości przy stole.</p>
              <p className="text-[11px] text-slate-600 mt-0.5">Napisz coś do pozostałych graczy poniżej.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderSeat === mySeat;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5 text-[10px] text-slate-400">
                    {msg.senderSeat && (
                      <span className={`px-1 rounded border text-[9px] font-black ${SEAT_COLORS[msg.senderSeat] || 'bg-slate-800 text-slate-300'}`}>
                        {msg.senderSeat}
                      </span>
                    )}
                    <span className="font-semibold text-slate-300">{msg.senderName}</span>
                    <span className="text-[9px] text-slate-500">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div
                    className={`max-w-[85%] px-3 py-1.5 rounded-2xl text-xs sm:text-sm font-medium shadow break-words ${
                      isMe
                        ? 'bg-emerald-600 text-white rounded-tr-sm'
                        : 'bg-slate-800 text-slate-100 border border-slate-700/80 rounded-tl-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick phrases chips */}
        <div className="px-3 py-1.5 bg-slate-900 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {QUICK_PHRASES.map((phrase) => (
            <button
              key={phrase}
              type="button"
              onClick={() => onSendMessage(phrase)}
              className="shrink-0 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition active:scale-95 border border-slate-700/60"
            >
              {phrase}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-2.5 sm:p-3 border-t border-slate-800 bg-slate-950/80 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Napisz do wszystkich przy stole..."
            maxLength={160}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="p-2 sm:px-3 sm:py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white rounded-xl transition shadow flex items-center justify-center gap-1 font-bold text-xs"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Wyślij</span>
          </button>
        </div>
      </div>
    </div>
  );
};
