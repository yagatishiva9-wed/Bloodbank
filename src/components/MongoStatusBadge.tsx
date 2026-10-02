/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Server,
  Layers,
  ShieldCheck,
  X,
  ExternalLink,
} from 'lucide-react';
import { api, MongoStatus } from '../services/api';

export const MongoStatusBadge: React.FC = () => {
  const [status, setStatus] = useState<MongoStatus | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStatus = () => {
    setIsRefreshing(true);
    api.getMongoStatus()
      .then((res) => setStatus(res))
      .catch((err) => console.warn('Could not fetch MongoDB status:', err))
      .finally(() => setIsRefreshing(false));
  };

  useEffect(() => {
    fetchStatus();
    // Refresh status every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!status) return null;

  return (
    <>
      {/* Interactive Status Pill Button */}
      <button
        onClick={() => setIsOpen(true)}
        type="button"
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border shadow-sm cursor-pointer ${
          status.connected
            ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800 hover:bg-emerald-900/80 hover:border-emerald-700'
            : 'bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800 hover:border-slate-600'
        }`}
        title="Click to view MongoDB Backend Connection Details"
      >
        <Database className={`w-3.5 h-3.5 ${status.connected ? 'text-emerald-400' : 'text-emerald-500'}`} />
        <span className="font-bold">MongoDB Backend:</span>
        <span className="flex items-center gap-1.5 font-mono text-[11px]">
          <span
            className={`w-2 h-2 rounded-full ${
              status.connected
                ? 'bg-emerald-400 animate-pulse'
                : 'bg-emerald-500'
            }`}
          />
          {status.connected ? 'Cluster Connected' : 'Engine Ready (Local Mirror)'}
        </span>
      </button>

      {/* Modal / Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 text-white flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <Database className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    MongoDB Backend Integration
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Persistent database engine powering inventory, staff auth & donations
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 text-xs text-slate-700">
              {/* Connection Status Box */}
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  status.connected
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                {status.connected ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <Server className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="font-bold text-sm">
                    {status.connected
                      ? 'Live MongoDB Cluster Connected'
                      : 'MongoDB Engine Active (Dual-Mode Driver)'}
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600">
                    {status.connected
                      ? `Successfully connected to database "${status.dbName}" via official MongoDB driver. All intake records and staff sessions are persisted in remote MongoDB collections.`
                      : `The backend is wired with the official MongoDB driver (v7). To target a live MongoDB Atlas cluster, set the MONGODB_URI environment variable. In development, records are safely mirrored in persistent storage.`}
                  </p>
                </div>
              </div>

              {/* Collections Grid */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-600" />
                  <span>MongoDB Collections in "{status.dbName}"</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-500 font-mono block">collection</span>
                    <strong className="text-slate-900 block font-mono text-xs">donations</strong>
                    <span className="text-lg font-black text-rose-600 font-mono mt-1 block">
                      {status.collections.donations}
                    </span>
                    <span className="text-[10px] text-slate-400">stored units</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-500 font-mono block">collection</span>
                    <strong className="text-slate-900 block font-mono text-xs">staff_users</strong>
                    <span className="text-lg font-black text-blue-600 font-mono mt-1 block">
                      {status.collections.staffUsers}
                    </span>
                    <span className="text-[10px] text-slate-400">staff profiles</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-500 font-mono block">collection</span>
                    <strong className="text-slate-900 block font-mono text-xs">sessions</strong>
                    <span className="text-lg font-black text-emerald-600 font-mono mt-1 block">
                      {status.collections.sessions}
                    </span>
                    <span className="text-[10px] text-slate-400">active tokens</span>
                  </div>
                </div>
              </div>

              {/* Technical Details */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 font-mono text-[11px]">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Driver:</span>
                  <span className="font-bold text-slate-800">{status.driver}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Target Database:</span>
                  <span className="font-bold text-emerald-700">{status.dbName}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Connection URI:</span>
                  <span className="font-semibold text-slate-700">
                    {status.sanitizedUri || 'MONGODB_URI (not defined, using default local mirror)'}
                  </span>
                </div>
              </div>

              {/* Instructions for MongoDB Atlas */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                  <span>Connecting Your MongoDB Atlas Cluster:</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Add <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">MONGODB_URI</code> to your environment with your Atlas connection string:
                </p>
                <code className="block bg-amber-100/80 p-2 rounded text-[10px] font-mono text-amber-900 break-all select-all">
                  MONGODB_URI="mongodb+srv://admin:&lt;password&gt;@cluster0.mongodb.net/hemasync_db?retryWrites=true&w=majority"
                </code>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={fetchStatus}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh Status</span>
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
