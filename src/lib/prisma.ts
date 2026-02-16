// Ensure a fallback DATABASE_URL is provided so Prisma can initialize
// This allows using a local sqlite database even when environment vars are missing
// Prefer a writable tmp path (serverless-friendly). If tmp isn't writable, fall back to repo path.
import fs from "fs";
import * as path from "path";

let dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  try {
    // Ensure /tmp/prisma is writable
    const tmpDir = "/tmp/prisma";
    fs.mkdirSync(tmpDir, { recursive: true });
    // Use file protocol pointing to a temp sqlite database there
    dbUrl = "file:/tmp/prisma/dev.db";
  } catch (e) {
    // Fallback to repository path if /tmp isn't writable
    dbUrl = "file:./prisma/dev.db";
  }
  process.env.DATABASE_URL = dbUrl;
}

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
