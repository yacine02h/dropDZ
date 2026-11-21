// ============================================================
// server.ts — Express API Server + Dashboard Host
// ============================================================
import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import * as dotenv from "dotenv";
import { getAllTargets, getTargetById, addTarget, removeTarget } from "./targetsStore";
import { appendHistory, getHistory, getTargetHistory } from "./historyStore";
import { getLastSnapshot, listSnapshots } from "../storage/snapshotStore";
import { runAllTargets } from "../runner/watchRunner";
import { WatchTarget } from "../types/watcher.types";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT ?? "3000", 10);

// ── Middleware ────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../../public")));

// ── Track running checks to prevent duplicates ────────────
const runningChecks = new Set<string>();

// ============================================================
// GET /api/targets — list all targets + their latest snapshot
// ============================================================
app.get("/api/targets", (_req: Request, res: Response) => {
  const targets = getAllTargets();
  const snapshots = listSnapshots();
  const snapshotMap = new Map(snapshots.map((s) => [s.targetId, s]));

  const result = targets.map((t) => ({
    ...t,
    snapshot: snapshotMap.get(t.id) ?? null,
    isChecking: runningChecks.has(t.id),
  }));

  res.json({ success: true, data: result });
});

// ============================================================
// POST /api/targets — add a new target
// ============================================================
app.post("/api/targets", (req: Request, res: Response) => {
  const body = req.body as Partial<WatchTarget>;

  if (!body.id || !body.name || !body.url || !body.fields?.length) {
    res.status(400).json({ success: false, error: "Missing required fields: id, name, url, fields" });
    return;
  }

  // Validate URL
  try {
    new URL(body.url);
  } catch {
    res.status(400).json({ success: false, error: "Invalid URL format" });
    return;
  }

  const target: WatchTarget = {
    id: body.id.trim().toLowerCase().replace(/\s+/g, "-"),
    name: body.name.trim(),
    url: body.url.trim(),
    fields: body.fields,
    alertCondition: body.alertCondition ?? "any_change",
  };

  try {
    addTarget(target);
    res.status(201).json({ success: true, data: target });
  } catch (err) {
    res.status(409).json({ success: false, error: (err as Error).message });
  }
});

// ============================================================
// DELETE /api/targets/:id — remove a target
// ============================================================
app.delete("/api/targets/:id", (req: Request, res: Response) => {
  const removed = removeTarget(String(req.params.id));
  if (!removed) {
    res.status(404).json({ success: false, error: "Target not found" });
    return;
  }
  res.json({ success: true });
});

// ============================================================
// POST /api/targets/:id/check — run a single check
// ============================================================
app.post("/api/targets/:id/check", async (req: Request, res: Response) => {
  const id = String(req.params.id);

  if (runningChecks.has(id)) {
    res.status(409).json({ success: false, error: "Check already running for this target" });
    return;
  }

  const target = getTargetById(id);
  if (!target) {
    res.status(404).json({ success: false, error: "Target not found" });
    return;
  }

  runningChecks.add(id);
  try {
    const [report] = await runAllTargets([target]);
    appendHistory(report);
    const snapshot = getLastSnapshot(id);
    res.json({ success: true, data: { report, snapshot } });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  } finally {
    runningChecks.delete(id);
  }
});

// ============================================================
// POST /api/check-all — run all targets
// ============================================================
app.post("/api/check-all", async (_req: Request, res: Response) => {
  const allTargets = getAllTargets();
  if (!allTargets.length) {
    res.json({ success: true, data: [] });
    return;
  }

  for (const t of allTargets) runningChecks.add(t.id);
  try {
    const reports = await runAllTargets(allTargets);
    reports.forEach((r) => appendHistory(r));
    res.json({ success: true, data: reports });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  } finally {
    allTargets.forEach((t) => runningChecks.delete(t.id));
  }
});

// ============================================================
// GET /api/history — get recent activity
// ============================================================
app.get("/api/history", (req: Request, res: Response) => {
  const limit = parseInt(String(req.query.limit ?? "30"), 10);
  res.json({ success: true, data: getHistory(limit) });
});

// ============================================================
// GET /api/history/:targetId — target-specific history
// ============================================================
app.get("/api/history/:targetId", (req: Request, res: Response) => {
  res.json({ success: true, data: getTargetHistory(String(req.params.targetId)) });
});

// ============================================================
// GET /api/status — health check
// ============================================================
app.get("/api/status", (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: "running",
      targets: getAllTargets().length,
      timestamp: new Date().toISOString(),
    },
  });
});

// ── Fallback: serve dashboard for all other routes ────────
app.get("/{*splat}", (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "../../public/index.html"));
});

// ── Start server ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log("\n╔════════════════════════════════════════════╗");
  console.log("║   🕵️  Page Watcher — Dashboard Server      ║");
  console.log("╚════════════════════════════════════════════╝");
  console.log(`\n🚀 Running at: http://localhost:${PORT}`);
  console.log("📋 API ready at: http://localhost:" + PORT + "/api/targets");
  console.log("\nPress Ctrl+C to stop.\n");
});
