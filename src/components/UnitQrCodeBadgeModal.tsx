/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { X, QrCode, Download, Printer, ShieldCheck, Thermometer } from 'lucide-react';
import { BloodInventoryUnit } from '../types/blood';

interface UnitQrCodeBadgeModalProps {
  unit: BloodInventoryUnit | null;
  hospitalName?: string;
  onClose: () => void;
}

export const UnitQrCodeBadgeModal: React.FC<UnitQrCodeBadgeModalProps> = ({
  unit,
  hospitalName,
  onClose,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (!unit) return;

    const payload = JSON.stringify({
      type: 'hemasync_blood_bag',
      bagBarcode: unit.bagBarcode,
      unitId: unit.unitId,
      bloodGroup: unit.bloodGroup,
      component: unit.component,
      volumeMl: unit.volumeMl,
      collectionDate: unit.collectionDate,
      expirationDate: unit.expirationDate,
      facilityId: unit.facilityId,
      storageLocation: unit.storageLocation,
      status: unit.status,
      testedClear: unit.testedClear,
    });

    QRCode.toDataURL(payload, {
      width: 280,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    }).then(setQrDataUrl);
  }, [unit]);

  if (!unit) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR-${unit.bagBarcode}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-rose-400" />
            <span className="font-bold text-sm">ISBT-128 Unit Bag Label</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Label Body */}
        <div className="p-6 text-center space-y-4">
          <div className="inline-block p-2 bg-slate-50 border-2 border-slate-200 rounded-2xl shadow-inner">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR code for ${unit.bagBarcode}`}
                className="w-48 h-48 mx-auto"
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-slate-400 font-mono text-xs">
                Generating QR...
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center gap-2">
              <span className="font-mono font-black text-lg text-slate-950">
                {unit.bagBarcode}
              </span>
              <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-black text-xs">
                {unit.bloodGroup}
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              {unit.component} · {unit.volumeMl} mL
            </p>
            <p className="text-[11px] text-slate-400 font-mono">
              Vault: {unit.storageLocation} {hospitalName ? `· ${hospitalName}` : ''}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400">Collected</span>
              <span>{new Date(unit.collectionDate).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400">Expires</span>
              <span className="font-bold text-slate-800">{new Date(unit.expirationDate).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleDownload}
              className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PNG</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Label</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
