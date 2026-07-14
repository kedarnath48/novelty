import type { ProviderConfig } from "../types/index";

export interface ApiMessage {
	role: string;
	content: string;
}

export interface UserChatMessage {
	id: string;
	role: "user";
	content: string;
	mode: "assistant" | "editor";
	timestamp: string;
}

export interface AssistantChatMessage {
	id: string;
	role: "assistant";
	content: string[];
	currentVariantIndex: number;
	model: string;
	mode: "assistant" | "editor";
	timestamp: string;
}

export type ChatMessage = UserChatMessage | AssistantChatMessage;

export function toApiMessages(messages: ChatMessage[]): ApiMessage[] {
	return messages.map((m) => ({
		role: m.role,
		content: m.role === "assistant" ? m.content[m.currentVariantIndex] : m.content,
	}));
}

export interface ChatCompletionRequest {
	model: string;
	messages: ApiMessage[];
	temperature?: number;
	max_tokens?: number;
	stream?: boolean;
}

export interface ChatCompletionResponse {
	id: string;
	object: string;
	created: number;
	model: string;
	choices: {
		index: number;
		message: { role: string; content: string };
		finish_reason: string;
	}[];
	usage?: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
}

export interface AICompletionOptions {
	provider: ProviderConfig;
	messages: ChatMessage[];
	systemPrompt?: string;
	temperature?: number;
	maxTokens?: number;
	onChunk?: (chunk: string) => void;
}

export interface ChatCompletionResult {
	content: string;
	usage: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	} | null;
}

export async function chatCompletion(
	endpoint: string,
	options: AICompletionOptions,
): Promise<ChatCompletionResult> {
	const { messages, temperature = 0.7, maxTokens = 2048, onChunk, systemPrompt } = options;

	const model = options.provider.models
		? Object.entries(options.provider.models).find(([, v]) =>
				typeof v === "boolean" ? v : v.enabled,
		  )?.[0] || "local-model"
		: "local-model";

	const apiMessages = toApiMessages(messages);
	if (systemPrompt) {
		apiMessages.unshift({ role: "system", content: systemPrompt });
	}

	const request: ChatCompletionRequest = {
		model,
		messages: apiMessages,
		temperature,
		max_tokens: maxTokens,
		stream: !!onChunk,
	};

	const response = await fetch(`${endpoint}/chat/completions`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(request),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`AI request failed: ${response.status} ${error}`);
	}

	if (onChunk && response.body) {
		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let fullContent = "";
		let usage: ChatCompletionResult["usage"] = null;

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			const chunk = decoder.decode(value);
			const lines = chunk.split("\n").filter((line) => line.trim() !== "");

			for (const line of lines) {
				if (line.startsWith("data: ")) {
					const data = line.slice(6);
					if (data === "[DONE]") continue;

					try {
						const parsed = JSON.parse(data);
						if (parsed.usage) {
							usage = {
								prompt_tokens: parsed.usage.prompt_tokens ?? 0,
								completion_tokens: parsed.usage.completion_tokens ?? 0,
								total_tokens: parsed.usage.total_tokens ?? 0,
							};
						}
						const content = parsed.choices?.[0]?.delta?.content || "";
						fullContent += content;
						onChunk(content);
					} catch {
						// Skip invalid JSON
					}
				}
			}
		}

		return { content: fullContent, usage };
	}

	const result: ChatCompletionResponse = await response.json();
	return {
		content: result.choices[0]?.message?.content || "",
		usage: result.usage ?? null,
	};
}

export async function generateCompletion(
	endpoint: string,
	model: string,
	prompt: string,
	options?: {
		temperature?: number;
		maxTokens?: number;
	},
): Promise<ChatCompletionResult> {
	const msg: UserChatMessage = {
		id: crypto.randomUUID(),
		role: "user",
		content: prompt,
		mode: "assistant",
		timestamp: new Date().toISOString(),
	};
	return chatCompletion(endpoint, {
		provider: { type: "lm-studio", endpoint, models: { [model]: { enabled: true } }, enabled: true },
		messages: [msg],
		temperature: options?.temperature,
		maxTokens: options?.maxTokens,
	});
}

export async function streamCompletion(
	endpoint: string,
	model: string,
	prompt: string,
	onChunk: (chunk: string) => void,
	options?: {
		temperature?: number;
		maxTokens?: number;
	},
): Promise<ChatCompletionResult> {
	const msg: UserChatMessage = {
		id: crypto.randomUUID(),
		role: "user",
		content: prompt,
		mode: "assistant",
		timestamp: new Date().toISOString(),
	};
	return chatCompletion(endpoint, {
		provider: { type: "lm-studio", endpoint, models: { [model]: { enabled: true } }, enabled: true },
		messages: [msg],
		temperature: options?.temperature,
		maxTokens: options?.maxTokens,
		onChunk,
	});
}

export async function checkLMStudioConnection(
	endpoint: string = "http://localhost:1234",
): Promise<boolean> {
	try {
		const response = await fetch(`${endpoint}/models`);
		return response.ok;
	} catch {
		return false;
	}
}

export async function getLMStudioModels(
	endpoint: string = "http://localhost:1234",
): Promise<string[]> {
	try {
		const response = await fetch(`${endpoint}/models`);
		if (!response.ok) return [];

		const data = await response.json();
		return data.data?.map((m: { id: string }) => m.id) || [];
	} catch {
		return [];
	}
}