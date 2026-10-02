/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  Database,
  Filter,
  Layers,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  Snowflake,
  Thermometer,
} from 'lucide-react';
import {
  BloodComponent,
  BloodGroup,
  DonorBloodSource,
  HospitalBloodSource,
} from '../types/blood';
import {
  aggregateStockByBloodGroup,
  aggregateStockByComponent,
  aggregateStockByRegion,
  ALL_BLOOD_GROUPS,
  ALL_COMPONENTS,
  GroupByDimension,
  runDynamicStockQuery,
} from '../services/aggregation';

interface StockAggregationViewProps {
  hospitals: HospitalBloodSource[];
  donors: DonorBloodSource[];
  onTriggerEmergencyModal: () => void;
}

export const StockAggregationView: React.FC<StockAggregationViewProps> = ({
  hospitals,
  donors,
  onTriggerEmergencyModal,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'groups' | 'components' | 'regional' | 'customQuery'>('groups');

  // Aggregation state calculations
  const groupAggregates = useMemo(() => aggregateStockByBloodGroup(hospitals), [hospitals]);
  const componentAggregates = useMemo(() => aggregateStockByComponent(hospitals), [hospitals]);
  const regionalAggregates = useMemo(() => aggregateStockByRegion(hospitals, donors), [hospitals, donors]);

  // Dynamic Query Builder State
  const [selectedGroupBy, setSelectedGroupBy] = useState<GroupByDimension>('bloodGroup');
  const [filterGroups, setFilterGroups] = useState<BloodGroup[]>([]);
  const [filterComponents, setFilterComponents] = useState<BloodComponent[]>([]);
  const [filterZones, setFilterZones] = useState<string[]>([]);

  const dynamicQueryRows = useMemo(() => {
    return runDynamicStockQuery(hospitals, donors, selectedGroupBy, {
      bloodGroups: filterGroups,
      components: filterComponents,
      zones: filterZones,
    });
  }, [hospitals, donors, selectedGroupBy, filterGroups, filterComponents, filterZones]);

  // Aggregate KPI summary
  const totalAvailableUnits = useMemo(
    () => groupAggregates.reduce((sum, g) => sum + g.availableUnits, 0),
    [groupAggregates]
  );
  const criticalDeficitGroups = useMemo(
    () => groupAggregates.filter((g) => g.status === 'CRITICAL_DEFICIT'),
    [groupAggregates]
  );
  const plateletsExpiring48h = useMemo(() => {
    const p = componentAggregates.find((c) => c.component === 'Platelets (SDP/RDP)');
    return p ? p.expiringIn48Hours : 0;
  }, [componentAggregates]);
  const mobilizableDonors = useMemo(
    () => donors.filter((d) => d.isEligible && d.status === 'available_immediate').length,
    [donors]
  );

  const toggleGroupFilter = (group: BloodGroup) => {
    setFilterGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );
  };

  const toggleComponentFilter = (comp: BloodComponent) => {
    setFilterComponents((prev) =>
      prev.includes(comp) ? prev.filter((c) => c !== comp) : [...prev, comp]
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Stat Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Ready Stock */}
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Ready Banked Stock
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
              {totalAvailableUnits}
            </span>
            <span className="text-xs text-slate-500 font-medium">certified units</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
            <span>Across 5 regional trauma depots</span>
          </div>
        </div>

        {/* KPI 2: Critical Deficits */}
        <div className={`p-5 rounded-xl border ${
          criticalDeficitGroups.length > 0 ? 'bg-rose-50/40 border-rose-200' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
              Critical Deficit Shortage
            </span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-700 font-mono tabular-nums">
              {criticalDeficitGroups.length}
            </span>
            <span className="text-xs text-rose-600 font-medium">blood groups below safety threshold</span>
          </div>
          <div className="mt-2 text-xs text-rose-700/80">
            {criticalDeficitGroups.length > 0 ? (
              <span>
                At Risk: {criticalDeficitGroups.map((g) => g.bloodGroup).join(', ')}
              </span>
            ) : (
              <span>All blood groups meeting safety thresholds</span>
            )}
          </div>
        </div>

        {/* KPI 3: Platelets 48h Expiry Alert */}
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
              Platelet Expiry (&lt;48h)
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
              {plateletsExpiring48h}
            </span>
            <span className="text-xs text-slate-500 font-medium">units near 5-day limit</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            <span>Agitated room-temp storage 20-24°C</span>
          </div>
        </div>

        {/* KPI 4: Active Mobilizable Donors */}
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Universal Donors Mobilizable
            </span>
            <CheckCircle2 className="w-4 h-4 text-sky-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
              {mobilizableDonors}
            </span>
            <span className="text-xs text-slate-500 font-medium">volunteers on stand-by</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            <span>Mean mobilization ETA: 35 mins</span>
          </div>
        </div>
      </div>

      {/* Segmented Filter Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('groups')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeSubTab === 'groups'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Blood Group Reserves (ABO/Rh)
          </button>

          <button
            onClick={() => setActiveSubTab('components')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeSubTab === 'components'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Components & Shelf-Life Horizon
          </button>

          <button
            onClick={() => setActiveSubTab('regional')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeSubTab === 'regional'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Regional Depots & Facility Zones
          </button>

          <button
            onClick={() => setActiveSubTab('customQuery')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeSubTab === 'customQuery'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Multi-Dimensional Aggregation Query
          </button>
        </div>

        <button
          onClick={onTriggerEmergencyModal}
          className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
          <span>Need STAT Blood? Dispatch Match</span>
        </button>
      </div>

      {/* Sub-View A: Blood Groups Grid */}
      {activeSubTab === 'groups' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Real-time aggregation query across certified hospital blood banks
            </span>
            <span className="font-mono tabular-nums">8 Blood Types Evaluated</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {groupAggregates.map((group) => {
              const isCritical = group.status === 'CRITICAL_DEFICIT';
              const isLow = group.status === 'LOW';
              const percentOfOptimal = Math.min(
                100,
                Math.round((group.availableUnits / group.optimalThreshold) * 100)
              );

              return (
                <div
                  key={group.bloodGroup}
                  className={`bg-white rounded-xl border p-4 transition-all ${
                    isCritical
                      ? 'border-rose-300 ring-1 ring-rose-200'
                      : isLow
                      ? 'border-amber-200'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-2xl font-black tracking-tight text-slate-900">
                        {group.bloodGroup}
                      </span>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {group.bloodGroup === 'O-'
                          ? 'Universal RBC Donor'
                          : group.bloodGroup === 'AB+'
                          ? 'Universal RBC Recipient'
                          : group.bloodGroup === 'AB-'
                          ? 'Universal Plasma Donor'
                          : 'Standard Antigen Type'}
                      </div>
                    </div>

                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        isCritical
                          ? 'bg-rose-100 text-rose-700'
                          : isLow
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isCritical
                        ? 'CRITICAL DEFICIT'
                        : isLow
                        ? 'LOW INVENTORY'
                        : 'STABLE RESERVE'}
                    </span>
                  </div>

                  <div className="mt-4 flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                        {group.availableUnits}
                      </span>
                      <span className="text-xs text-slate-500 ml-1">ready</span>
                    </div>

                    <div className="text-right text-xs text-slate-500">
                      <span>Safety Goal: </span>
                      <span className="font-mono font-semibold text-slate-800 tabular-nums">
                        {group.optimalThreshold}u
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCritical
                          ? 'bg-rose-600'
                          : isLow
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${percentOfOptimal}%` }}
                    ></div>
                  </div>

                  {/* Sub-breakdown: reserved, quarantined */}
                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                    <div>
                      <span>Reserved: </span>
                      <span className="font-mono font-medium text-slate-800 tabular-nums">
                        {group.reservedUnits}u
                      </span>
                    </div>
                    <div className="text-right">
                      <span>Quarantined: </span>
                      <span className="font-mono font-medium text-slate-800 tabular-nums">
                        {group.quarantinedUnits}u
                      </span>
                    </div>
                  </div>

                  {isCritical && (
                    <div className="mt-2 text-[11px] text-rose-700 font-semibold bg-rose-50 px-2 py-1 rounded">
                      Shortfall of {group.deficitUnits} units below emergency threshold!
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-View B: Component Shelf-Life & Expiration Horizon */}
      {activeSubTab === 'components' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Component Aggregations & Clinical Expiration Horizons
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitoring short shelf-life components (Platelets: 5-day limit) vs frozen plasma (1-year limit)
              </p>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Auto-calculated every 60s
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Component Name</th>
                  <th className="py-3 px-4">Storage Protocol</th>
                  <th className="py-3 px-4 text-right">Max Shelf Life</th>
                  <th className="py-3 px-4 text-right">Total Banked</th>
                  <th className="py-3 px-4 text-right">Available Ready</th>
                  <th className="py-3 px-4 text-right">Expiring &lt;48h</th>
                  <th className="py-3 px-4 text-right">Expiring &lt;7d</th>
                  <th className="py-3 px-4">Wastage Risk Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {componentAggregates.map((comp) => {
                  const hasCriticalExpiry = comp.expiringIn48Hours > 0;

                  return (
                    <tr key={comp.component} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {comp.component}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {comp.storageCondition}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                        {comp.shelfLifeDays} days
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-slate-900">
                        {comp.totalUnits}u
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-emerald-700">
                        {comp.availableUnits}u
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold tabular-nums">
                        {comp.expiringIn48Hours > 0 ? (
                          <span className="text-rose-600">{comp.expiringIn48Hours}u</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                        {comp.expiringIn7Days}u
                      </td>
                      <td className="py-3 px-4">
                        {hasCriticalExpiry ? (
                          <span className="text-amber-800 font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Action needed: prioritize dispatch</span>
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Normal rotation</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-View C: Regional Depots & Facility Zones */}
      {activeSubTab === 'regional' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {regionalAggregates.map((region) => {
            return (
              <div key={region.zone} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <h4 className="text-sm font-bold text-slate-900">{region.zone}</h4>
                  </div>
                  <span className="text-xs font-mono text-slate-500">
                    {region.hospitalCount} Depot{region.hospitalCount > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="text-slate-500">Ready Units</div>
                    <div className="text-lg font-bold font-mono text-slate-900 mt-0.5 tabular-nums">
                      {region.availableUnits}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="text-slate-500">Active Donors</div>
                    <div className="text-lg font-bold font-mono text-slate-900 mt-0.5 tabular-nums">
                      {region.activeDonorsCount}
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="text-xs font-medium text-slate-600 mb-1">
                    Zero-Inventory Alert Groups:
                  </div>
                  {region.criticalGroups.length > 0 ? (
                    <div className="flex flex-wrap gap-1 text-[11px] font-mono font-bold text-rose-700">
                      {region.criticalGroups.map((g) => (
                        <span key={g} className="bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                          {g} (0 in stock)
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-emerald-700">
                      All ABO/Rh types represented in this zone
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sub-View D: Multi-Dimensional Aggregation Query Builder */}
      {activeSubTab === 'customQuery' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Multi-Dimensional Aggregation Query Engine
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Dynamic aggregation slice by group dimension with interactive predicate filtering
              </p>
            </div>

            <div className="text-xs text-slate-500 font-mono">
              SQL Equivalent: SELECT {selectedGroupBy}, COUNT(*), SUM(available) GROUP BY {selectedGroupBy}
            </div>
          </div>

          {/* Dimension Selector & Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Group By Dimension */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Group By Aggregation Dimension
              </label>
              <select
                value={selectedGroupBy}
                onChange={(e) => setSelectedGroupBy(e.target.value as GroupByDimension)}
                className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-400 focus:outline-none"
              >
                <option value="bloodGroup">Blood Group (ABO/Rh)</option>
                <option value="component">Blood Component Type</option>
                <option value="facilityType">Hospital / Facility Classification</option>
                <option value="zone">Geographic Zone</option>
                <option value="coldChainStatus">Cold Chain Temperature Status</option>
              </select>
            </div>

            {/* Filter by Blood Group */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Filter by Blood Group {filterGroups.length > 0 && `(${filterGroups.length} active)`}
              </label>
              <div className="flex flex-wrap gap-1">
                {ALL_BLOOD_GROUPS.map((bg) => (
                  <button
                    key={bg}
                    type="button"
                    onClick={() => toggleGroupFilter(bg)}
                    className={`px-2 py-1 text-xs font-mono font-bold rounded border transition-colors cursor-pointer ${
                      filterGroups.includes(bg)
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {bg}
                  </button>
                ))}
                {filterGroups.length > 0 && (
                  <button
                    onClick={() => setFilterGroups([])}
                    className="text-[11px] text-slate-400 hover:text-slate-700 underline px-1"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Filter by Component */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Filter by Component {filterComponents.length > 0 && `(${filterComponents.length} active)`}
              </label>
              <select
                onChange={(e) => {
                  if (e.target.value && !filterComponents.includes(e.target.value as BloodComponent)) {
                    setFilterComponents([...filterComponents, e.target.value as BloodComponent]);
                  }
                }}
                className="w-full text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg p-2 focus:outline-none"
              >
                <option value="">+ Add Component Filter...</option>
                {ALL_COMPONENTS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {filterComponents.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {filterComponents.map((c) => (
                    <span
                      key={c}
                      onClick={() => toggleComponentFilter(c)}
                      className="text-[11px] bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 px-2 py-0.5 rounded cursor-pointer transition-colors"
                    >
                      {c.split(' ')[0]} ✕
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Aggregated Output Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                <tr>
                  <th className="py-2.5 px-4">{selectedGroupBy} (Group Key)</th>
                  <th className="py-2.5 px-4 text-right">Total Units</th>
                  <th className="py-2.5 px-4 text-right">Available (Ready)</th>
                  <th className="py-2.5 px-4 text-right">Reserved</th>
                  <th className="py-2.5 px-4 text-right">Quarantined</th>
                  <th className="py-2.5 px-4 text-right">Expiring &lt;72h</th>
                  {(selectedGroupBy === 'bloodGroup' || selectedGroupBy === 'zone') && (
                    <th className="py-2.5 px-4 text-right">Eligible Donor Pool</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {dynamicQueryRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No inventory records match the applied criteria.
                    </td>
                  </tr>
                ) : (
                  dynamicQueryRows.map((row) => (
                    <tr key={row.groupKey} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {row.groupKey}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {row.totalUnits}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 tabular-nums">
                        {row.availableUnits}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600 tabular-nums">
                        {row.reservedUnits}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-amber-700 tabular-nums">
                        {row.quarantinedUnits}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {row.expiringSoonUnits > 0 ? (
                          <span className="text-rose-600 font-semibold">{row.expiringSoonUnits}</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      {(selectedGroupBy === 'bloodGroup' || selectedGroupBy === 'zone') && (
                        <td className="py-3 px-4 text-right font-mono font-semibold text-sky-700 tabular-nums">
                          {row.donorPoolCount} on-call
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
