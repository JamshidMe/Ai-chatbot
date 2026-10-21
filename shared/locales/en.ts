/**
 * English dictionary. This file is the authoritative shape:
 * `LocaleShape = typeof en`, so uz.ts / ru.ts fail to compile if a key is
 * missing, misspelled, or has a non-string leaf.
 */
export const en = {
  meta: {
    code: 'en',
    name: 'English',
    dir: 'ltr',
  },
  app: {
    title: 'Multilingual AI Assistant',
    subtitle: 'Uzbek · English · Russian',
    tagline: 'Replies in the language you write in.',
  },
  lang: {
    label: 'Language',
    uz: 'Uzbek',
    en: 'English',
    ru: 'Russian',
  },
  nav: {
    newChat: 'New chat',
    conversations: 'Conversations',
    collapse: 'Collapse sidebar',
    expand: 'Expand sidebar',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    delete: 'Delete conversation',
    deleteConfirm: 'Delete this conversation?',
    deleteYes: 'Delete',
    deleteNo: 'Cancel',
    empty: 'No conversations yet',
    localNote: 'Saved in this browser',
  },
  welcome: {
    heading: 'How can I help you today?',
    body: 'Ask anything in Uzbek, English, or Russian. Replies come back in the language you write in.',
  },
  suggestions: {
    label: 'Try asking',
    s1: 'Explain a complex topic in simple terms',
    s2: 'Help me improve my CV summary',
    s3: 'Draft a polite email to a client',
    s4: 'Write a SQL query and explain it',
  },
  chat: {
    heading: 'Conversation',
    placeholder: 'Type your message…',
    send: 'Send',
    sending: 'Sending…',
    clear: 'Clear chat',
    you: 'You',
    assistant: 'Assistant',
    empty: 'No messages yet. Say hello to get started.',
    hintChars: 'Up to {max} characters per message',
    historyNote: 'Only the last {max} messages are sent as context.',
  },
  message: {
    copy: 'Copy',
    copied: 'Copied',
    retry: 'Try again',
    thinking: 'Thinking…',
  },
  composer: {
    hint: 'Enter to send · Shift+Enter for a new line',
  },
  provider: {
    live: 'Live',
  },
  assistant: {
    refusal:
      'Sorry, I can only help with verified information about the company’s products and services. No reliable information was found for this question. Please contact the company directly.',
    groundedNotice: 'Answers come only from the company’s verified information.',
    demoNotice: 'Sample data — this assistant is not yet connected to real company data.',
  },
  mock: {
    badge: 'Mock provider',
    notice: 'Mock mode is active: no AI model is called and no API cost is incurred.',
    reply:
      'Mock reply ({lang} locale) — the full UI and API work without any API cost. You said: "{message}"',
  },
  errors: {
    emptyMessage: 'Message must not be empty.',
    tooLong: 'Message is too long (maximum {max} characters).',
    invalidRequest: 'The request payload is invalid.',
    unsupportedLanguage: 'Unsupported language. Supported: uz, en, ru.',
    providerUnavailable: 'The AI provider is not configured yet.',
    providerFailed: 'The AI provider failed to respond.',
    serverError: 'Unexpected server error.',
    networkError: 'Cannot reach the API server.',
    timeout: 'The request took too long. Please try again.',
    malformedResponse: 'The server sent a response that could not be read.',
    rateLimited: 'Too many requests. Please try again in {seconds}s.',
    invalidWidget: 'This widget identifier is not recognised.',
    originNotAllowed: 'This website is not allowed to use the assistant.',
    payloadTooLarge: 'Request body is too large.',
  },
  health: {
    label: 'Server',
    ok: 'online',
    offline: 'offline',
    provider: 'Provider',
    model: 'Model',
    languages: 'Languages',
  },
};

export type LocaleShape = typeof en;
