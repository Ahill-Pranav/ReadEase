// simplify.js
// Import Transformers.js dynamically so it doesn't block page load
let simplifierPipeline = null;
let modelLoading = false;

async function loadModel() {
    if (simplifierPipeline || modelLoading) return;
    modelLoading = true;
    updateModelStatus('loading');

    try {
        const { pipeline } = await import(
            'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js'
        );
        simplifierPipeline = await pipeline(
            'summarization',
            'Xenova/distilbart-cnn-6-6',
            { quantized: true } // smaller file, faster load
        );
        updateModelStatus('ready');
    } catch (err) {
        updateModelStatus('error');
        if (typeof showToast !== 'undefined') showToast('AI model unavailable — using rule-based simplification', 'warning');
        console.error('Model load failed:', err);
    }
    modelLoading = false;
}

function updateModelStatus(status) {
    const el = document.getElementById('model-status');
    const states = {
        loading: '⏳ Loading AI model (~50MB, first time only)...',
        ready: '✅ AI model ready',
        error: '⚠️ AI offline — using rule-based simplification',
        idle: 'AI model: not loaded'
    };
    el.textContent = states[status] || states.idle;
    el.className = `model-status ${status}`;
}

// Start loading model in background after page load
window.addEventListener('load', () => setTimeout(loadModel, 2000));

// LEVEL 1: Rule-based — break long sentences, preserve vocabulary
function simplifyLevel1(text) {
    return text
        .replace(/([^.!?]{80,}?),\s/g, '$1. ') // break on commas in long sentences
        .replace(/\s(however|therefore|furthermore|consequently|nevertheless),\s/gi,
            '. $1, ') // break on connector words
        .replace(/\s{2,}/g, ' ')
        .trim();
}

// LEVEL 2: AI-based — Transformers.js summarization
async function simplifyLevel2(text) {
    if (!simplifierPipeline) {
        await loadModel();
    }
    if (!simplifierPipeline) {
        // Fallback: rule-based with word replacement
        return simplifyLevel2Fallback(text);
    }

    const chunks = chunkText(text, 400); // model has token limit
    const results = await Promise.all(
        chunks.map(chunk =>
            simplifierPipeline(chunk, { max_length: 120, min_length: 30, do_sample: false })
        )
    );
    return results.map(r => r[0].summary_text).join(' ');
}

// Level 2 fallback when model unavailable
function simplifyLevel2Fallback(text) {
    const complexToSimple = {
        'utilize': 'use', 'approximately': 'about', 'sufficient': 'enough',
        'demonstrate': 'show', 'subsequently': 'then', 'facilitate': 'help',
        'implement': 'use', 'comprehend': 'understand', 'obtain': 'get',
        'require': 'need', 'indicate': 'show', 'numerous': 'many',
        'commence': 'start', 'terminate': 'end', 'modification': 'change'
    };
    let result = simplifyLevel1(text);
    Object.entries(complexToSimple).forEach(([complex, simple]) => {
        result = result.replace(new RegExp(`\\b${complex}\\b`, 'gi'), simple);
    });
    return result;
}

// LEVEL 3: Core idea — extract first + last sentence + key sentence
function simplifyLevel3(text) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    if (sentences.length <= 3) return sentences.join(' ');

    // Take first sentence, most info-dense middle sentence, last sentence
    const scoreSentence = (s) => {
        const infoWords = s.match(/\b(is|are|was|were|causes|results|means|shows|proves)\b/gi);
        return (infoWords?.length || 0) + (s.length > 60 ? 1 : 0);
    };

    const middle = sentences.slice(1, -1);
    const keyMiddle = middle.sort((a, b) => scoreSentence(b) - scoreSentence(a))[0];

    return [sentences[0], keyMiddle, sentences[sentences.length - 1]]
        .filter(Boolean)
        .join(' ');
}

// Chunk text for model token limits
function chunkText(text, maxWords) {
    const words = text.split(' ');
    const chunks = [];
    for (let i = 0; i < words.length; i += maxWords) {
        chunks.push(words.slice(i, i + maxWords).join(' '));
    }
    return chunks;
}

// Main entry point called from HTML
// Main entry point called from HTML
async function handleSimplify(level) {
    const text = window._originalText;
    if (!text) { alert('Load some text first.'); return; }

    const targetLang = typeof selectedLang !== 'undefined' ? selectedLang : 'hi-IN';

    showLoading('simplify');

    let result;
    try {
        if (level === 1) result = simplifyLevel1(text);
        else if (level === 2) result = await simplifyLevel2(text);
        else if (level === 3) result = simplifyLevel3(text);
    } catch (err) {
        result = simplifyLevel1(text); // always fallback
    }

    const translatedText = await translateText(result, targetLang);

    hideLoading();
    window._simplifiedText = translatedText;
    showTab('simplified');

    // We update readability based on the english simplified text since FK doesn't work well on translated text
    updateReadabilityBadge(result, true);

    // Animate badge
    const badge = document.getElementById('readability-badge');
    if (badge) {
        badge.classList.remove('improved');
        void badge.offsetWidth; // reflow trick to re-trigger animation
        badge.classList.add('improved');
    }

    // Show the new badge
    document.getElementById('new-badge')?.classList.remove('hidden');

    // Mark active level button
    document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-level="${level}"]`)?.classList.add('active');
}

// ─── TRANSLATION LOGIC ───────────────────────────────────────────────────────

async function translateText(text, targetLangCode) {
    if (!text || !targetLangCode) return text;
    // Map our lang codes to Google Translate codes
    const gtLang = targetLangCode.split('-')[0]; // e.g. hi-IN -> hi

    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${gtLang}&dt=t&q=${encodeURIComponent(text)}`;
        const res = await fetch(url);
        const data = await res.json();
        return data[0].map(x => x[0]).join('');
    } catch (err) {
        console.error('Translation error:', err);
        return text;
    }
}
