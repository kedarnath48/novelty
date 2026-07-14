import { useState, useEffect, useCallback } from "react";
import { useRPC } from "../contexts/RPCContext";
import type { StoryAct, StorySequence, PlotThread, Chapter, StoryBeat } from "../types/index";
import { IconPlus, IconTrash, IconGripVertical, IconChevronDown, IconChevronRight, IconRefresh } from "@tabler/icons-react";

interface Props {
	projectId: string;
	chapters: Chapter[];
	onNavigateChapter: (chapterId: string) => void;
}

const THREAD_COLORS = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];
const BEAT_TYPES = [
	"opening-image", "theme-stated", "setup", "catalyst", "debate",
	"break-into-two", "b-story", "fun-and-games", "midpoint",
	"bad-guys-close-in", "all-is-lost", "dark-night-of-soul",
	"break-into-three", "climax", "falling-action", "finale", "final-image", "custom",
] as const;

export default function PlotArchitectureView({ projectId, chapters, onNavigateChapter }: Props) {
	const rpc = useRPC();

	const [acts, setActs] = useState<StoryAct[]>([]);
	const [sequences, setSequences] = useState<StorySequence[]>([]);
	const [plotThreads, setPlotThreads] = useState<PlotThread[]>([]);
	const [storyBeats, setStoryBeats] = useState<StoryBeat[]>([]);
	const [expandedActs, setExpandedActs] = useState<Set<string>>(new Set());
	const [activeTab, setActiveTab] = useState<"acts" | "threads" | "beats">("acts");

	const loadData = useCallback(async () => {
		const [a, s, t, b] = await Promise.all([
			rpc.request["db:get-story-acts"](projectId),
			rpc.request["db:get-story-sequences"](projectId),
			rpc.request["db:get-plot-threads"](projectId),
			rpc.request["db:get-story-beats"](projectId),
		]);
		setActs(a || []);
		setSequences(s || []);
		setPlotThreads(t || []);
		setStoryBeats(b || []);
	}, [projectId, rpc]);

	useEffect(() => { loadData(); }, [loadData]);

	async function handleAddAct() {
		const orderIndex = acts.length;
		await rpc.request["db:create-story-act"]({
			id: crypto.randomUUID(),
			projectId,
			title: `Act ${acts.length + 1}`,
			summary: null,
			orderIndex,
			actNumber: acts.length + 1,
			status: "outline",
		});
		loadData();
	}

	async function handleAddSequence(actId: string) {
		const actSeqs = sequences.filter(s => s.actId === actId);
		await rpc.request["db:create-story-sequence"]({
			id: crypto.randomUUID(),
			actId,
			projectId,
			title: `Sequence ${actSeqs.length + 1}`,
			summary: null,
			orderIndex: actSeqs.length,
			status: "outline",
		});
		loadData();
	}

	async function handleAddPlotThread() {
		await rpc.request["db:create-plot-thread"]({
			id: crypto.randomUUID(),
			projectId,
			name: "New Plot Thread",
			description: null,
			threadType: "subplot",
			color: THREAD_COLORS[plotThreads.length % THREAD_COLORS.length],
		});
		loadData();
	}

	async function handleAddStoryBeat() {
		await rpc.request["db:create-story-beat"]({
			id: crypto.randomUUID(),
			projectId,
			chapterId: null,
			beatType: "custom",
			title: "New Beat",
			description: null,
			orderIndex: storyBeats.length,
		});
		loadData();
	}

	async function handleDeleteAct(id: string) {
		await rpc.request["db:delete-story-act"](id);
		loadData();
	}

	async function handleDeleteSequence(id: string) {
		await rpc.request["db:delete-story-sequence"](id);
		loadData();
	}

	async function handleDeleteThread(id: string) {
		await rpc.request["db:delete-plot-thread"](id);
		loadData();
	}

	async function handleDeleteBeat(id: string) {
		await rpc.request["db:delete-story-beat"](id);
		loadData();
	}

	async function handleUpdateAct(id: string, field: string, value: string | number) {
		await rpc.request["db:update-story-act"]({ id, data: { [field]: value } as any });
		loadData();
	}

	async function handleUpdateSequence(id: string, field: string, value: string | number) {
		await rpc.request["db:update-story-sequence"]({ id, data: { [field]: value } as any });
		loadData();
	}

	async function handleUpdateThread(id: string, field: string, value: string) {
		await rpc.request["db:update-plot-thread"]({ id, data: { [field]: value } as any });
		loadData();
	}

	async function handleUpdateBeat(id: string, field: string, value: string) {
		await rpc.request["db:update-story-beat"]({ id, data: { [field]: value } as any });
		loadData();
	}

	function toggleAct(id: string) {
		setExpandedActs(prev => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	const actChapters = (actId: string) => chapters.filter(c => c.actId === actId);
	const actSequences = (actId: string) => sequences.filter(s => s.actId === actId);

	return (
		<div className="plot-architecture-view">
			<div className="plot-arch-header">
				<h3>Plot Architecture</h3>
				<div className="plot-arch-tabs">
					<button className={activeTab === "acts" ? "active" : ""} onClick={() => setActiveTab("acts")}>Acts</button>
					<button className={activeTab === "threads" ? "active" : ""} onClick={() => setActiveTab("threads")}>Plot Threads</button>
					<button className={activeTab === "beats" ? "active" : ""} onClick={() => setActiveTab("beats")}>Story Beats</button>
				</div>
				<button className="icon-btn" onClick={loadData} title="Refresh"><IconRefresh size={16} /></button>
			</div>

			{activeTab === "acts" && (
				<div className="acts-list">
					{acts.length === 0 && <div className="empty-state">No acts defined. Add one to structure your story.</div>}
					{acts.map((act) => (
						<div key={act.id} className="act-card">
							<div className="act-header" onClick={() => toggleAct(act.id)}>
								{expandedActs.has(act.id) ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
								<input
									className="act-title-input"
									value={act.title}
									onChange={e => handleUpdateAct(act.id, "title", e.target.value)}
									onClick={e => e.stopPropagation()}
								/>
								<span className="act-badge">{act.status}</span>
								<span className="act-chapter-count">{actChapters(act.id).length} chapters</span>
								<button className="icon-btn icon-btn-sm" onClick={e => { e.stopPropagation(); handleDeleteAct(act.id); }}><IconTrash size={14} /></button>
							</div>
							{expandedActs.has(act.id) && (
								<div className="act-body">
									<textarea
										className="act-summary-input"
										placeholder="Act summary..."
										value={act.summary || ""}
										onChange={e => handleUpdateAct(act.id, "summary", e.target.value)}
										rows={2}
									/>
									<div className="sequences-list">
										{actSequences(act.id).map(seq => (
											<div key={seq.id} className="sequence-card">
												<div className="sequence-header">
													<IconGripVertical size={12} />
													<input
														className="sequence-title-input"
														value={seq.title}
														onChange={e => handleUpdateSequence(seq.id, "title", e.target.value)}
													/>
													<span className="act-badge">{seq.status}</span>
													<button className="icon-btn icon-btn-sm" onClick={() => handleDeleteSequence(seq.id)}><IconTrash size={12} /></button>
												</div>
												<textarea
													className="sequence-summary-input"
													placeholder="Sequence summary..."
													value={seq.summary || ""}
													onChange={e => handleUpdateSequence(seq.id, "summary", e.target.value)}
													rows={1}
												/>
												<div className="sequence-chapters">
													{chapters.filter(c => c.sequenceId === seq.id).map(ch => (
														<div key={ch.id} className="seq-chapter-chip" onClick={() => onNavigateChapter(ch.id)}>
															{ch.title}
															<span className={`status-dot status-${ch.status}`} />
														</div>
													))}
												</div>
											</div>
										))}
										<button className="add-sequence-btn" onClick={() => handleAddSequence(act.id)}>
											<IconPlus size={14} /> Add Sequence
										</button>
									</div>
									<div className="act-unassigned">
										{actChapters(act.id).filter(c => !c.sequenceId).map(ch => (
											<div key={ch.id} className="seq-chapter-chip" onClick={() => onNavigateChapter(ch.id)}>
												{ch.title}
												<span className={`status-dot status-${ch.status}`} />
											</div>
										))}
									</div>
								</div>
							)}
						</div>
					))}
					<button className="add-act-btn" onClick={handleAddAct}><IconPlus size={16} /> Add Act</button>
				</div>
			)}

			{activeTab === "threads" && (
				<div className="threads-list">
					{plotThreads.length === 0 && <div className="empty-state">No plot threads defined. Add threads to track subplots and character arcs.</div>}
					{plotThreads.map(thread => (
						<div key={thread.id} className="thread-card" style={{ borderLeftColor: thread.color }}>
							<div className="thread-header">
								<input
									className="thread-name-input"
									value={thread.name}
									onChange={e => handleUpdateThread(thread.id, "name", e.target.value)}
								/>
								<select
									value={thread.threadType}
									onChange={e => handleUpdateThread(thread.id, "threadType", e.target.value)}
									className="thread-type-select"
								>
									<option value="main">Main</option>
									<option value="subplot">Subplot</option>
									<option value="character-arc">Character Arc</option>
									<option value="mystery">Mystery</option>
									<option value="romance">Romance</option>
									<option value="thematic">Thematic</option>
								</select>
								<input
									type="color"
									value={thread.color}
									onChange={e => handleUpdateThread(thread.id, "color", e.target.value)}
									className="thread-color-picker"
								/>
								<button className="icon-btn icon-btn-sm" onClick={() => handleDeleteThread(thread.id)}><IconTrash size={14} /></button>
							</div>
							<input
								className="thread-desc-input"
								placeholder="Description..."
								value={thread.description || ""}
								onChange={e => handleUpdateThread(thread.id, "description", e.target.value)}
							/>
							<div className="thread-chapters">
								Chapters: {chapters.filter(c => c.content?.includes(thread.name)).length}
							</div>
						</div>
					))}
					<button className="add-thread-btn" onClick={handleAddPlotThread}><IconPlus size={16} /> Add Plot Thread</button>
				</div>
			)}

			{activeTab === "beats" && (
				<div className="beats-list">
					{storyBeats.length === 0 && <div className="empty-state">No story beats defined. Add structural beats like "Inciting Incident" or "Midpoint".</div>}
					{storyBeats.map(beat => (
						<div key={beat.id} className="beat-card">
							<div className="beat-header">
								<select
									value={beat.beatType}
									onChange={e => handleUpdateBeat(beat.id, "beatType", e.target.value)}
									className="beat-type-select"
								>
									{BEAT_TYPES.map(bt => <option key={bt} value={bt}>{bt.replace(/-/g, " ")}</option>)}
								</select>
								<input
									className="beat-title-input"
									value={beat.title}
									onChange={e => handleUpdateBeat(beat.id, "title", e.target.value)}
								/>
								<button className="icon-btn icon-btn-sm" onClick={() => handleDeleteBeat(beat.id)}><IconTrash size={14} /></button>
							</div>
							<input
								className="beat-desc-input"
								placeholder="Description..."
								value={beat.description || ""}
								onChange={e => handleUpdateBeat(beat.id, "description", e.target.value)}
							/>
							<div className="beat-chapter">
								{beat.chapterId
									? <span>Assigned to: {chapters.find(c => c.id === beat.chapterId)?.title || "Unknown"}</span>
									: <span className="unassigned">Not assigned to a chapter</span>
								}
							</div>
						</div>
					))}
					<button className="add-beat-btn" onClick={handleAddStoryBeat}><IconPlus size={16} /> Add Story Beat</button>
				</div>
			)}
		</div>
	);
}
