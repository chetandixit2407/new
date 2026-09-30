import crypto from 'crypto';
import type { User, UserRole } from '../types/index.ts';

const DEFAULT_SALT = 'wcr_office_ops_salt';

export function hashPassword(password: string, salt = DEFAULT_SALT): string {
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash?: string): boolean {
  if (!storedHash) return false;
  if (storedHash.includes(':')) {
    const [salt, hash] = storedHash.split(':');
    const computed = crypto.pbkdf2Sync(password, salt, 1000, 32, 'sha256').toString('hex');
    return computed === hash;
  }
  // Fallback for simple tokens
  return password === storedHash;
}

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  CEO: [
    'ALL_PERMISSIONS',
    'FULL_ACCESS',
    'VIEW_DASHBOARDS',
    'VIEW_CANDIDATES',
    'view_candidate',
    'VIEW_DOCUMENTS',
    'DOWNLOAD_DOCUMENTS',
    'MANAGE_ROOMS',
    'MANAGE_INTERVIEWS',
    'START_INTERVIEW',
    'END_INTERVIEW',
    'VIEW_AUDIT_LOGS',
    'VIEW_REPORTS',
  ],
  CO_FOUNDER: [
    'ALL_PERMISSIONS',
    'FULL_ACCESS',
    'VIEW_DASHBOARDS',
    'VIEW_CANDIDATES',
    'view_candidate',
    'VIEW_DOCUMENTS',
    'DOWNLOAD_DOCUMENTS',
    'MANAGE_ROOMS',
    'MANAGE_INTERVIEWS',
    'START_INTERVIEW',
    'END_INTERVIEW',
    'VIEW_AUDIT_LOGS',
    'VIEW_REPORTS',
  ],
  ADMIN: [
    'ALL_PERMISSIONS',
    'FULL_ACCESS',
    'MANAGE_USERS',
    'MANAGE_ROOMS',
    'MANAGE_SETTINGS',
    'VIEW_CANDIDATES',
    'view_candidate',
    'EDIT_CANDIDATE',
    'edit_candidate',
    'DELETE_CANDIDATE',
    'candidate.delete',
    'VIEW_DOCUMENTS',
    'DOWNLOAD_DOCUMENTS',
    'VIEW_AUDIT_LOGS',
    'VIEW_REPORTS',
    'APPROVE_CHANGE_REQUESTS',
    'MANAGE_INTERVIEWS',
    'INTERVIEW_OVERRIDE',
  ],
  HR: [
    'FULL_ACCESS',
    'HR_FULL_ACCESS',
    'VIEW_CANDIDATES',
    'view_candidate',
    'EDIT_CANDIDATE',
    'edit_candidate',
    'DELETE_CANDIDATE',
    'candidate.delete',
    'VIEW_DOCUMENTS',
    'DOWNLOAD_DOCUMENTS',
    'ASSIGN_ROOMS',
    'MANAGE_INTERVIEWS',
    'START_INTERVIEW',
    'start_interview',
    'END_INTERVIEW',
    'complete_interview',
    'VIEW_TIMELINE',
    'RECEIVE_ALERTS',
    'APPROVE_CHANGE_REQUESTS',
  ],
  INTERVIEWER: [
    'VIEW_ASSIGNED_CANDIDATES',
    'view_candidate',
    'VIEW_RESUME',
    'START_INTERVIEW',
    'start_interview',
    'END_INTERVIEW',
    'complete_interview',
    'SUBMIT_FEEDBACK',
  ],
  RECEPTION: [
    'RECEPTION_OPERATIONAL_VIEW',
    'CAPTURE_PHOTO',
    'CHECK_IN_CANDIDATE',
    'VIEW_ASSIGNED_ROOMS',
    'REQUEST_CHANGE',
    'DELETE_CANDIDATE',
    'candidate.delete',
    'VIEW_CANDIDATES',
    'view_candidate_operational',
  ],
  PANTRY: [
    'PANTRY_TASK_VIEW',
    'PANTRY_TASK_COMPLETE',
  ],
  EMPLOYEE: ['BASIC_VIEW'],
  MANAGER: ['TEAM_VIEW', 'INTERVIEW_VIEW', 'view_candidate'],
  VISITOR_COORDINATOR: ['VISITOR_VIEW', 'CHECK_IN_CANDIDATE'],
  FACILITIES: ['ROOM_VIEW', 'MAINTENANCE_TOGGLE'],
  SECURITY: ['GATE_VIEW', 'VISITOR_LOG'],
  SUPER_ADMIN: ['ALL_PERMISSIONS', 'FULL_ACCESS'],
};

// ==========================================
// REAL-TIME ACCESS & SCHEDULED ENGINE
// ==========================================

export type EffectiveAccessStatus = 'ACTIVE' | 'NOT_YET_ACTIVE' | 'EXPIRED' | 'INACTIVE' | 'DELETED';

export function calculateEffectiveAccess(user: User, serverNow = new Date()): EffectiveAccessStatus {
  if (user.isDeleted || user.status === 'DELETED') {
    return 'DELETED';
  }

  if (user.isActive === false || user.status === 'INACTIVE') {
    return 'INACTIVE';
  }

  const nowMs = serverNow.getTime();

  if (user.accessStart) {
    const startMs = new Date(user.accessStart).getTime();
    if (!isNaN(startMs) && nowMs < startMs) {
      return 'NOT_YET_ACTIVE';
    }
  }

  if (user.accessEnd) {
    const endMs = new Date(user.accessEnd).getTime();
    if (!isNaN(endMs) && nowMs > endMs) {
      return 'EXPIRED';
    }
  }

  return 'ACTIVE';
}

export function getEffectivePermissions(user: User, serverNow = new Date()): string[] {
  const accessStatus = calculateEffectiveAccess(user, serverNow);
  if (accessStatus !== 'ACTIVE') {
    return [];
  }

  const roleBase = ROLE_PERMISSIONS[user.role] || [];
  const userDirect = user.permissions || [];
  const grantedOverrides = user.userOverrides?.granted || [];
  const deniedOverrides = user.userOverrides?.denied || [];

  const combined = new Set<string>([...roleBase, ...userDirect, ...grantedOverrides]);

  for (const denied of deniedOverrides) {
    combined.delete(denied);
    // Also delete alias
    if (denied === 'candidate.delete') combined.delete('DELETE_CANDIDATE');
    if (denied === 'DELETE_CANDIDATE') combined.delete('candidate.delete');
  }

  return Array.from(combined);
}

export function hasPermission(user: User, permissionKey: string, serverNow = new Date()): boolean {
  const effective = getEffectivePermissions(user, serverNow);

  if (effective.includes('ALL_PERMISSIONS') || effective.includes('FULL_ACCESS')) {
    // If permission is explicitly denied in overrides, deny it even for full access
    const deniedOverrides = user.userOverrides?.denied || [];
    if (deniedOverrides.includes(permissionKey)) return false;
    if (permissionKey === 'candidate.delete' && deniedOverrides.includes('DELETE_CANDIDATE')) return false;
    if (permissionKey === 'DELETE_CANDIDATE' && deniedOverrides.includes('candidate.delete')) return false;
    return true;
  }

  // Check direct or alias
  if (effective.includes(permissionKey)) return true;

  if (permissionKey === 'candidate.delete' && effective.includes('DELETE_CANDIDATE')) return true;
  if (permissionKey === 'DELETE_CANDIDATE' && effective.includes('candidate.delete')) return true;

  if (permissionKey === 'start_interview' && (effective.includes('START_INTERVIEW') || effective.includes('MANAGE_INTERVIEWS'))) return true;
  if (permissionKey === 'START_INTERVIEW' && (effective.includes('start_interview') || effective.includes('MANAGE_INTERVIEWS'))) return true;

  if (permissionKey === 'complete_interview' && (effective.includes('END_INTERVIEW') || effective.includes('MANAGE_INTERVIEWS'))) return true;
  if (permissionKey === 'END_INTERVIEW' && (effective.includes('complete_interview') || effective.includes('MANAGE_INTERVIEWS'))) return true;

  return false;
}
