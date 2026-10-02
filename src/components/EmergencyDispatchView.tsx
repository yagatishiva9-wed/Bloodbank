/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Heart,
  MapPin,
  PackageCheck,
  Radio,
  ShieldAlert,
  Truck,
  UserCheck,
  Zap,
} from 'lucide-react';
import { EmergencyRequest } from '../types/blood';

interface EmergencyDispatchViewProps {
  requests: EmergencyRequest[];
  onTriggerEmergencyModal: () => void;
  onUpdateStatus: (requestId: string, newStatus: EmergencyRequest['status']) => void;
}

export const EmergencyDispatchView: React.FC<EmergencyDispatchViewProps> = ({
  requests,
  onTriggerEmergencyModal,
  onUpdateStatus,
}) => {
  const activeRequests = requests.filter((r) => r.status !== 'DELIVERED' && r.status !== 'CANCELLED');
  const pastRequests = requests.filter((r) => r.status === 'DELIVERED' || r.status === 'CANCELLED');

  return (
    <div className="space-y-6">
      {/* Top Action Banner */}
      <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-slate-900 text-white rounded-xl p-5 border border-rose-950 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-rose-300 text-xs font-bold uppercase tracking-wider">
            <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
            <span>Emergency Operations Dispatch Console</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Active STAT Blood Transits & Patient Allocations
          </h2>
          <p className="text-xs text-rose-100 max-w-xl">
            Real-time pneumatic & high-priority courier tracking for trauma bays, ORs, and massive transfusion protocol (MTP) incidents.
          </p>
        </div>

        <button
          onClick={onTriggerEmergencyModal}
          className="px-4 py-2.5 text-xs font-bold text-slate-900 bg-white hover:bg-rose-50 rounded-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap self-start sm:self-auto"
        >
          <Zap className="w-4 h-4 text-rose-600 fill-rose-600" />
          <span>Launch STAT Emergency Match</span>
        </button>
      </div>

      {/* Active Requests List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold text-slate-700">
            Active In-Transit Emergency Cases ({activeRequests.length})
          </span>
          <span className="font-mono">Priority Triage Algorithm Active</span>
        </div>

        {activeRequests.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-900">No Pending Emergency Dispatches</h4>
            <p className="text-xs text-slate-500 mt-1">
              All trauma orders fulfilled. Standby mode active for trauma bay alert calls.
            </p>
          </div>
        ) : (
          activeRequests.map((req) => {
            const isStat = req.urgency === 'STAT_IMMEDIATE';

            return (
              <div
                key={req.requestId}
                className={`bg-white rounded-xl border p-5 transition-all ${
                  isStat
                    ? 'border-rose-300 shadow-sm ring-1 ring-rose-200'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left: Patient and Case Details */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xl font-black font-mono text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded">
                        {req.patientBloodGroup}
                      </span>

                      <h3 className="text-base font-bold text-slate-900">
                        {req.patientName}
                      </h3>

                      <span className="text-xs font-mono text-slate-400">({req.patientId})</span>

                      <span className="text-slate-300">·</span>

                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${
                          isStat
                            ? 'bg-rose-100 text-rose-700 font-mono'
                            : 'bg-amber-100 text-amber-800 font-mono'
                        }`}
                      >
                        {req.urgency.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-slate-800">
                        {req.unitsRequested} units of {req.componentNeeded}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{req.hospitalDestination}</span>
                      </span>
                      <span>·</span>
                      <span className="font-mono text-slate-400">
                        Logged: {req.createdAt.slice(11, 16)} UTC
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 mt-2">
                      <strong className="text-slate-700">Clinical Indication:</strong> {req.traumaCase}
                    </p>

                    {/* Automated Donor & Nearby Blood Bank Notifications Workflow */}
                    {req.automatedNotifications && req.automatedNotifications.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                            <Radio className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                            <span>Automated Broadcast & Alert Dispatches ({req.automatedNotifications.length}):</span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            Auto-notified on submission
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {req.automatedNotifications.map((n) => (
                            <div
                              key={n.id}
                              className="p-2.5 rounded-lg border bg-slate-50 border-slate-200 text-xs flex flex-col justify-between gap-1.5"
                            >
                              <div className="flex items-start justify-between gap-1">
                                <div className="flex items-center gap-1.5">
                                  {n.recipientType === 'hospital' ? (
                                    <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  ) : (
                                    <Heart className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                  )}
                                  <div>
                                    <span className="font-bold text-slate-800">{n.recipientName}</span>
                                    {n.bloodGroup && (
                                      <span className="text-[11px] font-mono text-slate-500 ml-1">
                                        ({n.bloodGroup})
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ${
                                    n.status === 'CONFIRMED' || n.status === 'DELIVERED'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : n.status === 'ACKNOWLEDGED'
                                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                      : n.status === 'DECLINED'
                                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                                  }`}
                                >
                                  {n.status}
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                                <span className="truncate max-w-[200px]">
                                  {n.responseNote || n.notes || n.message}
                                </span>
                                <span className="font-mono text-[10px] text-slate-400">
                                  {n.timestamp.slice(11, 16)} UTC · {n.channel}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Assigned Sources & Courier Trackers */}
                    {req.assignedSources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                        <div className="text-xs font-semibold text-slate-700">
                          Assigned Blood Sources & En-Route Transit:
                        </div>
                        {req.assignedSources.map((as) => (
                          <div
                            key={as.trackingCode}
                            className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              {as.sourceCategory === 'hospital' ? (
                                <Building2 className="w-4 h-4 text-slate-700" />
                              ) : (
                                <Heart className="w-4 h-4 text-rose-600" />
                              )}
                              <div>
                                <span className="font-bold text-slate-900">{as.sourceName}</span>
                                <span className="text-slate-500 ml-1">
                                  ({as.unitsAllocated} units allocated)
                                </span>
                                <div className="text-[11px] text-slate-500">
                                  Tracking: <code className="font-mono font-bold text-slate-700">{as.trackingCode}</code> · {as.dispatchStatus}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-rose-600 flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-200">
                                <Clock className="w-3.5 h-3.5" />
                                <span>ETA: ~{as.etaMinutes} mins</span>
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <button
                      onClick={() => onUpdateStatus(req.requestId, 'DELIVERED')}
                      className="px-3.5 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Confirm Delivery & Transfusion</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delivered / Fulfilled History */}
      {pastRequests.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Recently Fulfilled Emergency Dispatches ({pastRequests.length})
          </h4>
          <div className="space-y-2">
            {pastRequests.map((req) => (
              <div
                key={req.requestId}
                className="bg-white p-3 rounded-lg border border-slate-200 text-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-900">{req.patientName}</span>
                  <span className="font-mono font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                    {req.patientBloodGroup}
                  </span>
                  <span className="text-slate-600">
                    {req.unitsRequested}u {req.componentNeeded}
                  </span>
                </div>
                <div className="text-slate-500 font-mono text-[11px]">
                  Delivered to {req.hospitalDestination}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
