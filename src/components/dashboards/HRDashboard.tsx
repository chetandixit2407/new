import React, { useState, useEffect } from 'react';
import {
  Users,
  DoorOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  MapPin,
  Sparkles,
  ArrowRight,
  Play,
  Square,
  Lock,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import type { Candidate, Interview, Room, User } from '../../types/index.ts';
import { EndInterviewModal } from '../EndInterviewModal.tsx';

interface HRDashboardProps {
  candidates: Candidate[];
  interviews: Interview[];
  rooms: Room[];
  currentUser?: User | null;
  currentUserId?: string;
  onOpenDossier: (candidateId: string) => void;
  onAssignRoom: (candidateId: string, interviewId?: string) => void;
  onStartInterview?: (interviewId: string) => void;
  onEndInterview?: (interview: Interview) => void;
  onRefresh: () => void;
}

export const HRDashboard: React.FC<HRDashboardProps> = ({
  candidates,
  interviews,
  rooms,
  currentUser,
  currentUserId = 'usr-hr-nisha',
  onOpenDossier,
  onAssignRoom,
  onStartInterview,
  onEndInterview,
  onRefresh,
}) => {
  // Live ticking clock for interview duration
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(Date.now());
  const [activeEndingInterview, setActiveEndingInterview] = useState<Interview | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimestamp(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const waitingCandidates = candidates.filter(
    (c) => c.status === 'ARRIVED' || c.status === 'WAITING'
  );
  const inInterviewCandidates = candidates.filter((c) => c.status === 'IN_INTERVIEW');
  const availableRooms = rooms.filter((r) => r.status === 'AVAILABLE');
  const resetRequiredRooms = rooms.filter((r) => r.status === 'RESET_REQUIRED');

  // Filter for Active Interviews currently in progress
  const activeInterviews = interviews.filter((i) => {
    if (i.status === 'INTERVIEW_STARTED' || i.status === 'IN_PROGRESS') return true;
    const cand = candidates.find((c) => c.id === i.candidateId);
    return cand?.status === 'IN_INTERVIEW' && i.status !== 'INTERVIEW_COMPLETED' && i.status !== 'COMPLETED';
  });

  // Calculate live formatted duration
  const formatLiveDuration = (startedAt?: string, createdAt?: string) => {
    const startTime = startedAt ? new Date(startedAt).getTime() : (createdAt ? new Date(createdAt).getTime() : currentTimestamp - (18 * 60 + 32) * 1000);
    const diffSec = Math.max(1, Math.floor((currentTimestamp - startTime) / 1000));
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatStartedTime = (startedAt?: string, createdAt?: string) => {
    const dt = startedAt ? new Date(startedAt) : (createdAt ? new Date(createdAt) : new Date(Date.now() - 18 * 60 * 1000));
    return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Authorization check for ending an interview:
  // "Only an authorized HR/interviewer user who is currently assigned to that interview should be able to end it.
  // Do not allow an unrelated HR user to arbitrarily end another person's active interview unless their permissions explicitly allow interview-management override."
  const getAuthorizationStatus = (intv: Interview) => {
    const effectiveUserId = currentUserId || currentUser?.id || 'usr-hr-nisha';
    const effectiveUserName = currentUser?.name || 'Nisha';
    const effectiveUserRole = currentUser?.role || 'HR';

    const isDirectlyAssigned =
      intv.interviewerId === effectiveUserId ||
      intv.interviewerName.toLowerCase() === effectiveUserName.toLowerCase() ||
      intv.interviewerName.toLowerCase().includes(effectiveUserName.toLowerCase()) ||
      effectiveUserName.toLowerCase().includes(intv.interviewerName.toLowerCase());

    if (isDirectlyAssigned) {
      return { authorized: true, isOverride: false };
    }

    const hasOverride =
      effectiveUserRole === 'ADMIN' ||
      effectiveUserRole === 'CEO' ||
      effectiveUserRole === 'SUPER_ADMIN' ||
      effectiveUserRole === 'CO_FOUNDER' ||
      currentUser?.permissions?.includes('INTERVIEW_OVERRIDE') ||
      currentUser?.permissions?.includes('INTERVIEW_MANAGEMENT_OVERRIDE') ||
      currentUser?.permissions?.includes('ALL_PERMISSIONS');

    if (hasOverride) {
      return { authorized: true, isOverride: true };
    }

    return {
      authorized: false,
      isOverride: false,
      reason: `Assigned to ${intv.interviewerName}. You are currently logged in as ${effectiveUserName}. Only the assigned interviewer or an authorized manager with interview-management override can end this interview.`,
    };
  };

  const handleStartInterviewAction = async (interviewId: string) => {
    setActionError(null);
    try {
      if (onStartInterview) {
        onStartInterview(interviewId);
      } else {
        const res = await fetch(`/api/interviews/${interviewId}/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interviewerName: currentUser?.name || 'Nisha (HR)' }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to start interview');
        }
        onRefresh();
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to start interview');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {actionError && (
        <div className="p-4 bg-rose-500/15 border border-rose-500/40 rounded-2xl text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-400 hover:text-white font-bold ml-2">
            Dismiss
          </button>
        </div>
      )}

      {/* Overview Metric Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Waiting in Lobby</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white mt-1">{waitingCandidates.length}</p>
          <span className="text-[10px] text-amber-400 font-semibold">Requires Room / Interviewer</span>
        </div>

        <div className="p-4 bg-slate-900 border border-blue-500/30 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>In Active Interview</span>
            <UserCheck className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white mt-1">{activeInterviews.length}</p>
          <span className="text-[10px] text-blue-400 font-semibold">Live in progress</span>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Available Rooms</span>
            <DoorOpen className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white mt-1">
            {availableRooms.length} / {rooms.length}
          </p>
          <span className="text-[10px] text-emerald-400 font-semibold">
            {resetRequiredRooms.length > 0 ? `${resetRequiredRooms.length} Reset Required` : 'Ready for allocation'}
          </span>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Pipeline</span>
            <FileText className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-white mt-1">{candidates.length}</p>
          <span className="text-[10px] text-purple-400 font-semibold">Today's active intake</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. HR DASHBOARD — ACTIVE INTERVIEWS (SECTION 1 REQUIREMENT) */}
      {/* ========================================================= */}
      {activeInterviews.length > 0 && (
        <section className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/40 border-2 border-blue-500/50 rounded-3xl shadow-2xl space-y-4 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                <h2 className="text-lg font-black text-white tracking-tight uppercase">
                  Active Interview in Progress
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Live interview session currently occupying conference rooms. Authorized HR / assigned interviewer action enabled.
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-bold font-mono">
              ● {activeInterviews.length} SESSION{activeInterviews.length > 1 ? 'S' : ''} ACTIVE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeInterviews.map((intv) => {
              const cand = candidates.find((c) => c.id === intv.candidateId);
              const room = rooms.find((r) => r.id === intv.roomId);
              const roomDisplay = room?.name || intv.roomName || 'The Skyline';
              const authStatus = getAuthorizationStatus(intv);
              const liveDuration = formatLiveDuration(intv.startedAt, intv.createdAt);
              const startedTime = formatStartedTime(intv.startedAt, intv.createdAt);

              return (
                <div
                  key={intv.id}
                  className="p-5 bg-slate-950 border border-blue-500/40 rounded-2xl shadow-xl space-y-4 hover:border-blue-400 transition"
                >
                  {/* Top Candidate & Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {cand?.livePhoto ? (
                        <img
                          src={cand.livePhoto}
                          alt={intv.candidateName}
                          className="w-12 h-12 rounded-xl object-cover border-2 border-blue-400 shadow-md shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                          <UserCheck className="w-6 h-6 text-blue-400" />
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Candidate:</span>
                        <h3 className="text-base font-bold text-white">{intv.candidateName}</h3>
                        <p className="text-xs text-amber-400 font-medium">Position: {intv.position}</p>
                      </div>
                    </div>

                    <span className="px-3 py-1 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-400/40 flex items-center gap-1.5 shrink-0 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      INTERVIEW IN PROGRESS
                    </span>
                  </div>

                  {/* Structured Details Matrix */}
                  <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Interviewer:</span>
                      <strong className="text-amber-300 font-bold">{intv.interviewerName}</strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">Room:</span>
                      <strong className="text-slate-200 font-semibold flex items-center gap-1">
                        <DoorOpen className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        {roomDisplay}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">Started:</span>
                      <strong className="text-slate-300 font-mono">{startedTime}</strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">Duration:</span>
                      <strong className="text-amber-400 font-bold font-mono text-sm flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        {liveDuration}
                      </strong>
                    </div>
                  </div>

                  {/* Action Strip: [ END INTERVIEW ] */}
                  <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="text-[11px] text-slate-400">
                      {authStatus.authorized ? (
                        <span className="text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {authStatus.isOverride ? 'Manager override active' : 'Authorized assigned interviewer'}
                        </span>
                      ) : (
                        <span className="text-rose-400 font-medium flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5" />
                          Assigned to {intv.interviewerName}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {cand && (
                        <button
                          onClick={() => onOpenDossier(cand.id)}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition"
                        >
                          Dossier
                        </button>
                      )}

                      {/* Primary End Interview Action */}
                      <button
                        onClick={() => {
                          if (authStatus.authorized) {
                            setActiveEndingInterview(intv);
                          } else {
                            setActionError(authStatus.reason || 'Unauthorized to end this interview.');
                          }
                        }}
                        disabled={!authStatus.authorized}
                        title={authStatus.authorized ? 'End Interview and automatically reset room' : authStatus.reason}
                        className={`px-5 py-2.5 rounded-xl font-black text-xs shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          authStatus.authorized
                            ? 'bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-rose-950/50'
                            : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>END INTERVIEW</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Candidate Priority Queue */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                Live Candidate Intake & Room Allocation Queue
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Full authorized visibility for HR. Human room assignment triggers automated operational dispatch.
              </p>
            </div>
            <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 font-semibold">
              {waitingCandidates.length} Pending
            </span>
          </div>

          {waitingCandidates.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-3xl space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h3 className="text-sm font-bold text-white">No candidates waiting right now</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                When a candidate scans the WCR QR code and submits their live photo and resume, they appear here immediately with zero page refresh.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {waitingCandidates.map((cand) => {
                const intv = interviews.find((i) => i.id === cand.currentInterviewId);
                const hasAssignedRoom = cand.status === 'ROOM_ASSIGNED' || intv?.roomId;

                return (
                  <div
                    key={cand.id}
                    className="p-4 sm:p-5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl shadow-xl space-y-3 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        {cand.livePhoto ? (
                          <img
                            src={cand.livePhoto}
                            alt={cand.fullName}
                            className="w-13 h-13 rounded-2xl object-cover border-2 border-amber-500 shadow-md shrink-0"
                          />
                        ) : (
                          <div className="w-13 h-13 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                            <Users className="w-6 h-6" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-white">{cand.fullName}</h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                              {cand.status}
                            </span>
                          </div>
                          <p className="text-xs text-amber-400 font-medium">{cand.position}</p>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-500" />
                              {cand.currentLocation}
                            </span>
                            {cand.arrivalTime && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                Arrived: {new Date(cand.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                        {hasAssignedRoom && intv ? (
                          <button
                            onClick={() => handleStartInterviewAction(intv.id)}
                            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center gap-1.5"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Start Interview</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onAssignRoom(cand.id, cand.currentInterviewId)}
                            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center gap-1.5"
                          >
                            <DoorOpen className="w-3.5 h-3.5" />
                            <span>Assign Room</span>
                          </button>
                        )}
                        <button
                          onClick={() => onOpenDossier(cand.id)}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700 transition cursor-pointer"
                        >
                          View Dossier
                        </button>
                      </div>
                    </div>

                    {/* Interview Context row */}
                    {intv && (
                      <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="truncate">
                          Scheduled: <strong className="text-slate-200">{intv.roundName}</strong> with{' '}
                          <strong className="text-amber-400">{intv.interviewerName}</strong>
                        </span>
                        <span className="text-slate-500 font-mono text-[10px]">
                          Time: {intv.scheduledTime}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* RIGHT COL: OFFICE ROOMS & PODS (SECTION 5 REQUIREMENT)     */}
        {/* ========================================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <DoorOpen className="w-4 h-4 text-amber-400" />
                Office Rooms & Pods
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Real-time status across Floors 3 & 4.</p>
            </div>
            {resetRequiredRooms.length > 0 && (
              <span className="px-2 py-0.5 bg-amber-500/15 border border-amber-500/40 text-amber-300 rounded-lg text-[10px] font-bold animate-pulse">
                {resetRequiredRooms.length} Sanitizing
              </span>
            )}
          </div>

          <div className="space-y-2.5">
            {rooms.map((room) => {
              const isAvail = room.status === 'AVAILABLE';
              const isAssigned = room.status === 'ASSIGNED';
              const isOccupied = room.status === 'OCCUPIED';
              const isResetRequired = room.status === 'RESET_REQUIRED' || room.status === 'NEEDS_CLEANING';

              return (
                <div
                  key={room.id}
                  className={`p-3.5 bg-slate-900 border rounded-2xl space-y-2 text-xs transition ${
                    isResetRequired
                      ? 'border-amber-500/70 bg-gradient-to-r from-slate-900 to-amber-950/20 shadow-lg ring-1 ring-amber-500/30'
                      : isOccupied
                      ? 'border-rose-500/40'
                      : isAssigned
                      ? 'border-blue-500/40'
                      : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{room.name}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                        isAvail
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : isAssigned
                          ? 'bg-blue-500/10 text-blue-300 border border-blue-500/30'
                          : isOccupied
                          ? 'bg-rose-500/15 text-rose-300 border border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/60 shadow-xs'
                      }`}
                    >
                      {isOccupied && '🔴 OCCUPIED'}
                      {isResetRequired && '🟡 RESET REQUIRED'}
                      {isAssigned && '🔵 ASSIGNED'}
                      {isAvail && '🟢 AVAILABLE'}
                    </span>
                  </div>

                  {/* Status contextual details (Section 5 prompt spec) */}
                  {isOccupied && (
                    <div className="p-2 bg-slate-950/70 border border-rose-500/20 rounded-xl space-y-1 text-[11px] text-slate-300">
                      <div>
                        Candidate: <strong className="text-white font-bold">{room.currentCandidateName || 'Assigned Candidate'}</strong>
                      </div>
                      <div>
                        Interviewer: <strong className="text-amber-400 font-semibold">{room.assignedInterviewerName || 'Nisha'}</strong>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Activity: <span className="text-blue-300">{room.lastInterviewRound || 'Round 1 Interview'}</span>
                      </div>
                    </div>
                  )}

                  {isResetRequired && (
                    <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1 text-[11px]">
                      <div>
                        Candidate: <strong className="text-white font-bold">{room.currentCandidateName || room.lastOccupantName || 'Rahul Sharma'}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Interview:</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                          COMPLETED
                        </span>
                      </div>
                      <div className="pt-1 border-t border-amber-500/20 flex items-center justify-between text-amber-300 font-semibold text-[10px]">
                        <span>Next action:</span>
                        <span className="flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                          Room reset required
                        </span>
                      </div>
                    </div>
                  )}

                  {isAssigned && (
                    <div className="text-[11px] text-slate-300 flex items-center justify-between">
                      <span>Occupant: <strong className="text-amber-400">{room.currentCandidateName}</strong></span>
                      <span className="text-blue-400 font-semibold text-[10px]">Awaiting start</span>
                    </div>
                  )}

                  {isAvail && (
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{room.floor} • Cap: {room.capacity}</span>
                      <span className="text-emerald-400 font-semibold text-[10px]">Ready for allocation</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* HR Information Rule Card */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Room Automation Guarantee</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              When HR ends an active interview, the conference room automatically transitions to <strong className="text-amber-300">RESET REQUIRED</strong> without requiring a manual room release. Pantry is automatically dispatched to sanitize the room before it returns to <strong className="text-emerald-400">AVAILABLE</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Ending Active Interview */}
      {activeEndingInterview && (
        <EndInterviewModal
          interviewId={activeEndingInterview.id}
          candidateName={activeEndingInterview.candidateName}
          interviewerName={activeEndingInterview.interviewerName}
          currentRound={activeEndingInterview.roundName}
          roomName={activeEndingInterview.roomName || 'The Skyline'}
          startedAt={activeEndingInterview.startedAt}
          currentUserId={currentUserId}
          currentUserRole={currentUser?.role || 'HR'}
          currentUserName={currentUser?.name || 'Nisha'}
          onClose={() => setActiveEndingInterview(null)}
          onSuccess={() => {
            setActiveEndingInterview(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
};
