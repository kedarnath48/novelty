import { useState, useMemo } from "react";
import type { CompendiumCategory } from "../types/index";
import type { LineageEdge } from "../templates/lineage";
import { RELATION_PRESETS, edgeKey, buildLineageGraph } from "../templates/lineage";

interface LineageFieldEditorProps {
	edges: LineageEdge[];
	entryId: string;
	entryName: string;
	allowedCategories: CompendiumCategory[];
	characters?: Array<{ id: string; name: string }>;
	locations?: Array<{ id: string; name: string }>;
	organizations?: Array<{ id: string; name: string }>;
	items?: Array<{ id: string; name: string }>;
	loreEntries?: Array<{ id: string; name: string }>;
	onChange: (edges: LineageEdge[]) => void;
}

function entryLabel(
	category: string,
	id: string,
	characters?: Array<{ id: string; name: string }>,
	locations?: Array<{ id: string; name: string }>,
	organizations?: Array<{ id: string; name: string }>,
	items?: Array<{ id: string; name: string }>,
	loreEntries?: Array<{ id: string; name: string }>,
): string {
	const list =
		category === "character" ? characters :
			category === "location" ? locations :
				category === "organization" ? organizations :
					category === "item" ? items :
						category === "lore" ? loreEntries :
							[];
	const entry = list?.find((e) => e.id === id);
	return entry?.name ?? id;
}

function resolveTarget(
	edge: LineageEdge,
	characters?: Array<{ id: string; name: string }>,
	locations?: Array<{ id: string; name: string }>,
	organizations?: Array<{ id: string; name: string }>,
	items?: Array<{ id: string; name: string }>,
	loreEntries?: Array<{ id: string; name: string }>,
): string {
	return entryLabel(edge.targetType, edge.targetId, characters, locations, organizations, items, loreEntries);
}

export default function LineageFieldEditor({
	edges,
	entryId,
	entryName,
	allowedCategories,
	characters,
	locations,
	organizations,
	items,
	loreEntries,
	onChange,
}: LineageFieldEditorProps) {
	const [showAdd, setShowAdd] = useState(false);
	const [customRelation, setCustomRelation] = useState("");
	const [customInverse, setCustomInverse] = useState("");
	const [customTargetId, setCustomTargetId] = useState("");
	const [customTargetType, setCustomTargetType] = useState<CompendiumCategory>("character");
	const [presetIdx, setPresetIdx] = useState(0);
	const [useCustom, setUseCustom] = useState(false);

	const allEntries = useMemo(() => {
		const out: Array<{ id: string; name: string; category: CompendiumCategory }> = [];
		for (const cat of allowedCategories) {
			const list =
				cat === "character" ? characters :
					cat === "location" ? locations :
						cat === "organization" ? organizations :
							cat === "item" ? items :
								cat === "lore" ? loreEntries :
									[];
			for (const e of list || []) {
				out.push({ id: e.id, name: e.name, category: cat });
			}
		}
		return out;
	}, [allowedCategories, characters, locations, organizations, items, loreEntries]);

	const preset = RELATION_PRESETS[presetIdx];

	function addEdge() {
		if (!customTargetId) return;
		const relation = useCustom ? customRelation : preset.relation;
		const inverse = useCustom ? (customInverse || customRelation) : preset.inverse;
		const newEdge: LineageEdge = {
			relation,
			inverseRelation: inverse,
			targetType: customTargetType,
			targetId: customTargetId,
		};
		const key = edgeKey(newEdge);
		if (edges.some((e) => edgeKey(e) === key)) return;
		onChange([...edges, newEdge]);
		setCustomTargetId("");
		setShowAdd(false);
	}

	function removeEdge(targetId: string, relation: string) {
		onChange(edges.filter((e) => !(e.targetId === targetId && e.relation === relation)));
	}

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
			<div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", alignItems: "center" }}>
				{edges.length === 0 && <span style={{ color: "#888", fontSize: "0.85em" }}>No relationships defined.</span>}
				{edges.map((edge) => (
					<span key={edgeKey(edge)} style={{
						display: "inline-flex", alignItems: "center", gap: "0.25rem",
						padding: "0.15rem 0.4rem", background: "var(--bg-secondary, #222)",
						borderRadius: "3px", fontSize: "0.8em",
					}}>
						<span>{edge.relation}</span>
						<span style={{ color: "#888" }}>→</span>
						<span>{resolveTarget(edge, characters, locations, organizations, items, loreEntries)}</span>
						<button type="button" onClick={() => removeEdge(edge.targetId, edge.relation)}
							style={{ color: "#e74c3c", cursor: "pointer", background: "none", border: "none", padding: "0 2px", fontSize: "0.9em" }}>×</button>
					</span>
				))}
				<button type="button" onClick={() => setShowAdd(!showAdd)} style={{ fontSize: "0.8em" }}>+ Add</button>
			</div>

			{showAdd && (
				<div style={{ padding: "0.5rem", background: "var(--bg-secondary, #1a1a1a)", borderRadius: "4px", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
					<label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85em" }}>
						Relation:
						<select value={String(presetIdx)} onChange={(e) => { setPresetIdx(Number(e.target.value)); setUseCustom(false); }} style={{ flex: 1 }}>
							{RELATION_PRESETS.map((p, i) => (
								<option key={p.relation} value={i}>{p.relation}</option>
							))}
						</select>
						<label style={{ display: "flex", alignItems: "center", gap: "0.2rem", fontSize: "0.8em" }}>
							<input type="checkbox" checked={useCustom} onChange={(e) => setUseCustom(e.target.checked)} />
							Custom
						</label>
					</label>
					{useCustom && (
						<div style={{ display: "flex", gap: "0.5rem" }}>
							<input type="text" placeholder="Relation" value={customRelation} onChange={(e) => setCustomRelation(e.target.value)} style={{ flex: 1 }} />
							<input type="text" placeholder="Inverse" value={customInverse} onChange={(e) => setCustomInverse(e.target.value)} style={{ flex: 1 }} />
						</div>
					)}
					<div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
						<select value={customTargetType} onChange={(e) => setCustomTargetType(e.target.value as CompendiumCategory)} style={{ width: "50%", fontSize: "0.85em" }}>
							{allowedCategories.map((c) => (
								<option key={c} value={c}>{c}</option>
							))}
						</select>
						<select value={customTargetId} onChange={(e) => setCustomTargetId(e.target.value)} style={{ width: "50%", flex: 1, fontSize: "0.85em" }}>
							<option value="">Select target...</option>
							{allEntries.filter((e) => e.id !== entryId).map((e) => (
								<option key={e.id} value={e.id}>{e.name} ({e.category})</option>
							))}
						</select>
						<button type="button" onClick={addEdge} disabled={!customTargetId}>Add</button>
						<button type="button" onClick={() => setShowAdd(false)}>Cancel</button>
					</div>
				</div>
			)}

			{edges.length > 0 && (
				<div style={{ marginTop: "0.25rem" }}>
					<div style={{ fontSize: "0.75em", color: "#888", marginBottom: "0.25rem" }}>Family Tree</div>
					<LineageTree
						entryId={entryId}
						entryName={entryName}
						edges={edges}
						allEntries={allEntries}
					/>
				</div>
			)}
		</div>
	);
}

function LineageTree({
	entryId, entryName, edges, allEntries,
}: {
	entryId: string;
	entryName: string;
	edges: LineageEdge[];
	allEntries: Array<{ id: string; name: string; category: CompendiumCategory }>;
}) {
	const graph = useMemo(() => buildLineageGraph([
		{ id: entryId, templateData: { _lineage: edges } },
		...allEntries.map((e) => ({ id: e.id, templateData: {} as Record<string, unknown> })),
	]), [entryId, edges, allEntries]);

	const parents = edges.filter((e) => e.relation === "parent" || e.relation === "mother" || e.relation === "father" || e.relation === "grandparent");
	const children = edges.filter((e) => e.relation === "child" || e.relation === "son" || e.relation === "daughter" || e.relation === "grandchild");
	const spouses = edges.filter((e) => e.relation === "spouse" || e.relation === "wife" || e.relation === "husband" || e.relation === "partner");

	const parentIds = parents.map((p) => p.targetId);
	const childIds = children.map((c) => c.targetId);
	const spouseIds = spouses.map((s) => s.targetId);

	const grandparentIds = parentIds.flatMap((pid) => {
		const parentEdges = graph.get(pid) || [];
		return parentEdges.filter((e: LineageEdge) => e.relation === "parent" || e.relation === "mother" || e.relation === "father" || e.relation === "grandparent").map((e: LineageEdge) => e.targetId);
	});

	const siblingIds = parentIds.flatMap((pid) => {
		const parentEdges = graph.get(pid) || [];
		return parentEdges
			.filter((e: LineageEdge) => (e.relation === "child" || e.relation === "son" || e.relation === "daughter" || e.relation === "grandchild") && e.targetId !== entryId)
			.map((e: LineageEdge) => e.targetId);
	});

	const descendantIds = childIds.flatMap((cid) => {
		const childEdges = graph.get(cid) || [];
		return childEdges
			.filter((e: LineageEdge) => e.relation === "child" || e.relation === "son" || e.relation === "daughter" || e.relation === "grandchild")
			.map((e: LineageEdge) => e.targetId);
	});

	const resolveName = (id: string) => {
		const entry = allEntries.find((e) => e.id === id);
		return entry?.name ?? id;
	};

	const resolveCategory = (id: string) => {
		const entry = allEntries.find((e) => e.id === id);
		return entry?.category ?? "";
	};

	return (
		<div style={{ fontFamily: "monospace", fontSize: "0.8em", lineHeight: "1.4", whiteSpace: "pre" }}>
			{grandparentIds.length > 0 && (
				<div style={{ paddingLeft: "1rem", color: "#888" }}>
					{grandparentIds.map((id) => (
						<div key={id}>{resolveName(id)} ({resolveCategory(id)})</div>
					))}
				</div>
			)}
			{parentIds.length > 0 && (
				<div style={{ paddingLeft: "1rem", borderLeft: "1px solid #444", marginLeft: "0.5rem" }}>
					{parentIds.map((id) => (
						<div key={id} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
							<span style={{ color: "#4A9EFF" }}>│</span>
							<span>{resolveName(id)} ({resolveCategory(id)})</span>
						</div>
					))}
				</div>
			)}
			<div style={{ padding: "0.15rem 0.5rem", background: "rgba(74,158,255,0.15)", borderRadius: "3px", display: "inline-block", margin: "0.25rem 0" }}>
				★ {entryName} (you)
			</div>
			{spouseIds.length > 0 && (
				<div style={{ paddingLeft: "1rem", marginLeft: "0.5rem" }}>
					{spouseIds.map((id) => (
						<div key={id} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
							<span style={{ color: "#e74c3c" }}>═</span>
							<span>{resolveName(id)} ({resolveCategory(id)})</span>
						</div>
					))}
				</div>
			)}
			{siblingIds.length > 0 && (
				<div style={{ paddingLeft: "1rem", borderLeft: "1px solid #444", marginLeft: "0.5rem" }}>
					{siblingIds.map((id) => (
						<div key={id} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
							<span style={{ color: "#4A9EFF" }}>│</span>
							<span>{resolveName(id)} ({resolveCategory(id)})</span>
						</div>
					))}
				</div>
			)}
			{childIds.length > 0 && (
				<div style={{ paddingLeft: "1rem", borderLeft: "1px solid #444", marginLeft: "0.5rem" }}>
					{childIds.map((id) => (
						<div key={id} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
							<span style={{ color: "#4A9EFF" }}>│</span>
							<span>{resolveName(id)} ({resolveCategory(id)})</span>
						</div>
					))}
				</div>
			)}
			{descendantIds.length > 0 && (
				<div style={{ paddingLeft: "2rem", borderLeft: "1px solid #444", marginLeft: "1rem" }}>
					{descendantIds.map((id) => (
						<div key={id} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
							<span style={{ color: "#4A9EFF" }}>│</span>
							<span>{resolveName(id)} ({resolveCategory(id)})</span>
						</div>
					))}
				</div>
			)}
			{edges.filter((e) => !["parent", "mother", "father", "grandparent", "child", "son", "daughter", "grandchild", "spouse", "wife", "husband", "partner", "sibling", "brother", "sister", "twin"].includes(e.relation)).length > 0 && (
				<div style={{ paddingLeft: "1rem", color: "#888", marginTop: "0.25rem" }}>
					{edges.filter((e) => !["parent", "mother", "father", "grandparent", "child", "son", "daughter", "grandchild", "spouse", "wife", "husband", "partner", "sibling", "brother", "sister", "twin"].includes(e.relation)).map((e) => (
						<div key={edgeKey(e)}>{resolveName(e.targetId)} ({e.relation})</div>
					))}
				</div>
			)}
		</div>
	);
}