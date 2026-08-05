import * as DocumentPicker from 'expo-document-picker';
import { File as FsFile } from 'expo-file-system';
import Papa from 'papaparse';
import { Platform } from 'react-native';
import * as XLSX from 'xlsx';

import { separaContatto } from '@/lib/normalize';
import type { ClientInput } from '@/types/models';

export type ParsedSheet = {
  headers: string[];
  rows: string[][];
  fileName: string;
};

/** Campi cliente su cui mappare le colonne del file. */
export const CLIENT_FIELDS = [
  { key: 'nome', label: 'Nome', required: true },
  { key: 'contatto', label: 'Contatto', required: false },
  { key: 'prodotto', label: 'Prodotto', required: false },
  { key: 'note', label: 'Note', required: false },
] as const;

export type ClientFieldKey = (typeof CLIENT_FIELDS)[number]['key'];
export type ColumnMapping = Record<ClientFieldKey, number | null>;

/** Su web il picker restituisce un File del browser; su native leggiamo dall'uri. */
async function assetToBlob(asset: { uri: string; file?: unknown }): Promise<Blob> {
  if (Platform.OS === 'web' && asset.file) {
    return asset.file as Blob;
  }
  // La classe File di expo-file-system implementa Blob (.text() / .arrayBuffer()).
  return new FsFile(asset.uri) as unknown as Blob;
}

/** Apre il selettore file e restituisce righe grezze + intestazioni. */
export async function pickAndParseSpreadsheet(): Promise<ParsedSheet | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: [
      'text/csv',
      'text/comma-separated-values',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '*/*',
    ],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled || !res.assets?.length) return null;

  const asset = res.assets[0];
  const fileName = asset.name ?? 'file';
  const blob = await assetToBlob(asset);

  const isCsv = /\.csv$/i.test(fileName) || (asset.mimeType?.includes('csv') ?? false);
  const matrix = isCsv ? await parseCsv(blob) : await parseXlsx(blob);

  const [headerRow = [], ...dataRows] = matrix;
  const headers = headerRow.map((h, i) => {
    const text = String(h ?? '').trim();
    return text.length > 0 ? text : `Colonna ${i + 1}`;
  });
  const rows = dataRows.filter((r) => r.some((c) => String(c ?? '').trim() !== ''));
  return { headers, rows, fileName };
}

async function parseCsv(blob: Blob): Promise<string[][]> {
  const text = await blob.text();
  const result = Papa.parse<string[]>(text, { skipEmptyLines: true });
  return result.data;
}

async function parseXlsx(blob: Blob): Promise<string[][]> {
  const buffer = await blob.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' }) as string[][];
}

/** Prova ad abbinare automaticamente le colonne in base al nome dell'intestazione. */
export function guessMapping(headers: string[]): ColumnMapping {
  const norm = (s: string) => s.toLowerCase().trim();
  const patterns: Record<ClientFieldKey, RegExp> = {
    nome: /nome|name|cliente|nominativo|ragione/,
    contatto: /contatt|email|mail|telefono|tel|phone|cell|recapito/,
    prodotto: /prodott|product|abbonamento|pacchetto|servizio|piano/,
    note: /note|notes|osserv|commento/,
  };
  const mapping = {} as ColumnMapping;
  for (const field of CLIENT_FIELDS) {
    const idx = headers.findIndex((h) => patterns[field.key].test(norm(h)));
    mapping[field.key] = idx >= 0 ? idx : null;
  }
  return mapping;
}

/** Costruisce i record cliente dalle righe grezze secondo la mappatura. Scarta righe senza nome. */
export function buildClientRows(rows: string[][], mapping: ColumnMapping): ClientInput[] {
  const pick = (row: string[], idx: number | null) => {
    if (idx === null) return null;
    const value = String(row[idx] ?? '').trim();
    return value.length > 0 ? value : null;
  };

  const result: ClientInput[] = [];
  for (const row of rows) {
    const nome = pick(row, mapping.nome);
    if (!nome) continue; // il nome è obbligatorio

    const contatto = pick(row, mapping.contatto);
    // Email e telefono si ricavano subito in forma confrontabile: è ciò che
    // permette di accorgersi dei doppioni prima di importarli, non dopo.
    const { email, telefono } = separaContatto(contatto);

    result.push({
      nome,
      contatto,
      email,
      telefono_e164: telefono,
      prodotto: pick(row, mapping.prodotto),
      note: pick(row, mapping.note),
    });
  }
  return result;
}
