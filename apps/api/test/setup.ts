process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://ctf:ctf@localhost:5432/ctf_test";
process.env.REDIS_URL = process.env.TEST_REDIS_URL ?? "redis://localhost:6379";
process.env.JWT_SECRET = "test-access-secret-0123456789abcdef";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-0123456789abcdef";
process.env.JWT_ACCESS_TTL_SECONDS = "900";
process.env.JWT_REFRESH_TTL_SECONDS = "604800";
process.env.PASSWORD_RESET_TTL_SECONDS = "3600";
process.env.BCRYPT_ROUNDS = "4";
process.env.RATE_LIMIT_LOGIN = "1000";
process.env.RATE_LIMIT_GENERAL = "10000";
process.env.RATE_LIMIT_SUBMISSION = "10000";
process.env.RATE_LIMIT_UPLOAD = "100";
process.env.FILE_STORAGE_DIR = "/tmp/ctf-test-files";
process.env.FILE_DOWNLOAD_TTL_SECONDS = "300";
process.env.FILE_MAX_BYTES = "26214400";
process.env.PORT = "4001";
