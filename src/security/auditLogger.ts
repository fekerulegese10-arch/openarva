import { appendFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { recordAudit } from './privacy.js';

export type EnterpriseRole = 'admin' | 'operator' | 'analyst' | 'agent' | 'auditor' | 'readonly';
export type EnterprisePermission = 'ai:query' | 'call:handle' | 'customer:read' | 'customer:write' | 'payment:read' | 'payment:write' | 'system:execute' | 'audit:read';

const permissions: Record<EnterpriseRole, EnterprisePermission[]> = {
  admin: ['ai:query', 'call:handle', 'customer:read', 'customer:write', 'payment:read', 'payment:write', 'system:execute', 'audit:read'],
  operator: ['ai:query', 'call:handle', 'customer:read', 'customer:write'],
  analyst: ['ai:query', 'customer:read', 'payment:read'],
  agent: ['ai:query', 'call:handle', 'customer:read'],
  auditor: ['audit:read', 'customer:read', 'payment:read'],
  readonly: ['ai:query'],
};

const enterpriseAuditPath = join(homedir(), '.openarva', 'enterprise-audit.log');

export function hasPermission(role: EnterpriseRole, permission: EnterprisePermission) { return permissions[role]?.includes(permission) || false; }

export function requirePermission(role: EnterpriseRole, permission: EnterprisePermission) {
  if (!hasPermission(role, permission)) throw new Error(`Role ${role} is not authorized for ${permission}.`);
}

export function auditEnterpriseEvent(event: { action: string; actor: string; role: EnterpriseRole; outcome: 'allowed' | 'denied' | 'error'; details?: Record<string, unknown> }) {
  mkdirSync(join(homedir(), '.openarva'), { recursive: true });
  const line = JSON.stringify({ ...event, timestamp: new Date().toISOString() });
  appendFileSync(enterpriseAuditPath, `${line}\n`, 'utf8');
  recordAudit(`enterprise:${event.action}`, JSON.stringify({ role: event.role, outcome: event.outcome, details: event.details }), event.actor);
}

export function enterpriseAuditLogPath() { return enterpriseAuditPath; }
