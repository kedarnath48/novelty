import { db } from "./index";
import { seriesTemplates } from "../schema";
import { eq, and, asc } from "drizzle-orm";
import type { CompendiumCategory } from "../../mainview/types";

export type FieldDefinition = {
	name: string;
	type: "text" | "number" | "textarea" | "select" | "checkbox" | "date"
		| "file" | "multiselect" | "entitylink" | "richtext" | "color" | "toggle" | "range"
		| "portrait" | "images";
	label: string;
	required: boolean;
	disabled?: boolean;
	span?: 1 | 2 | 3 | 4;
	options?: string[];
	rangeMin?: number;
	rangeMax?: number;
	rangeStep?: number;
	entitylinkCategories?: CompendiumCategory[];
};

export type SeriesTemplate = {
	id: string;
	seriesId: string;
	name: string;
	description: string | null;
	baseType: CompendiumCategory;
	customFields: FieldDefinition[];
	createdAt: Date;
	updatedAt: Date;
};

export type NewSeriesTemplate = Omit<SeriesTemplate, "createdAt" | "updatedAt">;

function parseTemplate(row: typeof seriesTemplates.$inferSelect): SeriesTemplate {
	return {
		id: row.id,
		seriesId: row.seriesId,
		name: row.name,
		description: row.description,
		baseType: row.baseType as CompendiumCategory,
		customFields: row.customFields ? JSON.parse(row.customFields) : [],
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

export async function listSeriesTemplates(seriesId: string, baseType?: CompendiumCategory): Promise<SeriesTemplate[]> {
	const conditions = [eq(seriesTemplates.seriesId, seriesId)];
	if (baseType) {
		conditions.push(eq(seriesTemplates.baseType, baseType));
	}
	const rows = await db
		.select()
		.from(seriesTemplates)
		.where(and(...conditions))
		.orderBy(asc(seriesTemplates.name));
	return rows.map(parseTemplate);
}

export async function getSeriesTemplateById(id: string): Promise<SeriesTemplate | undefined> {
	const result = await db.select().from(seriesTemplates).where(eq(seriesTemplates.id, id));
	if (!result[0]) return undefined;
	return parseTemplate(result[0]);
}

export async function createSeriesTemplate(data: NewSeriesTemplate): Promise<SeriesTemplate> {
	const now = new Date();
	const insertData = {
		...data,
		customFields: JSON.stringify(data.customFields || []),
		createdAt: now,
		updatedAt: now,
	};
	await db.insert(seriesTemplates).values(insertData);
	return {
		...data,
		customFields: data.customFields || [],
		createdAt: now,
		updatedAt: now,
	};
}

export async function updateSeriesTemplate(
	id: string,
	data: Partial<NewSeriesTemplate>,
): Promise<SeriesTemplate | undefined> {
	const updateData: Record<string, unknown> = { updatedAt: new Date() };
	if (data.name !== undefined) updateData.name = data.name;
	if (data.description !== undefined) updateData.description = data.description;
	if (data.baseType !== undefined) updateData.baseType = data.baseType;
	if (data.customFields !== undefined) updateData.customFields = JSON.stringify(data.customFields);

	await db.update(seriesTemplates).set(updateData).where(eq(seriesTemplates.id, id));
	return getSeriesTemplateById(id);
}

export async function deleteSeriesTemplate(id: string): Promise<void> {
	await db.delete(seriesTemplates).where(eq(seriesTemplates.id, id));
}
