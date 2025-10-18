// ──────────────────────────────────────────────
// ✅ Firebase Functions v2 + Express + Prisma
// ──────────────────────────────────────────────

import {onRequest} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import express from "express";
import {PrismaClient} from "@prisma/client";

// ─── Secrets (from Firebase Secret Manager) ───
const DATABASE_URL = defineSecret("DATABASE_URL");

// ─── Express + Prisma setup ───────────────────
const app = express();
const prisma = new PrismaClient();

// Health-check route
app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT NOW()`;
    res.status(200).send("✅ Connected to Cloud SQL PostgreSQL successfully!");
  } catch (error) {
    console.error("❌ Database connection error:", error);
    res.status(500).send("❌ Failed to connect to the database.");
  }
});

// Example base route
app.get("/", (_req, res) => {
  res.send("Bills25 Cloud Function (Gen 2) is live 🚀");
});

// ─── Export Firebase Function (2nd Gen) ───────
export const api = onRequest(
  {
    region: "us-central1", // same region as your DB
    secrets: [DATABASE_URL] // securely inject DATABASE_URL
  },
  app
);
