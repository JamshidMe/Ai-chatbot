import { useT } from '../i18n/useLang';
import { SparkIcon } from './Icons';

/**
 * Loading state shown while the assistant reply is in flight.
 *
 * A visible label accompanies the dots so the state is understandable without
 * relying on the animation alone; the dots are hidden from screen readers.
 */
export function TypingIndicator() {
  const t = useT();

  return (
    <div className="msg msg-assistant typing-row" role="status" aria-live="polite">
      <div className="msg-avatar" aria-hidden="true">
        <SparkIcon size={14} />
      </div>
      <div className="msg-body">
        <div className="typing-capsule">
          <span className="typing-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="typing-label">{t('message.thinking')}</span>
        </div>
      </div>
    </div>
  );
}
