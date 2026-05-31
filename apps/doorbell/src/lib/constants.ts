/**
 * Application constants
 */

// Doorbell visit expiration time in minutes (for display purposes)
export const VISIT_EXPIRY_TIME = 15;

// Doorbell visit expiration time in milliseconds
export const VISIT_EXPIRY_TIME_MS = 60 * 1000 * VISIT_EXPIRY_TIME; // 1 minute

/**
 * Check if a doorbell visit has expired based on creation time
 * @param createdAt - The creation date of the visit
 * @returns true if the visit has expired, false otherwise
 */
export function isVisitExpired(createdAt: Date): boolean {
  const now = new Date();
  const timeDiff = now.getTime() - createdAt.getTime();
  return timeDiff > VISIT_EXPIRY_TIME_MS;
}
