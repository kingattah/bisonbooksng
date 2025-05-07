// Environment variable utility functions

/**
 * Get a required environment variable
 * @param key The environment variable key
 * @returns The environment variable value
 * @throws Error if the environment variable is not set
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    // In production, log the error but don't crash the app
    const errorMessage = `Environment variable ${key} is required but not set. Please check your environment configuration.`
    if (process.env.NODE_ENV === "production") {
      console.error(errorMessage)
      return ""
    } else {
      throw new Error(errorMessage)
    }
  }
  return value
}

/**
 * Get an optional environment variable with a default value
 * @param key The environment variable key
 * @param defaultValue The default value to use if the environment variable is not set
 * @returns The environment variable value or the default value
 */
export function getOptionalEnv(key: string, defaultValue: string): string {
  const value = process.env[key]
  return value || defaultValue
}

/**
 * Supabase environment variables
 */
export const supabaseEnv = {
  get url(): string {
    return getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL")
  },
  get anonKey(): string {
    return getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  },
  get serviceRoleKey(): string {
    return getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY")
  },
}

/**
 * Paystack environment variables
 */
export const paystackEnv = {
  get secretKey(): string {
    return getRequiredEnv("PAYSTACK_SECRET_KEY")
  },
  get publicKey(): string {
    return getRequiredEnv("NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY")
  },
}

/**
 * Application environment variables
 */
export const appEnv = {
  get url(): string {
    return getRequiredEnv("NEXT_PUBLIC_APP_URL")
  },
  get nodeEnv(): string {
    return getOptionalEnv("NODE_ENV", "development")
  },
  get isDevelopment(): boolean {
    return this.nodeEnv === "development"
  },
  get isProduction(): boolean {
    return this.nodeEnv === "production"
  },
}
