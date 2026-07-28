import { db, sqliteVecAvailable, rawSqlite } from "../../database/index";
import { embeddings } from "../../schema/index";
import { eq } from "drizzle-orm";
import { createEmbeddingProvider } from "./provider";
import type { EmbeddingSettings } from "../../../mainview/types";

export interface SearchOptions {
	projectId: string;
	query: string;
	topK?: number;
	entityTypes?: string[];
	minScore?: number;
}

export interface SearchResult {
	entityId: string;
	entityType: string;
	chunkText: string;
	score: number;
	tokenCount: number;
}

export async function semanticSearch(
	settings: EmbeddingSettings,
	options: SearchOptions
): Promise<SearchResult[]> {
	if (!sqliteVecAvailable) {
		console.warn("sqlite-vec not available, skipping semantic search");
		return [];
	}

	const { projectId, query, topK = 10, entityTypes, minScore } = options;

	const provider = createEmbeddingProvider(settings);
	const queryVector = (await provider.embed([query]))[0];

	if (!queryVector || queryVector.length === 0) {
		return [];
	}

	const vectorParam = new Float32Array(queryVector);

	const vecResults = rawSqlite.prepare(
		`SELECT rowid, distance FROM embeddings_vec WHERE embedding MATCH ? ORDER BY distance LIMIT ?`
	).all(vectorParam, topK * 3) as { rowid: string; distance: number }[];

	if (vecResults.length === 0) return [];

	const rowIds = vecResults.map((r) => r.rowid);
	const distanceMap = new Map(vecResults.map((r) => [r.rowid, r.distance]));

	const metaRows = db.select().from(embeddings)
		.where(eq(embeddings.projectId, projectId))
		.all()
		.filter((row: any) => rowIds.includes(row.id));

	const results: SearchResult[] = [];

	for (const meta of metaRows) {
		if (entityTypes && entityTypes.length > 0 && !entityTypes.includes(meta.entityType)) {
			continue;
		}

		const distance = distanceMap.get(meta.id) ?? 1;
		const score = 1 - distance;

		if (minScore !== undefined && score < minScore) continue;

		results.push({
			entityId: meta.entityId,
			entityType: meta.entityType,
			chunkText: meta.chunkText,
			score,
			tokenCount: meta.tokenCount,
		});
	}

	results.sort((a, b) => b.score - a.score);

	const seen = new Set<string>();
	const deduplicated: SearchResult[] = [];
	for (const r of results) {
		const key = `${r.entityType}:${r.entityId}`;
		if (!seen.has(key)) {
			seen.add(key);
			deduplicated.push(r);
		}
	}

	return deduplicated.slice(0, topK);
}
