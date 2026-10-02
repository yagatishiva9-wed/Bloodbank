/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Heart,
  Info,
  MapPin,
  MessageSquare,
  Phone,
  Plane,
  Radio,
  Send,
  ShieldAlert,
  Sparkles,
  Truck,
  UserCheck,
  UserX,
  X,
  Zap,
} from 'lucide-react';
import {
  BloodComponent,
  BloodGroup,
  BloodSource,
  DispatchedNotification,
  EmergencyRequest,
  HospitalBloodSource,
  isDonorSource,
  isHospitalSource,
  UrgencyLevel,
} from '../types/blood';
import {
  generateAutomatedEmergencyNotifications,
  rankSourcesForEmergency,
} from '../services/compatibility';

interface EmergencyMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  sources: BloodSource[];
  hospitals: HospitalBloodSource[];
  onDispatch: (
    newRequest: EmergencyRequest,
    source: BloodSource,
    unitsToAllocate: number
  ) => void;
}

export const EmergencyMatchModal: React.FC<EmergencyMatchModalProps> = ({
  isOpen,
  onClose,
  sources,
  hospitals,
  onDispatch,
}) => {
  const [requestingHospitalId, setRequestingHospitalId] = useState<string>(hospitals[0]?.id || '');
  const [patientBloodGroup, setPatientBloodGroup] = useState<BloodGroup>('O-');
  const [componentNeeded, setComponentNeeded] = useState<BloodComponent>('Packed Red Blood Cells (PRBC)');
  const [unitsRequested, setUnitsRequested] = useState<number>(2);
  const [urgency, setUrgency] = useState<UrgencyLevel>('STAT_IMMEDIATE');
  const [patientName, setPatientName] = useState('John Doe (Uncrossmatched Trauma)');
  const [patientId, setPatientId] = useState('PT-ER-' + Math.floor(1000 + Math.random() * 9000));
  const [hospitalDestination, setHospitalDestination] = useState(
    hospitals[0]?.name ? `${hospitals[0].name} (Trauma Bay 1)` : 'Metropolitan Trauma Bay 1'
  );
  const [traumaCase, setTraumaCase] = useState('Severe Hemorrhagic Shock - Massive Transfusion Protocol (MTP)');
  const [showNotificationPreview, setShowNotificationPreview] = useState(true);

  const requestingHospital = useMemo(() => {
    return hospitals.find((h) => h.id === requestingHospitalId) || hospitals[0];
  }, [hospitals, requestingHospitalId]);

  // Compute live ranked matches
  const rankedMatches = useMemo(() => {
    return rankSourcesForEmergency(sources, patientBloodGroup, componentNeeded, unitsRequested);
  }, [sources, patientBloodGroup, componentNeeded, unitsRequested]);

  // Pre-calculate automated notifications that would be generated
  const automatedNotificationPlan = useMemo(() => {
    return generateAutomatedEmergencyNotifications(
      sources,
      requestingHospitalId,
      requestingHospital?.name || 'Metropolitan Trauma Center',
      patientBloodGroup,
      componentNeeded,
      unitsRequested,
      urgency,
      patientName
    );
  }, [sources, requestingHospitalId, requestingHospital, patientBloodGroup, componentNeeded, unitsRequested, urgency, patientName]);

  // Find donors that are skipped and reasons
  const skippedDonors = useMemo(() => {
    return sources.filter(isDonorSource).filter((d) => {
      return d.availabilityStatus !== 'Available' || !d.isEligible;
    });
  }, [sources]);

  if (!isOpen) return null;

  const handleQuickONegativeMTP = () => {
    setPatientBloodGroup('O-');
    setComponentNeeded('Packed Red Blood Cells (PRBC)');
    setUnitsRequested(4);
    setUrgency('STAT_IMMEDIATE');
    setTraumaCase('Active Code Crimson MTP - Uncrossmatched O-Negative Resuscitation');
  };

  const handleConfirmDispatch = (matchedSource: BloodSource, unitsToTake: number) => {
    const trackingCode = `TRK-${Date.now().toString(36).toUpperCase()}`;
    const eta = isHospitalSource(matchedSource)
      ? matchedSource.leadTimeMinutes + Math.round(matchedSource.distanceKm * 1.5)
      : matchedSource.mobilizationLeadTimeMinutes + Math.round(matchedSource.distanceKm * 2);

    const newRequest: EmergencyRequest = {
      requestId: `REQ-${Date.now().toString(36).toUpperCase()}`,
      patientId: patientId || `PT-${Math.floor(1000 + Math.random() * 9000)}`,
      patientName: patientName || 'Emergency Patient',
      patientBloodGroup,
      componentNeeded,
      unitsRequested,
      urgency,
      hospitalDestination,
      requestingHospitalId,
      requestingHospitalName: requestingHospital?.name || 'Metropolitan Trauma Institute',
      destinationZone: isHospitalSource(matchedSource) ? matchedSource.zone : 'Downtown Central',
      traumaCase,
      status: 'EN_ROUTE',
      createdAt: new Date().toISOString(),
      assignedSources: [
        {
          sourceId: matchedSource.id,
          sourceCategory: matchedSource.category,
          sourceName: matchedSource.name,
          unitsAllocated: unitsToTake,
          dispatchStatus: isHospitalSource(matchedSource)
            ? 'Cold Vault Verified & High-Priority Courier Dispatched'
            : 'Universal Donor Contacted & Medical Transport En-Route',
          etaMinutes: eta,
          trackingCode,
        },
      ],
      automatedNotifications: automatedNotificationPlan.notifications,
    };

    onDispatch(newRequest, matchedSource, unitsToTake);
    onClose();
  };

  const topCandidate = rankedMatches[0];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Emergency Blood Request & Automated Search Dispatch
              </h2>
              <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span>Multi-Source Union Modeling</span>
                <span>·</span>
                <span>Automated Donor & Bank Notifications</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleQuickONegativeMTP}
              className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-100/90 hover:bg-rose-200 rounded-md transition-colors flex items-center gap-1 border border-rose-200 cursor-pointer"
              title="One-click setup for trauma massive transfusion protocol"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              <span>Massive Transfusion (MTP O-)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body content with parameters, automated notifications, and live matches */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Top Form Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
            {/* Requesting Hospital */}
            <div className="md:col-span-4 grid grid-cols-1 sm:grid-cols-3 gap-3 pb-3 border-b border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Requesting Hospital
                </label>
                <select
                  value={requestingHospitalId}
                  onChange={(e) => {
                    setRequestingHospitalId(e.target.value);
                    const h = hospitals.find((hosp) => hosp.id === e.target.value);
                    if (h) setHospitalDestination(`${h.name} (Trauma Bay 1)`);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 font-bold text-slate-800 focus:outline-none"
                >
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.zone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Patient Name / Trauma Bed
                </label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 font-medium text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Destination Unit / OR Room
                </label>
                <input
                  type="text"
                  value={hospitalDestination}
                  onChange={(e) => setHospitalDestination(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 font-medium text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            {/* Patient Blood Group */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Required Blood Group
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'] as BloodGroup[]).map((bg) => (
                  <button
                    key={bg}
                    type="button"
                    onClick={() => setPatientBloodGroup(bg)}
                    className={`py-1.5 text-xs font-bold rounded border transition-colors cursor-pointer ${
                      patientBloodGroup === bg
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {bg}
                  </button>
                ))}
              </div>
            </div>

            {/* Blood Component */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Component Needed
              </label>
              <select
                value={componentNeeded}
                onChange={(e) => setComponentNeeded(e.target.value as BloodComponent)}
                className="w-full text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                <option value="Packed Red Blood Cells (PRBC)">Packed Red Blood Cells (PRBC)</option>
                <option value="Fresh Frozen Plasma (FFP)">Fresh Frozen Plasma (FFP)</option>
                <option value="Platelets (SDP/RDP)">Platelets (SDP/RDP)</option>
                <option value="Cryoprecipitate">Cryoprecipitate</option>
                <option value="Whole Blood">Whole Blood</option>
              </select>

              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                <span>Storage rule:</span>
                <span className="font-mono text-slate-700">
                  {componentNeeded.includes('Plasma') || componentNeeded.includes('Cryo')
                    ? '-18°C Frozen'
                    : componentNeeded.includes('Platelets')
                    ? '20-24°C Agitated'
                    : '2-6°C Cold Vault'}
                </span>
              </div>
            </div>

            {/* Units Requested */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Units Needed (STAT)
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setUnitsRequested(num)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded border transition-colors cursor-pointer ${
                      unitsRequested === num
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {num}u
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Total Vol: <span className="font-mono tabular-nums text-slate-800">{unitsRequested * 450} mL</span>
              </p>
            </div>

            {/* Urgency Level */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Urgency Triage Level
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as UrgencyLevel)}
                className={`w-full text-xs font-bold rounded-lg p-2 border focus:outline-none ${
                  urgency === 'STAT_IMMEDIATE'
                    ? 'bg-rose-50 text-rose-700 border-rose-300'
                    : urgency === 'URGENT_TIER_1'
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-white text-slate-800 border-slate-200'
                }`}
              >
                <option value="STAT_IMMEDIATE">STAT CODE RED (&lt;15 mins)</option>
                <option value="URGENT_TIER_1">Urgent Tier 1 (&lt;45 mins)</option>
                <option value="PRIORITY_TIER_2">Priority Tier 2 (1-2 hours)</option>
                <option value="SCHEDULED">Scheduled Surgery Prep</option>
              </select>
              <p className="mt-2 text-[11px] text-slate-500">
                Trauma Target: <span className="font-semibold text-rose-600">Immediate dispatch & SMS alert</span>
              </p>
            </div>
          </div>

          {/* Trauma Case Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Clinical Case Notes / Transfusion Indication
            </label>
            <input
              type="text"
              value={traumaCase}
              onChange={(e) => setTraumaCase(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-800"
            />
          </div>

          {/* Automated Search & Notification Broadcast Engine Accordion */}
          <div className="bg-sky-50/70 border border-sky-200 rounded-xl overflow-hidden">
            <div
              onClick={() => setShowNotificationPreview(!showNotificationPreview)}
              className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-sky-100/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-sky-600 animate-pulse" />
                <span className="font-bold text-sky-950">
                  Automated Search & Broadcast Engine: {automatedNotificationPlan.notifiedCount} Targets Scheduled
                </span>
                <span className="text-[11px] text-sky-700">
                  (Simultaneous alert to nearby blood banks and real-time available donors)
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-sky-700 font-semibold text-[11px]">
                <span>{showNotificationPreview ? 'Hide Broadcast Details' : 'View Broadcast Details'}</span>
                {showNotificationPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>

            {showNotificationPreview && (
              <div className="p-4 pt-1 border-t border-sky-100 space-y-3">
                <div className="text-[11px] text-sky-800">
                  Submitting this request will automatically ping the following compatible sources:
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {automatedNotificationPlan.notifications.map((n) => (
                    <div
                      key={n.id}
                      className="bg-white p-2.5 rounded-lg border border-sky-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {n.recipientType === 'hospital' ? (
                          <Building2 className="w-4 h-4 text-slate-700" />
                        ) : (
                          <Heart className="w-4 h-4 text-rose-600" />
                        )}
                        <div>
                          <div className="font-bold text-slate-900">{n.recipientName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {n.channel} · Contact: {n.contactInfo} · Dist: {n.distanceKm.toFixed(1)} km
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                          ETA ~{n.etaMinutes}m
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {n.unitsAvailableOrPledged} units ready
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Skipped Donors notice */}
                {skippedDonors.length > 0 && (
                  <div className="pt-2 border-t border-sky-100 text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-600">Omitted Inactive Donors:</span>
                    {skippedDonors.map((d) => (
                      <span
                        key={d.id}
                        className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600"
                        title={d.availabilityNotes || d.eligibilityNotes}
                      >
                        {d.name} ({d.availabilityStatus})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section Divider with Ranked Results Counter */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Ranked Compatible Blood Sources
              </h3>
              <span className="text-xs text-slate-500">
                ({rankedMatches.length} candidate sources evaluated)
              </span>
            </div>

            {topCandidate && (
              <button
                type="button"
                onClick={() => handleConfirmDispatch(topCandidate.source, Math.min(unitsRequested, topCandidate.availableUnits || 1))}
                className="px-4 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Request & Broadcast Alerts ({automatedNotificationPlan.notifiedCount})</span>
              </button>
            )}
          </div>

          {/* Ranked List of Sources */}
          <div className="space-y-3">
            {rankedMatches.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-slate-900">No compatible blood sources found</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Try switching to the uncrossmatched universal O-Negative protocol.
                </p>
              </div>
            ) : (
              rankedMatches.map((match, idx) => {
                const src = match.source;
                const isHosp = isHospitalSource(src);
                const isDonor = isDonorSource(src);

                return (
                  <div
                    key={src.id}
                    className={`p-4 rounded-xl border transition-all ${
                      idx === 0
                        ? 'border-rose-400 bg-rose-50/20 shadow-sm ring-1 ring-rose-400/30'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Source metadata */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div
                            className={`p-1.5 rounded-md flex items-center justify-center ${
                              isHosp
                                ? 'bg-slate-900 text-white'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {isHosp ? (
                              <Building2 className="w-4 h-4" />
                            ) : (
                              <Heart className="w-4 h-4" />
                            )}
                          </div>

                          <h4 className="text-sm font-bold text-slate-900">
                            {src.name}
                          </h4>

                          <span className="text-xs text-slate-500">
                            {isHosp ? src.facilityType : src.donorType}
                          </span>

                          <span className="text-slate-300">·</span>

                          {/* Match Rank */}
                          <span
                            className={`text-xs font-semibold ${
                              match.compatibilityRank === 'EXACT'
                                ? 'text-emerald-700'
                                : 'text-blue-700'
                            }`}
                          >
                            {match.compatibilityRank === 'EXACT' ? 'Exact Match' : 'Safe Compatible'}
                          </span>

                          {isDonor && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                src.availabilityStatus === 'Available'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : src.availabilityStatus === 'Out of Town'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              Status: {src.availabilityStatus}
                            </span>
                          )}

                          {idx === 0 && (
                            <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                              Top Allocation Pick
                            </span>
                          )}
                        </div>

                        {/* Domain-specific union details */}
                        <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{src.zone}</span>
                            <span className="text-slate-400 font-mono">({src.distanceKm.toFixed(1)} km)</span>
                          </span>

                          <span className="text-slate-300">·</span>

                          <span className="flex items-center gap-1 font-semibold text-slate-800">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>ETA: {match.leadTimeMinutes} mins</span>
                          </span>

                          {isHosp && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className="flex items-center gap-1 text-slate-700">
                                <span>Cold Chain:</span>
                                <span
                                  className={`font-mono font-semibold ${
                                    src.coldChainStatus === 'optimal'
                                      ? 'text-emerald-600'
                                      : 'text-amber-600'
                                  }`}
                                >
                                  {src.coldChainTempC.toFixed(1)}°C
                                </span>
                              </span>
                            </>
                          )}
                        </div>

                        {/* Match notes / clinical justification */}
                        <p className="text-xs text-slate-500">{match.notes}</p>
                      </div>

                      {/* Right: Units available & Dispatch Action */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div className="text-left sm:text-right">
                          <div className="text-xs text-slate-500">Available Stock</div>
                          <div className="text-base font-bold font-mono text-slate-900">
                            {match.availableUnits}{' '}
                            <span className="text-xs font-normal text-slate-500">units</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleConfirmDispatch(src, Math.min(unitsRequested, match.availableUnits || 1))}
                          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                            match.canFulfillImmediately
                              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
                              : 'bg-slate-800 hover:bg-slate-900 text-white'
                          }`}
                        >
                          {isHosp ? (
                            <>
                              <Truck className="w-3.5 h-3.5" />
                              <span>Dispatch & Broadcast</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Mobilize & Broadcast</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Dispatched requests broadcast automated notifications and sign to audit ledger</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-md transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
