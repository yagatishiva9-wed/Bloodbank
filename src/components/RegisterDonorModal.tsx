/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Heart, Plus, ShieldCheck, UserCheck, X } from 'lucide-react';
import { BloodGroup, DonorBloodSource } from '../types/blood';
import { ALL_BLOOD_GROUPS } from '../services/aggregation';

interface RegisterDonorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (donor: DonorBloodSource) => void;
}

export const RegisterDonorModal: React.FC<RegisterDonorModalProps> = ({
  isOpen,
  onClose,
  onRegister,
}) => {
  const [name, setName] = useState('');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O-');
  const [phone, setPhone] = useState('+1 (555) ');
  const [email, setEmail] = useState('');
  const [zone, setZone] = useState('Downtown Central');
  const [age, setAge] = useState(30);
  const [weightKg, setWeightKg] = useState(72);
  const [hemoglobinGdl, setHemoglobinGdl] = useState(14.5);
  const [donorType, setDonorType] = useState<DonorBloodSource['donorType']>('Universal Donor Registry');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const randId = Math.floor(100 + Math.random() * 900);
    const rhFactor = bloodGroup.endsWith('+') ? '+' : '-';

    const newDonor: DonorBloodSource = {
      category: 'donor',
      id: `DONOR-NEW-${randId}`,
      name: name.trim(),
      bloodGroup,
      rhFactor,
      gender: 'Other',
      age,
      weightKg,
      hemoglobinGdl,
      zone,
      city: 'Metro City',
      address: `${100 + randId} Civic Center Ave`,
      coordinates: { lat: 37.77, lng: -122.42 },
      distanceKm: Number((1.5 + Math.random() * 4).toFixed(1)),
      phone,
      email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      donorType,
      status: 'available_immediate',
      availabilityStatus: 'Available',
      lastDonationDate: '2026-06-01',
      daysSinceLastDonation: 120,
      isEligible: hemoglobinGdl >= 12.5 && weightKg >= 50,
      totalDonationCount: 4,
      lifetimeDonations: 4,
      reliabilityRatePct: 96,
      mobilizationLeadTimeMinutes: 30,
    };

    onRegister(newDonor);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center">
              <Heart className="w-4 h-4 fill-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Register Certified Volunteer Donor</h3>
              <p className="text-xs text-slate-500">Adds an individual blood source with health screening metrics</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Donor Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Dr. Emily Watson"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 font-medium text-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Blood Group (ABO/Rh)</label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono font-bold text-rose-600"
              >
                {ALL_BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Registry Category</label>
              <select
                value={donorType}
                onChange={(e) => setDonorType(e.target.value as DonorBloodSource['donorType'])}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 font-medium text-slate-800"
              >
                <option value="Universal Donor Registry">Universal Donor Registry</option>
                <option value="On-Call First Responder">On-Call First Responder</option>
                <option value="Rare Antigen Panel">Rare Antigen Panel</option>
                <option value="Regular Volunteer">Regular Volunteer</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Age</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono text-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Weight (kg)</label>
              <input
                type="number"
                value={weightKg}
                onChange={(e) => setWeightKg(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono text-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Hemoglobin (g/dL)</label>
              <input
                type="number"
                step="0.1"
                value={hemoglobinGdl}
                onChange={(e) => setHemoglobinGdl(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Location Zone</label>
              <select
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 font-medium text-slate-800"
              >
                <option value="Downtown Central">Downtown Central</option>
                <option value="West Medical Corridor">West Medical Corridor</option>
                <option value="North Metro">North Metro</option>
                <option value="East Valley">East Valley</option>
                <option value="South Coastal">South Coastal</option>
              </select>
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
              className="px-4 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
            >
              Register & Verify Eligibility
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
