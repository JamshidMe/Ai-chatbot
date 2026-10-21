import { useT } from '../i18n/useLang';
import { LogoMark, SparkIcon } from './Icons';

interface WelcomeScreenProps {
  onPickSuggestion: (prompt: string) => void;
  disabled: boolean;
}

export function WelcomeScreen({ onPickSuggestion, disabled }: WelcomeScreenProps) {
  const t = useT();

  const suggestions = [
    t('suggestions.s1'),
    t('suggestions.s2'),
    t('suggestions.s3'),
    t('suggestions.s4'),
  ];

  return (
    <div className="welcome">
      <header className="welcome-head">
        <LogoMark size={46} />
        <h1 className="welcome-title">{t('welcome.heading')}</h1>
        <p className="welcome-body">{t('welcome.body')}</p>
      </header>

      <section className="suggestions" aria-labelledby="suggestions-label">
        <h2 id="suggestions-label" className="suggestions-label">
          {t('suggestions.label')}
        </h2>
        <ul className="suggestion-grid">
          {suggestions.map((prompt) => (
            <li key={prompt}>
              <button
                type="button"
                className="suggestion"
                onClick={() => onPickSuggestion(prompt)}
                disabled={disabled}
              >
                <span className="suggestion-icon" aria-hidden="true">
                  <SparkIcon size={14} />
                </span>
                <span>{prompt}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
