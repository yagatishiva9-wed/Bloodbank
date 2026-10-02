/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  HelpCircle,
  Info,
  Shield,
  ShieldAlert,
  Sparkles,
  XCircle,
  Zap,
} from 'lucide-react';
import { BloodComponent, BloodGroup } from '../types/blood';
import {
  ALL_BLOOD_GROUPS,
  PLASMA_COMPATIBILITY_MAP,
  PLATELET_COMPATIBILITY_MAP,
  RBC_COMPATIBILITY_MAP,
} from '../services/compatibility';

export const CompatibilityMatrixView: React.FC = () => {
  const [selectedRecipient, setSelectedRecipient] = useState<BloodGroup>('O-');
  const [selectedDonor, setSelectedDonor] = useState<BloodGroup>('O-');
  const [testComponent, setTestComponent] = useState<BloodComponent>('Packed Red Blood Cells (PRBC)');

  // Clinical check for test pair
  const isCompatible = React.useMemo(() => {
    if (testComponent === 'Fresh Frozen Plasma (FFP)') {
      return (PLASMA_COMPATIBILITY_MAP[selectedRecipient] || []).includes(selectedDonor);
    }
    if (testComponent === 'Platelets (SDP/RDP)') {
      return (PLATELET_COMPATIBILITY_MAP[selectedRecipient] || []).includes(selectedDonor);
    }
    return (RBC_COMPATIBILITY_MAP[selectedRecipient] || []).includes(selectedDonor);
  }, [selectedRecipient, selectedDonor, testComponent]);

  const rbcCompatibleDonors = RBC_COMPATIBILITY_MAP[selectedRecipient] || [];
  const plasmaCompatibleDonors = PLASMA_COMPATIBILITY_MAP[selectedRecipient] || [];

  return (
    <div className="space-y-6">
      {/* Top Educational Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <GitBranch className="w-4 h-4" />
            <span>Clinical Immunohaematology & Compatibility Architecture</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            ABO/Rh Antigen & Component Transfusion Matrix
          </h2>
          <p className="mt-1 text-xs text-slate-300 leading-relaxed">
            Transfusion rules differ critically between <strong className="text-white">Red Blood Cells (PRBC)</strong> and <strong className="text-white">Plasma (FFP)</strong>. While <strong className="text-rose-400">O-Negative</strong> is the universal Red Blood Cell donor (no A/B/Rh antigens to trigger host antibody destruction), <strong className="text-rose-400">AB-Positive</strong> is the universal Plasma donor (plasma contains zero anti-A or anti-B antibodies).
          </p>
        </div>
      </div>

      {/* Interactive Transfusion Safety Calculator */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900">
            Interactive Transfusion Compatibility Calculator
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Test any recipient-donor combination across specific blood components to simulate immunological compatibility.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* Recipient Selector */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              1. Patient (Recipient) Blood Group
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {ALL_BLOOD_GROUPS.map((bg) => (
                <button
                  key={bg}
                  type="button"
                  onClick={() => setSelectedRecipient(bg)}
                  className={`py-1.5 text-xs font-bold rounded border transition-colors cursor-pointer ${
                    selectedRecipient === bg
                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {bg}
                </button>
              ))}
            </div>
          </div>

          {/* Component Selector */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              2. Blood Component Being Transfused
            </label>
            <select
              value={testComponent}
              onChange={(e) => setTestComponent(e.target.value as BloodComponent)}
              className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg p-2.5 focus:outline-none"
            >
              <option value="Packed Red Blood Cells (PRBC)">Packed Red Blood Cells (PRBC)</option>
              <option value="Fresh Frozen Plasma (FFP)">Fresh Frozen Plasma (FFP)</option>
              <option value="Platelets (SDP/RDP)">Platelets (SDP/RDP)</option>
              <option value="Cryoprecipitate">Cryoprecipitate</option>
              <option value="Whole Blood">Whole Blood</option>
            </select>
            <div className="mt-2 text-[11px] text-slate-500 font-mono">
              Antibody target:{' '}
              {testComponent.includes('Plasma') ? 'Recipient RBC Antigens' : 'Donor Cell Antigens'}
            </div>
          </div>

          {/* Donor Selector */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              3. Proposed Donor Blood Group
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {ALL_BLOOD_GROUPS.map((bg) => (
                <button
                  key={bg}
                  type="button"
                  onClick={() => setSelectedDonor(bg)}
                  className={`py-1.5 text-xs font-bold rounded border transition-colors cursor-pointer ${
                    selectedDonor === bg
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {bg}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Compatibility Verdict Banner */}
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all ${
            isCompatible
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-3">
            {isCompatible ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="w-8 h-8 text-rose-600 shrink-0" />
            )}
            <div>
              <div className="text-sm font-bold">
                {isCompatible
                  ? `SAFE & COMPATIBLE: Donor ${selectedDonor} can safely transfuse ${testComponent} to Patient ${selectedRecipient}`
                  : `CLINICALLY INCOMPATIBLE: Acute Hemolytic Transfusion Reaction (AHTR) Danger!`}
              </div>
              <div className="text-xs opacity-90 mt-0.5">
                {isCompatible
                  ? selectedRecipient === selectedDonor
                    ? 'Identical ABO/Rh group. Standard pre-transfusion screen routine.'
                    : `Alternative safe crossmatch approved. Compatible under clinical emergency guidelines.`
                  : `Patient antibodies will attack donor cells causing intravascular hemolysis, acute renal failure, and DIC.`}
              </div>
            </div>
          </div>

          <span
            className={`text-xs font-mono font-bold px-3 py-1.5 rounded uppercase tracking-wider shrink-0 ${
              isCompatible ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
            }`}
          >
            {isCompatible ? 'Approved' : 'Prohibited'}
          </span>
        </div>
      </div>

      {/* Full Crossmatch Grid Reference Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Comprehensive ABO / Rh Compatibility Matrix (Red Cells vs Plasma)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Reference guide for hospital blood bank logistics officers and trauma surgeons.
          </p>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase">
              <tr>
                <th className="py-2.5 px-3">Patient Group</th>
                <th className="py-2.5 px-3">RBC Antigens</th>
                <th className="py-2.5 px-3">Plasma Antibodies</th>
                <th className="py-2.5 px-3 text-emerald-800 font-bold">Safe RBC Donors (PRBC)</th>
                <th className="py-2.5 px-3 text-blue-800 font-bold">Safe Plasma Donors (FFP)</th>
                <th className="py-2.5 px-3">Clinical Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {ALL_BLOOD_GROUPS.map((bg) => {
                const rbcDonors = RBC_COMPATIBILITY_MAP[bg];
                const plasmaDonors = PLASMA_COMPATIBILITY_MAP[bg];
                const isSelected = bg === selectedRecipient;

                return (
                  <tr
                    key={bg}
                    className={`transition-colors cursor-pointer ${
                      isSelected ? 'bg-rose-50/70 font-semibold' : 'hover:bg-slate-50'
                    }`}
                    onClick={() => setSelectedRecipient(bg)}
                  >
                    <td className="py-2.5 px-3 font-mono font-extrabold text-slate-900 text-sm">
                      {bg}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono">
                      {bg.startsWith('AB')
                        ? 'A and B'
                        : bg.startsWith('A')
                        ? 'A'
                        : bg.startsWith('B')
                        ? 'B'
                        : 'None (O)'}
                      {bg.endsWith('+') ? ', Rh(D)+' : ''}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono">
                      {bg.startsWith('AB')
                        ? 'None'
                        : bg.startsWith('A')
                        ? 'Anti-B'
                        : bg.startsWith('B')
                        ? 'Anti-A'
                        : 'Anti-A and Anti-B'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-emerald-700 font-bold">
                      {rbcDonors.join(', ')}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-blue-700 font-bold">
                      {plasmaDonors.join(', ')}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {bg === 'O-' && 'Universal RBC donor. High emergency trauma consumption.'}
                      {bg === 'AB+' && 'Universal RBC recipient. Can accept red cells from any donor.'}
                      {bg === 'AB-' && 'Universal plasma donor. Plasma safe for all recipients.'}
                      {bg === 'O+' && 'Most prevalent in general population (~38%).'}
                      {!['O-', 'AB+', 'AB-', 'O+'].includes(bg) && 'Requires standard antibody screening.'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
