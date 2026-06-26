import { Request } from 'express';

export interface AuthUser {
  userId: number;
  email: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

export type UserFilter = {
  userId: number;
  role: string;
};
