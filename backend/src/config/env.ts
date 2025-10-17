import 'dotenv/config';

const requiredEnv = [
  'DATABASE_URL',
  'JWT_SECRET',
  'PORT',
  'CLIENT_ORIGIN',
  'DATA_ENCRYPTION_KEY',
  'ADMIN_ALLOWED_HOSTS',
  'AGENT_ALLOWED_HOSTS',
] as const;

type RequiredEnvKey = typeof requiredEnv[number];

type EnvConfig = Record<RequiredEnvKey, string>;

function loadEnv(): EnvConfig {
  const config: Partial<EnvConfig> = {};

  for (const key of requiredEnv) {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    config[key] = value;
  }

  return config as EnvConfig;
}

export const env = loadEnv();
