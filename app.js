// app.js

// ─── State ──────────────────────────────────────────────────────────────────
window._originalText = '';
window._simplifiedText = '';
let currentTab = 'original';
let selectedLang = 'hi-IN';
let dyslexicMode = false;

// ─── PDF.js Setup ───────────────────────────────────────────────────────────
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ─── Sample Text ────────────────────────────────────────────────────────────
const SAMPLE_TEXT = `Photosynthesis is a process used by plants and other organisms to convert light energy into chemical energy that, through cellular respiration, can later be released to fuel the organism's activities. In most cases, the oxygen released as a by-product of photosynthesis is required by most living organisms for cellular respiration, including photosynthetic organisms themselves. Chlorophyll, the green pigment found in chloroplasts, absorbs sunlight and converts it into glucose and oxygen through a series of complex biochemical reactions involving the light-dependent and light-independent Calvin cycle reactions. This fundamental biological process is responsible for producing and maintaining the oxygen content of the Earth's atmosphere, and supplies most of the energy necessary for life on Earth.`;

// ─── Languages ──────────────────────────────────────────────────────────────
const LANGUAGES = [
  { code: 'en-IN', label: 'English', short: 'EN' },
  { code: 'hi-IN', label: 'Hindi', short: 'HI' },
  { code: 'ta-IN', label: 'Tamil', short: 'TA' },
  { code: 'te-IN', label: 'Telugu', short: 'TE' },
  { code: 'kn-IN', label: 'Kannada', short: 'KN' },
  { code: 'ml-IN', label: 'Malayalam', short: 'ML' },
];

function renderLanguageButtons() {
  const container = document.getElementById('language-buttons');
  container.innerHTML = LANGUAGES.map(lang => `
    <button class="lang-btn ${lang.code === selectedLang ? 'selected' : ''}"
      onclick="selectLang('${lang.code}')"
      title="${lang.label}">
      ${lang.short}
    </button>
  `).join('');
}

function selectLang(code) {
  selectedLang = code;
  renderLanguageButtons();
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    const text = document.getElementById('output-text').innerText;
    speakText(text, code);
  }
}

window.speechSynthesis.onvoiceschanged = renderLanguageButtons;

// ─── Input Handling ─────────────────────────────────────────────────────────
document.getElementById('load-sample').addEventListener('click', () => {
  setOutputText(SAMPLE_TEXT);
  generateQuiz();
});

document.getElementById('pdf-upload').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  showLoading('pdf');
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    if (pdf.numPages > 20) {
      showToast('PDF has 20+ pages — loading first 10 only', 'warning');
    }
    let fullText = '';
    for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) { // cap at 10 pages
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map(item => item.str).join(' ') + '\n\n';
    }
    setOutputText(fullText.trim());
  } catch (err) {
    showToast('Could not read PDF. Try copying the text instead.', 'error');
  }
  hideLoading();
});

function loadPastedText() {
  const text = document.getElementById('text-input').value.trim();
  if (!text) {
    showToast('Please paste some text or upload a PDF first', 'error');
    return;
  }
  setOutputText(text);
  document.getElementById('text-input').value = '';
}

// ─── Output Management ───────────────────────────────────────────────────────
function setOutputText(text) {
  document.getElementById('empty-state').style.display = 'none';
  window._originalText = text;
  window._simplifiedText = '';

  const el = document.getElementById('output-text');
  el.classList.add('loading-text');
  setTimeout(() => {
    // Wrap paragraphs with <p> to make focus mode work better
    el.innerHTML = text.split('\n\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('');
    if (text.split('\n\n').filter(p => p.trim()).length <= 1) {
      el.innerText = text;
    }
    el.classList.remove('loading-text');
  }, 150);

  updateReadabilityBadge(text, false);
  showTab('original');
  document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
}

function showTab(tab) {
  currentTab = tab;
  document.getElementById('tab-original').classList.toggle('active', tab === 'original');
  document.getElementById('tab-simplified').classList.toggle('active', tab === 'simplified');

  if (tab === 'simplified') {
    const badge = document.getElementById('new-badge');
    if (badge) badge.classList.add('hidden');
  }

  const text = tab === 'original'
    ? window._originalText
    : (window._simplifiedText || 'Press a simplify level on the left first.');

  if (tab === 'original' && document.getElementById('output-text').innerHTML.includes('class="word"')) {
    // Re-render words if they were inside TTS spans
    speakText(window._originalText, selectedLang, true); // true = just render spans, don't speak
  } else {
    document.getElementById('output-text').innerHTML = text.split('\n\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('');
    if (text.split('\n\n').filter(p => p.trim()).length <= 1) {
      document.getElementById('output-text').innerText = text;
    }
  }
}

// ─── Dyslexia Mode ──────────────────────────────────────────────────────────
function toggleDyslexicMode() {
  dyslexicMode = !dyslexicMode;
  document.body.classList.toggle('dyslexic-mode', dyslexicMode);
  const btn = document.getElementById('dyslexia-toggle');
  btn.textContent = dyslexicMode ? '✓ Dyslexia Mode ON' : 'Dyslexia Mode';
  btn.classList.toggle('active', dyslexicMode);
}

// Fixed speakText to optionally just render
function speakText(text, langCode, noSpeak = false) {
  window.speechSynthesis.cancel();



  const words = text.split(/(\s+)/);
  const container = document.getElementById('output-text');
  let wordIndex = 0;

  container.innerHTML = words.map((part, i) =>
    part.trim()
      ? `<span class="word" id="word-${wordIndex++}">${part}</span>`
      : part
  ).join('');

  if (noSpeak) return;

  document.getElementById('listen-btn').classList.toggle('playing', true);

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = langCode;
  utterance.rate = 0.85;
  utterance.pitch = 1.0;

  let highlightIndex = 0;
  utterance.onboundary = (event) => {
    if (event.name === 'word') {
      document.querySelectorAll('.word.active').forEach(el => el.classList.remove('active'));
      const el = document.getElementById(`word-${highlightIndex}`);
      if (el) {
        el.classList.add('active');
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      highlightIndex++;
    }
  };

  utterance.onend = () => {
    document.getElementById('listen-btn').classList.toggle('playing', false);
    document.querySelectorAll('.word.active').forEach(el => el.classList.remove('active'));
    document.getElementById('listen-btn').textContent = '▶ Listen';
    // Show quiz after listening
    if (window._originalText) generateQuiz();
  };

  utterance.onerror = () => {
    showToast(`${LANGUAGES.find(l => l.code === langCode)?.label || 'Selected'} voice not installed on this device — using default`, 'warning');
    // Silently fall back — TTS not available for this language
    document.getElementById('listen-btn').textContent = '▶ Listen';
  };

  window.speechSynthesis.speak(utterance);
  document.getElementById('listen-btn').textContent = '⏸ Pause';
}

function toggleSpeech() {
  if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
    window.speechSynthesis.pause();
    document.getElementById('listen-btn').textContent = '▶ Resume';
  } else if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
    document.getElementById('listen-btn').textContent = '⏸ Pause';
  } else {
    const text = document.getElementById('output-text').innerText;
    if (!text || text.includes('Upload a PDF')) {
      showToast('Please paste some text or upload a PDF first', 'error');
      return;
    }
    speakText(text, selectedLang);
  }
}


// ─── Accessibility Controls ──────────────────────────────────────────────────

// Focus mode — dims everything except the paragraph being read
function toggleFocusMode() {
  document.body.classList.toggle('focus-mode');
  document.getElementById('focus-toggle').textContent =
    document.body.classList.contains('focus-mode') ? 'On' : 'Off';
}

// Reading ruler — horizontal line that follows mouse
let ruler = null;
function toggleRuler() {
  if (ruler) {
    ruler.remove(); ruler = null;
    document.getElementById('ruler-toggle').textContent = 'Off';
    document.getElementById('output-text').removeEventListener('mousemove', moveRuler);
  } else {
    ruler = document.createElement('div');
    ruler.className = 'reading-ruler';
    document.getElementById('output-text').appendChild(ruler);
    document.getElementById('output-text').addEventListener('mousemove', moveRuler);
    document.getElementById('ruler-toggle').textContent = 'On';
  }
}

function moveRuler(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  if (ruler) ruler.style.top = (e.clientY - rect.top - 12) + 'px';
}

function setWordSpacing(value) {
  document.getElementById('output-text').style.wordSpacing = value + 'em';
}

function setFontSize(value) {
  document.getElementById('output-text').style.fontSize = value + 'px';
  document.getElementById('font-size-val').textContent = value + 'px';
}

function setLineSpacing(value) {
  document.getElementById('output-text').style.lineHeight = value;
}

const CONTRAST_MODES = {
  normal: { bg: '#FDF6EC', text: '#2C1810', panel: '#FFFFFF' },
  sepia: { bg: '#F4ECD8', text: '#3E2723', panel: '#FAF3E0' },
  dark: { bg: '#1A1A2E', text: '#E0E0E0', panel: '#16213E' },
  highContrast: { bg: '#000000', text: '#FFFF00', panel: '#111111' },
};

function setContrastMode(mode) {
  const { bg, text, panel } = CONTRAST_MODES[mode];
  document.getElementById('output-text').style.backgroundColor = bg;
  document.getElementById('output-text').style.color = text;
  document.getElementById('output-panel').style.backgroundColor = panel;
}

// ─── Loading State ───────────────────────────────────────────────────────────
const LoadingStates = {
  pdf: { icon: '📄', msg: 'Reading your PDF...', sub: 'Extracting text from pages' },
  model: { icon: '🤖', msg: 'Loading AI model', sub: 'First time only (~50MB) — cached after this' },
  simplify: { icon: '✨', msg: 'Simplifying text...', sub: 'On-device AI — your data stays here' },
  tts: { icon: '🔊', msg: 'Preparing audio...', sub: 'Loading voice for selected language' },
};

function showLoading(type) {
  const state = LoadingStates[type] || { icon: '⏳', msg: 'Processing...', sub: '' };
  document.getElementById('loading-icon').textContent = state.icon;
  document.getElementById('loading-msg').textContent = state.msg;
  document.getElementById('loading-sub').textContent = state.sub;
  document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loading').classList.add('hidden');
}

// ─── Toasts ──────────────────────────────────────────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
  const existing = document.getElementById('toast');
  if (existing) existing.remove();

  const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' };
  const toast = document.createElement('div');
  toast.id = 'toast';
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Clipboard paste shortcut
document.addEventListener('paste', (e) => {
  const pasted = e.clipboardData.getData('text');
  if (pasted.length > 50 && !window._originalText) {
    document.getElementById('text-input').value = pasted;
    showToast('Text pasted — click Load Text to begin', 'info');
  }
});

// ─── PWA Service Worker Registration ────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => { });
  });
}

// ─── Init ────────────────────────────────────────────────────────────────────
renderLanguageButtons();
// setOutputText(SAMPLE_TEXT); // Let empty state show

// Collapsible sections on mobile
document.querySelectorAll('.control-group').forEach(group => {
  const h3 = group.querySelector('h3');
  if (h3) {
    h3.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        group.classList.toggle('collapsed');
      }
    });
  }
});
