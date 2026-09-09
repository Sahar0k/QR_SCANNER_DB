import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Printer, X, Download } from 'lucide-react';
import { Device } from '../types.js';

interface QrPrintModalProps {
  device: Device | null;
  isOpen: boolean;
  onClose: () => void;
}

export const QrPrintModal: React.FC<QrPrintModalProps> = ({ device, isOpen, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [labelSize, setLabelSize] = useState<'standard' | 'compact'>('standard');

  useEffect(() => {
    if (device && isOpen) {
      // Generate QR for barcode
      QRCode.toDataURL(device.barcode, {
        width: 300,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('QR generation error:', err));
    }
  }, [device, isOpen]);

  if (!isOpen || !device) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div
        id="qr-print-modal-container"
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-semibold text-white">Печать маркировочной этикетки СИ</h3>
          </div>
          <button
            id="close-qr-modal-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/60">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">Формат этикетки</span>
            <div className="flex gap-2">
              <button
                id="label-size-std"
                type="button"
                onClick={() => setLabelSize('standard')}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  labelSize === 'standard'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-medium'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                58 × 40 мм (Термотрансфер)
              </button>
              <button
                id="label-size-compact"
                type="button"
                onClick={() => setLabelSize('compact')}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  labelSize === 'compact'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-medium'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                40 × 30 мм (Компактная)
              </button>
            </div>
          </div>

          {/* Printable preview card (High contrast white card for scanner calibration) */}
          <div className="flex justify-center">
            <div
              id="printable-label"
              className={`bg-white text-black p-4 rounded-xl border-2 border-dashed border-slate-500 shadow-md ${
                labelSize === 'standard' ? 'w-[320px] min-h-[190px]' : 'w-[260px] min-h-[160px]'
              } flex flex-col justify-between`}
            >
              <div className="border-b border-black/20 pb-2 mb-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Служба главного метролога</div>
                <div className="text-sm font-black leading-tight text-slate-900 truncate">{device.name}</div>
                <div className="text-xs font-semibold text-slate-700">{device.model}</div>
              </div>

              <div className="flex items-center gap-3 my-1">
                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt={device.barcode}
                    className="w-20 h-20 shrink-0 border border-black/10 rounded-sm"
                  />
                )}
                <div className="space-y-1 text-[11px] leading-snug">
                  <div>
                    <span className="text-slate-500">Зав. №: </span>
                    <span className="font-mono font-bold text-slate-900">{device.serialNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Инв. №: </span>
                    <span className="font-mono font-bold text-slate-900">{device.inventoryNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Поверка до: </span>
                    <span className="font-mono font-bold text-slate-900">{device.nextVerificationDate}</span>
                  </div>
                  <div className="pt-0.5">
                    <span className="font-mono text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">
                      {device.barcode}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-[9px] text-slate-500 text-center border-t border-black/10 pt-1">
                Сканировать сканером штрихкодов
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-800/60 border-t border-slate-800 flex justify-between items-center">
          <a
            id="download-qr-btn"
            href={qrDataUrl}
            download={`QR_${device.barcode.replace(':', '_')}.png`}
            className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-700/60 hover:bg-slate-700 px-3 py-2 rounded-xl transition-colors border border-slate-600/40"
          >
            <Download className="w-4 h-4" />
            Скачать PNG
          </a>
          <div className="flex gap-3">
            <button
              id="cancel-qr-modal-btn"
              type="button"
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-white px-4 py-2 rounded-xl hover:bg-slate-800 transition-colors"
            >
              Закрыть
            </button>
            <button
              id="print-label-action-btn"
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-xs px-4 py-2 rounded-xl shadow-lg shadow-cyan-500/20 transition-all"
            >
              <Printer className="w-4 h-4" />
              Отправить на печать
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
