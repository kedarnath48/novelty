import { useState } from 'react';
import type {
    Chapter,
    ChapterStatus,
    Character,
    PlotThread,
    ChapterPlotThread,
    ChapterOutlineData,
    StoryAct,
    StoryScene,
    StorySequence,
} from '../types/index';
import {
    IconPlus,
    IconTrash,
    IconArrowRight,
    IconGripVertical,
    IconChevronDown,
    IconChevronRight,
} from '@tabler/icons-react';
import SceneCardEditor from './SceneCardEditor';
import { useCollapseState } from '../hooks/useCollapseState';

interface Props {
    projectId: string;
    chapter: Chapter;
    characters: Character[];
    plotThreads: PlotThread[];
    chapterPlotThreads: ChapterPlotThread[];
    acts: StoryAct[];
    scenes: StoryScene[];
    sequences: StorySequence[];
    onUpdate: (field: string, value: unknown) => void;
    onMoveToDraft: () => void;
    onSceneCreate: (sequenceId: string | null) => void;
    onSceneDelete: (id: string) => void;
    onSceneUpdate: (id: string, field: string, value: unknown) => void;
    onSceneReorder: (container: string | null, orderedIds: string[]) => void;
    onSequenceCreate: () => void;
    onSequenceDelete: (id: string) => void;
    onSequenceUpdate: (id: string, field: string, value: unknown) => void;
    onSequenceReorder: (orderedIds: string[]) => void;
}

interface SceneListProps {
    scenes: StoryScene[];
    characters: Character[];
    containerKey: string | null;
    collapsedScenes: string[];
    onToggleSceneCollapse: (id: string) => void;
    onSceneCreate: (sequenceId: string | null) => void;
    onSceneDelete: (id: string) => void;
    onSceneUpdate: (id: string, field: string, value: unknown) => void;
    onSceneReorder: (container: string | null, orderedIds: string[]) => void;
}

function SceneList({
    scenes,
    characters,
    containerKey,
    collapsedScenes,
    onToggleSceneCollapse,
    onSceneCreate,
    onSceneDelete,
    onSceneUpdate,
    onSceneReorder,
}: SceneListProps) {
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    function handleDrop() {
        if (
            dragIndex === null ||
            dragOverIndex === null ||
            dragIndex === dragOverIndex
        ) {
            setDragIndex(null);
            setDragOverIndex(null);
            return;
        }
        const ids = scenes.map((s) => s.id);
        const [moved] = ids.splice(dragIndex, 1);
        ids.splice(dragOverIndex, 0, moved);
        onSceneReorder(containerKey, ids);
        setDragIndex(null);
        setDragOverIndex(null);
    }

    return (
        <>
            {scenes.length === 0 && (
                <div className="empty-scenes">
                    No scenes in this section yet.
                </div>
            )}
            {scenes.map((scene, idx) => (
                <div
                    key={scene.id}
                    className={`scene-drag-wrap ${dragOverIndex === idx && dragIndex !== null && dragIndex !== idx ? 'drop-target-line' : ''}`}
                    onDragOver={(e) => {
                        if (dragIndex === null) return;
                        e.preventDefault();
                        setDragOverIndex(idx);
                    }}
                    onDragLeave={(e) => {
                        const rel = e.relatedTarget as Node | null;
                        if (!e.currentTarget.contains(rel))
                            setDragOverIndex(null);
                    }}
                    onDrop={handleDrop}
                >
                    <SceneCardEditor
                        scene={scene}
                        index={idx}
                        characters={characters}
                        collapsed={collapsedScenes.includes(scene.id)}
                        onToggleCollapsed={() =>
                            onToggleSceneCollapse(scene.id)
                        }
                        onChange={onSceneUpdate}
                        onRemove={onSceneDelete}
                        dragHandle={
                            <span
                                className="drag-handle"
                                draggable
                                onDragStart={(e) => {
                                    e.dataTransfer.effectAllowed = 'move';
                                    setDragIndex(idx);
                                }}
                                onDragEnd={() => {
                                    setDragIndex(null);
                                    setDragOverIndex(null);
                                }}
                            >
                                <IconGripVertical size={12} />
                            </span>
                        }
                    />
                </div>
            ))}
            <button
                className="add-scene-btn"
                onClick={() => onSceneCreate(containerKey)}
            >
                <IconPlus size={12} /> Add Scene
            </button>
        </>
    );
}

export default function ChapterOutlineEditor({
    projectId,
    chapter,
    characters,
    plotThreads,
    chapterPlotThreads,
    acts,
    scenes,
    sequences,
    onUpdate,
    onMoveToDraft,
    onSceneCreate,
    onSceneDelete,
    onSceneUpdate,
    onSceneReorder,
    onSequenceCreate,
    onSequenceDelete,
    onSequenceUpdate,
    onSequenceReorder,
}: Props) {
    const { collapsed, toggle } = useCollapseState(projectId);
    const [outlineData, setOutlineData] = useState<ChapterOutlineData>(() => {
        try {
            const parsed = chapter.outline ? JSON.parse(chapter.outline) : {};
            return {
                summary: parsed.summary || '',
                scenes: [],
                keyEvents: parsed.keyEvents || [],
                notes: parsed.notes || '',
            };
        } catch {
            return { summary: '', scenes: [], keyEvents: [], notes: '' };
        }
    });

    const [dragSeqIndex, setDragSeqIndex] = useState<number | null>(null);
    const [dragOverSeqIndex, setDragOverSeqIndex] = useState<number | null>(
        null
    );
    function updateOutline(field: keyof ChapterOutlineData, value: unknown) {
        const newData = { ...outlineData, [field]: value };
        setOutlineData(newData);
        onUpdate('outline', JSON.stringify(newData));
    }

    function addKeyEvent() {
        updateOutline('keyEvents', [...outlineData.keyEvents, '']);
    }

    function updateKeyEvent(index: number, value: string) {
        const events = [...outlineData.keyEvents];
        events[index] = value;
        updateOutline('keyEvents', events);
    }

    function removeKeyEvent(index: number) {
        updateOutline(
            'keyEvents',
            outlineData.keyEvents.filter((_, i) => i !== index)
        );
    }

    function toggleSequence(id: string) {
        toggle('sequences', id);
    }

    function handleSequenceDrop() {
        if (
            dragSeqIndex === null ||
            dragOverSeqIndex === null ||
            dragSeqIndex === dragOverSeqIndex
        ) {
            setDragSeqIndex(null);
            setDragOverSeqIndex(null);
            return;
        }
        const ids = sortedSequences.map((s) => s.id);
        const [moved] = ids.splice(dragSeqIndex, 1);
        ids.splice(dragOverSeqIndex, 0, moved);
        onSequenceReorder(ids);
        setDragSeqIndex(null);
        setDragOverSeqIndex(null);
    }

    const statusOptions: ChapterStatus[] = [
        'outline',
        'draft',
        'revision',
        'done',
    ];
    const activeThreadIds = new Set(
        chapterPlotThreads.map((t) => t.plotThreadId)
    );

    const sortedSequences = [...sequences].sort(
        (a, b) => a.orderIndex - b.orderIndex
    );
    const directScenes = scenes
        .filter((s) => !s.sequenceId)
        .sort((a, b) => a.orderIndex - b.orderIndex);
    const scenesOfSequence = (seqId: string) =>
        scenes
            .filter((s) => s.sequenceId === seqId)
            .sort((a, b) => a.orderIndex - b.orderIndex);

    return (
        <div className="chapter-outline-editor">
            <div className="outline-toolbar">
                <div className="outline-status-group">
                    <label>Status</label>
                    <div className="status-selector">
                        {statusOptions.map((s) => (
                            <button
                                key={s}
                                className={`status-btn status-${s} ${chapter.status === s ? 'active' : ''}`}
                                onClick={() => onUpdate('status', s)}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {chapter.status === 'outline' && (
                    <button
                        className="move-to-draft-btn"
                        onClick={onMoveToDraft}
                    >
                        <IconArrowRight size={14} /> Move to Draft
                    </button>
                )}
            </div>

            <div className="outline-meta-grid">
                <div className="outline-field">
                    <label>Point of View</label>
                    <select
                        value={chapter.povCharacterId || ''}
                        onChange={(e) =>
                            onUpdate('povCharacterId', e.target.value || null)
                        }
                    >
                        <option value="">-- Select POV --</option>
                        {characters.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="outline-field">
                    <label>Word Count Target</label>
                    <input
                        type="number"
                        value={chapter.wordCountTarget || ''}
                        onChange={(e) =>
                            onUpdate(
                                'wordCountTarget',
                                e.target.value ? parseInt(e.target.value) : null
                            )
                        }
                        placeholder="e.g. 3000"
                    />
                </div>

                <div className="outline-field">
                    <label>Act</label>
                    <select
                        value={chapter.actId || ''}
                        onChange={(e) =>
                            onUpdate('actId', e.target.value || null)
                        }
                    >
                        <option value="">-- None --</option>
                        {acts.map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.title}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="outline-section">
                <label>Chapter Summary</label>
                <textarea
                    value={outlineData.summary}
                    onChange={(e) => updateOutline('summary', e.target.value)}
                    placeholder="Brief summary of what happens in this chapter..."
                    rows={3}
                />
            </div>

            <div className="outline-section">
                <div className="section-header">
                    <label>Scenes</label>
                    <button className="icon-btn" onClick={onSequenceCreate}>
                        <IconPlus size={14} /> Add Sequence
                    </button>
                </div>
                {sequences.length === 0 && directScenes.length === 0 && (
                    <div className="empty-scenes">
                        No sequences or scenes attached to this chapter yet.
                    </div>
                )}

                {sortedSequences.length > 0 && (
                    <div className="outline-sequences">
                        {sortedSequences.map((seq, seqIdx) => (
                            <div
                                key={seq.id}
                                className={`outline-sequence ${dragOverSeqIndex === seqIdx && dragSeqIndex !== null && dragSeqIndex !== seqIdx ? 'drop-target-line' : ''}`}
                                onDragOver={(e) => {
                                    if (dragSeqIndex === null) return;
                                    e.preventDefault();
                                    setDragOverSeqIndex(seqIdx);
                                }}
                                onDragLeave={(e) => {
                                    const rel = e.relatedTarget as Node | null;
                                    if (!e.currentTarget.contains(rel))
                                        setDragOverSeqIndex(null);
                                }}
                                onDrop={handleSequenceDrop}
                            >
                                <div className="outline-sequence-header">
                                    <span
                                        className="drag-handle"
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer.effectAllowed =
                                                'move';
                                            setDragSeqIndex(seqIdx);
                                        }}
                                        onDragEnd={() => {
                                            setDragSeqIndex(null);
                                            setDragOverSeqIndex(null);
                                        }}
                                    >
                                        <IconGripVertical size={12} />
                                    </span>
                                    <button
                                        className="collapse-btn"
                                        onClick={() => toggleSequence(seq.id)}
                                        title={
                                            collapsed.sequences.includes(seq.id)
                                                ? 'Expand'
                                                : 'Collapse'
                                        }
                                    >
                                        {collapsed.sequences.includes(
                                            seq.id
                                        ) ? (
                                            <IconChevronRight size={14} />
                                        ) : (
                                            <IconChevronDown size={14} />
                                        )}
                                    </button>
                                    <input
                                        className="sequence-title-input"
                                        placeholder="Sequence title..."
                                        value={seq.title}
                                        onChange={(e) =>
                                            onSequenceUpdate(
                                                seq.id,
                                                'title',
                                                e.target.value
                                            )
                                        }
                                    />
                                    <span className="act-badge">
                                        {seq.status}
                                    </span>
                                    <button
                                        className="icon-btn icon-btn-sm"
                                        onClick={() => onSequenceDelete(seq.id)}
                                    >
                                        <IconTrash size={12} />
                                    </button>
                                </div>
                                <textarea
                                    className="sequence-summary-input"
                                    placeholder="Sequence summary..."
                                    value={seq.summary || ''}
                                    onChange={(e) =>
                                        onSequenceUpdate(
                                            seq.id,
                                            'summary',
                                            e.target.value
                                        )
                                    }
                                    rows={1}
                                />
                                {!collapsed.sequences.includes(seq.id) && (
                                    <div className="outline-sequence-scenes">
                                        <SceneList
                                            scenes={scenesOfSequence(seq.id)}
                                            characters={characters}
                                            containerKey={seq.id}
                                            collapsedScenes={collapsed.scenes}
                                            onToggleSceneCollapse={(id) =>
                                                toggle('scenes', id)
                                            }
                                            onSceneCreate={onSceneCreate}
                                            onSceneDelete={onSceneDelete}
                                            onSceneUpdate={onSceneUpdate}
                                            onSceneReorder={onSceneReorder}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {directScenes.length > 0 && (
                    <div className="outline-direct-scenes">
                        <SceneList
                            scenes={directScenes}
                            characters={characters}
                            containerKey={null}
                            collapsedScenes={collapsed.scenes}
                            onToggleSceneCollapse={(id) => toggle('scenes', id)}
                            onSceneCreate={onSceneCreate}
                            onSceneDelete={onSceneDelete}
                            onSceneUpdate={onSceneUpdate}
                            onSceneReorder={onSceneReorder}
                        />
                    </div>
                )}
            </div>

            <div className="outline-section">
                <div className="section-header">
                    <label>Key Events / Plot Points</label>
                    <button className="icon-btn" onClick={addKeyEvent}>
                        <IconPlus size={14} />
                    </button>
                </div>
                {outlineData.keyEvents.map((event, idx) => (
                    <div key={idx} className="key-event-row">
                        <input
                            value={event}
                            onChange={(e) =>
                                updateKeyEvent(idx, e.target.value)
                            }
                            placeholder="e.g. Protagonist discovers the hidden letter"
                        />
                        <button
                            className="icon-btn icon-btn-sm"
                            onClick={() => removeKeyEvent(idx)}
                        >
                            <IconTrash size={12} />
                        </button>
                    </div>
                ))}
            </div>

            <div className="outline-section">
                <label>Plot Threads in this Chapter</label>
                <div className="plot-thread-tags">
                    {plotThreads.map((pt) => (
                        <button
                            key={pt.id}
                            className={`thread-tag ${activeThreadIds.has(pt.id) ? 'active' : ''}`}
                            style={{ borderLeftColor: pt.color }}
                            onClick={() => {
                                const existing = chapterPlotThreads.find(
                                    (t) => t.plotThreadId === pt.id
                                );
                                const newThreads = existing
                                    ? chapterPlotThreads.filter(
                                          (t) => t.plotThreadId !== pt.id
                                      )
                                    : [
                                          ...chapterPlotThreads,
                                          {
                                              chapterId: chapter.id,
                                              plotThreadId: pt.id,
                                              intensity: 5,
                                          },
                                      ];
                                onUpdate('plotThreads', newThreads);
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
                    onChange={(e) => updateOutline('notes', e.target.value)}
                    placeholder="Additional notes, reminders, research links..."
                    rows={3}
                />
            </div>
        </div>
    );
}
