import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';

import { useT } from '../i18n/useLang';
import { SendIcon } from './Icons';

interface ComposerProps {
  onSend: (text: string) => void;
  sending: boolean;
  maxMessageChars: number;
}

const MAX_TEXTAREA_HEIGHT = 200;
const COUNTER_VISIBLE_RATIO = 0.75;

export function Composer({ onSend, sending, maxMessageChars }: ComposerProps) {
  const t = useT();
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const hasSentRef = useRef(false);

  const used = value.trim().length;
  const tooLong = used > maxMessageChars;
  const canSend = used > 0 && !tooLong && !sending;

  // Grow with content, up to a cap, then scroll inside the textarea.
  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [value]);

  // Give focus back after a reply lands, but never steal it on first paint.
  useEffect(() => {
    if (!sending && hasSentRef.current) textareaRef.current?.focus();
  }, [sending]);

  const submit = useCallback(() => {
    if (!canSend) return;
    hasSentRef.current = true;
    onSend(value);
    setValue('');
  }, [canSend, onSend, value]);

  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      submit();
    },
    [submit],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== 'Enter' || event.shiftKey) return;
      // Respect IME composition (e.g. for Cyrillic/Uzbek input methods).
      if (event.nativeEvent.isComposing) return;
      event.preventDefault();
      submit();
    },
    [submit],
  );

  const showCounter = used > maxMessageChars * COUNTER_VISIBLE_RATIO;

  return (
    <form className="composer" onSubmit={onSubmit}>
      <label className="sr-only" htmlFor="composer-input">
        {t('chat.placeholder')}
      </label>
      <textarea
        id="composer-input"
        ref={textareaRef}
        className="composer-textarea"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t('chat.placeholder')}
        rows={1}
        aria-describedby="composer-hint"
        aria-invalid={tooLong}
        enterKeyHint="send"
        autoComplete="off"
      />

      <div className="composer-bar">
        <p className="composer-hint" id="composer-hint">
          {t('composer.hint')}
        </p>
        <div className="composer-actions">
          {showCounter ? (
            <span className={tooLong ? 'composer-count is-over' : 'composer-count'} aria-live="polite">
              {used}/{maxMessageChars}
            </span>
          ) : null}
          <button
            type="submit"
            className="send-button"
            disabled={!canSend}
            aria-label={sending ? t('chat.sending') : t('chat.send')}
          >
            {sending ? <span className="spinner" aria-hidden="true" /> : <SendIcon size={17} />}
          </button>
        </div>
      </div>
    </form>
  );
}
