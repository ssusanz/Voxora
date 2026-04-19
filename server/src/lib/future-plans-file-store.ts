import fs from 'node:fs/promises';
import path from 'node:path';

const storeFile = path.join(path.resolve(process.cwd(), 'data', 'future-plans'), 'plans.json');

export async function readFuturePlansFile(): Promise<unknown[]> {
  try {
    const raw = await fs.readFile(storeFile, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeFuturePlansFile(plans: unknown[]): Promise<void> {
  await fs.mkdir(path.dirname(storeFile), { recursive: true });
  await fs.writeFile(storeFile, JSON.stringify(plans), 'utf8');
}
