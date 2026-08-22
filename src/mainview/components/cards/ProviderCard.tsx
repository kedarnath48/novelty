import { useState } from 'react';
import {
    IconBolt,
    IconKey,
    IconPencil,
    IconRefresh,
    IconTrash,
    IconX,
} from '@tabler/icons-react';
import styles from './ProviderCard.module.css';
import { ProviderConfig } from '../../types';
import { useSettings } from '../../contexts/SettingsContext';
//import { div } from 'framer-motion/client';

type DefaultCardProps = {
    cardType?: 'default';
    cardData: {
        id: string;
        config: ProviderConfig & { baseUrl?: string };
    };
    onDelete?: (id: string) => void;
    onTestConnection?: (id: string) => void;
};

type AddCardProps = {
    cardType: 'add';
    cardData?: never;
    onAdd?: (newProvider: {
        id: string;
        baseUrl: string;
        endpoint: string;
        apiKey: string;
    }) => void;
};

type Props = DefaultCardProps | AddCardProps;

export default function ProviderCard(props: Props) {
    const { deleteProvider } = useSettings();
    const { cardType = 'default' } = props;
    const isAddType = cardType === 'add';

    const [providerId, setProviderId] = useState(
        isAddType ? '' : props.cardData?.id
    );
    const [baseUrl, setBaseUrl] = useState(
        isAddType ? '' : props.cardData?.config.baseUrl || ''
    );
    const [endpoint, setEndpoint] = useState(
        isAddType ? '' : props.cardData?.config.endpoint || ''
    );
    const [apiToggle, setApiToggle] = useState(false);
    const [apiKey, setApiKey] = useState('');

    const [isPillModelsView, setIsPillModelView] = useState(true);
    const [isEditingProviderLabel, setIsEditingProviderLabel] = useState(false);

    const [activeModelEdit, setActiveModelEdit] = useState<number | null>(null);

    const [activeModels, setActiveModels] = useState<number[]>(() => {
        const models = Object.entries(props.cardData?.config?.models ?? {});

        return models.reduce<number[]>((acc, [_, model], index) => {
            if (model.enabled === true) {
                acc.push(index);
            }
            return acc;
        }, []);
    });
    const toggleModel = (index: number) => {
        setActiveModels((prev) =>
            prev.includes(index)
                ? prev.filter((i) => i !== index)
                : [...prev, index]
        );
    };

    const previewUrl =
        `${baseUrl.replace(/\/$/, '')}${endpoint ? '/' + endpoint.replace(/^\//, '') : ''}` ||
        'https://api.example.com';

    const handleSaveKey = (e: React.FormEvent) => {
        e.preventDefault();
        // Trigger key save logic
    };

    return (
        <div
            className={`${styles.providerCard} ${isAddType ? styles.addCard : styles.defaultCard}`}
        >
            <div className={styles.providerCardHeader}>
                <div>
                    <input
                        type="checkbox"
                        name=""
                        id="providerToggle"
                        className={styles.providerToggleInput}
                    />
                </div>
                <div className={styles.providerLabel}>
                    {isAddType ? (
                        <input
                            type="text"
                            value={providerId}
                            onChange={(e) => setProviderId(e.target.value)}
                            placeholder="Provider ID"
                            aria-label="Provider ID"
                        />
                    ) : (
                        <div id={styles.cardLabel}>
                            {isEditingProviderLabel ? (
                                <input
                                    type="text"
                                    value={providerId}
                                    onChange={(e) =>
                                        setProviderId(e.target.value)
                                    }
                                    placeholder="Provider ID"
                                    aria-label="Provider ID"
                                />
                            ) : (
                                <span>{props.cardData?.id}</span>
                            )}
                            <button
                                className={`${isEditingProviderLabel ? styles.editing : ''}`}
                                onClick={() =>
                                    setIsEditingProviderLabel(
                                        !isEditingProviderLabel
                                    )
                                }
                            >
                                {isEditingProviderLabel ? (
                                    <IconX />
                                ) : (
                                    <IconPencil />
                                )}
                            </button>
                        </div>
                    )}
                </div>
                <div>
                    <button
                        title="Test connection"
                        aria-label="Test connection"
                        disabled={!baseUrl}
                        className={styles.iconBtn}
                        /*
                        onClick={() =>
                            !isAddType &&
                            props.onTestConnection?.(props.cardData?.id)
                        }
                            */
                    >
                        <IconBolt stroke={2} size={18} />
                    </button>
                    {!isAddType && props.cardData?.id && (
                        <button
                            className={`${styles.iconBtn} ${styles.delete}`}
                            title="Delete provider"
                            aria-label="Delete provider"
                            onClick={() => deleteProvider?.(props.cardData?.id)}
                        >
                            <IconTrash stroke={2} size={18} />
                        </button>
                    )}
                </div>
            </div>

            <div className={styles.providerCardBody}>
                <div className={styles.urlSection}>
                    <div className={styles.settingsRow}>
                        <label>Server URL</label>
                    </div>

                    <div className={styles.inputFields}>
                        <div>
                            <label htmlFor={`base-url-${providerId}`}>
                                base url
                            </label>
                            <input
                                id={`base-url-${providerId}`}
                                type="text"
                                placeholder="Base URL"
                                value={baseUrl}
                                onChange={(e) => setBaseUrl(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor={`endpoint-${providerId}`}>
                                endpoint
                            </label>
                            <input
                                id={`endpoint-${providerId}`}
                                type="text"
                                placeholder="Endpoint"
                                value={endpoint}
                                aria-label="Endpoint"
                                onChange={(e) => setEndpoint(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className={styles.previewUrl}>
                        Full URL: <span>{previewUrl}</span>
                    </div>
                </div>

                <div
                    className={`${styles.apiSection} ${apiToggle ? 'active' : ''}`}
                >
                    <div className={styles.settingsRow}>
                        <div style={{ display: 'flex' }}>
                            <input
                                type="checkbox"
                                name=""
                                id=""
                                onChange={() => setApiToggle(!apiToggle)}
                            />
                            <label htmlFor={`api-${providerId}`}>
                                API key <span>(optional)</span>
                            </label>
                        </div>
                        {apiToggle && (
                            <a
                                href="#"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Get your API key
                            </a>
                        )}
                    </div>
                    {apiToggle && (
                        <form onSubmit={handleSaveKey}>
                            <input
                                id={`api-${providerId}`}
                                type="password"
                                placeholder="Paste your API key here..."
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                aria-label="API key"
                            />

                            <button type="submit">
                                <IconKey /> Save key
                            </button>
                        </form>
                    )}
                </div>

                <div className={styles.modelsSection}>
                    <div className={styles.settingsRow}>
                        <label>Models</label>
                        <div className={styles.viewTyes}>
                            <button
                                className={`${isPillModelsView ? styles.active : ''}`}
                                onClick={() => setIsPillModelView(true)}
                            >
                                pill
                            </button>
                            <button
                                className={`${!isPillModelsView ? styles.active : ''}`}
                                onClick={() => setIsPillModelView(false)}
                            >
                                list
                            </button>
                        </div>

                        <button>
                            <IconRefresh />
                            <span className="txt">get models</span>
                        </button>
                    </div>

                    <div
                        className={`${styles.modelsList} ${isPillModelsView ? styles.pill : styles.list}`}
                    >
                        {Object.entries(
                            props.cardData?.config?.models ?? {}
                        ).map(([key, model], index) => {
                            const isEditing = activeModelEdit === index;
                            return (
                                <button
                                    type="button"
                                    key={index}
                                    title="click to Activate or double click to Edit"
                                    className={`${activeModels.includes(index) ? styles.active : ''} ${activeModelEdit === index ? styles.editing : ''}`}
                                    style={{
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                    }}
                                    onClick={() => toggleModel(index)}
                                    onDoubleClick={() =>
                                        setActiveModelEdit(
                                            isEditing ? null : index
                                        )
                                    }
                                >
                                    {isEditing ? (
                                        <div style={{ display: 'flex' }}>
                                            <input
                                                type="text"
                                                name=""
                                                id=""
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            />
                                            <button
                                                onClick={() =>
                                                    setActiveModelEdit(null)
                                                }
                                            >
                                                <IconX />
                                            </button>
                                        </div>
                                    ) : (
                                        <span>{model.alias || key}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

/*
{cardType ? (
                
                <div className={styles.providerCard}>
                    <div className={styles.providerCardHeader}>
                        <Toggle checked={false} onChange={() => {}} disabled />
                        <div className={styles.providerStatus}></div>
                        <input
                            type="text"
                            value={previewId}
                            onChange={(e) => setPreviewId(e.target.value)}
                            placeholder="Provider ID"
                            className={styles.textInputSmall}
                            style={{ flex: 1, minWidth: 0 }}
                        />
                        {renderTypeSelect(previewConfig.type, (t) =>
                            setPreviewConfig({
                                ...previewConfig,
                                type: t,
                                endpoint:
                                    parseServerUrl(
                                        previewConfig.endpoint,
                                        previewConfig.type
                                    ) + getEndpointPath(t),
                            })
                        )}
                        <button
                            title="Test connection"
                            disabled
                            className={styles.iconBtnSmall}
                        >
                            <IconBolt stroke={2} size={18} />
                        </button>
                    </div>
                    <div className={styles.providerFields}>
                        {renderServerUrlRow(
                            previewConfig.endpoint,
                            previewConfig.type,
                            (ep) =>
                                setPreviewConfig({
                                    ...previewConfig,
                                    endpoint: ep,
                                })
                        )}
                        {renderApiKeySection(
                            previewConfig.apiKey,
                            previewApiKeyDraft,
                            setPreviewApiKeyDraft,
                            () =>
                                setPreviewConfig({
                                    ...previewConfig,
                                    apiKey: previewApiKeyDraft,
                                }),
                            previewShowApiKey,
                            () => setPreviewShowApiKey((v) => !v)
                        )}
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 8,
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: '0.85rem',
                                        color: 'var(--text-secondary)',
                                    }}
                                >
                                    Models
                                </span>
                                <button
                                    title="Get models"
                                    onClick={() =>
                                        handleGetModels(
                                            '__preview__',
                                            previewConfig.endpoint
                                        )
                                    }
                                    disabled={!previewConfig.endpoint}
                                    className={styles.btnSmall}
                                >
                                    Get Models
                                </button>
                            </div>
                            {previewConfig.models &&
                                Object.keys(previewConfig.models).length >
                                    0 && (
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: 4,
                                        }}
                                    >
                                        {Object.keys(previewConfig.models).map(
                                            (m) => {
                                                const entry =
                                                    previewConfig.models?.[m];
                                                const enabled = entry
                                                    ? typeof entry === 'boolean'
                                                        ? entry
                                                        : entry.enabled
                                                    : false;
                                                const alias =
                                                    typeof entry === 'object'
                                                        ? entry.alias
                                                        : undefined;
                                                const isEditing =
                                                    editingAlias?.providerId ===
                                                        '__preview__' &&
                                                    editingAlias?.modelName ===
                                                        m;
                                                const displayMode =
                                                    previewConfig.modelDisplayMode ??
                                                    settings?.providers
                                                        .modelDisplayMode ??
                                                    'alias';
                                                return (
                                                    <div
                                                        key={m}
                                                        style={{
                                                            display:
                                                                'inline-flex',
                                                            alignItems:
                                                                'center',
                                                            gap: 4,
                                                        }}
                                                    >
                                                        <button
                                                            type="button"
                                                            className={`${styles.modelBtn}${
                                                                enabled
                                                                    ? ` ${styles.modelBtnActive}`
                                                                    : ''
                                                            }`}
                                                            onClick={() =>
                                                                setPreviewConfig(
                                                                    {
                                                                        ...previewConfig,
                                                                        models: {
                                                                            ...previewConfig.models,
                                                                            [m]: {
                                                                                enabled:
                                                                                    !enabled,
                                                                                alias,
                                                                            },
                                                                        },
                                                                    }
                                                                )
                                                            }
                                                        >
                                                            {getModelLabel(
                                                                m,
                                                                alias,
                                                                displayMode
                                                            )}
                                                        </button>
                                                        {isEditing ? (
                                                            <div
                                                                style={{
                                                                    position:
                                                                        'relative',
                                                                    display:
                                                                        'inline-flex',
                                                                    alignItems:
                                                                        'center',
                                                                }}
                                                            >
                                                                <input
                                                                    type="text"
                                                                    value={
                                                                        editingAlias.draft
                                                                    }
                                                                    onChange={(
                                                                        e
                                                                    ) =>
                                                                        setEditingAlias(
                                                                            (
                                                                                prev
                                                                            ) =>
                                                                                prev
                                                                                    ? {
                                                                                          ...prev,
                                                                                          draft: e
                                                                                              .target
                                                                                              .value,
                                                                                      }
                                                                                    : null
                                                                        )
                                                                    }
                                                                    className={
                                                                        styles.textInputSmall
                                                                    }
                                                                    style={{
                                                                        width: 140,
                                                                        paddingRight: 28,
                                                                    }}
                                                                    autoFocus
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setPreviewConfig(
                                                                            {
                                                                                ...previewConfig,
                                                                                models: {
                                                                                    ...previewConfig.models,
                                                                                    [m]: {
                                                                                        enabled,
                                                                                        alias:
                                                                                            editingAlias.draft ||
                                                                                            undefined,
                                                                                    },
                                                                                },
                                                                            }
                                                                        );
                                                                        setEditingAlias(
                                                                            null
                                                                        );
                                                                    }}
                                                                    style={{
                                                                        position:
                                                                            'absolute',
                                                                        right: 4,
                                                                        background:
                                                                            'none',
                                                                        border: 'none',
                                                                        color: '#4A9EFF',
                                                                        cursor: 'pointer',
                                                                        padding: 2,
                                                                        display:
                                                                            'flex',
                                                                    }}
                                                                >
                                                                    <IconCheck
                                                                        size={
                                                                            14
                                                                        }
                                                                    />
                                                                </button>
                                                            </div>
                                                        ) : null}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (isEditing) {
                                                                    setEditingAlias(
                                                                        null
                                                                    );
                                                                } else {
                                                                    setEditingAlias(
                                                                        {
                                                                            providerId:
                                                                                '__preview__',
                                                                            modelName:
                                                                                m,
                                                                            draft:
                                                                                alias ||
                                                                                '',
                                                                        }
                                                                    );
                                                                }
                                                            }}
                                                            className={
                                                                styles.iconBtnSmall
                                                            }
                                                            title={
                                                                isEditing
                                                                    ? 'Cancel'
                                                                    : 'Edit alias'
                                                            }
                                                        >
                                                            {isEditing ? (
                                                                <IconX
                                                                    size={14}
                                                                />
                                                            ) : (
                                                                <IconEdit
                                                                    size={14}
                                                                />
                                                            )}
                                                        </button>
                                                    </div>
                                                );
                                            }
                                        )}
                                    </div>
                                )}
                        </div>
                    </div>
                    <div className={styles.pathRow} style={{ marginTop: 8 }}>
                        <button
                            onClick={addPreviewProvider}
                            disabled={isLocked || !previewId.trim()}
                            className={styles.btn}
                        >
                            Add
                        </button>
                    </div>
                </div>
                
            ) : (
                <>
                {
                    <div key={id} className={styles.providerCard}>
                    <div className={styles.providerCardHeader}>
                        <Toggle
                            checked={config.enabled}
                            onChange={(v) =>
                                updateProviderConfig(id, {
                                    ...config,
                                    enabled: v,
                                })
                            }
                            disabled={isLocked}
                        />
                        <div className={styles.providerStatus}></div>
                        <span className={styles.providerCardName}>{id}</span>
                        {renderTypeSelect(
                            config.type,
                            (t) =>
                                updateProviderConfig(id, {
                                    ...config,
                                    type: t,
                                    endpoint:
                                        parseServerUrl(
                                            config.endpoint,
                                            config.type
                                        ) + getEndpointPath(t),
                                }),
                            isLocked
                        )}
                        <button
                            title="Test connection"
                            onClick={() => console.log('test connection', id)}
                            className={styles.iconBtnSmall}
                        >
                            <IconBolt stroke={2} size={18} />
                        </button>
                        <button
                            onClick={() => deleteProvider(id)}
                            disabled={isLocked}
                            className={`${styles.iconBtnSmall} ${styles.deleteBtn}`}
                            title="Delete provider"
                        >
                            <IconTrash stroke={2} size={18} />
                        </button>
                    </div>
                    <div className={styles.providerFields}>
                        {renderServerUrlRow(
                            config.endpoint,
                            config.type,
                            (ep) =>
                                updateProviderConfig(id, {
                                    ...config,
                                    endpoint: ep,
                                }),
                            isLocked
                        )}
                        {renderApiKeySection(
                            config.apiKey,
                            id in apiKeyDrafts
                                ? apiKeyDrafts[id]
                                : config.apiKey || '',
                            (v) =>
                                setApiKeyDrafts((prev) => ({
                                    ...prev,
                                    [id]: v,
                                })),
                            () =>
                                updateProviderConfig(id, {
                                    ...config,
                                    apiKey:
                                        id in apiKeyDrafts
                                            ? apiKeyDrafts[id]
                                            : config.apiKey,
                                }),
                            showApiKeys[id] || false,
                            () =>
                                setShowApiKeys((prev) => ({
                                    ...prev,
                                    [id]: !prev[id],
                                })),
                            isLocked
                        )}
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 8,
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: '0.85rem',
                                        color: 'var(--text-secondary)',
                                    }}
                                >
                                    Models
                                </span>
                                <button
                                    title="Get models"
                                    onClick={() =>
                                        handleGetModels(id, config.endpoint)
                                    }
                                    disabled={isLocked || !config.endpoint}
                                    className={styles.btnSmall}
                                >
                                    Get Models
                                </button>
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    marginBottom: 4,
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: '0.8rem',
                                        color: 'var(--text-secondary)',
                                    }}
                                >
                                    Show:
                                </span>
                                <select
                                    value={
                                        config.modelDisplayMode ??
                                        settings?.providers.modelDisplayMode ??
                                        'alias'
                                    }
                                    onChange={(e) =>
                                        updateProviderConfig(id, {
                                            ...config,
                                            modelDisplayMode: e.target.value as
                                                'alias' | 'both',
                                        })
                                    }
                                    disabled={isLocked}
                                    className={styles.selectSmall}
                                    style={{ minWidth: 100 }}
                                >
                                    <option value="alias">Alias only</option>
                                    <option value="both">Alias + Name</option>
                                </select>
                            </div>
                            {renderModels(id, config, isLocked)}
                        </div>
                    </div>
                </div>
                    }
                    </>
            )}


*/
