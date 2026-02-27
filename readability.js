// readability.js

function countSyllables(word) {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
}

function analyzeReadability(text) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);

    if (words.length < 10) return null;

    const totalSyllables = words.reduce((acc, w) => acc + countSyllables(w), 0);
    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = totalSyllables / words.length;

    // Flesch-Kincaid Reading Ease (0-100)
    const fkEase = 206.835
        - (1.015 * avgWordsPerSentence)
        - (84.6 * avgSyllablesPerWord);

    // Flesch-Kincaid Grade Level
    const fkGrade = (0.39 * avgWordsPerSentence) + (11.8 * avgSyllablesPerWord) - 15.59;

    const level = fkEase >= 70 ? 'Easy' : fkEase >= 50 ? 'Medium' : 'Hard';
    const readingMinutes = Math.max(1, Math.round(words.length / 200));

    return {
        score: Math.round(fkEase),
        grade: Math.max(1, Math.round(fkGrade)),
        level,
        readingMinutes,
        wordCount: words.length,
        sentenceCount: sentences.length,
        avgWordsPerSentence: Math.round(avgWordsPerSentence)
    };
}

function updateReadabilityBadge(text, isSimplified = false) {
    const stats = analyzeReadability(text);
    if (!stats) return;

    const badge = document.getElementById('readability-badge');
    badge.classList.remove('hidden');

    if (!isSimplified) {
        document.getElementById('badge-level').textContent = stats.level;
        document.getElementById('badge-level').className = `badge-level ${stats.level.toLowerCase()}`;
        document.getElementById('badge-grade').textContent = `Grade ${stats.grade}`;
        document.getElementById('badge-time').textContent = `${stats.readingMinutes} min read`;
        document.getElementById('badge-after').classList.add('hidden');
        document.getElementById('badge-arrow').classList.add('hidden');
    } else {
        // Show the improvement arrow
        document.getElementById('badge-arrow').classList.remove('hidden');
        const after = document.getElementById('badge-after');
        after.classList.remove('hidden');
        after.textContent = `→ Grade ${stats.grade} (${stats.level})`;
        after.className = `badge-after ${stats.level.toLowerCase()}`;
    }
}
