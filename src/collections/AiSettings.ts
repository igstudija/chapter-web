import type { CollectionConfig } from 'payload'
import { DEFAULT_AI_SYSTEM_PROMPT } from '../lib/aiDefaults'

/**
 * Hide collection for non-superadmin users
 * Uses isSuperadmin flag (always in JWT via saveToJWT) instead of adminHostname
 * which may not be available due to JWT generation timing
 */
const hideForNonSuperadmin = ({ user }: { user: any }): boolean => {
  return user?.isSuperadmin !== true
}

export const AiSettings: CollectionConfig = {
  slug: 'ai-settings',
  labels: {
    singular: 'AI Settings',
    plural: 'AI Settings',
  },
  admin: {
    useAsTitle: 'label',
    group: 'System',
    description: 'Configure AI chatbot settings (OpenAI API key, model, system prompt)',
    hidden: hideForNonSuperadmin,
  },
  access: {
    read: ({ req: { user } }) => user?.isSuperadmin === true,
    create: ({ req: { user } }) => user?.isSuperadmin === true,
    update: ({ req: { user } }) => user?.isSuperadmin === true,
    delete: ({ req: { user } }) => user?.isSuperadmin === true,
  },
  fields: [
    {
      name: 'label',
      type: 'text',
      defaultValue: 'Default AI Configuration',
      required: true,
      admin: {
        description: 'Internal label for this configuration',
      },
    },
    {
      name: 'enabled',
      type: 'checkbox',
      defaultValue: false,
      label: 'Enable AI Chatbot',
      admin: {
        description: 'Master switch to enable/disable the AI chatbot across all sites',
      },
    },
    {
      name: 'openaiApiKey',
      type: 'text',
      required: true,
      admin: {
        description: 'OpenAI API key (stored in database, never exposed to client)',
      },
    },
    {
      name: 'perplexityApiKey',
      type: 'text',
      admin: {
        description: 'Perplexity API key for Top40 business tag generation',
      },
    },
    {
      name: 'perplexityModel',
      type: 'select',
      defaultValue: 'sonar-pro',
      options: [
        { label: 'Sonar Pro (~$0.01/uzņēmums)', value: 'sonar-pro' },
        { label: 'Sonar (~$0.001/uzņēmums)', value: 'sonar' },
      ],
      admin: {
        description: 'Perplexity model for tag generation',
      },
    },
    {
      name: 'model',
      type: 'select',
      defaultValue: 'gpt-4o-mini',
      required: true,
      options: [
        { label: 'GPT-4.1 Nano ($0.10/$0.40)', value: 'gpt-4.1-nano' },
        { label: 'GPT-4o Mini ($0.15/$0.60)', value: 'gpt-4o-mini' },
        { label: 'GPT-4.1 Mini ($0.40/$1.60)', value: 'gpt-4.1-mini' },
        { label: 'o3-mini ($1.10/$4.40)', value: 'o3-mini' },
        { label: 'o4-mini ($1.10/$4.40)', value: 'o4-mini' },
        { label: 'GPT-5 ($1.25/$10)', value: 'gpt-5' },
        { label: 'o3 ($2/$8)', value: 'o3' },
        { label: 'GPT-4.1 ($2/$8)', value: 'gpt-4.1' },
        { label: 'GPT-4o ($2.50/$10)', value: 'gpt-4o' },
      ],
      admin: {
        description: 'Default OpenAI model for chat (price: input/output per 1M tokens)',
      },
    },
    {
      name: 'systemPrompt',
      type: 'textarea',
      required: true,
      defaultValue: DEFAULT_AI_SYSTEM_PROMPT,
      admin: {
        description: 'System prompt defining the assistant behaviour and which topics it will answer',
        rows: 8,
      },
    },
    {
      name: 'maxTokens',
      type: 'number',
      defaultValue: 1024,
      required: true,
      min: 100,
      max: 4096,
      admin: {
        description: 'Maximum tokens in AI response (100-4096)',
      },
    },
    {
      name: 'temperature',
      type: 'number',
      defaultValue: 0.7,
      required: true,
      min: 0,
      max: 2,
      admin: {
        description: 'Response creativity (0 = deterministic, 2 = very creative). Recommended: 0.7',
        step: 0.1,
      },
    },
    {
      name: 'defaultAiCreditUsd',
      type: 'number',
      defaultValue: 10,
      required: true,
      min: 0,
      max: 1000,
      admin: {
        description:
          'Default AI credit balance in USD for members (e.g., 10.00 = $10). Set on each site-membership manually.',
        step: 0.01,
      },
    },
  ],
}
