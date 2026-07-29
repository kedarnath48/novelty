import { useState, useEffect } from "react";
import Dialog from "../components/Dialog";
import { useSettings } from "../contexts/SettingsContext";
import { getRPC } from "../contexts/RPCContext";
import {
	IconBolt,
	IconExternalLink,
	IconEye,
	IconEyeOff,
	IconFileText,
	IconFolder,
	IconKey,
	IconSparkles2,
	IconTrash,
	IconChartBar,
	IconEdit,
	IconCheck,
	IconX,
	IconDatabase,
} from "@tabler/icons-react";
import type { ProviderType, ProviderConfig } from "../types/index";
import type { CompendiumCategory, FieldDefinition, GlobalTemplate, NewGlobalTemplate } from "../types/index";
import { getLMStudioModels } from "../services/ai";
import styles from "./projectsDialog.module.css";

interface SettingsRoute {
	tab: string;
	section?: string;
	focus?: string;
}

interface SettingsDialogProps {
	open: boolean;
	onClose: () => void;
	defaultRoute?: SettingsRoute;
}

function Toggle({
	checked,
	onChange,
	disabled,
}: {
	checked: boolean;
	onChange: (v: boolean) => void;
	disabled?: boolean;
}) {
	return (
		<label className={styles.toggle}>
			<input
				type="checkbox"
				checked={checked}
				onChange={(e) => onChange(e.target.checked)}
				disabled={disabled}
			/>
			<span className={styles.toggleSlider}></span>
		</label>
	);
}

function NumberInput({
	value,
	onChange,
	min,
	max,
	disabled,
}: {
	value: number;
	onChange: (v: number) => void;
	min?: number;
	max?: number;
	disabled?: boolean;
}) {
	return (
		<input
			type="number"
			value={value}
			onChange={(e) => onChange(Number(e.target.value))}
			min={min}
			max={max}
			disabled={disabled}
			className={styles.numberInput}
		/>
	);
}

function GeneralTab() {
	const { settings, updateGeneral, isLocked } = useSettings();
	if (!settings) return null;

	return (
		<div className={styles.tabContent}>
			<div className={styles.settingRow}>
				<span>Enable Auto Save</span>
				<Toggle
					checked={settings.general.enableAutoSave}
					onChange={(v) => updateGeneral("enableAutoSave", v)}
					disabled={isLocked}
				/>
			</div>
			<div className={styles.settingRow}>
				<span>Auto Save Interval (minutes)</span>
				<NumberInput
					value={settings.general.autoSaveInterval}
					onChange={(v) => updateGeneral("autoSaveInterval", v)}
					min={1}
					max={60}
					disabled={isLocked || !settings.general.enableAutoSave}
				/>
			</div>
			<div className={styles.settingRow}>
				<span>Enable Auto Backup</span>
				<Toggle
					checked={settings.general.enableAutoBackup}
					onChange={(v) => updateGeneral("enableAutoBackup", v)}
					disabled={isLocked}
				/>
			</div>
			<div className={styles.settingRow}>
				<span>Auto Backup Interval (hours)</span>
				<NumberInput
					value={settings.general.autoBackupInterval}
					onChange={(v) => updateGeneral("autoBackupInterval", v)}
					min={1}
					max={168}
					disabled={isLocked || !settings.general.enableAutoBackup}
				/>
			</div>
			<div className={styles.settingRow}>
				<span>Enable Auto Sync</span>
				<Toggle
					checked={settings.general.enableAutoSync}
					onChange={(v) => updateGeneral("enableAutoSync", v)}
					disabled={isLocked}
				/>
			</div>
			<div className={styles.settingRow}>
				<span>Auto Sync Interval (minutes)</span>
				<NumberInput
					value={settings.general.autoSyncInterval}
					onChange={(v) => updateGeneral("autoSyncInterval", v)}
					min={1}
					max={60}
					disabled={isLocked || !settings.general.enableAutoSync}
				/>
			</div>
			<div className={styles.settingRow}>
				<span>Enable Auto Update</span>
				<Toggle
					checked={settings.general.enableAutoUpdate}
					onChange={(v) => updateGeneral("enableAutoUpdate", v)}
					disabled={isLocked}
				/>
			</div>
			<div className={styles.settingRow}>
				<span>Auto Update Interval (hours)</span>
				<NumberInput
					value={settings.general.autoUpdateInterval}
					onChange={(v) => updateGeneral("autoUpdateInterval", v)}
					min={1}
					max={168}
					disabled={isLocked || !settings.general.enableAutoUpdate}
				/>
			</div>
			<div className={styles.settingSectionDivider} />
			<div className={styles.settingsSectionLabel}>Chat</div>

			<div className={styles.settingRow}>
				<span>Chat View</span>
				<select
					value={settings.general.chatViewMode}
					onChange={(e) =>
						updateGeneral(
							"chatViewMode",
							e.target.value as "full" | "truncate" | "accordion",
						)
					}
					disabled={isLocked}
					className={styles.select}
				>
					<option value="full">Full</option>
					<option value="truncate">Truncate</option>
					<option value="accordion">Accordion</option>
				</select>
			</div>
			<div className={styles.settingRow}>
				<span>Ask me before deleting sessions</span>
				<Toggle
					checked={settings.general.confirmBeforeDelete}
					onChange={(v) => updateGeneral("confirmBeforeDelete", v)}
					disabled={isLocked}
				/>
			</div>
			<div className={styles.settingRow}>
				<span>Auto-naming method</span>
				<select
					value={settings.general.autoNamingMethod}
					onChange={(e) =>
						updateGeneral(
							"autoNamingMethod",
							e.target.value as "ai-summarizer" | "smart-truncation",
						)
					}
					disabled={isLocked}
					className={styles.select}
				>
					<option value="ai-summarizer">AI Summarizer (Smart)</option>
					<option value="smart-truncation">Smart Truncation (Local)</option>
				</select>
			</div>
			<div className={styles.settingsSectionDivider} />
			<div className={styles.settingsSectionLabel}>AI Context</div>

			<div className={styles.settingRow}>
				<span>Max Context Tokens</span>
				<NumberInput
					value={settings.general.maxContextTokens}
					onChange={(v) => updateGeneral("maxContextTokens", v)}
					min={1024}
					max={32000}
					disabled={isLocked}
				/>
			</div>
			<div className={styles.settingRow}>
				<span>Chapter Context Mode</span>
				<select
					value={settings.general.chapterContextMode}
					onChange={(e) =>
						updateGeneral(
							"chapterContextMode",
							e.target.value as "brief" | "full",
						)
					}
					disabled={isLocked}
					className={styles.select}
				>
					<option value="brief">Brief (first ~800 chars)</option>
					<option value="full">Full Chapter</option>
				</select>
			</div>
			<div className={styles.settingRow}>
				<span>Theme</span>
				<select
					value={settings.general.theme}
					onChange={(e) =>
						updateGeneral(
							"theme",
							e.target.value as "light" | "dark" | "system",
						)
					}
					disabled={isLocked}
					className={styles.select}
				>
					<option value="system">System</option>
					<option value="light">Light</option>
					<option value="dark">Dark</option>
				</select>
			</div>
		</div>
	);
}

function ProjectsTab() {
	const {
		settings,
		updateProjects,
		openDirectory,
		revealInExplorer,
		isLocked,
	} = useSettings();
	if (!settings) return null;

	const handleSelectPath = async () => {
		const path = await openDirectory("Select Default Projects Directory");
		if (path) {
			updateProjects("defaultProjectsDir", path);
		}
	};

	const handleOpenProjects = async () => {
		const rpc = getRPC();
		await rpc.request["open-projects"]();
	};

	const handleOpenProjectFolder = async () => {
		if (settings.projects.defaultProjectsDir) {
			await revealInExplorer(settings.projects.defaultProjectsDir);
		}
	};

	const handleOpenProject = async (projectId: string) => {
		const rpc = getRPC();
		await rpc.request["open-project-folder"](projectId);
	};

	return (
		<div className={styles.tabContent}>
			<div className={styles.settingRow}>
				<span>Default Projects Directory</span>
				<div className={styles.pathRow}>
					<input
						type="text"
						value={settings.projects.defaultProjectsDir || ""}
						readOnly
						placeholder="Not set"
						className={styles.textInput}
					/>
					<button
						onClick={handleSelectPath}
						disabled={isLocked}
						className={styles.btn}
					>
						Browse
					</button>
				</div>
			</div>
			<div className={styles.pathRow}>
				<button
					onClick={handleOpenProjects}
					disabled={isLocked}
					className={styles.btn}
				>
					Open Projects
				</button>
				<button
					onClick={handleOpenProjectFolder}
					disabled={isLocked || !settings.projects.defaultProjectsDir}
					className={styles.btn}
				>
					Open Projects Folder
				</button>
			</div>
			<div className={styles.settingRow}>
				<span>Open Recent Project on Startup</span>
				<Toggle
					checked={settings.projects.openRecentProjectOnStartup}
					onChange={(v) => updateProjects("openRecentProjectOnStartup", v)}
					disabled={isLocked}
				/>
			</div>
			<div className={styles.settingRow}>
				<span>Recent Projects</span>
				<span>{settings.projects.recentProjects.length} projects</span>
			</div>
			{settings.projects.recentProjects.length > 0 && (
				<div className={styles.listSection}>
					{settings.projects.recentProjects.map((id) => (
						<div key={id} className={styles.listItem}>
							<span>{id}</span>
							<button
								onClick={() => handleOpenProject(id)}
								disabled={isLocked}
								className={styles.btnSmall}
								title="Open project folder"
							>
								<IconFolder size={16} />
							</button>
						</div>
					))}
					<button
						onClick={() => updateProjects("recentProjects", [])}
						disabled={isLocked}
						className={styles.btnDanger}
					>
						Clear Recent
					</button>
				</div>
			)}
		</div>
	);
}

function AssetLibraryTab() {
	const { settings, updateAssetLibrary, openDirectory, isLocked } =
		useSettings();
	if (!settings) return null;

	const handleSelectPath = async () => {
		const path = await openDirectory("Select Asset Library Path");
		if (path) {
			updateAssetLibrary("storagePath", path);
		}
	};

	return (
		<div className={styles.tabContent}>
			<div className={styles.settingRow}>
				<span>Storage Path</span>
				<div className={styles.pathRow}>
					<input
						type="text"
						value={settings.assetLibrary.storagePath || ""}
						readOnly
						placeholder="Not set"
						className={styles.textInput}
					/>
					<button
						onClick={handleSelectPath}
						disabled={isLocked}
						className={styles.btn}
					>
						Browse
					</button>
				</div>
			</div>
			<div className={styles.settingRow}>
				<span>Enable Auto Cleanup</span>
				<Toggle
					checked={settings.assetLibrary.autoCleanupEnabled}
					onChange={(v) => updateAssetLibrary("autoCleanupEnabled", v)}
					disabled={isLocked}
				/>
			</div>
			<div className={styles.settingRow}>
				<span>Cleanup Interval (days)</span>
				<NumberInput
					value={settings.assetLibrary.cleanupIntervalDays}
					onChange={(v) => updateAssetLibrary("cleanupIntervalDays", v)}
					min={1}
					max={365}
					disabled={isLocked || !settings.assetLibrary.autoCleanupEnabled}
				/>
			</div>
		</div>
	);
}

function ProvidersTab() {
	const {
		settings,
		updateProviders,
		updateProviderConfig,
		deleteProvider,
		isLocked,
	} = useSettings();
	const [showNewProvider, setShowNewProvider] = useState(false);
	const [previewId, setPreviewId] = useState("");
	const [previewConfig, setPreviewConfig] = useState<ProviderConfig>({
		type: "lm-studio",
		endpoint: "http://localhost:1234/v1",
		enabled: false,
	});
	const [apiKeyDrafts, setApiKeyDrafts] = useState<Record<string, string>>({});
	const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
	const [previewApiKeyDraft, setPreviewApiKeyDraft] = useState("");
	const [previewShowApiKey, setPreviewShowApiKey] = useState(false);
	const [editingAlias, setEditingAlias] = useState<{ providerId: string; modelName: string; draft: string } | null>(null);

	const ENDPOINT_PATHS: Record<ProviderType, string> = {
		"lm-studio": "/v1",
		openai: "/v1",
		anthropic: "/v1/messages",
		custom: "",
	};

	const getEndpointPath = (type: ProviderType) => ENDPOINT_PATHS[type];

	const parseServerUrl = (endpoint: string, type: ProviderType) => {
		const suffix = getEndpointPath(type);
		if (suffix && endpoint.endsWith(suffix)) {
			return endpoint.slice(0, -suffix.length);
		}
		return endpoint;
	};

	if (!settings) return null;

	const handleGetModels = async (id: string, endpoint: string) => {
		const models = await getLMStudioModels(endpoint);
		if (models.length === 0) return;
		if (id === "__preview__") {
			const existing = previewConfig.models || {};
			const updated = { ...existing };
			for (const m of models) {
				if (!(m in updated)) updated[m] = { enabled: false };
			}
			setPreviewConfig({ ...previewConfig, models: updated });
		} else {
			const config = settings.providers.configs[id];
			if (config) {
				const existing = config.models || {};
				const updated = { ...existing };
				for (const m of models) {
					if (!(m in updated)) updated[m] = { enabled: false };
				}
				updateProviderConfig(id, { ...config, models: updated });
			}
		}
	};

	const addPreviewProvider = () => {
		if (!previewId.trim()) return;
		updateProviderConfig(previewId.trim(), {
			...previewConfig,
			apiKey: previewApiKeyDraft || previewConfig.apiKey,
		});
		setShowNewProvider(false);
		setPreviewId("");
		setPreviewConfig({
			type: "lm-studio",
			endpoint: "http://localhost:1234/v1",
			enabled: false,
		});
		setPreviewApiKeyDraft("");
	};

	const typeOptions: { value: ProviderType; label: string }[] = [
		{ value: "lm-studio", label: "LM Studio" },
		{ value: "openai", label: "OpenAI" },
		{ value: "anthropic", label: "Anthropic" },
		{ value: "custom", label: "Custom" },
	];

	const renderServerUrlRow = (
		endpoint: string,
		type: ProviderType,
		onChange: (endpoint: string) => void,
		disabled?: boolean,
	) => {
		const serverUrl = parseServerUrl(endpoint, type);
		const path = getEndpointPath(type);
		return (
			<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
				<label>
					Server URL:
					<div className={styles.urlRow}>
						<input
							type="text"
							value={serverUrl}
							onChange={(e) =>
								onChange(e.target.value + getEndpointPath(type))
							}
							disabled={disabled}
							className={styles.textInputSmall}
							placeholder="https://api.example.com"
						/>
						<input
							type="text"
							value={path}
							readOnly
							tabIndex={-1}
							className={`${styles.textInputSmall} ${styles.pathInput}`}
						/>
					</div>
				</label>
				{endpoint && (
					<div className={styles.urlPreview}>Full URL: {endpoint}</div>
				)}
			</div>
		);
	};

	const renderTypeSelect = (
		type: ProviderType,
		onTypeChange: (type: ProviderType) => void,
		disabled?: boolean,
	) => (
		<select
			value={type}
			onChange={(e) => onTypeChange(e.target.value as ProviderType)}
			disabled={disabled}
			className={styles.headerSelect}
		>
			{typeOptions.map((o) => (
				<option key={o.value} value={o.value}>
					{o.label}
				</option>
			))}
		</select>
	);

	const renderApiKeySection = (
		configKey: string | undefined,
		draftValue: string,
		onDraftChange: (value: string) => void,
		onSave: () => void,
		showKey: boolean,
		onToggleShow: () => void,
		disabled?: boolean,
	) => {
		const committed = configKey || "";
		const saveDisabled = disabled || draftValue === committed;
		return (
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: 8,
					paddingTop: 8,
					borderTop: "1px solid var(--border)",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					<span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
						API Key
					</span>
					<a
						href="https://ollama.com/download"
						target="_blank"
						rel="noopener noreferrer"
						style={{
							fontSize: "0.75rem",
							color: "var(--accent)",
							textDecoration: "none",
							display: "inline-flex",
							alignItems: "center",
							gap: 4,
						}}
					>
						Get your API key{" "}
						<IconExternalLink size={11} stroke={2} />
					</a>
				</div>
				<div style={{ display: "flex", gap: 8 }}>
					<div style={{ position: "relative", flex: 1 }}>
						<input
							placeholder="Paste your API key here..."
							type={showKey ? "text" : "password"}
							value={draftValue}
							onChange={(e) => onDraftChange(e.target.value)}
							disabled={disabled}
							style={{
								width: "100%",
								padding: "8px 36px 8px 10px",
								fontSize: "0.8rem",
								background: "var(--bg-primary)",
								border: "1px solid var(--border)",
								borderRadius: "var(--radius-sm)",
								color: "var(--text-primary)",
								fontFamily: "monospace",
							}}
						/>
						<button
							type="button"
							onClick={onToggleShow}
							disabled={disabled}
							style={{
								position: "absolute",
								right: 6,
								top: "50%",
								transform: "translateY(-50%)",
								background: "none",
								border: "none",
								cursor: "pointer",
								padding: 4,
								color: "var(--text-muted)",
							}}
						>
							{showKey ? <IconEyeOff size={14} /> : <IconEye size={14} />}
						</button>
					</div>
					<button
						type="button"
						onClick={onSave}
						disabled={saveDisabled}
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: 8,
							borderRadius: "var(--radius-sm)",
							fontFamily: "var(--font-sans)",
							fontWeight: 500,
							cursor: saveDisabled ? "not-allowed" : "pointer",
							opacity: saveDisabled ? 0.4 : 1,
							transition: "var(--transition)",
							background: "var(--bg-tertiary)",
							color: "var(--text-primary)",
							border: "1px solid var(--border)",
							padding: "6px 12px",
							fontSize: "0.8rem",
						}}
					>
						<IconKey size={12} style={{ marginRight: 3 }} />
						Save Key
					</button>
				</div>
			</div>
		);
	};

	const getModelLabel = (modelName: string, alias: string | undefined, displayMode: "alias" | "both") => {
		if (!alias) return modelName;
		return displayMode === "both" ? `${alias} (${modelName})` : alias;
	};

	const renderModels = (
		id: string,
		config: ProviderConfig,
		disabled?: boolean,
	) => {
		const modelNames = config.models
			? Object.keys(config.models).filter(Boolean)
			: [];
		const displayMode = config.modelDisplayMode ?? settings?.providers.modelDisplayMode ?? "alias";
		return modelNames.length > 0 ? (
			<div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
				{modelNames.map((m) => {
					const entry = config.models?.[m];
					const enabled = entry ? (typeof entry === "boolean" ? entry : entry.enabled) : false;
					const alias = typeof entry === "object" ? entry.alias : undefined;
					const isEditing = editingAlias?.providerId === id && editingAlias?.modelName === m;
					return (
						<div key={m} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
							<button
								type="button"
								className={`${styles.modelBtn}${
									enabled ? ` ${styles.modelBtnActive}` : ""
								}`}
								onClick={() => {
									if (disabled) return;
									updateProviderConfig(id, {
										...config,
										models: {
											...config.models,
											[m]: { enabled: !enabled, alias },
										},
									});
								}}
								disabled={disabled}
							>
								{getModelLabel(m, alias, displayMode)}
							</button>
							{isEditing ? (
								<div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
									<input
										type="text"
										value={editingAlias.draft}
										onChange={(e) =>
											setEditingAlias((prev) =>
												prev ? { ...prev, draft: e.target.value } : null,
											)
										}
										className={styles.textInputSmall}
										style={{ width: 140, paddingRight: 28 }}
										autoFocus
										disabled={disabled}
									/>
									<button
										type="button"
										onClick={() => {
											if (disabled) return;
											updateProviderConfig(id, {
												...config,
												models: {
													...config.models,
													[m]: { enabled, alias: editingAlias.draft || undefined },
												},
											});
											setEditingAlias(null);
										}}
										disabled={disabled}
										style={{
											position: "absolute",
											right: 4,
											background: "none",
											border: "none",
											color: "#4A9EFF",
											cursor: "pointer",
											padding: 2,
											display: "flex",
										}}
									>
										<IconCheck size={14} />
									</button>
								</div>
							) : null}
							<button
								type="button"
								onClick={() => {
									if (disabled) return;
									if (isEditing) {
										setEditingAlias(null);
									} else {
										setEditingAlias({ providerId: id, modelName: m, draft: alias || "" });
									}
								}}
								disabled={disabled}
								className={styles.iconBtnSmall}
								title={isEditing ? "Cancel" : "Edit alias"}
							>
								{isEditing ? <IconX size={14} /> : <IconEdit size={14} />}
							</button>
						</div>
					);
				})}
			</div>
		) : (
			<input
				type="text"
				value={
					config.models
						? Object.entries(config.models)
								.filter(([, v]) => typeof v === "boolean" ? v : v.enabled)
								.map(([k]) => k)
								.join(", ")
						: ""
				}
				onChange={(e) =>
					updateProviderConfig(id, {
						...config,
						models: e.target.value ? { [e.target.value]: { enabled: true } } : {},
					})
				}
				disabled={disabled}
				className={styles.textInputSmall}
				placeholder="e.g., gpt-4"
			/>
		);
	};

	return (
		<div className={styles.tabContent} id="settings-section-providers-list">
			<div className={styles.settingRow} id="settings-section-default-provider">
				<span>Default Provider</span>
				<select
					value={settings.providers.defaultProvider || ""}
					onChange={(e) =>
						updateProviders("defaultProvider", e.target.value || null)
					}
					disabled={isLocked}
					className={styles.select}
				>
					<option value="">None</option>
					{Object.keys(settings.providers.configs).map((id) => (
						<option key={id} value={id}>
							{id}
						</option>
					))}
				</select>
			</div>

			<div className={styles.providerSection}>
				<div className={styles.providerSectionHeader}>
					<h3>Providers</h3>
					<button
						onClick={() => setShowNewProvider(!showNewProvider)}
						disabled={isLocked}
					>
						{showNewProvider ? "Cancel" : "Add Provider"}
					</button>
				</div>

				{showNewProvider && (
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
							{renderTypeSelect(
								previewConfig.type,
								(t) =>
									setPreviewConfig({
										...previewConfig,
										type: t,
										endpoint:
											parseServerUrl(previewConfig.endpoint, previewConfig.type) +
											getEndpointPath(t),
									}),
							)}
							<button title="Test connection" disabled className={styles.iconBtnSmall}>
								<IconBolt stroke={2} size={18} />
							</button>
						</div>
						<div className={styles.providerFields}>
							{renderServerUrlRow(
								previewConfig.endpoint,
								previewConfig.type,
								(ep) => setPreviewConfig({ ...previewConfig, endpoint: ep }),
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
								() => setPreviewShowApiKey((v) => !v),
							)}
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									gap: 8,
								}}
							>
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
									}}
								>
									<span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
										Models
									</span>
									<button
										title="Get models"
										onClick={() =>
											handleGetModels("__preview__", previewConfig.endpoint)
										}
										disabled={!previewConfig.endpoint}
										className={styles.btnSmall}
									>
										Get Models
									</button>
								</div>
								{previewConfig.models &&
									Object.keys(previewConfig.models).length > 0 && (
										<div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
											{Object.keys(previewConfig.models).map((m) => {
												const entry = previewConfig.models?.[m];
												const enabled = entry ? (typeof entry === "boolean" ? entry : entry.enabled) : false;
												const alias = typeof entry === "object" ? entry.alias : undefined;
												const isEditing = editingAlias?.providerId === "__preview__" && editingAlias?.modelName === m;
												const displayMode = previewConfig.modelDisplayMode ?? settings?.providers.modelDisplayMode ?? "alias";
												return (
													<div key={m} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
														<button
															type="button"
															className={`${styles.modelBtn}${
																enabled ? ` ${styles.modelBtnActive}` : ""
															}`}
															onClick={() =>
																setPreviewConfig({
																	...previewConfig,
																	models: {
																		...previewConfig.models,
																		[m]: { enabled: !enabled, alias },
																	},
																})
															}
														>
															{getModelLabel(m, alias, displayMode)}
														</button>
														{isEditing ? (
															<div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
																<input
																	type="text"
																	value={editingAlias.draft}
																	onChange={(e) =>
																		setEditingAlias((prev) =>
																			prev ? { ...prev, draft: e.target.value } : null,
																		)
																	}
																	className={styles.textInputSmall}
																	style={{ width: 140, paddingRight: 28 }}
																	autoFocus
																/>
																<button
																	type="button"
																	onClick={() => {
																		setPreviewConfig({
																			...previewConfig,
																			models: {
																				...previewConfig.models,
																				[m]: { enabled, alias: editingAlias.draft || undefined },
																			},
																		});
																		setEditingAlias(null);
																	}}
																	style={{
																		position: "absolute",
																		right: 4,
																		background: "none",
																		border: "none",
																		color: "#4A9EFF",
																		cursor: "pointer",
																		padding: 2,
																		display: "flex",
																	}}
																>
																	<IconCheck size={14} />
																</button>
															</div>
														) : null}
														<button
															type="button"
															onClick={() => {
																if (isEditing) {
																	setEditingAlias(null);
																} else {
																	setEditingAlias({ providerId: "__preview__", modelName: m, draft: alias || "" });
																}
															}}
															className={styles.iconBtnSmall}
															title={isEditing ? "Cancel" : "Edit alias"}
														>
															{isEditing ? <IconX size={14} /> : <IconEdit size={14} />}
														</button>
													</div>
												);
											})}
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
				)}

				{Object.entries(settings.providers.configs).map(([id, config]) => (
					<div key={id} className={styles.providerCard}>
						<div className={styles.providerCardHeader}>
							<Toggle
								checked={config.enabled}
								onChange={(v) =>
									updateProviderConfig(id, { ...config, enabled: v })
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
											parseServerUrl(config.endpoint, config.type) +
											getEndpointPath(t),
									}),
								isLocked,
							)}
							<button
								title="Test connection"
								onClick={() => console.log("test connection", id)}
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
									updateProviderConfig(id, { ...config, endpoint: ep }),
								isLocked,
							)}
							{renderApiKeySection(
								config.apiKey,
								id in apiKeyDrafts ? apiKeyDrafts[id] : config.apiKey || "",
								(v) =>
									setApiKeyDrafts((prev) => ({ ...prev, [id]: v })),
								() =>
									updateProviderConfig(id, {
										...config,
										apiKey: id in apiKeyDrafts ? apiKeyDrafts[id] : config.apiKey,
									}),
								showApiKeys[id] || false,
								() =>
									setShowApiKeys((prev) => ({
										...prev,
										[id]: !prev[id],
									})),
								isLocked,
							)}
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									gap: 8,
								}}
							>
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
									}}
								>
									<span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
										Models
									</span>
									<button
										title="Get models"
										onClick={() => handleGetModels(id, config.endpoint)}
										disabled={isLocked || !config.endpoint}
										className={styles.btnSmall}
									>
										Get Models
									</button>
								</div>
								<div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
									<span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
										Show:
									</span>
									<select
										value={config.modelDisplayMode ?? settings?.providers.modelDisplayMode ?? "alias"}
										onChange={(e) =>
											updateProviderConfig(id, {
												...config,
												modelDisplayMode: e.target.value as "alias" | "both",
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
				))}
			</div>
		</div>
	);
}

function StorageTab() {
	const {
		settings,
		setEncryption,
		encryptionMode,
		isLocked,
		unlock,
		lock,
		reset,
		clearCache,
		getCacheSize,
	} = useSettings();
	const [cacheSize, setCacheSize] = useState(0);
	const [password, setPassword] = useState("");
	const [unlockPassword, setUnlockPassword] = useState("");
	const [unlockError, setUnlockError] = useState("");

	useEffect(() => {
		getCacheSize().then(setCacheSize);
	}, [getCacheSize]);

	const formatBytes = (bytes: number) => {
		if (bytes === 0) return "0 B";
		const k = 1024;
		const sizes = ["B", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
	};

	const handleClearCache = async () => {
		const cleared = await clearCache();
		setCacheSize(0);
		alert(`Cleared ${formatBytes(cleared)} from cache`);
	};

	const handleSetEncryption = async (mode: "machine" | "password") => {
		if (mode === "password" && password) {
			await setEncryption(mode, password);
			setPassword("");
		} else {
			await setEncryption(mode);
		}
	};

	const handleUnlock = async () => {
		const success = await unlock(unlockPassword);
		if (!success) {
			setUnlockError("Incorrect password");
		} else {
			setUnlockPassword("");
			setUnlockError("");
		}
	};

	if (!settings) return null;

	if (isLocked) {
		return (
			<div className={styles.tabContent}>
				<div className={styles.lockedMessage}>
					<span>Settings are locked</span>
					<div className={styles.unlockSection}>
						<input
							type="password"
							value={unlockPassword}
							onChange={(e) => setUnlockPassword(e.target.value)}
							placeholder="Enter master password"
							className={styles.textInput}
						/>
						<button onClick={handleUnlock} className={styles.btn}>
							Unlock
						</button>
						{unlockError && <span className={styles.error}>{unlockError}</span>}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className={styles.tabContent}>
			<div className={styles.settingRow}>
				<span>Encryption Mode</span>
				<div className={styles.encryptionButtons}>
					<button
						onClick={() => handleSetEncryption("machine")}
						disabled={encryptionMode === "machine"}
						className={styles.btnSmall}
					>
						Machine Key
					</button>
					<button
						onClick={() => handleSetEncryption("password")}
						disabled={encryptionMode === "password"}
						className={styles.btnSmall}
					>
						Password
					</button>
				</div>
			</div>
			{encryptionMode === "password" && (
				<div className={styles.settingRow}>
					<span>Set New Password</span>
					<div className={styles.pathRow}>
						<input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="New password"
							className={styles.textInput}
						/>
						<button
							onClick={() => handleSetEncryption("password")}
							disabled={!password}
							className={styles.btn}
						>
							Set
						</button>
					</div>
				</div>
			)}

			<div className={styles.settingRow}>
				<span>Data Location</span>
				<span className={styles.pathDisplay}>
					{settings.storage.dataLocation}
				</span>
			</div>
			<div className={styles.settingRow}>
				<span>Cache Size</span>
				<span>{formatBytes(cacheSize)}</span>
			</div>
			<div className={styles.settingRow}>
				<button onClick={handleClearCache} className={styles.btnDanger}>
					Clear Cache
				</button>
			</div>

			<div className={styles.dangerZone}>
				<h3>Danger Zone</h3>
				<div className={styles.settingRow}>
					<span>Lock Settings</span>
					<button onClick={lock} className={styles.btnWarning}>
						Lock
					</button>
				</div>
				<div className={styles.settingRow}>
					<span>Reset All Settings</span>
					<button onClick={reset} className={styles.btnDanger}>
						Reset
					</button>
				</div>
			</div>
		</div>
	);
}

function AppearanceTab() {
	const { settings, updateAppearance, isLocked } = useSettings();
	if (!settings) return null;
	const c = settings.appearance.sidebarConstraints ?? {
		enableCustomWidthCap: false,
		maxLeftWidth: 400,
		maxRightWidth: 700,
		leftWidth: 280,
		rightWidth: 550,
	};

	return (
		<div className={styles.tabContent}>
			<div className={styles.settingsSectionLabel}>Sidebar Constraints</div>
			<div className={styles.settingRow}>
				<span>Enable Custom Width Cap</span>
				<Toggle
					checked={c.enableCustomWidthCap}
					onChange={(v) => updateAppearance("sidebarConstraints", { ...c, enableCustomWidthCap: v })}
					disabled={isLocked}
				/>
			</div>
			{c.enableCustomWidthCap && (
				<>
					<div className={styles.settingRow}>
						<span>Max Left Sidebar Width (px)</span>
						<NumberInput
							value={c.maxLeftWidth}
							onChange={(v) => updateAppearance("sidebarConstraints", { ...c, maxLeftWidth: v || 400 })}
							min={220}
							max={1200}
							disabled={isLocked}
						/>
					</div>
					<div className={styles.settingRow}>
						<span>Max Right Sidebar Width (px)</span>
						<NumberInput
							value={c.maxRightWidth}
							onChange={(v) => updateAppearance("sidebarConstraints", { ...c, maxRightWidth: v || 700 })}
							min={400}
							max={2000}
							disabled={isLocked}
						/>
					</div>
				</>
			)}
		</div>
	);
}

function QuotaTab() {
	const { settings, updateGeneral, isLocked } = useSettings();
	const rpc = getRPC();
	const [period, setPeriod] = useState<"today" | "month">("today");
	const [stats, setStats] = useState<{ tokensConsumed: number; requestCount: number } | null>(null);

	useEffect(() => {
		async function loadStats() {
			try {
				const result = await rpc.request["usage:get-stats"]({ period, projectId: null });
				setStats(result);
			} catch (e) {
				console.error("Failed to load usage stats:", e);
			}
		}
		loadStats();
	}, [period, rpc]);

	if (!settings) return null;

	const tokenLimit = (period === "today" ? settings.general.dailyTokenLimit : settings.general.monthlyTokenLimit) ?? 100000;
	const requestLimit = (period === "today" ? settings.general.dailyRequestLimit : settings.general.monthlyRequestLimit) ?? 100;
	const tokens = stats?.tokensConsumed ?? 0;
	const requests = stats?.requestCount ?? 0;
	const tokenPct = tokenLimit > 0 ? Math.min((tokens / tokenLimit) * 100, 100) : 0;
	const requestPct = requestLimit > 0 ? Math.min((requests / requestLimit) * 100, 100) : 0;

	const progressColor = (pct: number) => {
		if (pct > 95) return "#ff453a";
		if (pct > 80) return "#ff9f0a";
		if (pct > 50) return "#ffd60a";
		return "#30d158";
	};

	return (
		<div className={styles.tabContent}>
			<div className={styles.settingsSectionLabel}>Quota & Usage Control</div>

			<div className={styles.periodToggle}>
				<button
					className={period === "today" ? styles.activePeriod : ""}
					onClick={() => setPeriod("today")}
				>
					Today
				</button>
				<button
					className={period === "month" ? styles.activePeriod : ""}
					onClick={() => setPeriod("month")}
				>
					Month
				</button>
			</div>

			<div className={styles.usageCard}>
				<div className={styles.usageLabel}>Tokens Consumed</div>
				<div className={styles.usageValue}>
					{tokens.toLocaleString()} / {tokenLimit.toLocaleString()}
				</div>
				<div className={styles.progressBar}>
					<div
						className={styles.progressFill}
						style={{
							width: `${tokenPct}%`,
							backgroundColor: progressColor(tokenPct),
						}}
					/>
				</div>
			</div>

			<div className={styles.usageCard}>
				<div className={styles.usageLabel}>Requests (API Calls)</div>
				<div className={styles.usageValue}>
					{requests.toLocaleString()} / {requestLimit.toLocaleString()}
				</div>
				<div className={styles.progressBar}>
					<div
						className={styles.progressFill}
						style={{
							width: `${requestPct}%`,
							backgroundColor: progressColor(requestPct),
						}}
					/>
				</div>
			</div>

			<div className={styles.settingsSectionDivider} />
			<div className={styles.settingsSectionLabel}>Limits</div>

			<div className={styles.settingRow}>
				<span>Daily Token Limit</span>
				<NumberInput
					value={settings.general.dailyTokenLimit}
					onChange={(v) => updateGeneral("dailyTokenLimit", v)}
					min={1000}
					max={10000000}
					disabled={isLocked}
				/>
			</div>
			<div className={styles.settingRow}>
				<span>Monthly Token Limit</span>
				<NumberInput
					value={settings.general.monthlyTokenLimit}
					onChange={(v) => updateGeneral("monthlyTokenLimit", v)}
					min={1000}
					max={100000000}
					disabled={isLocked}
				/>
			</div>
			<div className={styles.settingRow}>
				<span>Daily Request Limit</span>
				<NumberInput
					value={settings.general.dailyRequestLimit}
					onChange={(v) => updateGeneral("dailyRequestLimit", v)}
					min={1}
					max={100000}
					disabled={isLocked}
				/>
			</div>
			<div className={styles.settingRow}>
				<span>Monthly Request Limit</span>
				<NumberInput
					value={settings.general.monthlyRequestLimit}
					onChange={(v) => updateGeneral("monthlyRequestLimit", v)}
					min={1}
					max={1000000}
					disabled={isLocked}
				/>
			</div>
		</div>
	);
}

function AboutTab() {
	return (
		<>
			<h4>Application Information</h4>
			<p>Version: 0.0.1</p>
			<p>License: MIT</p>
			<p>Author: Eon</p>
			<p>Website: https://eon.com</p>
			<p>License: MIT</p>
		</>
	);
}

const gtFieldTypes: FieldDefinition["type"][] = [
	"text", "number", "textarea", "select", "checkbox", "date",
	"file", "multiselect", "entitylink", "richtext", "color", "toggle", "range",
	"portrait", "images",
];

const GT_CATEGORIES: CompendiumCategory[] = [
	"character", "location", "organization", "item", "lore",
];

const gtCategoryLabels: Record<CompendiumCategory, string> = {
	character: "Character", location: "Location",
	organization: "Organization", item: "Item", lore: "Lore",
};

function TemplatesTab() {
	const rpc = getRPC();
	const [templates, setTemplates] = useState<GlobalTemplate[]>([]);
	const [loading, setLoading] = useState(true);
	const [filterBaseType, setFilterBaseType] = useState<CompendiumCategory | "all">("all");

	const [showCreate, setShowCreate] = useState(false);
	const [createName, setCreateName] = useState("");
	const [createDesc, setCreateDesc] = useState("");
	const [createBaseType, setCreateBaseType] = useState<CompendiumCategory>("character");
	const [createFields, setCreateFields] = useState<FieldDefinition[]>([]);
	const [newFieldName, setNewFieldName] = useState("");
	const [newFieldType, setNewFieldType] = useState<FieldDefinition["type"]>("text");

	const [showEdit, setShowEdit] = useState(false);
	const [editId, setEditId] = useState<string | null>(null);
	const [editName, setEditName] = useState("");
	const [editDesc, setEditDesc] = useState("");
	const [editBaseType, setEditBaseType] = useState<CompendiumCategory>("character");
	const [editFields, setEditFields] = useState<FieldDefinition[]>([]);
	const [editNewFieldName, setEditNewFieldName] = useState("");
	const [editNewFieldType, setEditNewFieldType] = useState<FieldDefinition["type"]>("text");

	const [showDelete, setShowDelete] = useState(false);
	const [deleteId, setDeleteId] = useState<string | null>(null);

	useEffect(() => {
		loadTemplates();
	}, []);

	async function loadTemplates() {
		setLoading(true);
		try {
			const result = await rpc.request["db:list-global-templates"]();
			setTemplates(Array.isArray(result) ? result : []);
		} catch (e) {
			console.error("Failed to load global templates:", e);
		} finally {
			setLoading(false);
		}
	}

	const filteredTemplates = filterBaseType === "all"
		? templates
		: templates.filter((t) => t.baseType === filterBaseType);

	function resetCreateForm() {
		setCreateName("");
		setCreateDesc("");
		setCreateBaseType("character");
		setCreateFields([]);
		setNewFieldName("");
		setNewFieldType("text");
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
	) {
		return (
			<div>
				<div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
					<input
						type="text"
						placeholder="Field name"
						value={newName}
						onChange={(e) => setNewName(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && addField(fields, setter, newName, newType)}
						style={{ flex: 1 }}
					/>
					<select value={newType} onChange={(e) => setNewType(e.target.value as FieldDefinition["type"])}>
						{gtFieldTypes.map((t) => <option key={t} value={t}>{t}</option>)}
					</select>
					<button onClick={() => { addField(fields, setter, newName, newType); setNewName(""); setNewType("text"); }} disabled={!newName.trim()}>
						Add
					</button>
				</div>
				{fields.length === 0 ? (
					<div style={{ color: "#888", fontSize: "0.85em" }}>No fields defined</div>
				) : (
					<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "300px", overflowY: "auto" }}>
						{fields.map((f, i) => (
							<div key={i} style={{ padding: "0.5rem", border: "1px solid var(--border, #333)", borderRadius: "4px" }}>
								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
									<strong>{f.name}</strong>
									<span style={{ color: "#888", fontSize: "0.85em" }}>{f.type}</span>
								</div>
								<div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
									<input
										type="text"
										placeholder="Label"
										value={f.label}
										onChange={(e) => updateField(i, { label: e.target.value }, fields, setter)}
										style={{ flex: 1 }}
									/>
									<label style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85em" }}>
										<input
											type="checkbox"
											checked={f.required}
											onChange={(e) => updateField(i, { required: e.target.checked }, fields, setter)}
										/>
										Required
									</label>
								</div>
								{(f.type === "select" || f.type === "multiselect") && (
									<input
										type="text"
										placeholder="Options (comma-separated)"
										value={f.options?.join(", ") || ""}
										onChange={(e) => updateField(i, { options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean) }, fields, setter)}
										style={{ width: "100%", marginTop: "0.25rem" }}
									/>
								)}
								{f.type === "range" && (
									<div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
										<input type="number" placeholder="Min" value={f.rangeMin ?? 0}
											onChange={(e) => updateField(i, { rangeMin: Number(e.target.value) }, fields, setter)} />
										<input type="number" placeholder="Max" value={f.rangeMax ?? 100}
											onChange={(e) => updateField(i, { rangeMax: Number(e.target.value) }, fields, setter)} />
										<input type="number" placeholder="Step" value={f.rangeStep ?? 1}
											onChange={(e) => updateField(i, { rangeStep: Number(e.target.value) }, fields, setter)} />
									</div>
								)}
								<button
									onClick={() => removeField(i, fields, setter)}
									style={{ marginTop: "0.25rem", color: "#e74c3c", fontSize: "0.85em" }}
								>
									Remove
								</button>
							</div>
						))}
					</div>
				)}
			</div>
		);
	}

	async function handleCreate() {
		if (!createName.trim()) return;
		const data: NewGlobalTemplate = {
			id: crypto.randomUUID(),
			name: createName.trim(),
			description: createDesc.trim() || null,
			baseType: createBaseType,
			customFields: createFields.filter((f) => f.name.trim() && f.label.trim()),
		};
		await rpc.request["db:create-global-template"](data);
		setShowCreate(false);
		loadTemplates();
	}

	function handleEditOpen(t: GlobalTemplate) {
		setEditId(t.id);
		setEditName(t.name);
		setEditDesc(t.description || "");
		setEditBaseType(t.baseType);
		setEditFields(t.customFields || []);
		setEditNewFieldName("");
		setEditNewFieldType("text");
		setShowEdit(true);
	}

	async function handleEditSave() {
		if (!editId || !editName.trim()) return;
		await rpc.request["db:update-global-template"]({
			id: editId,
			data: {
				name: editName.trim(),
				description: editDesc.trim() || null,
				baseType: editBaseType,
				customFields: editFields.filter((f) => f.name.trim() && f.label.trim()),
			},
		});
		setShowEdit(false);
		setEditId(null);
		loadTemplates();
	}

	async function handleDeleteConfirm() {
		if (!deleteId) return;
		await rpc.request["db:delete-global-template"](deleteId);
		setShowDelete(false);
		setDeleteId(null);
		loadTemplates();
	}

	return (
		<div className={styles.tabContent}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
				<div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
					<label>Filter:</label>
					<select
						value={filterBaseType}
						onChange={(e) => setFilterBaseType(e.target.value as CompendiumCategory | "all")}
					>
						<option value="all">All Types</option>
						{GT_CATEGORIES.map((cat) => (
							<option key={cat} value={cat}>{gtCategoryLabels[cat]}</option>
						))}
					</select>
				</div>
				<button onClick={() => { resetCreateForm(); setShowCreate(true); }}>New Global Template</button>
			</div>

			{loading ? (
				<div>Loading...</div>
			) : filteredTemplates.length === 0 ? (
				<div style={{ color: "#888", textAlign: "center", padding: "2rem" }}>
					No global templates yet. Create one to reuse across projects.
				</div>
			) : (
				<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
					{GT_CATEGORIES.map((cat) => {
						const items = filteredTemplates.filter((t) => t.baseType === cat);
						if (items.length === 0) return null;
						return (
							<div key={cat}>
								<h4 style={{ margin: "0 0 0.5rem 0", color: "#aaa" }}>{gtCategoryLabels[cat]} Templates</h4>
								<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
									{items.map((t) => (
										<div
											key={t.id}
											style={{
												display: "flex",
												alignItems: "center",
												justifyContent: "space-between",
												padding: "0.75rem",
												border: "1px solid var(--border, #333)",
												borderRadius: "6px",
											}}
										>
											<div>
												<strong>{t.name}</strong>
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
												<button
													onClick={() => { setDeleteId(t.id); setShowDelete(true); }}
													style={{ color: "#e74c3c" }}
												>
													Delete
												</button>
											</div>
										</div>
									))}
								</div>
							</div>
						);
					})}
				</div>
			)}

			{showCreate && (
				<div className={styles.overlay}>
					<div className={styles.subDialog}>
						<h4>Create Global Template</h4>
						<div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
							<div>
								<label>Template Name</label>
								<input type="text" value={createName} onChange={(e) => setCreateName(e.target.value)} style={{ width: "100%" }} autoFocus />
							</div>
							<div>
								<label>Description</label>
								<textarea value={createDesc} onChange={(e) => setCreateDesc(e.target.value)} rows={2} style={{ width: "100%" }} />
							</div>
							<div>
								<label>Base Type</label>
								<select value={createBaseType} onChange={(e) => setCreateBaseType(e.target.value as CompendiumCategory)} style={{ width: "100%" }}>
									{GT_CATEGORIES.map((cat) => <option key={cat} value={cat}>{gtCategoryLabels[cat]}</option>)}
								</select>
							</div>
							<div>
								<label>Custom Fields</label>
								{renderFieldEditor(createFields, setCreateFields, newFieldName, setNewFieldName, newFieldType, setNewFieldType)}
							</div>
							<div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
								<button onClick={() => setShowCreate(false)}>Cancel</button>
								<button onClick={handleCreate} disabled={!createName.trim()}>Create</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{showEdit && editId && (
				<div className={styles.overlay}>
					<div className={styles.subDialog}>
						<h4>Edit Global Template</h4>
						<div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
							<div>
								<label>Template Name</label>
								<input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ width: "100%" }} />
							</div>
							<div>
								<label>Description</label>
								<textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2} style={{ width: "100%" }} />
							</div>
							<div>
								<label>Base Type</label>
								<select value={editBaseType} onChange={(e) => setEditBaseType(e.target.value as CompendiumCategory)} style={{ width: "100%" }}>
									{GT_CATEGORIES.map((cat) => <option key={cat} value={cat}>{gtCategoryLabels[cat]}</option>)}
								</select>
							</div>
							<div>
								<label>Custom Fields</label>
								{renderFieldEditor(editFields, setEditFields, editNewFieldName, setEditNewFieldName, editNewFieldType, setEditNewFieldType)}
							</div>
							<div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
								<button onClick={() => setShowEdit(false)}>Cancel</button>
								<button onClick={handleEditSave} disabled={!editName.trim()}>Save</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{showDelete && deleteId && (
				<div className={styles.overlay}>
					<div className={styles.subDialog}>
						<h4>Delete Global Template</h4>
						<p>Are you sure you want to delete this global template? Projects using it will lose the inherited fields.</p>
						<div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
							<button onClick={() => setShowDelete(false)}>Cancel</button>
							<button onClick={handleDeleteConfirm} style={{ color: "#e74c3c" }}>Delete</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

function EmbeddingsTab() {
	const { settings, updateEmbeddings, isLocked } = useSettings();
	const rpc = getRPC();
	const [indexStatus, setIndexStatus] = useState<{ total: number; byType: Record<string, number> } | null>(null);
	const [isIndexing, setIsIndexing] = useState(false);
	const [indexProgress, setIndexProgress] = useState<string>("");
	const [vecAvailable, setVecAvailable] = useState<boolean | null>(null);

	useEffect(() => {
		rpc.request["embeddings:check-availability"]().then(setVecAvailable).catch(() => setVecAvailable(false));
	}, [rpc]);

	useEffect(() => {
		if (settings?.embeddings?.enabled) {
			// Load index status for current project if available
			rpc.request["settings:get-all"]().then((s) => {
				const recentProjects = s.projects?.recentProjects;
				if (recentProjects && recentProjects.length > 0) {
					rpc.request["embeddings:status"](recentProjects[0]).then(setIndexStatus).catch(() => {});
				}
			}).catch(() => {});
		}
	}, [settings?.embeddings?.enabled, rpc]);

	if (!settings) return null;

	const emb = settings.embeddings ?? {
		enabled: false,
		endpoint: "http://localhost:1234/v1",
		model: "nomic-embed-text",
		dimension: 768,
		chunkSize: 500,
		chunkOverlap: 50,
		autoIndexOnSave: true,
	};

	const handleTestConnection = async () => {
		try {
			const result = await rpc.request["embeddings:test-server"]();
			if (result.ok) {
				alert("Embedding server is reachable!");
			} else {
				alert(`Connection failed: ${result.error}`);
			}
		} catch (e) {
			alert(`Connection failed: ${e}`);
		}
	};

	const handleRebuildIndex = async () => {
		const recentProjects = settings.projects.recentProjects;
		if (!recentProjects || recentProjects.length === 0) {
			alert("No project open to index.");
			return;
		}
		const projectId = recentProjects[0];
		setIsIndexing(true);
		setIndexProgress("Starting index...");
		try {
			await rpc.request["embeddings:rebuild"](projectId);
			const result = await rpc.request["embeddings:index-project"]({ projectId });
			setIndexStatus(await rpc.request["embeddings:status"](projectId));
			setIndexProgress(`Indexed ${result.indexed} chunks (${result.skipped} skipped, ${result.failed} failed)`);
		} catch (e) {
			setIndexProgress(`Error: ${e}`);
		} finally {
			setIsIndexing(false);
		}
	};

	return (
		<div className={styles.tabContent}>
			<div className={styles.settingsSectionLabel}>Context Engine (RAG)</div>

			{vecAvailable === false && (
				<div style={{ padding: "12px", background: "#fff3cd", borderRadius: "8px", marginBottom: "16px", color: "#856404" }}>
					<strong>sqlite-vec not available.</strong> Vector features are disabled. On macOS, install Homebrew SQLite and restart the app.
				</div>
			)}

			<div className={styles.settingRow}>
				<label>Enable Context Engine</label>
				<input
					type="checkbox"
					checked={emb.enabled}
					disabled={isLocked || vecAvailable === false}
					onChange={async (e) => {
						const enabled = e.target.checked;
						await updateEmbeddings("enabled", enabled);
						if (enabled) {
							const recentProjects = settings.projects.recentProjects;
							if (recentProjects && recentProjects.length > 0) {
								const projectId = recentProjects[0];
								try {
									const status = await rpc.request["embeddings:status"](projectId);
									if (status.total === 0) {
										const confirmed = confirm("Index your project for semantic search? This will embed all chapters, characters, locations, and other compendium entries.");
										if (confirmed) {
											setIsIndexing(true);
											setIndexProgress("Starting initial index...");
											const result = await rpc.request["embeddings:index-project"]({ projectId });
											setIndexStatus(await rpc.request["embeddings:status"](projectId));
											setIndexProgress(`Indexed ${result.indexed} chunks (${result.failed} failed)`);
											setIsIndexing(false);
										}
									} else {
										setIndexStatus(status);
									}
								} catch (err) {
									console.error("Auto-index failed:", err);
								}
							}
						}
					}}
				/>
			</div>

			<div className={styles.settingRow}>
				<label>Server</label>
				<div style={{ display: "flex", gap: "8px" }}>
					<button
						disabled={isLocked || !emb.enabled}
						onClick={() => updateEmbeddings("endpoint", "http://localhost:1234/v1")}
						style={{
							flex: 1,
							padding: "6px 12px",
							borderRadius: "6px",
							border: emb.endpoint.includes(":1234") ? "1px solid #8b5cf6" : "1px solid #333",
							background: emb.endpoint.includes(":1234") ? "rgba(139,92,246,0.15)" : "transparent",
							color: emb.endpoint.includes(":1234") ? "#8b5cf6" : "#999",
							cursor: "pointer",
							fontWeight: emb.endpoint.includes(":1234") ? "600" : "400",
						}}
					>
						LM Studio
					</button>
					<button
						disabled={isLocked || !emb.enabled}
						onClick={() => updateEmbeddings("endpoint", "http://localhost:11434")}
						style={{
							flex: 1,
							padding: "6px 12px",
							borderRadius: "6px",
							border: emb.endpoint.includes(":11434") ? "1px solid #8b5cf6" : "1px solid #333",
							background: emb.endpoint.includes(":11434") ? "rgba(139,92,246,0.15)" : "transparent",
							color: emb.endpoint.includes(":11434") ? "#8b5cf6" : "#999",
							cursor: "pointer",
							fontWeight: emb.endpoint.includes(":11434") ? "600" : "400",
						}}
					>
						Ollama
					</button>
				</div>
			</div>

			<div className={styles.settingRow}>
				<label>Endpoint URL</label>
				<input
					type="text"
					value={emb.endpoint}
					disabled={isLocked || !emb.enabled}
					placeholder="LM Studio: http://localhost:1234/v1 | Ollama: http://localhost:11434"
					onChange={(e) => updateEmbeddings("endpoint", e.target.value)}
				/>
			</div>

			<div className={styles.settingRow}>
				<label>Embedding Model</label>
				<input
					type="text"
					value={emb.model}
					disabled={isLocked || !emb.enabled}
					placeholder="nomic-embed-text"
					onChange={(e) => updateEmbeddings("model", e.target.value)}
				/>
			</div>

			<div className={styles.settingRow}>
				<label>Vector Dimension</label>
				<input
					type="number"
					value={emb.dimension}
					disabled={isLocked || !emb.enabled}
					onChange={(e) => updateEmbeddings("dimension", parseInt(e.target.value) || 768)}
				/>
			</div>

			<div className={styles.settingRow}>
				<label>Chunk Size (tokens)</label>
				<input
					type="number"
					value={emb.chunkSize}
					disabled={isLocked || !emb.enabled}
					min={128}
					max={2048}
					onChange={(e) => updateEmbeddings("chunkSize", parseInt(e.target.value) || 500)}
				/>
			</div>

			<div className={styles.settingRow}>
				<label>Chunk Overlap (tokens)</label>
				<input
					type="number"
					value={emb.chunkOverlap}
					disabled={isLocked || !emb.enabled}
					min={0}
					max={200}
					onChange={(e) => updateEmbeddings("chunkOverlap", parseInt(e.target.value) || 50)}
				/>
			</div>

			<div className={styles.settingRow}>
				<label>Auto-index on chapter save</label>
				<input
					type="checkbox"
					checked={emb.autoIndexOnSave}
					disabled={isLocked || !emb.enabled}
					onChange={(e) => updateEmbeddings("autoIndexOnSave", e.target.checked)}
				/>
			</div>

			<div style={{ marginTop: "24px" }}>
				<div className={styles.settingsSectionLabel}>Index Status</div>

				<div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
					<button
						onClick={handleTestConnection}
						disabled={isLocked || !emb.enabled}
						style={{
							padding: "8px 16px",
							borderRadius: "8px",
							border: "1px solid #555",
							background: "#333",
							color: "#fff",
							cursor: "pointer",
						}}
					>
						Test Connection
					</button>
					<button
						onClick={handleRebuildIndex}
						disabled={isLocked || !emb.enabled || isIndexing}
						style={{
							padding: "8px 16px",
							borderRadius: "8px",
							border: "1px solid #555",
							background: "#333",
							color: "#fff",
							cursor: isIndexing ? "not-allowed" : "pointer",
							opacity: isIndexing ? 0.5 : 1,
						}}
					>
						{isIndexing ? "Indexing..." : "Rebuild Index"}
					</button>
				</div>

				{indexStatus && (
					<div style={{ marginBottom: "12px", fontSize: "13px", color: "#888" }}>
						Total indexed: {indexStatus.total} chunks
						{Object.entries(indexStatus.byType).map(([type, count]) => (
							<div key={type} style={{ marginLeft: "12px" }}>
								{type}: {count}
							</div>
						))}
					</div>
				)}

				{isIndexing && indexProgress && (
					<div style={{ marginBottom: "12px", fontSize: "13px", color: "#30d158" }}>
						{indexProgress}
					</div>
				)}
			</div>
		</div>
	);
}

export default function SettingsDialog({
	open,
	onClose,
	defaultRoute,
}: SettingsDialogProps) {
	const { loading } = useSettings();
	const [activeTab, setActiveTab] = useState(defaultRoute?.tab ?? "general");

	useEffect(() => {
		if (!open || !defaultRoute) return;
		if (defaultRoute.tab) setActiveTab(defaultRoute.tab);
		const timer = setTimeout(() => {
			if (defaultRoute.section) {
				const el = document.getElementById(
					`settings-section-${defaultRoute.section}`,
				);
				el?.scrollIntoView({ behavior: "smooth", block: "center" });
			}
			if (defaultRoute.focus) {
				const el = document.getElementById(
					`settings-focus-${defaultRoute.focus}`,
				);
				el?.focus();
				if (
					el instanceof HTMLInputElement ||
					el instanceof HTMLTextAreaElement
				) {
					el.select();
				}
			}
		}, 100);
		return () => clearTimeout(timer);
	}, [open, defaultRoute]);

	function handleBtnClick(tab: string) {
		setActiveTab(tab);
	}

	if (loading) {
		return (
			<Dialog open={open} onClose={onClose} title="Settings" large>
				<div className={styles.loading}>Loading settings...</div>
			</Dialog>
		);
	}

	const TABS = [
		{
			id: "general",
			label: "General",
			description: "General settings",
			component: GeneralTab,
		},
		{
			id: "appearance",
			label: "Appearance",
			description: "Appearance settings",
			component: AppearanceTab,
		},
		{
			id: "projects",
			label: "Projects",
			description: "Manage projects",
			component: ProjectsTab,
		},
		{
			id: "templates",
			icon: <IconFileText stroke={2} />,
			label: "Templates",
			description: "Manage global templates",
			component: TemplatesTab,
		},
		{
			id: "asset library",
			label: "Asset Library",
			description: "Manage assets",
			component: AssetLibraryTab,
		},
		{
			id: "providers",
			icon: <IconSparkles2 stroke={2} />,
			label: "Providers",
			description: "Manage providers",
			component: ProvidersTab,
		},
		{
			id: "embeddings",
			icon: <IconDatabase stroke={2} />,
			label: "Context Engine",
			description: "Configure RAG and embeddings",
			component: EmbeddingsTab,
		},
		{
			id: "quota",
			icon: <IconChartBar stroke={2} />,
			label: "Quota & Usage",
			description: "Monitor and control API usage",
			component: QuotaTab,
		},
		{
			id: "storage",
			label: "Storage",
			description: "Manage storage",
			component: StorageTab,
		},
		{
			id: "about",
			label: "About",
			description: "About this app",
			component: AboutTab,
		},
	];

	return (
		<Dialog
			open={open}
			onClose={onClose}
			title="Settings"
			large
			id="settingsDialog"
		>
			<div className={styles.dialogContent}>
				<div className={styles.sideBar}>
					{/*
						<div className="sideBar-header">
							<h2>Settings</h2>
						</div>
					*/}
					{TABS.map((tab) => (
						<button
							onClick={() => handleBtnClick(tab.id)}
							className={activeTab === tab.id ? styles.active : ""}
							key={tab.id}
						>
							{tab.icon}
							{tab.label}
						</button>
					))}
					<div className={styles.sideBarContent}></div>
				</div>
				<div className={styles.tabPanel}>
					<div className={styles.tabPanelHeader}>
						<h3>{TABS.find((tab) => tab.id === activeTab)?.label}</h3>
						<p>{TABS.find((tab) => tab.id === activeTab)?.description}</p>
					</div>
					{activeTab === "general" && <GeneralTab />}
					{activeTab === "appearance" && <AppearanceTab />}
					{activeTab === "projects" && <ProjectsTab />}
					{activeTab === "templates" && <TemplatesTab />}
					{activeTab === "asset library" && <AssetLibraryTab />}
				{activeTab === "providers" && <ProvidersTab />}
				{activeTab === "embeddings" && <EmbeddingsTab />}
				{activeTab === "quota" && <QuotaTab />}
				{activeTab === "storage" && <StorageTab />}
				{activeTab === "about" && <AboutTab />}
				</div>
			</div>
		</Dialog>
	);
}
