// src/services/DataPortService.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import JSZip from "jszip";
import { useStore } from "../store/useStore";

/** Bump this whenever the export shape changes; importers can branch on it. */
export const DATA_EXPORT_VERSION = 1;

/** The persist middleware key used in src/store/useStore.ts */
const PERSIST_KEY = "finance-storage";

export interface ExportedBundle {
  /** Fixed id so importers can reject unrelated zips. */
  kind: "ardab-backup";
  version: number; // DATA_EXPORT_VERSION
  exportedAt: string; // ISO
  appVersion?: string; // optional, pulled from app.json if you import it
  /** Live snapshot of the store slices. */
  data: {
    projects: unknown[];
    transactions: unknown[];
    employees: unknown[];
    invoices: unknown[];
    conversations: unknown[];
    messages: Record<string, unknown[]>;
  };
  /** Optional raw persist blob so importers can restore as-is if they prefer. */
  persistBlob?: string;
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export async function exportBackupToZip(): Promise<string> {
  // 1) Grab live state from the store (single source of truth).
  const state = useStore.getState();

  const bundle: ExportedBundle = {
    kind: "ardab-backup",
    version: DATA_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      projects: state.projects,
      transactions: state.transactions,
      employees: state.employees,
      invoices: state.invoices,
      conversations: state.conversations,
      messages: state.messages,
    },
  };

  // 2) Also capture the raw AsyncStorage blob as a belt-and-braces fallback.
  try {
    const raw = await AsyncStorage.getItem(PERSIST_KEY);
    if (raw) bundle.persistBlob = raw;
  } catch {
    // ignore — not critical
  }

  // 3) Build the zip.
  const zip = new JSZip();
  zip.file("data.json", JSON.stringify(bundle, null, 2));
  zip.file(
    "README.txt",
    [
      "Ardab – بيانات النسخة الاحتياطية",
      "",
      `صُدّرت في: ${bundle.exportedAt}`,
      `إصدار المخطط: ${bundle.version}`,
      "",
      "لا تعدّل هذا الملف يدويًا. لإعادة البيانات، افتح",
      "شاشة الإعدادات داخل التطبيق ثم اختر: استيراد نسخة احتياطية.",
    ].join("\n"),
  );

  // 4) Base64 → write to a temp file → share.
  const base64 = await zip.generateAsync({
    type: "base64",
    compression: "DEFLATE",
  });
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const fileName = `ardab-backup-${stamp}.zip`;
  const uri = FileSystem.cacheDirectory + fileName;

  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // 5) Let the user send it to Drive / Files / WhatsApp etc.
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/zip",
      dialogTitle: "حفظ النسخة الاحتياطية",
      UTI: "public.zip-archive",
    });
  }

  return uri;
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export interface ImportResult {
  ok: boolean;
  reason?: string;
  summary?: {
    projects: number;
    transactions: number;
    invoices: number;
    employees: number;
  };
}

export async function importBackupFromPicker(): Promise<ImportResult> {
  // 1) Pick a .zip from Files / Drive etc.
  const picked = await DocumentPicker.getDocumentAsync({
    type: ["application/zip", "application/x-zip-compressed", "*/*"],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (picked.canceled || picked.assets.length === 0) {
    return { ok: false, reason: "cancelled" };
  }

  const fileUri = picked.assets[0].uri;

  // 2) Read as base64 → load into JSZip.
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  let bundle: ExportedBundle;
  try {
    const zip = await JSZip.loadAsync(base64, { base64: true });
    const dataFile = zip.file("data.json");
    if (!dataFile) {
      return { ok: false, reason: "no-data-file" };
    }
    const jsonText = await dataFile.async("string");
    bundle = JSON.parse(jsonText) as ExportedBundle;
  } catch (err) {
    console.error("[Import] Failed to parse zip:", err);
    return { ok: false, reason: "invalid-zip" };
  }

  // 3) Sanity checks.
  if (bundle?.kind !== "ardab-backup") {
    return { ok: false, reason: "not-an-ardab-backup" };
  }
  if (typeof bundle.version !== "number") {
    return { ok: false, reason: "missing-version" };
  }
  if (bundle.version > DATA_EXPORT_VERSION) {
    // Older app import of a newer backup — refuse to guess.
    return { ok: false, reason: "backup-too-new" };
  }

  // 4) Apply the data to the store *without* wiping anything first, so
  //    a partial import (say, only projects) can still be applied safely.
  //    Replace is intentional here — a backup restore is a full swap.
  const data = bundle.data;

  if (
    !Array.isArray(data.projects) ||
    !Array.isArray(data.transactions) ||
    !Array.isArray(data.invoices) ||
    !Array.isArray(data.employees) ||
    !Array.isArray(data.conversations) ||
    typeof data.messages !== "object" ||
    data.messages === null
  ) {
    return { ok: false, reason: "malformed-data" };
  }

  useStore.setState({
    projects: data.projects as never,
    transactions: data.transactions as never,
    invoices: data.invoices as never,
    employees: data.employees as never,
    conversations: data.conversations as never,
    messages: data.messages as never,
  });

  // The persist middleware will now write the new state back to
  // AsyncStorage automatically — no manual setItem needed.

  return {
    ok: true,
    summary: {
      projects: data.projects.length,
      transactions: data.transactions.length,
      invoices: data.invoices.length,
      employees: data.employees.length,
    },
  };
}
