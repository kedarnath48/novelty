import { useState, useEffect } from "react";
import Dialog from "../components/Dialog";
import SubDialog from "../components/SubDialog";
import { useRPC } from "../contexts/RPCContext";
import type {
	CompendiumCategory,
	FieldDefinition,
	SeriesTemplate,
	NewSeriesTemplate,
	GlobalTemplate,
} from "../types/index";

interface SeriesTemplateEditorDialogProps {
	open: boolean;
	onClose: () => void;
	seriesId: string;
	seriesName: string;
}

const fieldTypes: FieldDefinition["type"][] = [
	"text", "number", "textarea", "select", "checkbox", "date",
	"file", "multiselect", "entitylink", "richtext", "color", "toggle", "range",
	"portrait", "images",
];

const CATEGORIES: CompendiumCategory[] = [
	"character", "location", "organization", "item", "lore",
];

const categoryLabels: Record<CompendiumCategory, string> = {
	character: "Character", location: "Location",
	organization: "Organization", item: "Item", lore: "Lore",
};

export default function SeriesTemplateEditorDialog({
	open,
	onClose,
	seriesId,
	seriesName,
}: SeriesTemplateEditorDialogProps) {
	const rpc = useRPC();
	const [templates, setTemplates] = useState<SeriesTemplate[]>([]);
	const [loading, setLoading] = useState(true);
	const [filterBaseType, setFilterBaseType] = useState<CompendiumCategory | "all">("all");

	const [globalTemplatesList, setGlobalTemplatesList] = useState<GlobalTemplate[]>([]);

	const [showCreate, setShowCreate] = useState(false);
	const [createName, setCreateName] = useState("");
	const [createDesc, setCreateDesc] = useState("");
	const [createBaseType, setCreateBaseType] = useState<CompendiumCategory>("character");
	const [createFields, setCreateFields] = useState<FieldDefinition[]>([]);
	const [newFieldName, setNewFieldName] = useState("");
	const [newFieldType, setNewFieldType] = useState<FieldDefinition["type"]>("text");
	const [createRefGlobalId, setCreateRefGlobalId] = useState<string | null>(null);

	const [showEdit, setShowEdit] = useState(false);
	const [editId, setEditId] = useState<string | null>(null);
	const [editName, setEditName] = useState("");
	const [editDesc, setEditDesc] = useState("");
	const [editFields, setEditFields] = useState<FieldDefinition[]>([]);
	const [editNewFieldName, setEditNewFieldName] = useState("");
	const [editNewFieldType, setEditNewFieldType] = useState<FieldDefinition["type"]>("text");
	const [editRefGlobalId, setEditRefGlobalId] = useState<string | null>(null);

	const [showDelete, setShowDelete] = useState(false);
	const [deleteId, setDeleteId] = useState<string | null>(null);

	useEffect(() => {
		if (open) loadTemplates();
	}, [open, seriesId]);

	async function loadTemplates() {
		setLoading(true);
		try {
			const [seriesResult, globalResult] = await Promise.all([
				rpc.request["db:list-series-templates"]({ seriesId }),
				rpc.request["db:list-global-templates"](),
			]);
			setTemplates(Array.isArray(seriesResult) ? seriesResult : []);
			setGlobalTemplatesList(Array.isArray(globalResult) ? globalResult : []);
		} catch (e) {
			console.error("Failed to load templates:", e);
		} finally {
			setLoading(false);
		}
	}

	const globalByBaseType = (baseType: CompendiumCategory) =>
		globalTemplatesList.filter((g) => g.baseType === baseType);

	const filteredTemplates = filterBaseType === "all"
		? templates
		: templates.filter((t) => t.baseType === filterBaseType);

	function getGlobalInheritedNames(globalId: string | null): Set<string> {
		if (!globalId) return new Set();
		const gt = globalTemplatesList.find((g) => g.id === globalId);
		if (!gt?.customFields) return new Set();
		return new Set(gt.customFields.map((f) => f.name));
	}

	function mergeGlobalIntoFields(fields: FieldDefinition[], globalId: string | null): FieldDefinition[] {
		const inherited = getGlobalInheritedNames(globalId);
		const nonInherited = fields.filter((f) => !inherited.has(f.name));
		if (inherited.size === 0) return nonInherited;
		const gt = globalTemplatesList.find((g) => g.id === globalId)!;
		const savedOverrides = new Map(fields.filter((f) => inherited.has(f.name)).map((f) => [f.name, f] as const));
		const inheritedFields = gt.customFields.map((f) => {
			const existing = savedOverrides.get(f.name);
			if (existing) return { ...f, ...existing, disabled: existing.disabled ?? false };
			return { ...f, disabled: false };
		});
		return [...inheritedFields, ...nonInherited];
	}

	function addField(fields: FieldDefinition[], setter: (f: FieldDefinition[]) => void, name: string, type: FieldDefinition["type"]) {
		if (!name.trim()) return;
		const field: FieldDefinition = {
			name: name.trim().toLowerCase().replace(/\s+/g, "_"),
			type,
			label: name.trim(),
			required: false,
			...(type === "select" || type === "multiselect" ? { options: [] } : {}),
			...(type === "range" ? { rangeMin: 0, rangeMax: 100, rangeStep: 1 } : {}),
			...(type === "entitylink" ? { entitylinkCategories: ["character", "location", "organization", "item", "lore"] } : {}),
		};
		setter([...fields, field]);
	}

	function removeField(index: number, fields: FieldDefinition[], setter: (f: FieldDefinition[]) => void) {
		setter(fields.filter((_, i) => i !== index));
	}

	function updateField(index: number, updates: Partial<FieldDefinition>, fields: FieldDefinition[], setter: (f: FieldDefinition[]) => void) {
		const newFields = [...fields];
		newFields[index] = { ...newFields[index], ...updates };
		setter(newFields);
	}

	function renderFieldEditor(
		fields: FieldDefinition[],
		setter: (f: FieldDefinition[]) => void,
		newName: string,
		setNewName: (v: string) => void,
		newType: FieldDefinition["type"],
		setNewType: (v: FieldDefinition["type"]) => void,
		inheritedNames?: Set<string>,
	) {
		const [dragIndex, setDragIndex] = useState<number | null>(null);
		const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

		function moveField(from: number, to: number) {
			if (from === to) return;
			const newFields = [...fields];
			const [moved] = newFields.splice(from, 1);
			newFields.splice(to, 0, moved);
			setter(newFields);
		}

		function handleDragStart(index: number) {
			setDragIndex(index);
		}

		function handleDragOver(e: React.DragEvent, index: number) {
			e.preventDefault();
			setDragOverIndex(index);
		}

		function handleDragLeave() {
			setDragOverIndex(null);
		}

		function handleDrop(index: number) {
			if (dragIndex !== null && dragIndex !== index) {
				moveField(dragIndex, index);
			}
			setDragIndex(null);
			setDragOverIndex(null);
		}

		function handleDragEnd() {
			setDragIndex(null);
			setDragOverIndex(null);
		}

		return (
			<div>
				<div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
					<input type="text" placeholder="Field name" value={newName}
						onChange={(e) => setNewName(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && addField(fields, setter, newName, newType)}
						style={{ flex: 1 }} />
					<select value={newType} onChange={(e) => setNewType(e.target.value as FieldDefinition["type"])}>
						{fieldTypes.map((t) => <option key={t} value={t}>{t}</option>)}
					</select>
					<button onClick={() => { addField(fields, setter, newName, newType); setNewName(""); setNewType("text"); }} disabled={!newName.trim()}>Add</button>
				</div>
				{fields.length === 0 ? (
					<div style={{ color: "#888", fontSize: "0.85em" }}>No fields defined</div>
				) : (
					<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "300px", overflowY: "auto" }}>
						{fields.map((f, i) => {
							const isOver = dragOverIndex === i && dragIndex !== i;
							return (
								<div
									key={i}
									draggable={!f.disabled}
									onDragStart={() => handleDragStart(i)}
									onDragOver={(e) => handleDragOver(e, i)}
									onDragLeave={handleDragLeave}
									onDrop={() => handleDrop(i)}
									onDragEnd={handleDragEnd}
									style={{
										padding: "0.5rem",
										border: `1px solid ${isOver ? "#4A9EFF" : "var(--border, #333)"}`,
										borderRadius: "4px",
										borderStyle: isOver ? "dashed" : "solid",
										opacity: dragIndex === i ? 0.4 : 1,
										cursor: f.disabled ? "default" : "grab",
									}}
								>
									<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
										<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
											<span style={{ cursor: f.disabled ? "default" : "grab", color: "#888", userSelect: "none" }}>≡</span>
											<strong>{f.name}</strong>
											{inheritedNames?.has(f.name) && (
												<span style={{ fontSize: "0.7em", color: "#FFA500", background: "rgba(255,165,0,0.15)", padding: "1px 6px", borderRadius: "3px", fontWeight: 500 }}>
													INHERITED
												</span>
											)}
										</div>
										<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
											<label style={{ display: "flex", alignItems: "center", gap: "0.2rem", fontSize: "0.8em", color: "#888" }}>
												Span
												<select
													value={f.span || 4}
													onChange={(e) => updateField(i, { span: Number(e.target.value) as 1 | 2 | 3 | 4 }, fields, setter)}
													style={{ padding: "2px 4px", fontSize: "0.85em" }}
												>
													<option value={1}>1</option>
													<option value={2}>2</option>
													<option value={3}>3</option>
													<option value={4}>4</option>
												</select>
											</label>
											<span style={{ color: "#888", fontSize: "0.85em" }}>{f.type}</span>
										</div>
									</div>
									{inheritedNames?.has(f.name) ? (
										<div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem", alignItems: "center" }}>
											<span style={{ flex: 1, color: "#aaa", fontSize: "0.9em" }}>{f.label}</span>
											{f.required && <span style={{ color: "#e74c3c", fontSize: "0.85em" }}>Required *</span>}
											<label style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85em", cursor: "pointer", color: f.disabled ? "#e74c3c" : "#aaa" }}>
												<input type="checkbox" checked={!f.disabled}
													onChange={() => {
														const updated = [...fields];
														updated[i] = { ...updated[i], disabled: !updated[i].disabled };
														setter(updated);
													}} />
												Enabled
											</label>
										</div>
									) : (
										<>
											<div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
												<input type="text" placeholder="Label" value={f.label}
													onChange={(e) => updateField(i, { label: e.target.value }, fields, setter)} style={{ flex: 1 }} />
												<label style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85em" }}>
													<input type="checkbox" checked={f.required}
														onChange={(e) => updateField(i, { required: e.target.checked }, fields, setter)} />
													Required
												</label>
											</div>
											{(f.type === "select" || f.type === "multiselect") && (
												<input type="text" placeholder="Options (comma-separated)" value={f.options?.join(", ") || ""}
													onChange={(e) => updateField(i, { options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean) }, fields, setter)}
													style={{ width: "100%", marginTop: "0.25rem" }} />
											)}
											{f.type === "range" && (
												<div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
													<input type="number" placeholder="Min" value={f.rangeMin ?? 0} onChange={(e) => updateField(i, { rangeMin: Number(e.target.value) }, fields, setter)} />
													<input type="number" placeholder="Max" value={f.rangeMax ?? 100} onChange={(e) => updateField(i, { rangeMax: Number(e.target.value) }, fields, setter)} />
													<input type="number" placeholder="Step" value={f.rangeStep ?? 1} onChange={(e) => updateField(i, { rangeStep: Number(e.target.value) }, fields, setter)} />
												</div>
											)}
											<button onClick={() => removeField(i, fields, setter)} style={{ marginTop: "0.25rem", color: "#e74c3c", fontSize: "0.85em" }}>Remove</button>
										</>
									)}
								</div>
							);
						})}
					</div>
				)}
			</div>
		);
	}

	async function handleCreate() {
		if (!createName.trim()) return;
		const inheritedNames = getGlobalInheritedNames(createRefGlobalId);
		const savable = createFields.filter((f) => {
			if (!inheritedNames.has(f.name)) return true;
			if (f.disabled) return true;
			return false;
		});
		const data: NewSeriesTemplate = {
			id: crypto.randomUUID(),
			seriesId,
			name: createName.trim(),
			description: createDesc.trim() || null,
			baseType: createBaseType,
			customFields: savable.filter((f) => f.name.trim() && f.label.trim()),
		};
		await rpc.request["db:create-series-template"](data);
		setShowCreate(false);
		loadTemplates();
	}

	function handleEditOpen(t: SeriesTemplate) {
		setEditId(t.id);
		setEditName(t.name);
		setEditDesc(t.description || "");
		setEditFields(t.customFields || []);
		setEditNewFieldName("");
		setEditNewFieldType("text");
		const initGlobalId = globalByBaseType(t.baseType)[0]?.id || null;
		setEditRefGlobalId(initGlobalId);
		setShowEdit(true);
		if (initGlobalId) {
			setTimeout(() => setEditFields((prev) => mergeGlobalIntoFields(prev, initGlobalId)), 0);
		}
	}

	async function handleEditSave() {
		if (!editId || !editName.trim()) return;
		const inheritedNames = getGlobalInheritedNames(editRefGlobalId);
		const savable = editFields.filter((f) => {
			if (!inheritedNames.has(f.name)) return true;
			if (f.disabled) return true;
			return false;
		});
		await rpc.request["db:update-series-template"]({
			id: editId,
			data: {
				name: editName.trim(),
				description: editDesc.trim() || null,
				customFields: savable.filter((f) => f.name.trim() && f.label.trim()),
			},
		});
		setShowEdit(false);
		setEditId(null);
		loadTemplates();
	}

	async function handleDeleteConfirm() {
		if (!deleteId) return;
		await rpc.request["db:delete-series-template"](deleteId);
		setShowDelete(false);
		setDeleteId(null);
		loadTemplates();
	}

	return (
		<Dialog open={open} onClose={onClose} title={`Series Templates: ${seriesName}`} large>
			<div style={{ padding: "1rem" }}>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
					<div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
						<label>Filter:</label>
						<select value={filterBaseType} onChange={(e) => setFilterBaseType(e.target.value as CompendiumCategory | "all")}>
							<option value="all">All Types</option>
							{CATEGORIES.map((cat) => <option key={cat} value={cat}>{categoryLabels[cat]}</option>)}
						</select>
					</div>
					<button onClick={() => { setShowCreate(true); setCreateBaseType(filterBaseType !== "all" ? filterBaseType : "character"); }}>New Template</button>
				</div>

				{loading ? (
					<div>Loading...</div>
				) : filteredTemplates.length === 0 ? (
					<div style={{ color: "#888", textAlign: "center", padding: "2rem" }}>
						No series templates for {filterBaseType !== "all" ? categoryLabels[filterBaseType] : "this filter"} yet.
					</div>
				) : (
					<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
						{filteredTemplates.map((t) => (
							<div key={t.id} style={{
								display: "flex", alignItems: "center", justifyContent: "space-between",
								padding: "0.75rem", border: "1px solid var(--border, #333)", borderRadius: "6px",
							}}>
								<div>
									<strong>{t.name}</strong>
									<span style={{ marginLeft: "0.5rem", color: "#888", fontSize: "0.85em" }}>
										({categoryLabels[t.baseType]})
									</span>
									{t.description && (
										<span style={{ marginLeft: "0.5rem", color: "#888", fontSize: "0.85em" }}>
											— {t.description}
										</span>
									)}
									<span style={{ marginLeft: "0.5rem", color: "#888", fontSize: "0.85em" }}>
										({t.customFields?.length || 0} fields)
									</span>
								</div>
								<div style={{ display: "flex", gap: "0.5rem" }}>
									<button onClick={() => handleEditOpen(t)}>Edit</button>
									<button onClick={() => { setDeleteId(t.id); setShowDelete(true); }} style={{ color: "#e74c3c" }}>Delete</button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{showCreate && (
				<SubDialog open={showCreate} onClose={() => setShowCreate(false)} title="Create Series Template">
					<div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
						<div><label>Template Name</label><input type="text" value={createName} onChange={(e) => setCreateName(e.target.value)} style={{ width: "100%" }} autoFocus /></div>
						<div><label>Description</label><textarea value={createDesc} onChange={(e) => setCreateDesc(e.target.value)} rows={2} style={{ width: "100%" }} /></div>
						<div><label>Base Type</label>
							<select value={createBaseType} onChange={(e) => {
								setCreateBaseType(e.target.value as CompendiumCategory);
								setCreateRefGlobalId(null);
								setCreateFields((prev) => mergeGlobalIntoFields(prev, null));
							}} style={{ width: "100%" }}>
								{CATEGORIES.map((cat) => <option key={cat} value={cat}>{categoryLabels[cat]}</option>)}
							</select>
						</div>
						<div>
							<label>Reference Global Template (optional, for inherited fields)</label>
							<select value={createRefGlobalId || ""} onChange={(e) => {
								const id = e.target.value || null;
								setCreateRefGlobalId(id);
								setCreateFields((prev) => mergeGlobalIntoFields(prev, id));
							}} style={{ width: "100%" }}>
								<option value="">— None —</option>
								{globalByBaseType(createBaseType).map((g) => (
									<option key={g.id} value={g.id}>{g.name}</option>
								))}
							</select>
							{createRefGlobalId && (
								<div style={{ marginTop: "0.25rem", fontSize: "0.85em", color: "#888" }}>
									Inherited fields from global template appear in the list below.
								</div>
							)}
						</div>
						<div><label>Fields</label>
							{renderFieldEditor(createFields, setCreateFields, newFieldName, setNewFieldName, newFieldType, setNewFieldType, getGlobalInheritedNames(createRefGlobalId))}
						</div>
						<div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
							<button onClick={() => setShowCreate(false)}>Cancel</button>
							<button onClick={handleCreate} disabled={!createName.trim()}>Create</button>
						</div>
					</div>
				</SubDialog>
			)}

			{showEdit && editId && (() => {
				const editingTemplate = templates.find((t) => t.id === editId);
				const bt = editingTemplate?.baseType || "character";
				return (
				<SubDialog open={showEdit} onClose={() => setShowEdit(false)} title="Edit Series Template">
					<div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
						<div><label>Template Name</label><input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ width: "100%" }} /></div>
						<div><label>Description</label><textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2} style={{ width: "100%" }} /></div>
						<div>
							<label>Reference Global Template (for inherited fields)</label>
							<select value={editRefGlobalId || ""} onChange={(e) => {
								const id = e.target.value || null;
								setEditRefGlobalId(id);
								setEditFields((prev) => mergeGlobalIntoFields(prev, id));
							}} style={{ width: "100%" }}>
								<option value="">— None —</option>
								{globalByBaseType(bt).map((g) => (
									<option key={g.id} value={g.id}>{g.name}</option>
								))}
							</select>
							{editRefGlobalId && (
								<div style={{ marginTop: "0.25rem", fontSize: "0.85em", color: "#888" }}>
									Inherited fields from global template appear in the list below.
								</div>
							)}
						</div>
						<div><label>Fields</label>
							{renderFieldEditor(editFields, setEditFields, editNewFieldName, setEditNewFieldName, editNewFieldType, setEditNewFieldType, getGlobalInheritedNames(editRefGlobalId))}
						</div>
						<div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
							<button onClick={() => setShowEdit(false)}>Cancel</button>
							<button onClick={handleEditSave} disabled={!editName.trim()}>Save</button>
						</div>
					</div>
				</SubDialog>
				);
			})()}

			{showDelete && deleteId && (
				<SubDialog open={showDelete} onClose={() => setShowDelete(false)} title="Delete Series Template">
					<p>Are you sure you want to delete this series template? Projects using it will lose the inherited fields.</p>
					<div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
						<button onClick={() => setShowDelete(false)}>Cancel</button>
						<button onClick={handleDeleteConfirm} style={{ color: "#e74c3c" }}>Delete</button>
					</div>
				</SubDialog>
			)}
		</Dialog>
	);
}
