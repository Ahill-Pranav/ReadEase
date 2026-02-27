// quiz.js

// Hardcoded quiz for the sample NCERT text (demo fallback — always works)
const SAMPLE_QUIZ = [
    {
        question: "What is the main purpose of photosynthesis?",
        options: [
            "To absorb water from the soil",
            "To convert light energy into chemical energy",
            "To release carbon dioxide into the air",
            "To break down glucose for energy"
        ],
        answer: 1
    },
    {
        question: "Which pigment in plants absorbs sunlight?",
        options: ["Melanin", "Hemoglobin", "Chlorophyll", "Carotene"],
        answer: 2
    },
    {
        question: "Where in the plant cell does photosynthesis occur?",
        options: ["Mitochondria", "Nucleus", "Ribosome", "Chloroplast"],
        answer: 3
    }
];

function generateQuiz() {
    // For demo: always use sample quiz
    // For production: call AI to generate from current text
    const quiz = SAMPLE_QUIZ;
    renderQuiz(quiz);
    document.getElementById('quiz-section').classList.remove('hidden');
    document.getElementById('quiz-section').scrollIntoView({ behavior: 'smooth' });
}

function renderQuiz(questions) {
    const container = document.getElementById('quiz-questions');
    container.innerHTML = questions.map((q, qi) => `
    <div class="quiz-question" id="q-${qi}">
      <p class="q-text">${qi + 1}. ${q.question}</p>
      <div class="q-options">
        ${q.options.map((opt, oi) => `
          <button class="q-option" onclick="checkAnswer(${qi}, ${oi}, ${q.answer})" id="q-${qi}-${oi}">
            ${opt}
          </button>
        `).join('')}
      </div>
      <p class="q-feedback hidden" id="feedback-${qi}"></p>
    </div>
  `).join('');
}

function checkAnswer(questionIndex, selectedIndex, correctIndex) {
    const isCorrect = selectedIndex === correctIndex;
    const feedback = document.getElementById(`feedback-${questionIndex}`);
    const selectedBtn = document.getElementById(`q-${questionIndex}-${selectedIndex}`);
    const correctBtn = document.getElementById(`q-${questionIndex}-${correctIndex}`);

    // Disable all options for this question
    document.querySelectorAll(`#q-${questionIndex} .q-option`)
        .forEach(btn => { btn.disabled = true; });

    selectedBtn.classList.add(isCorrect ? 'correct' : 'wrong');
    if (!isCorrect) correctBtn.classList.add('correct');

    feedback.textContent = isCorrect
        ? '✅ Correct!'
        : `❌ The correct answer is: ${document.getElementById(`q-${questionIndex}-${correctIndex}`).textContent.trim()}`;
    feedback.classList.remove('hidden');
    feedback.className = `q-feedback ${isCorrect ? 'correct' : 'wrong'}`;
}
