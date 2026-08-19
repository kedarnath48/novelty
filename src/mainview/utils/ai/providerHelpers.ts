export type ProviderType =
    'lm-studio' | 'openai' | 'anthropic' | 'ollama' | 'custom';

interface ProviderConfig {
    label: string;
    url?: string;
    port?: string;
    endpointPath: string;
}

export const AI_PROVIDERS: Record<ProviderType, ProviderConfig> = {
    'lm-studio': { label: 'LM Studio', endpointPath: '/v1' },
    openai: { label: 'OpenAI', endpointPath: '/v1' },
    anthropic: { label: 'Anthropic', endpointPath: '/v1/messages' },
    ollama: { label: 'Ollama', endpointPath: '/v1' },
    custom: { label: 'Custom', endpointPath: '' },
};

export const getEndpointPath = (type: ProviderType): string =>
    AI_PROVIDERS[type]?.endpointPath ?? '';

export const typeOptions = (Object.keys(AI_PROVIDERS) as ProviderType[]).map(
    (key) => ({
        value: key,
        label: AI_PROVIDERS[key].label,
    })
);
