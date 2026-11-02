/// <reference types="bun-types" />

import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import * as schema from './McpSchema';

export const sqlite = new Database('./../.tmp/novelty_manuscript.db');
console.log('Mcpindex ');

const appSettings = Bun.file('./../.tmp/settings.json');
(async () => {
    console.log('as', await appSettings.json());
})();

export const db = drizzle(sqlite, { schema });
