export type LineageEdge = {
	relation: string;
	inverseRelation: string;
	targetType: string;
	targetId: string;
};

export function isLineageEdge(v: unknown): v is LineageEdge {
	return (
		typeof v === "object" &&
		v !== null &&
		typeof (v as LineageEdge).relation === "string" &&
		typeof (v as LineageEdge).inverseRelation === "string" &&
		typeof (v as LineageEdge).targetId === "string"
	);
}

export const RELATION_PRESETS: ReadonlyArray<{ relation: string; inverse: string }> = [
	{ relation: "father", inverse: "child" },
	{ relation: "mother", inverse: "child" },
	{ relation: "parent", inverse: "child" },
	{ relation: "child", inverse: "parent" },
	{ relation: "son", inverse: "parent" },
	{ relation: "daughter", inverse: "parent" },
	{ relation: "grandfather", inverse: "grandchild" },
	{ relation: "grandmother", inverse: "grandchild" },
	{ relation: "grandparent", inverse: "grandchild" },
	{ relation: "grandchild", inverse: "grandparent" },
	{ relation: "brother", inverse: "brother" },
	{ relation: "sister", inverse: "sister" },
	{ relation: "sibling", inverse: "sibling" },
	{ relation: "twin", inverse: "twin" },
	{ relation: "husband", inverse: "wife" },
	{ relation: "wife", inverse: "husband" },
	{ relation: "spouse", inverse: "spouse" },
	{ relation: "partner", inverse: "partner" },
	{ relation: "uncle", inverse: "nephew or niece" },
	{ relation: "aunt", inverse: "nephew or niece" },
	{ relation: "nephew", inverse: "uncle or aunt" },
	{ relation: "niece", inverse: "uncle or aunt" },
	{ relation: "cousin", inverse: "cousin" },
	{ relation: "godfather", inverse: "godchild" },
	{ relation: "godmother", inverse: "godchild" },
	{ relation: "godchild", inverse: "godparent" },
	{ relation: "adoptive parent", inverse: "adopted child" },
	{ relation: "adopted child", inverse: "adoptive parent" },
];

export function inverseOf(relation: string): string {
	const preset = RELATION_PRESETS.find((p) => p.relation === relation);
	if (preset) return preset.inverse;
	return relation;
}

export function edgeKey(edge: LineageEdge): string {
	return `${edge.targetId}::${edge.relation}`;
}

export function buildLineageGraph(entries: Array<{ id: string; templateData?: Record<string, unknown> | null }>) {
	const graph = new Map<string, LineageEdge[]>();
	for (const entry of entries) {
		const data = entry.templateData as Record<string, unknown> | null | undefined;
		if (!data) continue;
		for (const [, value] of Object.entries(data)) {
			if (Array.isArray(value) && value.every(isLineageEdge)) {
				const existing = graph.get(entry.id) || [];
				graph.set(entry.id, [...existing, ...(value as LineageEdge[])]);
			}
		}
	}
	return graph;
}

export function findLineageField(templateFields: Array<{ type: string; name: string }>): string | null {
	return templateFields.find((f) => f.type === "lineage")?.name ?? null;
}
