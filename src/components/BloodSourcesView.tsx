/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Activity,
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Edit3,
  ExternalLink,
  Heart,
  Mail,
  MapPin,
  Phone,
  Plane,
  Plus,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Thermometer,
  UserCheck,
  UserX,
  X,
  Zap,
} from 'lucide-react';
import {
  BloodGroup,
  BloodSource,
  DonorAvailabilityStatus,
  DonorBloodSource,
  HospitalBloodSource,
  isDonorSource,
  isHospitalSource,
} from '../types/blood';

interface BloodSourcesViewProps {
  hospitals: HospitalBloodSource[];
  donors: DonorBloodSource[];
  onOpenRegisterDonor: () => void;
  onOpenAddUnit: () => void;
  onMobilizeDonor: (donor: DonorBloodSource) => void;
  onUpdateDonorAvailability: (
    donorId: string,
    status: DonorAvailabilityStatus,
    notes?: string,
    outOfTownUntil?: string
  ) => void;
}

export const BloodSourcesView: React.FC<BloodSourcesViewProps> = ({
  hospitals,
  donors,
  onOpenRegisterDonor,
  onOpenAddUnit,
  onMobilizeDonor,
  onUpdateDonorAvailability,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'hospital' | 'donor'>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHospitalForModal, setSelectedHospitalForModal] = useState<HospitalBloodSource | null>(null);

  // Donor editing status modal
  const [editingDonor, setEditingDonor] = useState<DonorBloodSource | null>(null);
  const [editStatus, setEditStatus] = useState<DonorAvailabilityStatus>('Available');
  const [editNotes, setEditNotes] = useState('');
  const [editOutOfTownUntil, setEditOutOfTownUntil] = useState('');

  // Union sources
  const allSources: BloodSource[] = [...hospitals, ...donors];

  const filteredSources = allSources.filter((source) => {
    if (categoryFilter !== 'all' && source.category !== categoryFilter) return false;

    if (isDonorSource(source)) {
      if (availabilityFilter !== 'ALL' && source.availabilityStatus !== availabilityFilter) {
        return false;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = source.name.toLowerCase().includes(q);
      const matchZone = source.zone.toLowerCase().includes(q);
      const matchBloodGroup = isDonorSource(source) && source.bloodGroup.toLowerCase().includes(q);
      const matchStatus = isDonorSource(source) && source.availabilityStatus.toLowerCase().includes(q);
      return matchName || matchZone || matchBloodGroup || matchStatus;
    }
    return true;
  });

  const handleOpenEditDonor = (donor: DonorBloodSource) => {
    setEditingDonor(donor);
    setEditStatus(donor.availabilityStatus);
    setEditNotes(donor.availabilityNotes || '');
    setEditOutOfTownUntil(donor.outOfTownUntil || '2026-10-05');
  };

  const handleSaveDonorStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDonor) return;

    onUpdateDonorAvailability(
      editingDonor.id,
      editStatus,
      editNotes,
      editStatus === 'Out of Town' ? editOutOfTownUntil : undefined
    );
    setEditingDonor(null);
  };

  return (
    <div className="space-y-6">
      {/* Educational Header explaining Union Type Modeling */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Zap className="w-4 h-4" />
            <span>Category (Union Type) Modeling & Real-Time Donor Availability</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Unified Blood Sources with Real-Time Donor Readiness
          </h2>
          <p className="mt-1 text-xs text-slate-300 leading-relaxed">
            Hospitals and volunteer donors are unified under <code className="font-mono text-rose-300">BloodSource</code>. Donors maintain a real-time availability status (<span className="text-emerald-400 font-semibold">Available</span>, <span className="text-amber-400 font-semibold">Unavailable</span>, or <span className="text-purple-400 font-semibold">Out of Town</span>). Hospital emergency dispatchers instantly see which volunteers can answer immediate STAT summons versus scheduled procedures.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col lg:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              categoryFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            All Sources ({allSources.length})
          </button>

          <button
            onClick={() => setCategoryFilter('hospital')}
            className={`px-3 py-1.5 font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              categoryFilter === 'hospital'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Hospitals & Central Banks ({hospitals.length})
          </button>

          <button
            onClick={() => setCategoryFilter('donor')}
            className={`px-3 py-1.5 font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              categoryFilter === 'donor'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Registered Donors ({donors.length})
          </button>

          {/* Availability filter for donors */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
            <span className="text-slate-500 font-medium">Availability:</span>
            <select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-semibold focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="Available">Available Only (Immediate)</option>
              <option value="Out of Town">Out of Town</option>
              <option value="Unavailable">Unavailable</option>
              <option value="Resting">Resting (Deferral)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, zone, or blood group..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <button
            onClick={onOpenRegisterDonor}
            className="px-3 py-1.5 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 flex items-center gap-1 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register Donor</span>
          </button>

          <button
            onClick={onOpenAddUnit}
            className="px-3 py-1.5 font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Bank Unit</span>
          </button>
        </div>
      </div>

      {/* Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSources.map((source) => {
          if (isHospitalSource(source)) {
            // Render Hospital Source Card
            const totalUnits = source.inventoryUnits.length;
            const availableUnits = source.inventoryUnits.filter(
              (u) => u.status === 'available' && u.testedClear && !u.temperatureAlert
            ).length;

            return (
              <div
                key={source.id}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Category Header Tag */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-slate-900 text-white">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                          Hospital Blood Bank
                        </span>
                        <h3 className="text-base font-bold text-slate-900 leading-snug">
                          {source.name}
                        </h3>
                      </div>
                    </div>

                    <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {source.facilityType}
                    </span>
                  </div>

                  {/* Location & Contact Info */}
                  <div className="mt-3 flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{source.zone}</span>
                      <span className="font-mono text-slate-400">({source.distanceKm} km)</span>
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Pneumatic dispatch: {source.leadTimeMinutes}m</span>
                    </span>
                  </div>

                  {/* Cold Chain & Inventory Metrics */}
                  <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div className="text-slate-500">Ready Stock</div>
                      <div className="text-lg font-bold font-mono text-slate-900 mt-0.5 tabular-nums">
                        {availableUnits}{' '}
                        <span className="text-[11px] font-normal text-slate-400">/ {totalUnits}</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div className="text-slate-500">Cold Chain</div>
                      <div
                        className={`text-lg font-bold font-mono mt-0.5 tabular-nums ${
                          source.coldChainStatus === 'optimal'
                            ? 'text-emerald-600'
                            : 'text-amber-600'
                        }`}
                      >
                        {source.coldChainTempC.toFixed(1)}°C
                      </div>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div className="text-slate-500">Reserved</div>
                      <div className="text-lg font-bold font-mono text-slate-700 mt-0.5 tabular-nums">
                        {source.reservedUnits}u
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-rose-600" />
                    <span className="font-mono font-medium">{source.emergencyDirectLine}</span>
                  </div>

                  <button
                    onClick={() => setSelectedHospitalForModal(source)}
                    className="text-xs font-semibold text-slate-700 hover:text-slate-900 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Cold Storage ({source.inventoryUnits.length})</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          }

          if (isDonorSource(source)) {
            // Render Donor Source Card with Real-Time Availability
            const isAvail = source.availabilityStatus === 'Available';
            const isOut = source.availabilityStatus === 'Out of Town';
            const isUnavail = source.availabilityStatus === 'Unavailable';
            const isResting = source.availabilityStatus === 'Resting';

            return (
              <div
                key={source.id}
                className={`bg-white rounded-xl border p-5 hover:border-slate-300 transition-all flex flex-col justify-between ${
                  isAvail ? 'border-emerald-200' : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Category Header Tag & Real-Time Availability Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-rose-50 text-rose-600">
                        <Heart className="w-4 h-4 fill-rose-600" />
                      </div>
                      <div>
                        <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                          Certified Volunteer Donor
                        </span>
                        <h3 className="text-base font-bold text-slate-900 leading-snug">
                          {source.name}
                        </h3>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="text-lg font-black font-mono text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded">
                        {source.bloodGroup}
                      </span>

                      {/* Real-time status badge */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditDonor(source)}
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity ${
                          isAvail
                            ? 'bg-emerald-100 text-emerald-800'
                            : isOut
                            ? 'bg-purple-100 text-purple-800'
                            : isUnavail
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                        title="Click to update real-time availability"
                      >
                        {isAvail ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                        ) : isOut ? (
                          <Plane className="w-3 h-3 text-purple-600" />
                        ) : null}
                        <span>{source.availabilityStatus}</span>
                        <Edit3 className="w-2.5 h-2.5 ml-0.5 opacity-60" />
                      </button>
                    </div>
                  </div>

                  {/* Availability note / out of town info */}
                  {isOut && (
                    <div className="mt-2 text-[11px] bg-purple-50 text-purple-800 p-2 rounded-lg border border-purple-200 flex items-center justify-between">
                      <span>Expected return: {source.outOfTownUntil || 'Unknown'}</span>
                      <span className="italic opacity-80">{source.availabilityNotes}</span>
                    </div>
                  )}

                  {isUnavail && source.availabilityNotes && (
                    <div className="mt-2 text-[11px] bg-amber-50 text-amber-800 p-2 rounded-lg border border-amber-200">
                      <span>Notice: {source.availabilityNotes}</span>
                    </div>
                  )}

                  {/* Location & Metadata */}
                  <div className="mt-3 flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{source.zone}</span>
                      <span className="font-mono text-slate-400">({source.distanceKm} km)</span>
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Mobilize ETA: {source.mobilizationLeadTimeMinutes}m</span>
                    </span>
                    <span>·</span>
                    <span>{source.donorType}</span>
                  </div>

                  {/* Health Screen & Eligibility Metrics */}
                  <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div className="text-slate-500">Hemoglobin</div>
                      <div className="text-lg font-bold font-mono text-slate-900 mt-0.5 tabular-nums">
                        {source.hemoglobinGdl}{' '}
                        <span className="text-[11px] font-normal text-slate-500">g/dL</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div className="text-slate-500">Last Donation</div>
                      <div className="text-lg font-bold font-mono text-slate-900 mt-0.5 tabular-nums">
                        {source.daysSinceLastDonation}d{' '}
                        <span className="text-[11px] font-normal text-slate-500">ago</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div className="text-slate-500">Attendance</div>
                      <div className="text-lg font-bold font-mono text-emerald-600 mt-0.5 tabular-nums">
                        {source.reliabilityRatePct}%
                      </div>
                    </div>
                  </div>

                  {!source.isEligible && (
                    <div className="mt-2 text-[11px] text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                      {source.eligibilityNotes}
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono">{source.phone}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditDonor(source)}
                      className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded text-xs font-semibold cursor-pointer"
                    >
                      Update Status
                    </button>

                    <button
                      disabled={!source.isEligible || !isAvail}
                      onClick={() => onMobilizeDonor(source)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                        source.isEligible && isAvail
                          ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{isAvail ? 'Mobilize Callout' : 'Unavailable'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>

      {/* Real-Time Availability Status Editor Modal */}
      {editingDonor && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Update Real-Time Availability: {editingDonor.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingDonor(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDonorStatus} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Select Real-Time Availability Status:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Available', 'Unavailable', 'Out of Town', 'Resting'] as DonorAvailabilityStatus[]).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setEditStatus(status)}
                      className={`p-2.5 rounded-lg border text-left font-bold transition-all cursor-pointer ${
                        editStatus === status
                          ? status === 'Available'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                            : status === 'Out of Town'
                            ? 'bg-purple-50 border-purple-500 text-purple-800'
                            : status === 'Unavailable'
                            ? 'bg-amber-50 border-amber-500 text-amber-800'
                            : 'bg-slate-100 border-slate-600 text-slate-800'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{status}</span>
                        {editStatus === status && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                      <div className="text-[10px] font-normal opacity-75 mt-0.5">
                        {status === 'Available' && 'Ready for immediate emergency alert'}
                        {status === 'Unavailable' && 'Off-duty, at work, or temporarily busy'}
                        {status === 'Out of Town' && 'Traveling away from metro response zone'}
                        {status === 'Resting' && 'In post-donation recovery interval'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {editStatus === 'Out of Town' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Expected Return Date to Metro Area:
                  </label>
                  <input
                    type="date"
                    value={editOutOfTownUntil}
                    onChange={(e) => setEditOutOfTownUntil(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-slate-800"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Availability Notes / Shift Schedule:
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. On-call after 5 PM, reachable via SMS only, or in conference until Oct 5..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDonor(null)}
                  className="px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm"
                >
                  Save Real-Time Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hospital Cold Vault Details Modal */}
      {selectedHospitalForModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {selectedHospitalForModal.name} - Cold Storage Vault
                </h3>
                <p className="text-xs text-slate-500">
                  Accreditation: {selectedHospitalForModal.accreditationId} · Sensor Temp:{' '}
                  {selectedHospitalForModal.coldChainTempC}°C
                </p>
              </div>
              <button
                onClick={() => setSelectedHospitalForModal(null)}
                className="text-xs text-slate-400 hover:text-slate-700 font-bold px-2 py-1"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2">
              <div className="text-xs text-slate-500 mb-2">
                Stored inventory units with certified ISBT-128 barcodes:
              </div>
              {selectedHospitalForModal.inventoryUnits.map((u) => (
                <div
                  key={u.unitId}
                  className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 font-mono">{u.bagBarcode}</span>
                      <span className="font-bold font-mono text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                        {u.bloodGroup}
                      </span>
                      <span className="text-slate-600">{u.component}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Location: {u.storageLocation} · Vol: {u.volumeMl}mL · Exp:{' '}
                      {u.expirationDate.slice(0, 10)}
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
                      u.status === 'available'
                        ? 'bg-emerald-100 text-emerald-800'
                        : u.status === 'reserved'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {u.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
