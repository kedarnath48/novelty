import { useState } from "react";
import type { Chapter, ChapterStatus, Character, PlotThread, ChapterPlotThread, SceneOutline, ChapterOutlineData, StoryAct, StorySequence } from "../types/index";
import { IconPlus, IconTrash, IconArrowRight } from "@tabler/icons-react";

interface Props {
	chapter: Chapter;
	characters: Character[];
	plotThreads: PlotThread[];
	chapterPlotThreads: ChapterPlotThread[];
	acts: StoryAct[];
	sequences: StorySequence[];
	onUpdate: (field: string, value: unknown) => void;
	onMoveToDraft: () => void;
}

export default function ChapterOutlineEditor({
	chapter, characters, plotThreads,
	chapterPlotThreads, acts, sequences,
	onUpdate, onMoveToDraft,
}: Props) {
	const [outlineData, setOutlineData] = useState<ChapterOutlineData>(() => {
		try {
			return chapter.outline ? JSON.parse(chapter.outline) : { summary: "", scenes: [], keyEvents: [], notes: "" };
		} catch {
			return { summary: "", scenes: [], keyEvents: [], notes: "" };
		}
	});

	function updateOutline(field: keyof ChapterOutlineData, value: unknown) {
		const newData = { ...outlineData, [field]: value };
		setOutlineData(newData);
		onUpdate("outline", JSON.stringify(newData));
	}

	function addScene() {
		const newScene: SceneOutline = {
			id: crypto.randomUUID(),
			title: "",
			summary: "",
			setting: "",
			charactersPresent: [],
			keyEvents: [],
			duration: null,
			conflict: null,
		};
		updateOutline("scenes", [...outlineData.scenes, newScene]);
	}

	function removeScene(id: string) {
		updateOutline("scenes", outlineData.scenes.filter(s => s.id !== id));
	}

	function updateScene(id: string, field: keyof SceneOutline, value: unknown) {
		updateOutline("scenes", outlineData.scenes.map(s => s.id === id ? { ...s, [field]: value } : s));
	}

	function addKeyEvent() {
		updateOutline("keyEvents", [...outlineData.keyEvents, ""]);
	}

	function updateKeyEvent(index: number, value: string) {
		const events = [...outlineData.keyEvents];
		events[index] = value;
		updateOutline("keyEvents", events);
	}

	function removeKeyEvent(index: number) {
		updateOutline("keyEvents", outlineData.keyEvents.filter((_, i) => i !== index));
	}

	function toggleCharacterInScene(sceneId: string, charId: string) {
		const scene = outlineData.scenes.find(s => s.id === sceneId);
		if (!scene) return;
		const present = scene.charactersPresent.includes(charId);
		updateScene(sceneId, "charactersPresent",
			present
				? scene.charactersPresent.filter(id => id !== charId)
				: [...scene.charactersPresent, charId],
		);
	}

	const statusOptions: ChapterStatus[] = ["outline", "draft", "revision", "done"];
	const activeThreadIds = new Set(chapterPlotThreads.map(t => t.plotThreadId));

	return (
		<div className="chapter-outline-editor">
			<div className="outline-toolbar">
				<div className="outline-status-group">
					<label>Status</label>
					<div className="status-selector">
						{statusOptions.map(s => (
							<button
								key={s}
								className={`status-btn status-${s} ${chapter.status === s ? "active" : ""}`}
								onClick={() => onUpdate("status", s)}
							>
								{s}
							</button>
						))}
					</div>
				</div>

				{chapter.status === "outline" && (
					<button className="move-to-draft-btn" onClick={onMoveToDraft}>
						<IconArrowRight size={14} /> Move to Draft
					</button>
				)}
			</div>

			<div className="outline-meta-grid">
				<div className="outline-field">
					<label>Point of View</label>
					<select
						value={chapter.povCharacterId || ""}
						onChange={e => onUpdate("povCharacterId", e.target.value || null)}
					>
						<option value="">-- Select POV --</option>
						{characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
					</select>
				</div>

				<div className="outline-field">
					<label>Word Count Target</label>
					<input
						type="number"
						value={chapter.wordCountTarget || ""}
						onChange={e => onUpdate("wordCountTarget", e.target.value ? parseInt(e.target.value) : null)}
						placeholder="e.g. 3000"
					/>
				</div>

				<div className="outline-field">
					<label>Act</label>
					<select
						value={chapter.actId || ""}
						onChange={e => onUpdate("actId", e.target.value || null)}
					>
						<option value="">-- None --</option>
						{acts.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
					</select>
				</div>

				<div className="outline-field">
					<label>Sequence</label>
					<select
						value={chapter.sequenceId || ""}
						onChange={e => onUpdate("sequenceId", e.target.value || null)}
					>
						<option value="">-- None --</option>
						{sequences.filter(s => !chapter.actId || s.actId === chapter.actId).map(s => (
							<option key={s.id} value={s.id}>{s.title}</option>
						))}
					</select>
				</div>
			</div>

			<div className="outline-section">
				<label>Chapter Summary</label>
				<textarea
					value={outlineData.summary}
					onChange={e => updateOutline("summary", e.target.value)}
					placeholder="Brief summary of what happens in this chapter..."
					rows={3}
				/>
			</div>

			<div className="outline-section">
				<div className="section-header">
					<label>Scenes</label>
					<button className="icon-btn" onClick={addScene}><IconPlus size={14} /> Add Scene</button>
				</div>
				{outlineData.scenes.map((scene, idx) => (
					<div key={scene.id} className="scene-card">
						<div className="scene-header">
							<span className="scene-number">Scene {idx + 1}</span>
							<button className="icon-btn icon-btn-sm" onClick={() => removeScene(scene.id)}><IconTrash size={12} /></button>
						</div>
						<input
							className="scene-title"
							placeholder="Scene title..."
							value={scene.title}
							onChange={e => updateScene(scene.id, "title", e.target.value)}
						/>
						<textarea
							placeholder="What happens in this scene?"
							value={scene.summary}
							onChange={e => updateScene(scene.id, "summary", e.target.value)}
							rows={2}
						/>
						<div className="scene-details">
							<input
								placeholder="Setting (e.g. The Throne Room)"
								value={scene.setting}
								onChange={e => updateScene(scene.id, "setting", e.target.value)}
							/>
							<input
								placeholder="Duration (e.g. 10 minutes)"
								value={scene.duration || ""}
								onChange={e => updateScene(scene.id, "duration", e.target.value)}
							/>
							<input
								placeholder="Core conflict..."
								value={scene.conflict || ""}
								onChange={e => updateScene(scene.id, "conflict", e.target.value)}
							/>
						</div>
						<div className="scene-characters">
							<label>Characters present:</label>
							<div className="char-tags">
								{characters.map(ch => (
									<button
										key={ch.id}
										className={`char-tag ${scene.charactersPresent.includes(ch.id) ? "active" : ""}`}
										onClick={() => toggleCharacterInScene(scene.id, ch.id)}
									>
										{ch.name}
									</button>
								))}
							</div>
						</div>
					</div>
				))}
			</div>

			<div className="outline-section">
				<div className="section-header">
					<label>Key Events / Plot Points</label>
					<button className="icon-btn" onClick={addKeyEvent}><IconPlus size={14} /></button>
				</div>
				{outlineData.keyEvents.map((event, idx) => (
					<div key={idx} className="key-event-row">
						<input
							value={event}
							onChange={e => updateKeyEvent(idx, e.target.value)}
							placeholder="e.g. Protagonist discovers the hidden letter"
						/>
						<button className="icon-btn icon-btn-sm" onClick={() => removeKeyEvent(idx)}><IconTrash size={12} /></button>
					</div>
				))}
			</div>

			<div className="outline-section">
				<label>Plot Threads in this Chapter</label>
				<div className="plot-thread-tags">
					{plotThreads.map(pt => (
						<button
							key={pt.id}
							className={`thread-tag ${activeThreadIds.has(pt.id) ? "active" : ""}`}
							style={{ borderLeftColor: pt.color }}
							onClick={() => {
								const existing = chapterPlotThreads.find(t => t.plotThreadId === pt.id);
								const newThreads = existing
									? chapterPlotThreads.filter(t => t.plotThreadId !== pt.id)
									: [...chapterPlotThreads, { chapterId: chapter.id, plotThreadId: pt.id, intensity: 5 }];
								onUpdate("plotThreads", newThreads);
							}}
						>
							{pt.name}
						</button>
					))}
				</div>
			</div>

			<div className="outline-section">
				<label>Notes</label>
				<textarea
					value={outlineData.notes}
					onChange={e => updateOutline("notes", e.target.value)}
					placeholder="Additional notes, reminders, research links..."
					rows={3}
				/>
			</div>
		</div>
	);
}
