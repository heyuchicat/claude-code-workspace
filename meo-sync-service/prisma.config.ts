// .envファイルが無い環境(git clone直後など)でも動くよう、
// DATABASE_URLが未設定の場合はデフォルト値にフォールバックする。
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"] ?? "file:./dev.db",
  },
});
