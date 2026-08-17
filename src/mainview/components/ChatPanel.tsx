import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    //IconArrowRight,
    IconPlus,
    IconHistory,
    IconArchive,
    IconSettings2,
    IconX,
    IconSend,
    IconMicrophone,
    IconPaperclip,
    IconLoader2,
    IconArrowUp,
    IconArrowDown,
    IconArrowBackUp,
    IconBook,
    IconFiles,
    IconUsers,
    IconMapPin2,
    IconBuildings,
    IconSwords,
} from '@tabler/icons-react';
import { chatCompletion, toApiMessages } from '../services/ai';
import type {
    ChatMessage,
    UserChatMessage,
    AssistantChatMessage,
} from '../services/ai';
import type {
    NewChatSession,
    Project,
    MentionTarget,
    Chapter,
    Character,
    Location,
    Organization,
    Item,
    LoreEntry,
    CompendiumCategory,
    FieldDefinition,
} from '../types';
import { parseEntryData, parseAllEntryData } from '../services/entryParser';
import type { ParsedEntry } from '../services/entryParser';
import type { RichTextEditorHandle } from './RichTextEditor';
import { buildContext } from '../services/contextBuilder';
import {
    buildAIContext,
    checkEmbeddingsAvailable,
} from '../services/contextEngine';
import { getTextSource } from '../services/textExtractor';
import type { ExtractionSource } from '../services/textExtractor';
import { useSettings } from '../contexts/SettingsContext';
import { getRPC } from '../contexts/RPCContext';
import { useSessions } from '../hooks/useSessions';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import MessageBubble from './MessageBubble';
import SessionListView from './SessionListView';
import SettingsDialog from '../dialogs/SettingsDialog';
import FloatingSuggestions from './FloatingSuggestions';
import type { SuggestionGroup } from './FloatingSuggestions';
import ContextChips from './ContextChips';
import SystemPromptToggle from './SystemPromptToggle';
import { SettingsDialogActiveTab } from '../constants/layout_tabs';

function smartTruncate(text: string, maxLen = 50): string {
    const cleaned = text
        .replace(
            /^(hi|hello|hey|okay|ok|please|could you|can you|would you|i want|i need|thanks|thank you|hi there|hey there)[,\s!.]*/i,
            ''
        )
        .trim();
    if (cleaned.length <= maxLen) return cleaned;
    const truncated = cleaned.substring(0, maxLen + 1);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 0) return truncated.substring(0, lastSpace) + '...';
    return cleaned.substring(0, maxLen) + '...';
}

interface ChatPanelProps {
    onToggleCollapse: () => void;
    sessionId?: string;
    onNewSession?: () => void;
    projectId?: string | null;
    project?: Project | null;
    chapters?: Chapter[];
    characters?: Character[];
    locations?: Location[];
    organizations?: Organization[];
    items?: Item[];
    loreEntries?: LoreEntry[];
    editorRef?: React.RefObject<RichTextEditorHandle | null>;
    onCreateCompendiumEntry?: (
        category: CompendiumCategory,
        name: string,
        templateData: Record<string, unknown>
    ) => Promise<string | null>;
    onExtractEntities?: (
        entries: ParsedEntry[],
        source: ExtractionSource
    ) => void;
    onUpdateCompendium?: (
        entries: ParsedEntry[],
        source: ExtractionSource
    ) => void;
    activeTabId?: string | null;
    activeTabType?: string | null;
    style?: React.CSSProperties;
    resolvedTemplates?: Partial<Record<CompendiumCategory, FieldDefinition[]>>;
}

export default function ChatPanel({
    onToggleCollapse,
    onNewSession: _onNewSession,
    style,
    projectId,
    project,
    chapters = [],
    characters = [],
    locations = [],
    organizations = [],
    items = [],
    loreEntries = [],
    editorRef,
    onCreateCompendiumEntry,
    onExtractEntities,
    onUpdateCompendium,
    activeTabId,
    activeTabType,
    resolvedTemplates,
}: ChatPanelProps) {
    const rpc = getRPC();
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [mode, setMode] = useState<'assistant' | 'editor'>('assistant');
    const [expandedMessages, setExpandedMessages] = useState<Set<string>>(
        new Set()
    );
    const [lastCopiedId, setLastCopiedId] = useState<string | null>(null);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [showJumpToPrompt, setShowJumpToPrompt] = useState(false);
    const [showScrollBottom, setShowScrollBottom] = useState(false);
    const [activeView, setActiveView] = useState<
        'chat' | 'history' | 'archive'
    >('chat');
    const [showSettings, setShowSettings] = useState(false);
    const [settingsRoute, setSettingsRoute] = useState<
        | { tab: SettingsDialogActiveTab; section?: string; focus?: string }
        | undefined
    >(undefined);
    const [selectedModel, setSelectedModel] = useState('');

    // Slash command state
    const [showSlashPopup, setShowSlashPopup] = useState(false);
    const [slashSearchTerm, setSlashSearchTerm] = useState('');
    const slashTriggerPos = useRef<number | null>(null);

    // @-mention state
    const [showAtPopup, setShowAtPopup] = useState(false);
    const [atSearchTerm, setAtSearchTerm] = useState('');
    const [mentions, setMentions] = useState<MentionTarget[]>([]);
    const [fileAttachments, setFileAttachments] = useState<
        { path: string; label: string }[]
    >([]);
    const [customSystemPrompt, setCustomSystemPrompt] = useState(
        project?.systemPrompt || ''
    );
    const [pendingEntryData, setPendingEntryData] = useState<
        Record<string, ParsedEntry>
    >({});
    const [creatingEntryId, setCreatingEntryId] = useState<string | null>(null);
    const [slashCommandTargets, setSlashCommandTargets] = useState<
        Record<string, { category: CompendiumCategory; name: string }>
    >({});
    const [embeddingsAvailable, setEmbeddingsAvailable] = useState(false);

    useEffect(() => {
        checkEmbeddingsAvailable()
            .then(setEmbeddingsAvailable)
            .catch(() => setEmbeddingsAvailable(false));
    }, []);

    const COMMAND_MAP: Record<string, CompendiumCategory> = {
        createcharacter: 'character',
        createlocation: 'location',
        createorganization: 'organization',
        createitem: 'item',
        createlore: 'lore',
    };

    const EXTRACT_COMMANDS = new Set([
        'extractcharacters',
        'extractlocations',
        'extractorganizations',
        'extractitems',
        'extractlore',
        'extractall',
        'updatecompendium',
    ]);

    const EXTRACT_CATEGORY_MAP: Record<string, CompendiumCategory | null> = {
        extractcharacters: 'character',
        extractlocations: 'location',
        extractorganizations: 'organization',
        extractitems: 'item',
        extractlore: 'lore',
        extractall: null,
        updatecompendium: null,
    };

    const typeLabels: Record<MentionTarget['type'], string> = {
        chapter: 'Chapters',
        character: 'Characters',
        location: 'Locations',
        organization: 'Organizations',
        item: 'Items',
        lore: 'Lore',
    };

    const typeIcons: Record<MentionTarget['type'], React.ReactNode> = {
        chapter: <IconFiles size={14} />,
        character: <IconUsers size={14} />,
        location: <IconMapPin2 size={14} />,
        organization: <IconBuildings size={14} />,
        item: <IconSwords size={14} />,
        lore: <IconBook size={14} />,
    };

    const SLASH_COMMANDS = [
        {
            command: '/continue',
            description: 'Continue writing from cursor',
            type: 'instant' as const,
        },
        {
            command: '/rewrite',
            description: 'Rewrite selected text',
            type: 'instant' as const,
        },
        {
            command: '/expand',
            description: 'Expand on selected text',
            type: 'instant' as const,
        },
        {
            command: '/summarize',
            description: 'Summarize selected text',
            type: 'instant' as const,
        },
        {
            command: '/tone:',
            description: 'Change tone (formal, casual, poetic...)',
            type: 'context' as const,
        },
        {
            command: '/createcharacter',
            description: 'Create a new character entry',
            type: 'context' as const,
        },
        {
            command: '/createlocation',
            description: 'Create a new location entry',
            type: 'context' as const,
        },
        {
            command: '/createorganization',
            description: 'Create a new organization entry',
            type: 'context' as const,
        },
        {
            command: '/createitem',
            description: 'Create a new item entry',
            type: 'context' as const,
        },
        {
            command: '/createlore',
            description: 'Create a new lore entry',
            type: 'context' as const,
        },
        {
            command: '/extractcharacters',
            description: 'Extract character entries from text',
            type: 'context' as const,
        },
        {
            command: '/extractlocations',
            description: 'Extract location entries from text',
            type: 'context' as const,
        },
        {
            command: '/extractorganizations',
            description: 'Extract organization entries from text',
            type: 'context' as const,
        },
        {
            command: '/extractitems',
            description: 'Extract item entries from text',
            type: 'context' as const,
        },
        {
            command: '/extractlore',
            description: 'Extract lore entries from text',
            type: 'context' as const,
        },
        {
            command: '/extractall',
            description: 'Extract all entity types from text',
            type: 'context' as const,
        },
        {
            command: '/updatecompendium',
            description: 'Update existing entries from text',
            type: 'context' as const,
        },
    ];

    const messagesRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const lastUserMsgRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const atTriggerPos = useRef<{ start: number; end: number } | null>(null);
    const streamedContentRef = useRef('');
    const streamedReasoningRef = useRef('');
    const rafIdRef = useRef<number | null>(null);
    const isStreamingRef = useRef(false);

    useEffect(() => {
        const ta = inputRef.current;
        if (ta) {
            ta.style.height = 'auto';
            ta.style.height = Math.min(ta.scrollHeight, 240) + 'px';
        }
    }, [input]);
    const prevMessagesLength = useRef(0);
    const { settings } = useSettings();
    const {
        sessions,
        setSessions,
        activeSessions,
        archivedSessions,
        activeSessionId,
        setActiveSessionId,
        createSession,
        renameSession,
        archiveSession,
        unarchiveSession,
        deleteSession,
    } = useSessions(projectId);
    const viewMode = settings?.general.chatViewMode ?? 'full';

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    const prevStreamLenRef = useRef(0);
    const [voiceInterim, setVoiceInterim] = useState('');
    const voice = useSpeechRecognition(
        useCallback((text: string) => {
            setInput((prev) => prev + text);
        }, []),
        useCallback((text: string) => {
            setVoiceInterim(text);
        }, [])
    );

    useEffect(() => {
        const lenChanged = messages.length > prevMessagesLength.current;
        if (lenChanged) {
            scrollToBottom();
        }
        // Also scroll during streaming content updates
        if (isLoading && messages.length > 0) {
            const last = messages[messages.length - 1];
            if (last.role === 'assistant') {
                const currentLen = last.content[0].length;
                if (currentLen > prevStreamLenRef.current + 5) {
                    prevStreamLenRef.current = currentLen;
                    scrollToBottom();
                }
            }
        }
        prevMessagesLength.current = messages.length;
    }, [messages, isLoading, scrollToBottom]);

    const getEnabledModels = useCallback(() => {
        const provider = settings?.providers.defaultProvider
            ? settings.providers.configs[settings.providers.defaultProvider]
            : null;
        if (provider?.models) {
            const displayMode =
                provider.modelDisplayMode ??
                settings?.providers.modelDisplayMode ??
                'alias';
            return Object.entries(provider.models)
                .filter(([, entry]) =>
                    typeof entry === 'boolean' ? entry : entry.enabled
                )
                .map(([name, entry]) => {
                    const alias =
                        typeof entry === 'object' ? entry.alias : undefined;
                    const displayText = alias
                        ? displayMode === 'both'
                            ? `${alias} (${name})`
                            : alias
                        : name;
                    return { name, displayText };
                });
        }
        return [];
    }, [settings]);

    const getModelName = useCallback(() => {
        if (selectedModel) return selectedModel;
        const enabled = getEnabledModels();
        return enabled[0]?.name || '';
    }, [selectedModel, getEnabledModels]);

    const getModelDisplayText = useCallback(
        (modelName: string): string => {
            const provider = settings?.providers.defaultProvider
                ? settings.providers.configs[settings.providers.defaultProvider]
                : null;
            if (provider?.models) {
                const entry = provider.models[modelName];
                const alias =
                    entry && typeof entry === 'object'
                        ? entry.alias
                        : undefined;
                if (alias) {
                    const displayMode =
                        provider.modelDisplayMode ??
                        settings?.providers.modelDisplayMode ??
                        'alias';
                    return displayMode === 'both'
                        ? `${alias} (${modelName})`
                        : alias;
                }
            }
            return modelName;
        },
        [settings]
    );

    const streamingUpdate = useCallback(
        (assistantId: string, content: string) => {
            setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === 'assistant' && last.id === assistantId) {
                    updated[updated.length - 1] = {
                        ...last,
                        content: [content],
                    } as AssistantChatMessage;
                }
                return updated;
            });
        },
        []
    );

    const streamingUpdateReasoning = useCallback(
        (assistantId: string, reasoning: string) => {
            setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === 'assistant' && last.id === assistantId) {
                    updated[updated.length - 1] = {
                        ...last,
                        reasoning,
                    } as AssistantChatMessage;
                }
                return updated;
            });
        },
        []
    );

    const handleSubmit = async (prompt?: string) => {
        const text = (prompt ?? input).trim();
        if (!text || isLoading || isStreamingRef.current) return;

        let sessionId = activeSessionId;
        let sessionIsManuallyNamed = true;

        if (!sessionId) {
            const session = await createSession();
            sessionId = session.id;
            sessionIsManuallyNamed = session.isManuallyNamed;
            setActiveSessionId(sessionId);
        } else {
            const existing = sessions.find((s) => s.id === activeSessionId);
            sessionIsManuallyNamed = existing?.isManuallyNamed ?? true;
        }

        // Build system prompt with context
        let systemPromptMessage: { role: 'system'; content: string } | null =
            null;
        if (project) {
            const parsedMentions: MentionTarget[] = [];
            const mentionPattern = /@(\w+):([\w-]+)/g;
            let match;
            while ((match = mentionPattern.exec(text)) !== null) {
                const type = match[1] as MentionTarget['type'];
                const id = match[2];
                if (
                    [
                        'chapter',
                        'character',
                        'location',
                        'organization',
                        'item',
                        'lore',
                    ].includes(type)
                ) {
                    const existing = mentions.find(
                        (m) => m.id === id && m.type === type
                    );
                    parsedMentions.push(
                        existing || { type, id, label: '', mode: 'brief' }
                    );
                }
            }

            const fileContents: string[] = [];
            for (const f of fileAttachments) {
                try {
                    const content = await rpc.request['file:read-content'](
                        f.path
                    );
                    if (content != null)
                        fileContents.push(
                            `\n[Attached file: "${f.label}"]\n${content}`
                        );
                } catch {
                    /* skip */
                }
            }

            const chapterContextMode =
                settings?.general.chapterContextMode ?? 'brief';
            const maxContextTokens = settings?.general.maxContextTokens ?? 8000;

            let ctxResult: {
                systemPrompt: string;
                estimatedTokens?: number;
                tokenEstimate?: number;
            };

            if (embeddingsAvailable && settings?.embeddings?.enabled) {
                const engineResult = await buildAIContext({
                    projectId: project.id,
                    userMessage: text,
                    currentChapterId:
                        activeTabType === 'chapter'
                            ? (activeTabId ?? undefined)
                            : undefined,
                    mentionTargets: parsedMentions,
                    fileContents,
                    customPrompt: customSystemPrompt || null,
                    chapterContextMode,
                    tokenBudget: maxContextTokens,
                });
                ctxResult = {
                    systemPrompt: engineResult.systemPrompt,
                    tokenEstimate: engineResult.tokenEstimate,
                };
            } else {
                ctxResult = buildContext({
                    project,
                    mentions: parsedMentions,
                    fileContents,
                    customPrompt: customSystemPrompt || null,
                    chapterContextMode,
                    maxContextTokens,
                    chapters,
                    characters,
                    locations,
                    organizations,
                    items,
                    loreEntries,
                    resolvedTemplates,
                });
            }

            systemPromptMessage = {
                role: 'system',
                content: ctxResult.systemPrompt,
            };
        }

        // --- Slash command detection ---
        let slashTarget: { category: CompendiumCategory; name: string } | null =
            null;
        let displayText = text;
        let extractionSource: ExtractionSource | null = null;
        let isExtractCommand = false;
        let isUpdateCommand = false;

        const cmdMatch = text.match(/^\/(\w+)(?:\s+(.+))?/);
        const command = cmdMatch ? cmdMatch[1].toLowerCase() : '';
        const cmdArgs = cmdMatch?.[2]?.trim() ?? '';
        const isCreateCommand = COMMAND_MAP[command] !== undefined;

        if (isCreateCommand || EXTRACT_COMMANDS.has(command)) {
            const category = COMMAND_MAP[command];

            if (EXTRACT_COMMANDS.has(command)) {
                isExtractCommand = command !== 'updatecompendium';
                isUpdateCommand = command === 'updatecompendium';
                const extractCategory = EXTRACT_CATEGORY_MAP[command] || null;
                const args = cmdArgs;

                // Parse @-mention chapter reference from args
                let mentionChapterId: string | null = null;
                const mentionMatch = args.match(/@chapter:([\w-]+)/);
                if (mentionMatch) mentionChapterId = mentionMatch[1];
                const cleanArgs = args.replace(/@chapter:[\w-]+/g, '').trim();

                displayText = isUpdateCommand
                    ? `Update compendium from text${cleanArgs ? `: ${cleanArgs}` : ''}`
                    : `Extract ${extractCategory ?? 'all entities'} from text${cleanArgs ? `: ${cleanArgs}` : ''}`;

                if (systemPromptMessage) {
                    const categoryFilter = extractCategory
                        ? `Focus on identifying ${extractCategory} entries only.`
                        : 'Identify all character, location, organization, item, and lore entries.';

                    const existingContext = isUpdateCommand
                        ? `\nExisting characters: ${characters.map((c) => `${c.name} (id:${c.id})`).join(', ')}\nExisting locations: ${locations.map((l) => `${l.name} (id:${l.id})`).join(', ')}\nExisting organizations: ${organizations.map((o) => `${o.name} (id:${o.id})`).join(', ')}\nExisting items: ${items.map((i) => `${i.name} (id:${i.id})`).join(', ')}\nExisting lore entries: ${loreEntries.map((le) => `${le.name} (id:${le.id})`).join(', ')}`
                        : '';

                    const actionInstruction = isUpdateCommand
                        ? 'For each entity found in the text that matches an existing entry, output an entry-data block with its existing id and any updated field values.'
                        : 'For each distinct entity found, output a ```entry-data JSON block.';

                    const bt = '\x60\x60\x60';
                    const idField = isUpdateCommand
                        ? ', "id": "existing-entry-id"'
                        : '';
                    systemPromptMessage.content =
                        "You are analyzing text from the user's novel. " +
                        categoryFilter +
                        ' ' +
                        actionInstruction +
                        '\n\n' +
                        'Read the text below carefully and output ' +
                        (isUpdateCommand
                            ? 'updates for matching entries'
                            : 'all entities you can identify') +
                        '.\n\n' +
                        existingContext +
                        '\n\n' +
                        'Each entry-data block must follow this format:\n' +
                        bt +
                        'entry-data\n' +
                        '{"category": "character|location|organization|item|lore", "name": "Entity Name"' +
                        idField +
                        ', "fields": {"field1": "value1", ...}}\n' +
                        bt +
                        '\n\n' +
                        'Be thorough but only include information present in the text.';
                }

                // Get text source for extraction
                try {
                    extractionSource = await getTextSource({
                        editorRef,
                        activeTabId: activeTabId ?? null,
                        activeTabType: activeTabType ?? null,
                        chapters,
                        mentionChapterId,
                        rpc,
                    });
                } catch (e) {
                    console.error('Failed to get text source:', e);
                }

                if (extractionSource?.text) {
                    if (systemPromptMessage) {
                        systemPromptMessage.content += `\n\nText to analyze (${extractionSource.label}):\n\n${extractionSource.text}`;
                    }
                } else {
                    displayText =
                        'No text available for extraction. Open a chapter or select text first.';
                    setIsLoading(false);
                    isStreamingRef.current = false;
                    return;
                }
            } else if (category) {
                const commaIdx = cmdArgs.indexOf(',');
                const cmdName =
                    commaIdx > 0
                        ? cmdArgs.substring(0, commaIdx).trim()
                        : cmdArgs.trim();
                const description =
                    commaIdx > 0 ? cmdArgs.substring(commaIdx + 1).trim() : '';

                slashTarget = { category, name: cmdName };
                displayText = `Create ${category}: ${cmdName}${description ? ` — "${description}"` : ''}`;

                if (systemPromptMessage) {
                    const prompt = description
                        ? `The user wants to create a ${category} entry named "${cmdName}". Description: ${description}. Generate detailed content for this entry.`
                        : `The user wants to create a ${category} entry named "${cmdName}". Generate detailed content for this entry.`;
                    systemPromptMessage.content += `\n\n${prompt}\nMake sure the \`\`\`entry-data JSON block at the end uses category "${category}" and name "${cmdName}".`;
                }
            }
        }

        const userMessage: UserChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: displayText,
            mode,
            timestamp: new Date().toISOString(),
        };

        const assistantId = crypto.randomUUID();
        const modelName = getModelName();
        const assistantMessage: AssistantChatMessage = {
            id: assistantId,
            role: 'assistant',
            content: [''],
            reasoning: '',
            currentVariantIndex: 0,
            model: modelName,
            mode,
            timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, userMessage, assistantMessage]);
        setInput('');
        setMentions([]);
        setFileAttachments([]);
        setIsLoading(true);
        isStreamingRef.current = true;

        try {
            rpc.request['db:create-message']({
                id: userMessage.id,
                sessionId,
                role: userMessage.role,
                content: userMessage.content,
            });

            const provider = settings?.providers.defaultProvider
                ? settings.providers.configs[settings.providers.defaultProvider]
                : null;

            const endpoint = provider?.endpoint || 'http://localhost:1234/v1';

            streamedContentRef.current = '';
            streamedReasoningRef.current = '';

            const result = await chatCompletion(endpoint, {
                provider: {
                    type: provider?.type || 'lm-studio',
                    endpoint,
                    models: modelName ? { [modelName]: { enabled: true } } : {},
                    enabled: true,
                },
                messages: [...messages, userMessage],
                systemPrompt: systemPromptMessage?.content,
                onChunk: (chunk) => {
                    streamedContentRef.current += chunk;
                    if (rafIdRef.current === null) {
                        rafIdRef.current = requestAnimationFrame(() => {
                            rafIdRef.current = null;
                            streamingUpdate(
                                assistantId,
                                streamedContentRef.current
                            );
                        });
                    }
                },
                onReasoningChunk: (chunk) => {
                    streamedReasoningRef.current += chunk;
                    streamingUpdateReasoning(
                        assistantId,
                        streamedReasoningRef.current
                    );
                },
            });

            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
            // Final state sync
            streamingUpdate(assistantId, result.content);
            streamingUpdateReasoning(assistantId, streamedReasoningRef.current);

            rpc.request['db:create-message']({
                id: assistantId,
                sessionId,
                role: 'assistant',
                content: result.content,
            });

            if (result.usage) {
                rpc.request['usage:log']({
                    sessionId,
                    projectId: projectId || null,
                    promptTokens: result.usage.prompt_tokens,
                    completionTokens: result.usage.completion_tokens,
                    totalTokens: result.usage.total_tokens,
                    model: modelName || null,
                });
            }

            // Continuous auto-naming
            if (!sessionIsManuallyNamed) {
                let newTitle: string;
                const autoMethod =
                    settings?.general.autoNamingMethod ?? 'smart-truncation';

                if (autoMethod === 'ai-summarizer') {
                    try {
                        const completedAssistant: AssistantChatMessage = {
                            ...assistantMessage,
                            content: [result.content],
                        };
                        const recentApiMessages = toApiMessages(
                            [
                                ...messages,
                                userMessage,
                                completedAssistant,
                            ].slice(-4)
                        );
                        if (systemPromptMessage) {
                            recentApiMessages.unshift(systemPromptMessage);
                        }
                        const titleResult = await chatCompletion(endpoint, {
                            provider: {
                                type: provider?.type || 'lm-studio',
                                endpoint,
                                models: modelName
                                    ? { [modelName]: { enabled: true } }
                                    : {},
                                enabled: true,
                            },
                            messages: [...messages, userMessage],
                            systemPrompt:
                                systemPromptMessage?.content ||
                                'Generate a very short, descriptive title (3-5 words) for this conversation. Respond with ONLY the title text, no quotes, no punctuation, no explanation.',
                        });
                        newTitle = titleResult.content
                            .trim()
                            .replace(/^["']|["']$/g, '')
                            .substring(0, 60);
                        if (!newTitle) throw new Error('Empty title');
                    } catch {
                        newTitle = smartTruncate(text);
                    }
                } else {
                    newTitle = smartTruncate(text);
                }

                await rpc.request['db:update-session']({
                    id: sessionId,
                    data: { title: newTitle } as Partial<NewChatSession>,
                });
                setSessions((prev) =>
                    prev.map((s) =>
                        s.id === sessionId ? { ...s, title: newTitle } : s
                    )
                );
            }

            // Scan for compendium entry data in the response
            if (isExtractCommand || isUpdateCommand) {
                const extracted = parseAllEntryData(result.content);
                if (extracted.length > 0) {
                    if (isUpdateCommand && onUpdateCompendium) {
                        onUpdateCompendium(extracted, extractionSource!);
                    } else if (onExtractEntities) {
                        onExtractEntities(extracted, extractionSource!);
                    }
                }
            } else {
                const parsed = parseEntryData(result.content);
                if (parsed) {
                    setPendingEntryData((prev) => ({
                        ...prev,
                        [assistantId]: parsed,
                    }));
                    if (slashTarget) {
                        setSlashCommandTargets((prev) => ({
                            ...prev,
                            [assistantId]: slashTarget,
                        }));
                    }
                }
            }
        } catch (error) {
            console.error('Chat error:', error);
            streamingUpdate(
                assistantId,
                'Error: Failed to get response from AI'
            );
        } finally {
            isStreamingRef.current = false;
            setIsLoading(false);
        }
    };

    const loadSessionMessages = async (sessionId: string) => {
        try {
            const msgs = await rpc.request['db:get-messages'](sessionId);
            const mapped: ChatMessage[] = (msgs || []).map((m) => {
                if (m.role === 'assistant') {
                    return {
                        id: m.id,
                        role: 'assistant' as const,
                        content: [m.content],
                        currentVariantIndex: 0,
                        model: 'unknown',
                        mode: 'assistant' as const,
                        timestamp:
                            typeof m.timestamp === 'string'
                                ? m.timestamp
                                : m.timestamp?.toISOString?.() ||
                                  new Date(m.timestamp).toISOString(),
                    } as AssistantChatMessage;
                }
                return {
                    id: m.id,
                    role: 'user' as const,
                    content: m.content,
                    mode: 'assistant' as const,
                    timestamp:
                        typeof m.timestamp === 'string'
                            ? m.timestamp
                            : m.timestamp?.toISOString?.() ||
                              new Date(m.timestamp).toISOString(),
                } as UserChatMessage;
            });
            setMessages(mapped);

            // Scan loaded messages for entry data
            const entryData: Record<string, ParsedEntry> = {};
            for (const msg of mapped) {
                if (msg.role === 'assistant') {
                    const content = msg.content[msg.currentVariantIndex];
                    if (content) {
                        const parsed = parseEntryData(content);
                        if (parsed) entryData[msg.id] = parsed;
                    }
                }
            }
            if (Object.keys(entryData).length > 0) {
                setPendingEntryData((prev) => ({ ...prev, ...entryData }));
            }
        } catch (e) {
            console.error('Failed to load session messages:', e);
        }
    };

    const handleSelectSession = (id: string) => {
        setActiveSessionId(id);
        loadSessionMessages(id);
        setActiveView('chat');
    };

    const handleNewSession = () => {
        setActiveSessionId(null);
        setMessages([]);
        setActiveView('chat');
    };

    const handleOpenSettingsProviders = () => {
        setSettingsRoute({
            tab: 'providers',
            section: 'add-provider',
            focus: 'provider-id',
        });
        setShowSettings(true);
    };

    const handleDeleteSession = useCallback(
        async (id: string) => {
            const session = sessions.find((s) => s.id === id);
            if (!session) return;
            if (session.isArchived) {
                alert(
                    'This session is vaulted. You must unvault it before it can be deleted.'
                );
                return;
            }
            if (settings?.general.confirmBeforeDelete) {
                if (!confirm('Are you sure you want to delete this session?'))
                    return;
            }
            await deleteSession(id);
        },
        [sessions, settings, deleteSession]
    );

    const handleRename = useCallback(
        async (id: string, newTitle: string) => {
            await renameSession(id, newTitle);
        },
        [renameSession]
    );

    const handleRetry = async (messageId: string) => {
        if (isLoading || isStreamingRef.current) return;

        const msgIndex = messages.findIndex((m) => m.id === messageId);
        if (msgIndex === -1) return;

        const precedingMessages = messages.slice(0, msgIndex);

        setIsLoading(true);
        isStreamingRef.current = true;

        // Create a new variant slot for streaming
        const newVariantIndex = (() => {
            const msg = messages[msgIndex];
            if (msg.role === 'assistant') return msg.content.length;
            return 0;
        })();

        setMessages((prev) =>
            prev.map((m) =>
                m.id === messageId && m.role === 'assistant'
                    ? {
                          ...m,
                          content: [...m.content, ''],
                          currentVariantIndex: newVariantIndex,
                      }
                    : m
            )
        );

        try {
            const provider = settings?.providers.defaultProvider
                ? settings.providers.configs[settings.providers.defaultProvider]
                : null;

            const endpoint = provider?.endpoint || 'http://localhost:1234/v1';
            const modelName = getModelName();

            streamedContentRef.current = '';
            streamedReasoningRef.current = '';

            const result = await chatCompletion(endpoint, {
                provider: {
                    type: provider?.type || 'lm-studio',
                    endpoint,
                    models: modelName ? { [modelName]: { enabled: true } } : {},
                    enabled: true,
                },
                messages: precedingMessages,
                systemPrompt: customSystemPrompt || undefined,
                onChunk: (chunk) => {
                    streamedContentRef.current += chunk;
                    if (rafIdRef.current === null) {
                        rafIdRef.current = requestAnimationFrame(() => {
                            rafIdRef.current = null;
                            const content = streamedContentRef.current;
                            setMessages((prev) =>
                                prev.map((m) =>
                                    m.id === messageId && m.role === 'assistant'
                                        ? {
                                              ...m,
                                              content: [
                                                  ...m.content.slice(
                                                      0,
                                                      newVariantIndex
                                                  ),
                                                  content,
                                              ],
                                          }
                                        : m
                                )
                            );
                        });
                    }
                },
                onReasoningChunk: (chunk) => {
                    streamedReasoningRef.current += chunk;
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === messageId && m.role === 'assistant'
                                ? {
                                      ...m,
                                      reasoning: streamedReasoningRef.current,
                                  }
                                : m
                        )
                    );
                },
            });

            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }

            setMessages((prev) =>
                prev.map((m) =>
                    m.id === messageId && m.role === 'assistant'
                        ? {
                              ...m,
                              content: [
                                  ...m.content.slice(0, newVariantIndex),
                                  result.content,
                              ],
                              reasoning:
                                  streamedReasoningRef.current || m.reasoning,
                          }
                        : m
                )
            );

            // Scan for compendium entry data in the retried response
            const parsed = parseEntryData(result.content);
            if (parsed) {
                setPendingEntryData((prev) => ({
                    ...prev,
                    [messageId]: parsed,
                }));
            }
        } catch (error) {
            console.error('Retry error:', error);
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === messageId && m.role === 'assistant'
                        ? {
                              ...m,
                              content: [
                                  ...m.content.slice(0, newVariantIndex),
                                  'Error: Request failed',
                              ],
                          }
                        : m
                )
            );
        } finally {
            isStreamingRef.current = false;
            setIsLoading(false);
        }
    };

    const handleCopy = (messageId: string) => {
        const msg = messages.find((m) => m.id === messageId);
        if (!msg) return;

        const text =
            msg.role === 'assistant'
                ? msg.content[msg.currentVariantIndex]
                : msg.content;

        navigator.clipboard.writeText(text).then(() => {
            setLastCopiedId(messageId);
            setTimeout(() => setLastCopiedId(null), 1500);
        });
    };

    const handleVariantChange = (messageId: string, variantIndex: number) => {
        setMessages((prev) =>
            prev.map((m) =>
                m.id === messageId && m.role === 'assistant'
                    ? { ...m, currentVariantIndex: variantIndex }
                    : m
            )
        );
    };

    const handleUndo = (messageId: string) => {
        const index = messages.findIndex((m) => m.id === messageId);
        if (index === -1) return;
        const msg = messages[index];
        if (msg.role !== 'user') return;

        setInput(msg.content);
        setMessages((prev) => prev.slice(0, index));
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const handleRemove = (messageId: string) => {
        const index = messages.findIndex((m) => m.id === messageId);
        if (index === -1) return;
        setMessages((prev) => prev.slice(0, index));
    };

    const handleSlashSelect = useCallback(
        (command: string) => {
            if (slashTriggerPos.current !== null) {
                const before = input.slice(0, slashTriggerPos.current - 1);
                setInput(`${before}${command} `);
            } else {
                setInput(`${command} `);
            }
            setShowSlashPopup(false);
            slashTriggerPos.current = null;
            setSlashSearchTerm('');
            setTimeout(() => inputRef.current?.focus(), 0);
        },
        [input]
    );

    const handleAtSelect = useCallback(
        (target: MentionTarget) => {
            if (!atTriggerPos.current) return;

            // Insert @Type:id into input text at the trigger position
            const before = input.slice(0, atTriggerPos.current.start - 1);
            const after = input.slice(atTriggerPos.current.end);
            const tag = `@${target.type}:${target.id}`;
            const newInput = `${before}${tag} ${after}`;
            setInput(newInput);

            // Add to mentions list
            setMentions((prev) => {
                if (
                    prev.some(
                        (m) => m.id === target.id && m.type === target.type
                    )
                )
                    return prev;
                return [...prev, { ...target, mode: 'brief' }];
            });

            setShowAtPopup(false);
            atTriggerPos.current = null;
            setAtSearchTerm('');

            // Focus back on input
            setTimeout(() => inputRef.current?.focus(), 0);
        },
        [input]
    );

    const handleSuggestionsSelect = useCallback(
        (id: string) => {
            if (showSlashPopup) {
                handleSlashSelect(id);
            } else if (showAtPopup) {
                const target = JSON.parse(id) as MentionTarget;
                handleAtSelect(target);
            }
        },
        [showSlashPopup, showAtPopup, handleSlashSelect, handleAtSelect]
    );

    const handleSuggestionsClose = useCallback(() => {
        setShowSlashPopup(false);
        setShowAtPopup(false);
        slashTriggerPos.current = null;
        atTriggerPos.current = null;
    }, []);

    const suggestionGroups = useMemo((): SuggestionGroup[] => {
        if (showSlashPopup) {
            const filtered = SLASH_COMMANDS.filter(
                (cmd) =>
                    !slashSearchTerm ||
                    cmd.command
                        .toLowerCase()
                        .startsWith(`/${slashSearchTerm.toLowerCase()}`)
            );
            return [
                {
                    items: filtered.map((cmd) => ({
                        id: cmd.command,
                        primary: (
                            <span className={`fs-type-${cmd.type}`}>
                                {cmd.command}
                            </span>
                        ),
                        secondary: cmd.description,
                    })),
                },
            ];
        }

        if (showAtPopup) {
            const each = <T extends { id: string; name: string }>(
                list: T[],
                type: MentionTarget['type'],
                opts?: { metadata?: string }
            ): SuggestionGroup | null => {
                const items = list
                    .filter(
                        (i) =>
                            !atSearchTerm ||
                            i.name
                                .toLowerCase()
                                .includes(atSearchTerm.toLowerCase())
                    )
                    .map((i) => ({
                        id: JSON.stringify({ type, id: i.id, label: i.name }),
                        primary: i.name,
                        ...(opts?.metadata ? { metadata: opts.metadata } : {}),
                    }));
                return items.length > 0
                    ? { label: typeLabels[type], icon: typeIcons[type], items }
                    : null;
            };

            return [
                each(
                    chapters.map((c) => ({ id: c.id, name: c.title })),
                    'chapter' as const,
                    { metadata: 'Brief' }
                ),
                each(characters, 'character' as const),
                each(locations, 'location' as const),
                each(organizations, 'organization' as const),
                each(items, 'item' as const),
                each(loreEntries, 'lore' as const),
            ].filter(Boolean) as SuggestionGroup[];
        }

        return [];
    }, [
        showSlashPopup,
        showAtPopup,
        slashSearchTerm,
        atSearchTerm,
        chapters,
        characters,
        locations,
        organizations,
        items,
        loreEntries,
    ]);

    const handleAttachFile = async () => {
        try {
            const path = await rpc.request['dialog:open-file']({
                title: 'Attach File',
                filters: [{ name: 'All Files', extensions: ['*'] }],
            });
            if (path) {
                const label = path.split(/[/\\]/).pop() || path;
                setFileAttachments((prev) => [...prev, { path, label }]);
            }
        } catch (e) {
            console.error('Failed to attach file:', e);
        }
    };

    const handleRemoveMention = (id: string) => {
        setMentions((prev) => prev.filter((m) => m.id !== id));
    };

    const handleRemoveFile = (index: number) => {
        setFileAttachments((prev) => prev.filter((_, i) => i !== index));
    };

    const handleToggleMentionMode = (id: string) => {
        setMentions((prev) =>
            prev.map((m) =>
                m.id === id
                    ? {
                          ...m,
                          mode:
                              m.mode === 'full'
                                  ? ('brief' as const)
                                  : ('full' as const),
                      }
                    : m
            )
        );
    };

    const handlePromptChange = (prompt: string) => {
        setCustomSystemPrompt(prompt);
    };

    const handleApply = (content: string) => {
        if (!editorRef?.current) return;
        // Detect if the response started with a slash command to determine insertion behavior
        const trimmed = content.trim();
        if (trimmed.startsWith('/rewrite') || trimmed.startsWith('/tone:')) {
            editorRef.current.replaceSelection(
                trimmed.replace(/^\/\w+\:?\S*\s*/, '')
            );
        } else {
            editorRef.current.insertContent(trimmed);
        }
    };

    const handleExpand = (messageId: string) => {
        setExpandedMessages((prev) => {
            const next = new Set(prev);
            next.add(messageId);
            return next;
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        const showAnyPopup = showSlashPopup || showAtPopup;

        if (showAnyPopup) {
            if (e.key === 'Escape') {
                e.preventDefault();
                setShowSlashPopup(false);
                setShowAtPopup(false);
                slashTriggerPos.current = null;
                atTriggerPos.current = null;
                return;
            }
            if (
                e.key === 'ArrowDown' ||
                e.key === 'ArrowUp' ||
                e.key === 'Enter'
            ) {
                e.preventDefault();
                return;
            }
        }

        if (e.key === '/' && !showAnyPopup) {
            const textarea = e.currentTarget as HTMLTextAreaElement;
            const pos = textarea.selectionStart;
            if (pos === 0 || /\s/.test(input[pos - 1])) {
                setSlashSearchTerm('');
                setShowSlashPopup(true);
                slashTriggerPos.current = pos + 1;
            }
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
            return;
        }

        if (e.key === '@' && !showAnyPopup) {
            const textarea = e.currentTarget as HTMLTextAreaElement;
            const pos = textarea.selectionStart;
            if (pos === 0 || /\s/.test(input[pos - 1])) {
                setAtSearchTerm('');
                setShowAtPopup(true);
                atTriggerPos.current = { start: pos + 1, end: pos + 1 };
            }
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setInput(value);

        // If / popup is open, update search term
        if (showSlashPopup && slashTriggerPos.current !== null) {
            const slashText = value.slice(slashTriggerPos.current);
            const spaceIdx = slashText.search(/[\s\n]/);
            const term =
                spaceIdx >= 0 ? slashText.slice(0, spaceIdx) : slashText;
            setSlashSearchTerm(term);

            // Close if no / context remains
            if (slashTriggerPos.current > value.length) {
                setShowSlashPopup(false);
                slashTriggerPos.current = null;
            }
        }

        // If @ popup is open, update search term
        if (showAtPopup && atTriggerPos.current) {
            const atText = value.slice(atTriggerPos.current.start);
            const spaceIdx = atText.search(/[\s\n]/);
            const term = spaceIdx >= 0 ? atText.slice(0, spaceIdx) : atText;
            setAtSearchTerm(term);

            // Close if no @ context remains
            if (
                !value.includes('@') ||
                atTriggerPos.current.start > value.length
            ) {
                setShowAtPopup(false);
                atTriggerPos.current = null;
            }
        }
    };

    // Determine the start of the active message pair (last user-assistant exchange)
    const activeStart = useMemo(() => {
        if (messages.length === 0) return 0;
        let lastUserIdx = -1;
        let lastAssistantIdx = -1;
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === 'user' && lastUserIdx === -1)
                lastUserIdx = i;
            if (messages[i].role === 'assistant' && lastAssistantIdx === -1)
                lastAssistantIdx = i;
            if (lastUserIdx !== -1 && lastAssistantIdx !== -1) break;
        }
        const activeStart = Math.min(
            lastUserIdx !== -1 ? lastUserIdx : Infinity,
            lastAssistantIdx !== -1 ? lastAssistantIdx : Infinity
        );
        return activeStart === Infinity ? 0 : activeStart;
    }, [messages]);

    // IntersectionObserver for Jump-to-Prompt
    useEffect(() => {
        const target = lastUserMsgRef.current;
        const root = messagesRef.current;
        if (!target || !root) return;

        const observer = new IntersectionObserver(
            ([entry]) => setShowJumpToPrompt(!entry.isIntersecting),
            { root, threshold: 0 }
        );
        observer.observe(target);
        return () => observer.disconnect();
    }, [messages]);

    // Scroll handlers for floating buttons
    const handleScroll = useCallback(() => {
        const el = messagesRef.current;
        if (!el) return;

        const { scrollTop, scrollHeight, clientHeight } = el;
        setShowScrollTop(scrollTop > 300);

        const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
        setShowScrollBottom(!isAtBottom || (isLoading && !isAtBottom));
    }, [isLoading]);

    useEffect(() => {
        const el = messagesRef.current;
        if (!el) return;
        el.addEventListener('scroll', handleScroll, { passive: true });
        return () => el.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    const jumpToPrompt = () => {
        if (lastUserMsgRef.current) {
            lastUserMsgRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }
    };

    const scrollToTop = () => {
        messagesRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="chat-panel" style={style}>
            <div className="chat-panel-header">
                <div className="chat-panel-header-tabs">
                    <button
                        className={activeView === 'chat' ? 'active' : ''}
                        onClick={() => setActiveView('chat')}
                    >
                        Active Chat
                    </button>
                    <button
                        className={activeView === 'history' ? 'active' : ''}
                        onClick={() => setActiveView('history')}
                    >
                        <IconHistory size={14} />
                        History
                    </button>
                    <button
                        className={activeView === 'archive' ? 'active' : ''}
                        onClick={() => setActiveView('archive')}
                    >
                        <IconArchive size={14} />
                        Vault
                    </button>
                </div>
                <div className="chat-panel-header-actions">
                    {activeView === 'chat' && project && (
                        <SystemPromptToggle
                            project={project}
                            onPromptChange={handlePromptChange}
                        />
                    )}
                    {activeView === 'chat' && (
                        <button onClick={handleNewSession} title="New session">
                            <IconPlus size={16} />
                        </button>
                    )}
                    <button
                        onClick={handleOpenSettingsProviders}
                        title="Settings"
                    >
                        <IconSettings2 size={16} />
                    </button>
                    <button onClick={onToggleCollapse}>
                        <IconX size={16} />
                    </button>
                </div>
            </div>

            <div className="chat-panel-body">
                {activeView === 'chat' && (
                    <div className="chat-panel-messages" ref={messagesRef}>
                        {messages.length === 0 && (
                            <div className="chat-welcome">
                                <p>Ask me anything about your story...</p>
                                <p className="chat-hint">
                                    Try: "Describe the main character's
                                    appearance" or "What's the timeline of
                                    events?"
                                </p>
                            </div>
                        )}
                        {messages.map((msg, i) => {
                            // Skip rendering empty assistant bubbles during loading unless they have reasoning content (Ollama/Gemma 4 pattern)
                            if (
                                msg.role === 'assistant' &&
                                isLoading &&
                                (msg as AssistantChatMessage).content[0]
                                    .length === 0 &&
                                !(msg as AssistantChatMessage).reasoning
                            ) {
                                return null;
                            }
                            const isLastUser =
                                msg.role === 'user' &&
                                !messages
                                    .slice(i + 1)
                                    .some((m) => m.role === 'user');
                            const isOld =
                                i < activeStart && viewMode !== 'full';
                            const entryData =
                                msg.role === 'assistant'
                                    ? pendingEntryData[msg.id]
                                    : undefined;
                            const slashOverride =
                                msg.role === 'assistant'
                                    ? slashCommandTargets[msg.id]
                                    : undefined;
                            const effectiveCategory =
                                slashOverride?.category || entryData?.category;
                            const effectiveName =
                                slashOverride?.name || entryData?.name;
                            const createEntryBtn =
                                entryData &&
                                effectiveCategory &&
                                effectiveName &&
                                onCreateCompendiumEntry ? (
                                    <button
                                        className="message-action-btn create-entry-btn"
                                        onClick={async () => {
                                            setCreatingEntryId(msg.id);
                                            try {
                                                await onCreateCompendiumEntry(
                                                    effectiveCategory!,
                                                    effectiveName!,
                                                    entryData.templateData
                                                );
                                                setPendingEntryData((prev) => {
                                                    const copy = { ...prev };
                                                    delete copy[msg.id];
                                                    return copy;
                                                });
                                            } finally {
                                                setCreatingEntryId(null);
                                            }
                                        }}
                                        disabled={creatingEntryId === msg.id}
                                        title={`Create ${effectiveCategory} entry`}
                                    >
                                        {creatingEntryId === msg.id ? (
                                            <IconLoader2
                                                size={14}
                                                className="spin"
                                            />
                                        ) : (
                                            <IconBook size={14} />
                                        )}
                                        <span
                                            style={{
                                                fontSize: '11px',
                                                marginLeft: '2px',
                                            }}
                                        >
                                            {effectiveCategory}
                                        </span>
                                    </button>
                                ) : undefined;
                            return (
                                <MessageBubble
                                    key={msg.id}
                                    ref={
                                        isLastUser ? lastUserMsgRef : undefined
                                    }
                                    message={msg}
                                    modelDisplayText={
                                        msg.role === 'assistant'
                                            ? getModelDisplayText(
                                                  (msg as AssistantChatMessage)
                                                      .model
                                              )
                                            : undefined
                                    }
                                    justCopiedId={lastCopiedId}
                                    viewMode={viewMode}
                                    isOld={isOld}
                                    isExpanded={expandedMessages.has(msg.id)}
                                    isStreaming={isLoading}
                                    onCopy={handleCopy}
                                    onRetry={handleRetry}
                                    onUndo={handleUndo}
                                    onRemove={handleRemove}
                                    onVariantChange={handleVariantChange}
                                    onExpand={handleExpand}
                                    createEntryButton={createEntryBtn}
                                />
                            );
                        })}
                        {!isLoading &&
                            mode === 'editor' &&
                            (() => {
                                if (messages.length < 2) return null;
                                const last = messages[messages.length - 1];
                                const prev = messages[messages.length - 2];
                                if (
                                    last.role !== 'assistant' ||
                                    prev.role !== 'user'
                                )
                                    return null;
                                return (
                                    <div className="editor-apply-bar">
                                        <button
                                            className="editor-apply-btn"
                                            onClick={() =>
                                                handleApply(
                                                    last.content[
                                                        last.currentVariantIndex
                                                    ]
                                                )
                                            }
                                        >
                                            Apply to editor
                                        </button>
                                        <button
                                            className="editor-discard-btn"
                                            onClick={() =>
                                                setMessages((prev) =>
                                                    prev.slice(0, -1)
                                                )
                                            }
                                        >
                                            Discard
                                        </button>
                                    </div>
                                );
                            })()}
                        {isLoading &&
                            messages.length > 0 &&
                            (() => {
                                const last = messages[messages.length - 1];
                                if (
                                    last.role === 'assistant' &&
                                    last.content[0].length === 0
                                ) {
                                    return (
                                        <div className="chat-message loading">
                                            <div className="chat-message-content">
                                                <IconLoader2
                                                    className="spin"
                                                    size={16}
                                                />
                                                <span>Thinking...</span>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                        <div ref={messagesEndRef} />
                        <div className="scroll-nav-buttons">
                            {showScrollTop && (
                                <button
                                    className="scroll-nav-btn"
                                    onClick={scrollToTop}
                                    title="Scroll to top"
                                >
                                    <IconArrowUp size={16} />
                                </button>
                            )}
                            {showJumpToPrompt && (
                                <button
                                    className="scroll-nav-btn"
                                    onClick={jumpToPrompt}
                                    title="Jump to prompt"
                                >
                                    <IconArrowBackUp size={16} />
                                </button>
                            )}
                            {showScrollBottom && (
                                <button
                                    className="scroll-nav-btn"
                                    onClick={scrollToBottom}
                                    title="Scroll to bottom"
                                >
                                    <IconArrowDown size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {activeView === 'history' && (
                    <SessionListView
                        sessions={activeSessions}
                        type="history"
                        onSelect={handleSelectSession}
                        onAction={archiveSession}
                        onDelete={handleDeleteSession}
                        onRename={handleRename}
                    />
                )}

                {activeView === 'archive' && (
                    <SessionListView
                        sessions={archivedSessions}
                        type="archive"
                        onSelect={handleSelectSession}
                        onAction={unarchiveSession}
                        onDelete={handleDeleteSession}
                    />
                )}
            </div>

            {activeView === 'chat' && (
                <div className="chat-panel-input">
                    <ContextChips
                        mentions={mentions}
                        fileLabels={fileAttachments.map((f) => f.label)}
                        onRemoveMention={handleRemoveMention}
                        onRemoveFile={handleRemoveFile}
                        onToggleMentionMode={handleToggleMentionMode}
                    />
                    {mode === 'editor' && (
                        <div className="editor-actions">
                            <button
                                className="editor-action-btn"
                                onClick={() => setInput('/continue ')}
                                title="Continue writing from cursor"
                            >
                                Continue
                            </button>
                            <button
                                className="editor-action-btn"
                                onClick={() => setInput('/rewrite ')}
                                title="Rewrite selected text"
                            >
                                Rewrite
                            </button>
                            <button
                                className="editor-action-btn"
                                onClick={() => setInput('/expand ')}
                                title="Expand on selected text"
                            >
                                Expand
                            </button>
                            <button
                                className="editor-action-btn"
                                onClick={() => setInput('/summarize ')}
                                title="Summarize"
                            >
                                Summarize
                            </button>
                            <select
                                className="editor-action-select"
                                onChange={(e) => {
                                    if (e.target.value) {
                                        setInput(`/tone:${e.target.value} `);
                                        e.target.value = '';
                                    }
                                }}
                                defaultValue=""
                            >
                                <option value="" disabled>
                                    Change Tone...
                                </option>
                                <option value="formal">Formal</option>
                                <option value="casual">Casual</option>
                                <option value="poetic">Poetic</option>
                                <option value="dramatic">Dramatic</option>
                                <option value="humorous">Humorous</option>
                                <option value="dark">Dark</option>
                                <option value="whimsical">Whimsical</option>
                            </select>
                        </div>
                    )}
                    {voice.isListening && (
                        <div className="voice-indicator">
                            <span className="voice-dot" />
                            <span className="voice-label">
                                {voiceInterim
                                    ? `"${voiceInterim}"`
                                    : 'Listening...'}
                            </span>
                        </div>
                    )}
                    <div className="chat-input-wrapper">
                        <FloatingSuggestions
                            isOpen={showSlashPopup || showAtPopup}
                            groups={suggestionGroups}
                            onSelect={handleSuggestionsSelect}
                            onClose={handleSuggestionsClose}
                        />
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder={
                                mode === 'editor'
                                    ? 'Describe what to write, or use /continue, /rewrite...'
                                    : 'Ask anything... @ to mention'
                            }
                        />
                    </div>
                    <div className="chat-panel-footer">
                        <div className="chat-panel-footer-left">
                            <button
                                title="Attach file"
                                onClick={handleAttachFile}
                            >
                                <IconPaperclip size={16} />
                            </button>
                            <select
                                value={mode}
                                onChange={(e) =>
                                    setMode(e.target.value as typeof mode)
                                }
                                className="mode-select"
                            >
                                <option value="assistant">Assistant</option>
                                <option value="editor">Editor</option>
                            </select>
                            <select
                                value={selectedModel || getModelName()}
                                onChange={(e) =>
                                    setSelectedModel(e.target.value)
                                }
                                className="model-select"
                            >
                                {getEnabledModels().length > 0 ? (
                                    getEnabledModels().map((m) => (
                                        <option key={m.name} value={m.name}>
                                            {m.displayText}
                                        </option>
                                    ))
                                ) : (
                                    <option value="" disabled>
                                        Select model
                                    </option>
                                )}
                            </select>
                        </div>
                        <div className="chat-panel-footer-right">
                            <button
                                title={
                                    voice.isListening
                                        ? 'Stop recording'
                                        : 'Voice input'
                                }
                                onClick={voice.toggle}
                                className={
                                    voice.isListening ? 'voice-active' : ''
                                }
                                disabled={!voice.isSupported}
                            >
                                <IconMicrophone size={16} />
                            </button>
                            <button
                                onClick={() => handleSubmit()}
                                disabled={!input.trim() || isLoading}
                                title="Send"
                            >
                                <IconSend size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showSettings && (
                <SettingsDialog
                    open={showSettings}
                    onClose={() => setShowSettings(false)}
                    defaultRoute={settingsRoute}
                />
            )}
        </div>
    );
}
