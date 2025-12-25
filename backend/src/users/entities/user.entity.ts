import { UserRole } from '@prisma/client';

export class User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  ssoProvider?: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}
