import type { Permission } from "../types/admin";
import { Role } from "../types/enums";

// Role hierarchy used for RBAC-aware user management. Superiors may only
// manage strictly lower-ranked accounts (except SUPER_ADMIN, which all admins
// may manage).
export const ROLE_RANK: Record<Role, number> = {
  [Role.USER]: 0,
  [Role.AUTHOR]: 1,
  [Role.MODERATOR]: 2,
  [Role.ADMIN]: 3,
  [Role.SUPER_ADMIN]: 4,
};

export const STAFF_ROLES: readonly Role[] = [
  Role.AUTHOR,
  Role.MODERATOR,
  Role.ADMIN,
  Role.SUPER_ADMIN,
];

export const PERMISSION_MATRIX: Record<Permission, readonly Role[]> = {
  "content.manage": [Role.AUTHOR, Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN],
  "announcements.manage": [
    Role.AUTHOR,
    Role.MODERATOR,
    Role.ADMIN,
    Role.SUPER_ADMIN,
  ],
  "events.manage": [Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN],
  "files.upload": [Role.AUTHOR, Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN],
  "users.manage": [Role.ADMIN, Role.SUPER_ADMIN],
  "teams.moderate": [Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN],
  "analytics.view": [Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN],
  "audit.view": [Role.ADMIN, Role.SUPER_ADMIN],
  "notifications.broadcast": [
    Role.MODERATOR,
    Role.ADMIN,
    Role.SUPER_ADMIN,
  ],
};

export function getRolesForPermission(
  permission: Permission,
): readonly Role[] {
  return PERMISSION_MATRIX[permission];
}

export function roleHasPermission(
  role: Role,
  permission: Permission,
): boolean {
  return PERMISSION_MATRIX[permission].includes(role);
}

export function roleRank(role: Role): number {
  return ROLE_RANK[role] ?? ROLE_RANK[Role.USER];
}