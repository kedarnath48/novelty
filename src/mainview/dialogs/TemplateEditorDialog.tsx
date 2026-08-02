import { useState, useEffect, useMemo } from "react";
import Dialog from "../components/Dialog";
import VisibilityEditor from "../components/VisibilityEditor";
import { useRPC } from "../contexts/RPCContext";
import type { CompendiumCategory, FieldDefinition, EntityTemplate, GlobalTemplate, SeriesTemplate, ResolvedTemplateInfo } from "../types/index";
import { describeVisibility } from "../templates/fieldVisibility";
import { getInheritedNames, getSeriesInheritedNames, fullMerge } from "../templates/mergeFields";

interface TemplateEditorProps {
	open: boolean;
	onClose: () => void;
	projectId: string;
	seriesId: string | null;
	baseType: CompendiumCategory;
	template: EntityTemplate | null;
	onSave: (baseType: CompendiumCategory, fields: FieldDefinition[], globalTemplateId?: string | null, seriesTemplateId?: string | null) => void;
}

const fieldTypes: FieldDefinition["type"][] = [
	"text", "number", "textarea", "select", "checkbox", "date",
	"file", "multiselect", "entitylink", "richtext", "color", "toggle", "range",
	"portrait", "images",
];

const categoryLabels: Record<CompendiumCategory, string> = {
	character: "Character", location: "Location",
	organization: "Organization", item: "Item", lore: "Lore",
};

export default function TemplateEditorDialog({
	open,
	onClose,
	projectId,
	seriesId,
	baseType,
	template,
	onSave,
}: TemplateEditorProps) {
	const rpc = useRPC();

	const [globalTemplatesList, setGlobalTemplatesList] = useState<GlobalTemplate[]>([]);
	const [seriesTemplatesList, setSeriesTemplatesList] = useState<SeriesTemplate[]>([]);
	const [resolvedInfo, setResolvedInfo] = useState<ResolvedTemplateInfo | null>(null);
	const [loading, setLoading] = useState(false);

	const [globalTemplateId, setGlobalTemplateId] = useState<string | null>(null);
	const [seriesTemplateId, setSeriesTemplateId] = useState<string | null>(null);
	const [projectFields, setProjectFields] = useState<FieldDefinition[]>([]);

	const [newFieldName, setNewFieldName] = useState("");
	const [newFieldType, setNewFieldType] = useState<FieldDefinition["type"]>("text");

	const [dragIndex, setDragIndex] = useState<number | null>(null);
	const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

	function moveField(from: number, to: number) {
		if (from === to) return;
		const newFields = [...projectFields];
		const [moved] = newFields.splice(from, 1);
		newFields.splice(to, 0, moved);
		setProjectFields(newFields);
	}

	useEffect(() => {
		if (!open) return;
		loadData();
	}, [open, projectId, baseType, seriesId]);

	async function loadData() {
		setLoading(true);
		try {
			const [globalList, resolved] = await Promise.all([
				rpc.request["db:list-global-templates"]({ baseType }),
				rpc.request["db:get-resolved-template"]({ projectId, baseType }),
			]);
			const gl = Array.isArray(globalList) ? globalList : [];
			setGlobalTemplatesList(gl);
			setResolvedInfo(resolved);

			let sList: SeriesTemplate[] = [];
			if (seriesId) {
				const result = await rpc.request["db:list-series-templates"]({ seriesId, baseType });
				sList = Array.isArray(result) ? result : [];
			}
			setSeriesTemplatesList(sList);

			const initGlobalId = template?.globalTemplateId || resolved?.globalTemplate?.id || null;
			const initSeriesId = template?.seriesTemplateId || resolved?.seriesTemplate?.id || null;
			setGlobalTemplateId(initGlobalId);
			setSeriesTemplateId(initSeriesId);

			const baseFields = template?.customFields || [];
			setProjectFields(fullMerge(baseFields, initGlobalId, gl, initSeriesId, sList));
		} catch (e) {
			console.error("Failed to load template data:", e);
		} finally {
			setLoading(false);
		}
	}

	function handleGlobalTemplateChange(newId: string) {
		const id = newId || null;
		setGlobalTemplateId(id);
		setProjectFields((prev) => {
			const oldInherited = getInheritedNames(globalTemplateId, globalTemplatesList);
			const cleaned = prev.filter((f) => !oldInherited.has(f.name));
			return fullMerge(cleaned, id, globalTemplatesList, seriesTemplateId, seriesTemplatesList);
		});
	}

	function handleSeriesTemplateChange(newId: string) {
		const id = newId || null;
		setSeriesTemplateId(id);
		setProjectFields((prev) => {
			const oldInherited = getSeriesInheritedNames(seriesTemplateId, seriesTemplatesList);
			const cleaned = prev.filter((f) => !oldInherited.has(f.name));
			return fullMerge(cleaned, globalTemplateId, globalTemplatesList, id, seriesTemplatesList);
		});
	}

	function addField() {
		if (!newFieldName.trim()) return;
		const fieldBase = {
			name: newFieldName.trim().toLowerCase().replace(/\s+/g, "_"),
			type: newFieldType,
			label: newFieldName.trim(),
			required: false,
		};
		const field: FieldDefinition = {
			...fieldBase,
			...(newFieldType === "select" || newFieldType === "multiselect" ? { options: [] } : {}),
			...(newFieldType === "range" ? { rangeMin: 0, rangeMax: 100, rangeStep: 1 } : {}),
			...(newFieldType === "entitylink" ? { entitylinkCategories: ["character", "location", "organization", "item", "lore"] } : {}),
		};
		setProjectFields([...projectFields, field]);
		setNewFieldName("");
		setNewFieldType("text");
	}

	function updateField(index: number, updates: Partial<FieldDefinition>) {
		const newFields = [...projectFields];
		newFields[index] = { ...newFields[index], ...updates };
		setProjectFields(newFields);
	}

	function removeField(index: number) {
		setProjectFields(projectFields.filter((_, i) => i !== index));
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

	function handleSave() {
		const savable = projectFields.filter((f) => {
			if (!isFieldInherited(f.name)) return true;
			if (f.disabled) return true;
			return false;
		});
		const validFields = savable.filter((f) => f.name.trim() && f.label.trim());
		onSave(baseType, validFields, globalTemplateId, seriesTemplateId);
		onClose();
	}

	const selectedGlobal = globalTemplatesList.find((g) => g.id === globalTemplateId);
	const selectedSeries = seriesTemplatesList.find((s) => s.id === seriesTemplateId);

	const inheritedNames = useMemo(() => getInheritedNames(globalTemplateId, globalTemplatesList), [globalTemplateId, globalTemplatesList]);
	const seriesInheritedNames = useMemo(() => getSeriesInheritedNames(seriesTemplateId, seriesTemplatesList), [seriesTemplateId, seriesTemplatesList]);

	function toggleFieldDisabled(fieldName: string) {
		setProjectFields((prev) =>
			prev.map((f) => (f.name === fieldName ? { ...f, disabled: !f.disabled } : f))
		);
	}

	function isFieldInherited(fieldName: string): boolean {
		return inheritedNames.has(fieldName) || seriesInheritedNames.has(fieldName);
	}

	function renderFieldPreview(fields: FieldDefinition[]) {
		if (fields.length === 0) return <span style={{ color: "#888", fontStyle: "italic" }}>No fields</span>;
		return (
			<div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
				{fields.map((f) => {
					const visDesc = describeVisibility(f.visibleWhen, (name) => projectFields.find((p) => p.name === name)?.label || name);
					return (
					<span key={f.name} title={visDesc || undefined} style={{
						padding: "0.15rem 0.4rem", background: "var(--bg-secondary, #222)",
						borderRadius: "3px", fontSize: "0.85em", color: "#ccc",
					}}>
						{f.label || f.name}
						{f.required && <span style={{ color: "#e74c3c" }}>*</span>}
						<span style={{ color: "#888", marginLeft: "0.25rem", fontSize: "0.85em" }}>({f.type})</span>
						{visDesc && <span style={{ color: "#4A9EFF", marginLeft: "0.25rem", fontSize: "0.85em" }}>👁</span>}
					</span>
					);
				})}
			</div>
		);
	}

	return (
		<Dialog open={open} onClose={onClose} title={`Edit ${categoryLabels[baseType]} Template`} id="templateEditorDialog" large>
			<div className="template-editor-dialog" style={{ minWidth: "600px" }}>
				{loading ? (
					<div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>
				) : (
					<>
						{/* Global Template Selection */}
						<div style={{ marginBottom: "1.5rem" }}>
							<h4 style={{ margin: "0 0 0.5rem 0" }}>Global Template</h4>
							<p style={{ fontSize: "0.85em", color: "#888", margin: "0 0 0.5rem 0" }}>
								Select a base template that applies to all projects. Inherited fields appear below and can be reordered, resized, or disabled.
							</p>
							<select
								value={globalTemplateId || ""}
								onChange={(e) => handleGlobalTemplateChange(e.target.value)}
								style={{ width: "100%" }}
							>
								<option value="">None (no global template)</option>
								{globalTemplatesList.map((gt) => (
									<option key={gt.id} value={gt.id}>
										{gt.name}{gt.description ? ` — ${gt.description}` : ""} ({gt.customFields?.length || 0} fields)
									</option>
								))}
							</select>
							{selectedGlobal && (
								<div style={{ marginTop: "0.5rem", padding: "0.5rem", background: "var(--bg-secondary, #1a1a1a)", borderRadius: "4px", fontSize: "0.85em", color: "#888" }}>
									Inherited from <strong>{selectedGlobal.name}</strong> — {selectedGlobal.customFields?.length || 0} fields (shown below)
								</div>
							)}
						</div>

						{/* Series Template Selection */}
						{seriesId && (
							<div style={{ marginBottom: "1.5rem" }}>
								<h4 style={{ margin: "0 0 0.5rem 0" }}>Series Template</h4>
								<p style={{ fontSize: "0.85em", color: "#888", margin: "0 0 0.5rem 0" }}>
									Select a template from the series. Inherited fields appear below.
								</p>
								<select
									value={seriesTemplateId || ""}
									onChange={(e) => handleSeriesTemplateChange(e.target.value)}
									style={{ width: "100%" }}
								>
									<option value="">None (no series template)</option>
									{seriesTemplatesList.map((st) => (
										<option key={st.id} value={st.id}>
											{st.name}{st.description ? ` — ${st.description}` : ""} ({st.customFields?.length || 0} fields)
										</option>
									))}
								</select>
								{selectedSeries && (
									<div style={{ marginTop: "0.5rem", padding: "0.5rem", background: "var(--bg-secondary, #1a1a1a)", borderRadius: "4px", fontSize: "0.85em", color: "#888" }}>
										Inherited from <strong>{selectedSeries.name}</strong> — {selectedSeries.customFields?.length || 0} fields (shown below)
									</div>
								)}
							</div>
						)}

						{/* Merged Preview */}
						{resolvedInfo && resolvedInfo.fields.length > 0 && (
							<div style={{ marginBottom: "1.5rem" }}>
								<h4 style={{ margin: "0 0 0.5rem 0" }}>Effective Template Preview</h4>
								<p style={{ fontSize: "0.85em", color: "#888", margin: "0 0 0.5rem 0" }}>
									These are the final merged fields that will appear in the editor.
								</p>
								<div style={{ padding: "0.75rem", background: "var(--bg-secondary, #1a1a1a)", borderRadius: "4px" }}>
									{renderFieldPreview(resolvedInfo.fields)}
								</div>
							</div>
						)}

						{/* Fields List */}
						<div style={{ marginBottom: "1rem" }}>
							<h4 style={{ margin: "0 0 0.5rem 0" }}>Fields</h4>
							<p style={{ fontSize: "0.85em", color: "#888", margin: "0 0 0.5rem 0" }}>
								Inherited fields from templates are shown first. Drag to reorder, adjust span, or disable.
							</p>

							<div className="new-metafield">
								<div className="new-metafield-row" style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
									<input
										type="text"
										placeholder="Metafield name"
										value={newFieldName}
										onChange={(e) => setNewFieldName(e.target.value)}
										onKeyDown={(e) => e.key === "Enter" && addField()}
										style={{ flex: 1 }}
									/>
									<select
										value={newFieldType}
										onChange={(e) => setNewFieldType(e.target.value as FieldDefinition["type"])}
									>
										{fieldTypes.map((type) => (
											<option key={type} value={type}>{type}</option>
										))}
									</select>
									<button onClick={addField} disabled={!newFieldName.trim()}>Create</button>
								</div>

								<div className="fields-grid">
									{projectFields.length === 0 ? (
										<div className="empty-fields" style={{ color: "#888" }}>No fields defined. Select a template above or create one below.</div>
									) : (
										projectFields.map((field, index) => {
											const isOver = dragOverIndex === index && dragIndex !== index;
											return (
												<div
													key={index}
													draggable={!field.disabled}
													onDragStart={() => handleDragStart(index)}
													onDragOver={(e) => handleDragOver(e, index)}
													onDragLeave={handleDragLeave}
													onDrop={() => handleDrop(index)}
													onDragEnd={handleDragEnd}
													style={{
														padding: "0.5rem",
														border: `1px solid ${isOver ? "#4A9EFF" : "var(--border, #333)"}`,
														borderRadius: "4px",
														marginBottom: "0.5rem",
														borderStyle: isOver ? "dashed" : "solid",
														opacity: dragIndex === index ? 0.4 : 1,
														cursor: field.disabled ? "default" : "grab",
													}}
												>
												<div className="field-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
													<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
														<span style={{ cursor: field.disabled ? "default" : "grab", color: "#888", userSelect: "none" }}>≡</span>
														<span className="field-name" style={{ fontWeight: "bold" }}>{field.name}</span>
														{isFieldInherited(field.name) && (
															<span style={{ fontSize: "0.7em", color: "#FFA500", background: "rgba(255,165,0,0.15)", padding: "1px 6px", borderRadius: "3px", fontWeight: 500 }}>
																INHERITED
															</span>
														)}
														{field.visibleWhen && (
															<span title={describeVisibility(field.visibleWhen, (name) => projectFields.find((p) => p.name === name)?.label || name) || undefined} style={{ fontSize: "0.7em", color: "#4A9EFF", background: "rgba(74,158,255,0.15)", padding: "1px 6px", borderRadius: "3px", fontWeight: 500 }}>
																👁 CONDITIONAL
															</span>
														)}
													</div>
													<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
														<label style={{ display: "flex", alignItems: "center", gap: "0.2rem", fontSize: "0.8em", color: "#888" }}>
															Span
															<select
																value={field.span || 4}
																onChange={(e) => updateField(index, { span: Number(e.target.value) as 1 | 2 | 3 | 4 })}
																style={{ padding: "2px 4px", fontSize: "0.85em" }}
															>
																<option value={1}>1</option>
																<option value={2}>2</option>
																<option value={3}>3</option>
																<option value={4}>4</option>
															</select>
														</label>
														<span className="field-type" style={{ color: "#888", fontSize: "0.85em" }}>{field.type}</span>
													</div>
												</div>
												<div className="field-card-body" style={{ marginTop: "0.25rem" }}>
													{isFieldInherited(field.name) ? (
														<div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.25rem", alignItems: "center" }}>
															<span style={{ flex: 1, color: "#aaa", fontSize: "0.9em" }}>{field.label}</span>
															{field.required && <span style={{ color: "#e74c3c", fontSize: "0.85em" }}>Required *</span>}
															<label style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85em", cursor: "pointer", color: field.disabled ? "#e74c3c" : "#aaa" }}>
																<input type="checkbox" checked={!field.disabled}
																	onChange={() => toggleFieldDisabled(field.name)} />
																Enabled
															</label>
														</div>
													) : (
														<>
															<div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.25rem" }}>
																<input
																	type="text" placeholder="Label" value={field.label}
																	onChange={(e) => updateField(index, { label: e.target.value })}
																	style={{ flex: 1 }}
																/>
																<label style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85em" }}>
																	<input type="checkbox" checked={field.required}
																		onChange={(e) => updateField(index, { required: e.target.checked })} />
																	Required
																</label>
															</div>
															{(field.type === "select" || field.type === "multiselect") && (
																<input type="text" placeholder="Options (comma-separated)"
																	value={field.options?.join(", ") || ""}
																	onChange={(e) => updateField(index, { options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean) })}
																	style={{ width: "100%" }} />
															)}
															{field.type === "range" && (
																<div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
																	<input type="number" placeholder="Min" value={field.rangeMin ?? 0}
																		onChange={(e) => updateField(index, { rangeMin: Number(e.target.value) })} />
																	<input type="number" placeholder="Max" value={field.rangeMax ?? 100}
																		onChange={(e) => updateField(index, { rangeMax: Number(e.target.value) })} />
																	<input type="number" placeholder="Step" value={field.rangeStep ?? 1}
																		onChange={(e) => updateField(index, { rangeStep: Number(e.target.value) })} />
																</div>
															)}
															{field.type === "entitylink" && (
																<div style={{ marginTop: "0.25rem" }}>
																	<label style={{ fontSize: "0.85em" }}>Allowed Categories:</label>
																	<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
																		{(["character", "location", "organization", "item", "lore"] as CompendiumCategory[]).map((cat) => (
																			<label key={cat} style={{ fontSize: "0.85em", display: "flex", alignItems: "center", gap: "0.2rem" }}>
																				<input type="checkbox" checked={field.entitylinkCategories?.includes(cat) ?? true}
																					onChange={(e) => {
																						const current = field.entitylinkCategories || ["character", "location", "organization", "item", "lore"];
																						const updated = e.target.checked ? [...current, cat] : current.filter((c) => c !== cat);
																						updateField(index, { entitylinkCategories: updated });
																					}} />
																				{cat}
																			</label>
																		))}
																	</div>
																</div>
															)}
															<VisibilityEditor
																fields={projectFields}
																currentIndex={index}
																value={field.visibleWhen}
																onChange={(v) => updateField(index, { visibleWhen: v })}
															/>
															<button onClick={() => removeField(index)}
																style={{ marginTop: "0.25rem", color: "#e74c3c", fontSize: "0.85em" }}>
																Remove
															</button>
														</>
													)}
												</div>
												</div>
											);
										})
									)}
								</div>
							</div>
						</div>

						<div className="dialog-actions" style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
							<button className="cancel-btn" onClick={onClose}>Cancel</button>
							<button className="save-btn" onClick={handleSave}>Save Template</button>
						</div>
					</>
				)}
			</div>
		</Dialog>
	);
}
