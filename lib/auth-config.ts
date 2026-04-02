type AuthConfigEnv = Record<string, string | undefined>;

const truthy = new Set(["1", "true", "yes", "on"]);

function isTruthy(value?: string) {
  if (!value) return false;
  return truthy.has(value.toLowerCase());
}

export function isProductionRuntime(env: AuthConfigEnv) {
  return env.NODE_ENV === "production" || isTruthy(env.VERCEL);
}

export function normalizeAuthUrl(value?: string | null) {
  if (!value) return undefined;

  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return undefined;

  try {
    return new URL(trimmed).toString().replace(/\/+$/, "");
  } catch {
    return undefined;
  }
}

export type ResolvedAuthConfiguration = {
  authSecret?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  hasGoogleProviderConfig: boolean;
  normalizedAuthUrl?: string;
  warnings: string[];
};

export function resolveAuthConfiguration(env: AuthConfigEnv): ResolvedAuthConfiguration {
  const production = isProductionRuntime(env);
  const normalizedAuthUrl = normalizeAuthUrl(env.NEXTAUTH_URL ?? env.AUTH_URL);
  const authSecret = env.NEXTAUTH_SECRET ?? env.AUTH_SECRET;
  const googleClientId = env.GOOGLE_CLIENT_ID;
  const googleClientSecret = env.GOOGLE_CLIENT_SECRET;
  const hasGoogleProviderConfig = Boolean(googleClientId && googleClientSecret);
  const hasPartialGoogleConfig = Boolean(googleClientId || googleClientSecret) && !hasGoogleProviderConfig;
  const warnings: string[] = [];

  if (hasPartialGoogleConfig) {
    const message = "[auth] GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET doivent etre definis ensemble.";
    if (production) {
      throw new Error(message);
    }
    warnings.push(message);
  }

  if (!authSecret) {
    const message = "[auth] NEXTAUTH_SECRET (ou AUTH_SECRET) est requis en production.";
    if (production) {
      throw new Error(message);
    }
    warnings.push(`${message} Fallback local active uniquement hors production.`);
  }

  if (production && !normalizedAuthUrl) {
    throw new Error("[auth] NEXTAUTH_URL (ou AUTH_URL) doit etre defini en production.");
  }

  return {
    authSecret,
    googleClientId,
    googleClientSecret,
    hasGoogleProviderConfig,
    normalizedAuthUrl,
    warnings,
  };
}