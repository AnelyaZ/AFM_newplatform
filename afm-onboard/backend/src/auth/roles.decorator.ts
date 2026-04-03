import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export type Role = 'EMPLOYEE' | 'ADMIN';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);


