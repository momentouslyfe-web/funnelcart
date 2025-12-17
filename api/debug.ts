import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const results: Record<string, any> = {
    step: "start",
    errors: []
  };
  
  try {
    results.step = "importing express";
    const express = await import("express");
    results.expressOk = true;
  } catch (err: any) {
    results.expressOk = false;
    results.errors.push({ step: "express", error: err.message });
  }
  
  try {
    results.step = "importing supabase";
    const { createClient } = await import("@supabase/supabase-js");
    results.supabaseOk = true;
  } catch (err: any) {
    results.supabaseOk = false;
    results.errors.push({ step: "supabase", error: err.message });
  }
  
  try {
    results.step = "importing schema";
    const schema = await import("../shared/schema");
    results.schemaOk = true;
    results.schemaExports = Object.keys(schema).slice(0, 10);
  } catch (err: any) {
    results.schemaOk = false;
    results.errors.push({ step: "schema", error: err.message, stack: err.stack?.split('\n').slice(0, 5) });
  }
  
  try {
    results.step = "importing db";
    const db = await import("../server/db");
    results.dbOk = true;
  } catch (err: any) {
    results.dbOk = false;
    results.errors.push({ step: "db", error: err.message, stack: err.stack?.split('\n').slice(0, 5) });
  }
  
  try {
    results.step = "importing storage";
    const storage = await import("../server/storage");
    results.storageOk = true;
  } catch (err: any) {
    results.storageOk = false;
    results.errors.push({ step: "storage", error: err.message, stack: err.stack?.split('\n').slice(0, 5) });
  }
  
  results.step = "complete";
  res.status(200).json(results);
}
