/**
 * Embeddable AI chat widget loader.
 *
 * Usage on the company website (paste before </body>):
 *   <script src="https://YOUR-DEPLOYED-DOMAIN/widget.js" async></script>
 *
 * Optional data attributes:
 *   data-widget-id   Public widget id (also fetched from /api/widget)
 *   data-position    "right" (default) or "left"
 *   data-lang        Initial language: uz | en | ru
 *
 * Design notes:
 *  - No React on the host page: this file is plain ES5-ish JS and the actual
 *    chat runs inside an iframe, so the host's CSS/JS cannot interfere.
 *  - All our styles live in a Shadow DOM, so nothing leaks into the host page.
 *  - The iframe is only created on first open and is then kept mounted, so the
 *    conversation survives closing and reopening the panel.
 */
(function () {
  'use strict';

  if (window.__companyChatWidgetLoaded) return;
  window.__companyChatWidgetLoaded = true;

  var script = document.currentScript;
  if (!script) return;

  var base;
  try {
    base = new URL(script.src).origin;
  } catch (error) {
    return;
  }

  var widgetId = script.getAttribute('data-widget-id') || '';
  var langAttr = (script.getAttribute('data-lang') || '').toLowerCase();
  var lang = langAttr === 'uz' || langAttr === 'en' || langAttr === 'ru' ? langAttr : '';

  var state = {
    open: false,
    mounted: false,
    config: {
      companyName: 'Assistant',
      accentColor: '#4f7cff',
      position: script.getAttribute('data-position') === 'left' ? 'left' : 'right',
    },
  };

  var host = document.createElement('div');
  host.setAttribute('data-company-chat-widget', '');
  host.style.cssText = 'position:fixed;z-index:2147483000;inset:auto 0 0 auto;width:0;height:0;';
  var shadow = host.attachShadow ? host.attachShadow({ mode: 'open' }) : null;
  var root = shadow || host;

  var style = document.createElement('style');
  style.textContent = [
    ':host{all:initial}',
    '*,*::before,*::after{box-sizing:border-box}',
    '.root{--accent:#4f7cff;--panel-w:380px;--panel-h:min(620px,calc(100vh - 104px));',
    '  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;',
    '  font-size:15px;line-height:1.5}',
    '@supports (height:100dvh){.root{--panel-h:min(620px,calc(100dvh - 104px))}}',
    '.launcher{position:fixed;bottom:20px;right:20px;width:56px;height:56px;border:0;border-radius:50%;',
    '  background:var(--accent);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;',
    '  box-shadow:0 10px 30px -8px rgba(15,23,42,.45),0 2px 6px rgba(15,23,42,.2);',
    '  transition:transform .18s cubic-bezier(.22,1,.36,1),box-shadow .18s ease;padding:0}',
    '.launcher:hover{transform:translateY(-2px);box-shadow:0 14px 34px -8px rgba(15,23,42,.5)}',
    '.launcher:active{transform:scale(.96)}',
    '.launcher:focus-visible{outline:3px solid rgba(79,124,255,.5);outline-offset:3px}',
    '.launcher svg{width:26px;height:26px}',
    '.left .launcher{left:20px;right:auto}',
    '.panel{position:fixed;bottom:88px;right:20px;width:var(--panel-w);height:var(--panel-h);',
    '  background:#fff;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;',
    '  box-shadow:0 24px 60px -24px rgba(15,23,42,.5),0 4px 14px rgba(15,23,42,.12);',
    '  border:1px solid rgba(15,23,42,.1);opacity:0;transform:translateY(12px) scale(.98);',
    '  pointer-events:none;transition:opacity .2s ease,transform .2s cubic-bezier(.22,1,.36,1)}',
    '.left .panel{left:20px;right:auto}',
    '.panel.open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}',
    '.panel[hidden]{display:none}',
    '.frame{width:100%;height:100%;border:0;display:block;background:#fff}',
    '.status{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;',
    '  padding:24px;text-align:center;color:#475569;font-size:14px;background:#fff}',
    '.status[hidden]{display:none}',
    '@media (max-width:480px){',
    '  .panel{right:12px;left:12px;width:auto;bottom:84px;--panel-h:min(620px,calc(100vh - 96px))}',
    '  .left .panel{left:12px;right:12px}',
    '  .launcher{right:16px;bottom:16px;width:52px;height:52px}',
    '  .left .launcher{left:16px;right:auto}',
    '}',
    '@media (prefers-reduced-motion:reduce){',
    '  .launcher,.panel{transition:none !important}',
    '}',
  ].join('');

  var reduc = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var wrapper = document.createElement('div');
  wrapper.className = 'root ' + state.config.position;

  var launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'launcher';
  launcher.setAttribute('aria-label', 'Open chat');
  launcher.setAttribute('aria-expanded', 'false');
  launcher.setAttribute('aria-controls', 'company-chat-panel');
  launcher.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.4H8l-4 3.1.9-3.6A8.4 8.4 0 1 1 21 11.5Z"/></svg>';

  var panel = document.createElement('div');
  panel.className = 'panel';
  panel.id = 'company-chat-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Chat with support');
  panel.hidden = true;

  var status = document.createElement('div');
  status.className = 'status';
  status.textContent = 'Loading chat…';

  panel.appendChild(status);

  wrapper.appendChild(panel);
  wrapper.appendChild(launcher);
  root.appendChild(style);
  root.appendChild(wrapper);

  if (!document.body) {
    document.addEventListener('DOMContentLoaded', function () {
      document.body.appendChild(host);
    });
  } else {
    document.body.appendChild(host);
  }

  function applyBranding() {
    wrapper.style.setProperty('--accent', state.config.accentColor);
    launcher.setAttribute('aria-label', 'Open chat with ' + state.config.companyName);
    panel.setAttribute('aria-label', 'Chat with ' + state.config.companyName);
    if (state.config.position === 'left') {
      wrapper.classList.add('left');
    } else {
      wrapper.classList.remove('left');
    }
  }

  /** Branding is optional: a failure here must not block the widget. */
  function loadBranding() {
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (controller) controller.abort();
    }, 4000);

    fetch(base + '/api/widget', controller ? { signal: controller.signal } : {})
      .then(function (response) {
        return response.ok ? response.json() : null;
      })
      .then(function (config) {
        if (!config) return;
        if (typeof config.accentColor === 'string' && /^#[0-9a-f]{6}$/i.test(config.accentColor)) {
          state.config.accentColor = config.accentColor;
        }
        if (typeof config.companyName === 'string' && config.companyName) {
          state.config.companyName = config.companyName;
        }
        if (config.position === 'left' || config.position === 'right') {
          if (!script.getAttribute('data-position')) state.config.position = config.position;
        }
        if (typeof config.widgetId === 'string' && !widgetId) widgetId = config.widgetId;
        applyBranding();
      })
      .catch(function () {
        /* keep defaults */
      })
      .then(function () {
        clearTimeout(timer);
      });
  }

  function buildFrame() {
    var frame = document.createElement('iframe');
    frame.className = 'frame';
    frame.title = 'Chat with ' + state.config.companyName;
    frame.setAttribute('allow', 'clipboard-write');
    frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');

    var params = [];
    try {
      params.push('parentOrigin=' + encodeURIComponent(window.location.origin));
    } catch (error) {
      /* opaque origin */
    }
    if (widgetId) params.push('widgetId=' + encodeURIComponent(widgetId));
    if (lang) params.push('lang=' + encodeURIComponent(lang));
    frame.src = base + '/embed' + (params.length ? '?' + params.join('&') : '');

    frame.addEventListener('load', function () {
      status.hidden = true;
    });
    frame.addEventListener('error', function () {
      status.hidden = false;
      status.textContent = 'The chat could not be loaded. Please try again later.';
    });

    state.mounted = true;
    return frame;
  }

  function open() {
    if (state.open) return;
    state.open = true;

    if (!state.mounted) {
      var frame = buildFrame();
      panel.insertBefore(frame, status);
      state.frame = frame;
    }

    panel.hidden = false;
    // Force a frame so the transition runs instead of jumping.
    void panel.offsetHeight;
    panel.classList.add('open');
    launcher.setAttribute('aria-expanded', 'true');
    launcher.setAttribute('aria-label', 'Close chat');

    var focusTarget = state.frame;
    if (focusTarget && focusTarget.focus) {
      try {
        focusTarget.focus();
      } catch (error) {
        /* ignore */
      }
    }
    if (!reduc) return;
  }

  function close() {
    if (!state.open) return;
    state.open = false;
    panel.classList.remove('open');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.setAttribute('aria-label', 'Open chat with ' + state.config.companyName);
    launcher.focus();
    var delay = reduc ? 0 : 200;
    setTimeout(function () {
      if (!state.open) panel.hidden = true;
    }, delay);
  }

  launcher.addEventListener('click', function () {
    if (state.open) close();
    else open();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && state.open) close();
  });

  window.addEventListener('message', function (event) {
    if (event.origin !== base) return;
    if (!state.frame || event.source !== state.frame.contentWindow) return;
    var data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'chatbot:close') close();
    if (data.type === 'chatbot:ready') status.hidden = true;
  });

  applyBranding();
  loadBranding();
})();
