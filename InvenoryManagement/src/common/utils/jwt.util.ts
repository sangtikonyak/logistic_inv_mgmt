import type { UserRole } from '../../modules/auth/types/auth.types';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';

const JWT_SECRET = env.JWT_SECRET;
const JWT_EXPIRES_IN = env.JWT_EXPIRES_IN as SignOptions['expiresIn'];
const REFRESH_SECRET = env.REFRESH_SECRET;
const REFRESH_EXPIRES_IN = env.REFRESH_EXPIRES_IN as SignOptions['expiresIn'];

export interface JwtPayload {
  userId: string;
  tenantId: string;
  role: UserRole;
}

export const generateTokens = (payload: JwtPayload) => {
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });

  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
};
