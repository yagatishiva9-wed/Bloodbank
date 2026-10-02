/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Database, Plus, ShieldCheck, X } from 'lucide-react';
import {
  BloodComponent,
  BloodGroup,
  BloodInventoryUnit,
  HospitalBloodSource,
} from '../types/blood';
import { ALL_BLOOD_GROUPS, ALL_COMPONENTS } from '../services/aggregation';

interface AddUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospitals: HospitalBloodSource[];
  onAddUnit: (facilityId: string, unit: BloodInventoryUnit) => void;
}

export const AddUnitModal: React.FC<AddUnitModalProps> = ({
  isOpen,
  onClose,
  hospitals,
  onAddUnit,
}) => {
  const [targetFacilityId, setTargetFacilityId] = useState(hospitals[0]?.id || '');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O-');
  const [component, setComponent] = useState<BloodComponent>('Packed Red Blood Cells (PRBC)');
  const [volumeMl, setVolumeMl] = useState(450);
  const [shelfLifeDays, setShelfLifeDays] = useState(42);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date('2026-09-30T02:00:00Z');
    const expDate = new Date(now.getTime() + shelfLifeDays * 86400000).toISOString();
    const randId = Math.floor(1000 + Math.random() * 9000);

    const newUnit: BloodInventoryUnit = {
      unitId: `UNIT-2026-${randId}`,
      bagBarcode: `ISBT128-${bloodGroup.replace('-', 'N').replace('+', 'P')}-${randId}`,
      bloodGroup,
      component,
      volumeMl,
      collectionDate: now.toISOString(),
      expirationDate: expDate,
      facilityId: targetFacilityId,
      storageLocation:
        component.includes('Plasma') || component.includes('Cryo')
          ? 'Deep-Freeze Cryo B-04 (-22°C)'
          : component.includes('Platelets')
          ? 'Platelet Agitator Rack 2 (22°C)'
          : 'Cold Storage Vault Bay A (3.6°C)',
      status: 'available',
      testedClear: true,
      temperatureAlert: false,
    };

    onAddUnit(targetFacilityId, newUnit);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Check In Certified Blood Unit</h3>
              <p className="text-xs text-slate-500">ISBT-128 barcode registration into cold chain vault</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Target Facility Depot</label>
            <select
              value={targetFacilityId}
              onChange={(e) => setTargetFacilityId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 font-medium text-slate-800"
            >
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.zone})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Blood Group (ABO/Rh)</label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono font-bold text-slate-800"
              >
                {ALL_BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Volume (mL)</label>
              <input
                type="number"
                value={volumeMl}
                onChange={(e) => setVolumeMl(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Blood Component</label>
            <select
              value={component}
              onChange={(e) => {
                const val = e.target.value as BloodComponent;
                setComponent(val);
                if (val.includes('Platelets')) setShelfLifeDays(5);
                else if (val.includes('Plasma')) setShelfLifeDays(365);
                else setShelfLifeDays(42);
              }}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 font-medium text-slate-800"
            >
              {ALL_COMPONENTS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Shelf Life Expiration Horizon (Days)
            </label>
            <input
              type="number"
              value={shelfLifeDays}
              onChange={(e) => setShelfLifeDays(Number(e.target.value))}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono text-slate-800"
            />
            <div className="text-[11px] text-slate-400 mt-1">
              Platelets: max 5 days | PRBC: max 42 days | Plasma: 365 days
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm"
            >
              Check In & Sign to Ledger
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
