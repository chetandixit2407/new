import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DoorOpen,
  UserCheck,
  RefreshCw,
  Sparkles,
  ArrowRight,
  XCircle,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import type { User } from '../types/index.ts';

interface EndInterviewModalProps {
  interviewId: string;
  candidateName: string;
  interviewerName: string;
  currentRound?: string;
  roomName?: string;
  startedAt?: string;
  onClose: () => void;
  onSuccess: () => void;
  currentUserId?: string;
  currentUserRole?: string;
  currentUserName?: string;
}

export const EndInterviewModal: React.FC<EndInterviewModalProps> = ({
  interviewId,
  candidateName,
  interviewerName,
  currentRound = 'Interview Round 1',
  roomName = 'The Skyline',
  startedAt,
  onClose,
  onSuccess,
  currentUserId = 'usr-hr-nisha',
  currentUserRole = 'HR',
  currentUserName = 'Nisha',
}) => {
  // Primary outcome: strictly PASS or FAIL
  const [outcome, setOutcome] = useState<'PASS' | 'FAIL'>('PASS');
  const [remarks, setRemarks] = useState<string>('');
  const [nextRoundName, setNextRoundName] = useState<string>('Round 2 - HR & Culture Fit');
  const [nextInterviewerId, setNextInterviewerId] = useState<string>('');
  const [staffUsers, setStaffUsers] = useState<User[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Live duration calculation
  const [elapsedDuration, setElapsedDuration] = useState<string>('27 min');
  const [clockTimer, setClockTimer] = useState<string>('27:34');

  useEffect(() => {
    const calculateTime = () => {
      const startMs = startedAt ? new Date(startedAt).getTime() : Date.now() - 27 * 60 * 1000;
      const nowMs = Date.now();
      const diffSec = Math.max(1, Math.floor((nowMs - startMs) / 1000));
      const mins = Math.floor(diffSec / 60);
      const secs = diffSec % 60;
      setElapsedDuration(`${mins} min ${secs}s`);
      setClockTimer(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users?role=ADMIN');
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        const potential = data.users.filter(
          (u: User) =>
            u.isActive &&
            (u.role === 'INTERVIEWER' || u.role === 'HR' || u.role === 'CEO' || u.role === 'CO_FOUNDER' || u.role === 'ADMIN')
        );
        setStaffUsers(potential);
        if (potential.length > 0) {
          // Select co-founder or interviewer by default
          const defaultUser = potential.find((u: User) => u.id !== currentUserId) || potential[0];
          setNextInterviewerId(defaultUser.id);
        }
      }
    } catch (err) {
      console.error('Failed to load users for next interviewer selection', err);
    }
  };

  const isFormValid =
    remarks.trim().length > 0 &&
    (outcome === 'FAIL' || (outcome === 'PASS' && nextInterviewerId.trim().length > 0 && nextRoundName.trim().length > 0));

  const handleConfirmEndInterview = async () => {
    if (!isFormValid) {
      setError('Please provide mandatory remarks before confirming outcome.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/interviews/${interviewId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId,
          'x-user-role': currentUserRole,
          'x-user-name': currentUserName,
        },
        body: JSON.stringify({
          userId: currentUserId,
          userRole: currentUserRole,
          userName: currentUserName,
          outcome,
          notes: remarks.trim(),
          nextInterviewerId: outcome === 'PASS' ? nextInterviewerId : undefined,
          nextRoundName: outcome === 'PASS' ? nextRoundName : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete interview on server');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                Official Interview Conclusion
              </span>
              <h2 className="text-lg font-black text-white tracking-tight">END INTERVIEW OUTCOME</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-300">
              {error}
            </div>
          )}

          {/* Active Interview Context Card */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2.5">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 block">Candidate:</span>
                <strong className="text-white text-sm font-bold">{candidateName}</strong>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Current Interviewer:</span>
                <strong className="text-amber-400 text-sm font-bold">{interviewerName}</strong>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Assigned Room:</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <DoorOpen className="w-3.5 h-3.5 text-blue-400" />
                  <strong className="text-slate-200 font-semibold">{roomName}</strong>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Duration Elapsed:</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <strong className="text-amber-300 font-bold font-mono">{elapsedDuration} ({clockTimer})</strong>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Stage: <strong className="text-slate-300">{currentRound}</strong></span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Live Transaction Mode
              </span>
            </div>
          </div>

          {/* Primary Outcome Selector: Exactly PASS / FAIL */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-200 text-xs uppercase tracking-wider">
              1. Primary Interview Outcome <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* PASS OPTION */}
              <button
                type="button"
                onClick={() => setOutcome('PASS')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                  outcome === 'PASS'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/40 shadow-lg'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        outcome === 'PASS' ? 'border-emerald-400 bg-emerald-500' : 'border-slate-600'
                      }`}
                    >
                      {outcome === 'PASS' && <span className="w-1.5 h-1.5 bg-slate-950 rounded-full" />}
                    </span>
                    <strong className="text-sm font-black text-white">PASS</strong>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-[11px] text-slate-400">
                  Advance to next stage & assign next interviewer
                </p>
              </button>

              {/* FAIL OPTION */}
              <button
                type="button"
                onClick={() => setOutcome('FAIL')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                  outcome === 'FAIL'
                    ? 'bg-rose-500/15 border-rose-500 text-rose-300 ring-2 ring-rose-500/40 shadow-lg'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        outcome === 'FAIL' ? 'border-rose-400 bg-rose-500' : 'border-slate-600'
                      }`}
                    >
                      {outcome === 'FAIL' && <span className="w-1.5 h-1.5 bg-slate-950 rounded-full" />}
                    </span>
                    <strong className="text-sm font-black text-white">FAIL</strong>
                  </div>
                  <XCircle className="w-4 h-4 text-rose-400" />
                </div>
                <p className="text-[11px] text-slate-400">
                  Mark as failed/rejected & route to reception checkout
                </p>
              </button>
            </div>
          </div>

          {/* Remarks input (Mandatory for both PASS and FAIL) */}
          <div className="space-y-1.5">
            <label className="block font-semibold text-slate-300">
              {outcome === 'PASS' ? 'Interview Remarks' : 'Failure Remarks'} <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={2}
              required
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={
                outcome === 'PASS'
                  ? 'e.g. Candidate demonstrated strong communication and relevant real-estate experience.'
                  : 'e.g. Experience does not match the current position requirements.'
              }
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-hidden focus:border-amber-400 transition"
            />
          </div>

          {/* Next Stage & Interviewer Assignment (When PASS is selected) */}
          {outcome === 'PASS' && (
            <div className="p-4 bg-slate-950 border border-emerald-500/30 rounded-2xl space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Next Interview Routing</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Next Interview / Stage <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={nextRoundName}
                    onChange={(e) => setNextRoundName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-hidden focus:border-emerald-400"
                  >
                    <option value="Round 2 - HR & Culture Fit">Round 2 - HR & Culture Fit</option>
                    <option value="Round 2 - Technical & Sales Assessment">Round 2 - Technical & Sales Assessment</option>
                    <option value="Round 3 - Founders / Management">Round 3 - Founders / Management (Kimmi Mam / Lalit Sir)</option>
                    <option value="Final Executive Review">Final Executive Review</option>
                    <option value="Final Commercial & Offer Discussion">Final Commercial & Offer Discussion</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Next Interviewer <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={nextInterviewerId}
                    onChange={(e) => setNextInterviewerId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-hidden focus:border-emerald-400"
                  >
                    {staffUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role} - {u.designation || u.department})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-300 flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Candidate will transition to <strong>WAITING_FOR_NEXT_INTERVIEWER</strong> and the assigned interviewer will receive an immediate real-time alert without refreshing.
                </span>
              </div>
            </div>
          )}

          {/* When FAIL is selected */}
          {outcome === 'FAIL' && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-[11px] text-rose-300 flex items-start gap-2 animate-in fade-in duration-200">
              <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>
                Candidate status will change immediately to <strong>INTERVIEW_FAILED</strong>. Reception will receive an alert to assist with visitor checkout and exit.
              </span>
            </div>
          )}

          {/* Room Transition Notice */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-start gap-2 text-[10px] text-slate-400">
            <DoorOpen className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>Automatic Room Reset:</strong> <span className="text-slate-200 font-semibold">{roomName}</span> will automatically transition to <strong className="text-amber-400">RESET REQUIRED</strong> and dispatch a sanitization task to the Pantry team.
            </span>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmEndInterview}
            disabled={submitting || !isFormValid}
            className={`px-6 py-2.5 rounded-xl text-xs font-black shadow-lg transition cursor-pointer flex items-center gap-1.5 ${
              outcome === 'PASS'
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 disabled:opacity-50'
                : 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white disabled:opacity-50'
            }`}
          >
            {submitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Confirming Outcome...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>CONFIRM OUTCOME</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
