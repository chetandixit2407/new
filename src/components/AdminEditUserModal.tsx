import React, { useState } from 'react';
import {
  X,
  Shield,
  KeyRound,
  User as UserIcon,
  Mail,
  Phone,
  Briefcase,
  Building,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Trash2,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  RefreshCw,
} from 'lucide-react';
import type { UserRole } from '../types/index.ts';

interface AdminEditUserModalProps {
  user: any;
  adminUserId?: string;
  adminName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const AVAILABLE_PERMISSIONS: { key: string; label: string; desc: string }[] = [
  { key: 'view_candidate', label: 'View Candidate Profiles', desc: 'Read candidate information and current workflow status' },
  { key: 'edit_candidate', label: 'Edit Candidate Profiles', desc: 'Modify candidate contact details and notes' },
  { key: 'candidate.delete', label: 'Delete / Archive Candidates', desc: 'Soft-delete candidate records from active radar' },
  { key: 'capture_arrival_photo', label: 'Capture Arrival Photos', desc: 'Front desk and reception live photo verification' },
  { key: 'view_resume', label: 'View Resumes', desc: 'Access and preview uploaded candidate resume PDFs' },
  { key: 'view_government_id', label: 'View Government IDs', desc: 'Access candidate Aadhaar/PAN/Passport documents' },
  { key: 'start_interview', label: 'Start Interview Sessions', desc: 'Launch interview timer and mark room as in session' },
  { key: 'complete_interview', label: 'Conclude Interviews (PASS/FAIL)', desc: 'Submit final outcome, stage routing and remarks' },
  { key: 'assign_room', label: 'Assign Office Rooms', desc: 'Allocate pods and cabins with double-booking lock' },
  { key: 'manage_users', label: 'Manage Staff Users', desc: 'Admin authority to provision accounts and credentials' },
  { key: 'manage_settings', label: 'Configure Office Rules', desc: 'Adjust field visibility and automated pantry workflows' },
];

export const AdminEditUserModal: React.FC<AdminEditUserModalProps> = ({
  user,
  adminUserId = 'usr-admin-sameer',
  adminName = 'Sameer Sir (Admin)',
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [username, setUsername] = useState(user.username || user.userId || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [role, setRole] = useState<UserRole>(user.role || 'HR');
  const [department, setDepartment] = useState(user.department || '');
  const [designation, setDesignation] = useState(user.designation || '');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Time-based Scheduled Access
  const [accessStart, setAccessStart] = useState(user.accessStart ? user.accessStart.slice(0, 16) : '');
  const [accessEnd, setAccessEnd] = useState(user.accessEnd ? user.accessEnd.slice(0, 16) : '');

  // Permissions & Overrides
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    Array.isArray(user.permissions) ? user.permissions : []
  );
  const [deniedPermissions, setDeniedPermissions] = useState<string[]>(
    user.userOverrides?.denied || []
  );

  const [isActive, setIsActive] = useState<boolean>(user.isActive !== false);

  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteReason, setDeleteReason] = useState('Account decommissioning');

  const togglePermission = (permKey: string) => {
    if (selectedPermissions.includes(permKey)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== permKey));
      // Add to denied overrides so role default won't re-grant it
      if (!deniedPermissions.includes(permKey)) {
        setDeniedPermissions([...deniedPermissions, permKey]);
      }
    } else {
      setSelectedPermissions([...selectedPermissions, permKey]);
      setDeniedPermissions(deniedPermissions.filter((p) => p !== permKey));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId,
          adminName,
          adminRole: 'ADMIN',
          name,
          email,
          username,
          phone,
          role,
          department,
          designation,
          password: newPassword ? newPassword : undefined,
          accessStart: accessStart ? new Date(accessStart).toISOString() : null,
          accessEnd: accessEnd ? new Date(accessEnd).toISOString() : null,
          permissions: selectedPermissions,
          userOverrides: {
            granted: selectedPermissions,
            denied: deniedPermissions,
          },
          isActive,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onSuccess();
        onClose();
      } else {
        setActionError(data.error || 'Failed to update staff configuration.');
      }
    } catch (err: any) {
      setActionError(err?.message || 'Network error.');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickActivate = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUserId, adminName, adminRole: 'ADMIN' }),
      });
      const data = await res.json();
      if (data.success) {
        setIsActive(true);
        onSuccess();
      } else {
        setActionError(data.error || 'Failed to activate user.');
      }
    } catch (err: any) {
      setActionError(err?.message || 'Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickDeactivate = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/deactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUserId, adminName, adminRole: 'ADMIN', reason: 'Deactivated by Administrator' }),
      });
      const data = await res.json();
      if (data.success) {
        setIsActive(false);
        onSuccess();
      } else {
        setActionError(data.error || 'Failed to deactivate user.');
      }
    } catch (err: any) {
      setActionError(err?.message || 'Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeNow = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/revoke-now`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUserId, adminName, adminRole: 'ADMIN', reason: 'Immediate real-time revocation' }),
      });
      const data = await res.json();
      if (data.success) {
        setIsActive(false);
        onSuccess();
        onClose();
      } else {
        setActionError(data.error || 'Failed to revoke access.');
      }
    } catch (err: any) {
      setActionError(err?.message || 'Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUserId, adminName, adminRole: 'ADMIN', reason: deleteReason }),
      });
      const data = await res.json();
      if (data.success) {
        setShowDeleteConfirm(false);
        onSuccess();
        onClose();
      } else {
        setActionError(data.error || 'Failed to delete user.');
      }
    } catch (err: any) {
      setActionError(err?.message || 'Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 text-slate-100 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">{user.name}</h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}
              >
                {isActive ? 'ACTIVE' : 'DEACTIVATED'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Admin Real-Time Access & Permission Management (ID: <span className="font-mono text-purple-300">{user.id}</span>)
            </p>
          </div>
        </div>

        {actionError && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Identity & Basic Details */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5" /> Staff Identity & Profile
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Username / ID</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-hidden focus:border-amber-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Mobile Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-amber-400 font-semibold text-amber-300"
                >
                  <option value="CEO">CEO (Lalit Sir)</option>
                  <option value="CO_FOUNDER">CO_FOUNDER (Kimmi Mam)</option>
                  <option value="ADMIN">ADMIN (Sameer Sir)</option>
                  <option value="HR">HR Executive</option>
                  <option value="INTERVIEWER">Interviewer</option>
                  <option value="RECEPTION">Reception & Escort</option>
                  <option value="PANTRY">Pantry Steward</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Designation</label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Admin Password Override (Leave blank to keep current)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password to overwrite"
                  className="w-full pl-3 pr-10 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Time-Based Scheduled Access */}
          <div className="p-4 bg-slate-950 border border-purple-500/30 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Time-Based / Scheduled Access Engine
              </h4>
              <span className="text-[11px] text-slate-400 font-mono">
                Current Server Time: Authoritative
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Access Start (Activation Time)
                </label>
                <input
                  type="datetime-local"
                  value={accessStart}
                  onChange={(e) => setAccessStart(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-purple-400"
                />
                <p className="text-[10px] text-slate-500 mt-1">Leave empty for immediate operational activation</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Access End (Expiration Time)
                </label>
                <input
                  type="datetime-local"
                  value={accessEnd}
                  onChange={(e) => setAccessEnd(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-purple-400"
                />
                <p className="text-[10px] text-slate-500 mt-1">Leave empty for no expiration date</p>
              </div>
            </div>
          </div>

          {/* Individual Permissions & Overrides */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" /> Real-Time Permissions & User Overrides
              </h4>
              <span className="text-[11px] text-slate-400">
                {selectedPermissions.length} Active Permissions
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Modifications propagate instantly to the user's active session without requiring manual logout/login.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {AVAILABLE_PERMISSIONS.map((perm) => {
                const isChecked = selectedPermissions.includes(perm.key);
                return (
                  <label
                    key={perm.key}
                    onClick={() => togglePermission(perm.key)}
                    className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition select-none ${
                      isChecked
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="w-4 h-4 rounded-md accent-amber-500 mt-0.5 shrink-0"
                    />
                    <div>
                      <strong className="block text-xs font-semibold text-white">{perm.label}</strong>
                      <span className="text-[10px] text-slate-400">{perm.desc}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Actions & Lifecycle Buttons */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800">
            <div className="flex items-center gap-2">
              {isActive ? (
                <button
                  type="button"
                  onClick={handleQuickDeactivate}
                  disabled={saving}
                  className="px-3 py-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Deactivate Account</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleQuickActivate}
                  disabled={saving}
                  className="px-3 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Activate Account</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleRevokeNow}
                disabled={saving}
                className="px-3 py-2 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                title="Immediately revokes active sessions and realtime token"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Revoke Access Now</span>
              </button>

              {user.id !== 'usr-admin-sameer' && user.role !== 'CEO' && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={saving}
                  className="px-3 py-2 bg-slate-800 hover:bg-rose-950 border border-slate-700 hover:border-rose-700 text-rose-300 font-semibold rounded-xl transition cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete User</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 text-white font-black text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Save & Apply Real-Time</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* DELETE USER CONFIRMATION SUB-MODAL */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 backdrop-blur-xs p-4">
            <div className="bg-slate-900 border border-rose-500/60 rounded-3xl p-6 max-w-md w-full space-y-4 text-slate-100 shadow-2xl animate-in zoom-in-95">
              <div className="w-12 h-12 bg-rose-500/20 text-rose-400 border border-rose-500/40 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1.5">
                <h3 className="text-lg font-bold text-white">Delete Staff User?</h3>
                <p className="text-xs text-slate-300 font-medium">
                  Staff Member: <strong className="text-amber-400">{user.name}</strong> ({user.email})
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  This action will soft-delete the account, revoke active sessions, and mark the user as deleted while <strong className="text-slate-200">strictly preserving historical audit logs and actor identity</strong>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Reason for Deletion</label>
                <input
                  type="text"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteUser}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white font-black text-xs rounded-xl shadow-lg transition cursor-pointer"
                >
                  {saving ? 'Deleting...' : 'Confirm Soft Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
