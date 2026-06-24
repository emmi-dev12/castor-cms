import { env } from '../config/env.js';
import { loadSettings } from '../config/settings.js';

export type Provider = 'anthropic' | 'openrouter';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  text: string;
  provider: Provider;
}

async function callAnthropic(messages: LLMMessage[], apiKey: string): Promise<string> {
  const system = messages.find((m) => m.role === 'system')?.content ?? '';
  const userMessages = messages.filter((m) => m.role !== 'system');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system,
      messages: userMessages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${err}`);
  }

  const data = await response.json() as { content: Array<{ type: string; text: string }> };
  return data.content.find((b) => b.type === 'text')?.text ?? '';
}

async function callOpenRouter(messages: LLMMessage[], apiKey: string): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://castor.local',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4-6',
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${err}`);
  }

  const data = await response.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices[0]?.message?.content ?? '';
}

export async function callLLM(messages: LLMMessage[]): Promise<LLMResponse> {
  const settings = loadSettings();
  const anthropicKey = settings.anthropicApiKey || env.ANTHROPIC_API_KEY;
  const openrouterKey = settings.openrouterApiKey || env.OPENROUTER_API_KEY;
  const preferredProvider = settings.aiProvider;

  if (preferredProvider === 'openrouter' && openrouterKey) {
    return { text: await callOpenRouter(messages, openrouterKey), provider: 'openrouter' };
  }
  if (preferredProvider === 'anthropic' && anthropicKey) {
    return { text: await callAnthropic(messages, anthropicKey), provider: 'anthropic' };
  }
  // Fallback: whichever key is available
  if (anthropicKey) {
    return { text: await callAnthropic(messages, anthropicKey), provider: 'anthropic' };
  }
  if (openrouterKey) {
    return { text: await callOpenRouter(messages, openrouterKey), provider: 'openrouter' };
  }
  throw new Error('No AI provider configured. Add an API key in Settings.');
}
