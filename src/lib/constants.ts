export const SILO_OPTIONS = [
  "Spread Bet",
  "CFD",
  "LISTED STOCKS",
  "CRYPTO",
  "Wallet",
] as const;

export const ENTITY_OPTIONS = ["UK", "EU", "ROW", "EU CY"] as const;

export const EMAIL_TYPE_OPTIONS = ["marketing", "transactional"] as const;

export type EmailType = (typeof EMAIL_TYPE_OPTIONS)[number];
