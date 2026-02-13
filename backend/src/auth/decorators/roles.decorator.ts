import { SetMetadata } from '@nestjs/common';
import { RoleUtilisateur } from '../../database/entities';

export const Roles = (...roles: RoleUtilisateur[]) => SetMetadata('roles', roles);
