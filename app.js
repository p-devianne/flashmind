/**
 * FlashMind - Smart Flashcard App
 * A modern PWA for effective studying with flashcards
 */

// =========================================
// iOS PWA Detection & Setup
// =========================================

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

// Prevent iOS bounce/overscroll
if (isIOS) {
    document.addEventListener('touchmove', (e) => {
        if (e.target.closest('.sidebar-content, .cards-list, .card-content, .modal-body')) {
            return; // Allow scrolling in scrollable areas
        }
        if (document.body.scrollHeight <= window.innerHeight) {
            e.preventDefault();
        }
    }, { passive: false });
}

// =========================================
// Data Store & State Management
// =========================================

const DB_NAME = 'flashmind_db';
const DB_VERSION = 1;

class DataStore {
    constructor() {
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Topics store
                if (!db.objectStoreNames.contains('topics')) {
                    const topicsStore = db.createObjectStore('topics', { keyPath: 'id' });
                    topicsStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // Cards store
                if (!db.objectStoreNames.contains('cards')) {
                    const cardsStore = db.createObjectStore('cards', { keyPath: 'id' });
                    cardsStore.createIndex('topicId', 'topicId', { unique: false });
                    cardsStore.createIndex('createdAt', 'createdAt', { unique: false });
                }
            };
        });
    }

    // Generic transaction helper
    async transaction(storeName, mode, callback) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, mode);
            const store = transaction.objectStore(storeName);
            const result = callback(store);

            if (result instanceof IDBRequest) {
                result.onsuccess = () => resolve(result.result);
                result.onerror = () => reject(result.error);
            } else {
                transaction.oncomplete = () => resolve(result);
                transaction.onerror = () => reject(transaction.error);
            }
        });
    }

    // Topics CRUD
    async getAllTopics() {
        return this.transaction('topics', 'readonly', (store) => store.getAll());
    }

    async getTopic(id) {
        return this.transaction('topics', 'readonly', (store) => store.get(id));
    }

    async saveTopic(topic) {
        return this.transaction('topics', 'readwrite', (store) => store.put(topic));
    }

    async deleteTopic(id) {
        // Delete all cards for this topic first
        const cards = await this.getCardsByTopic(id);
        for (const card of cards) {
            await this.deleteCard(card.id);
        }
        return this.transaction('topics', 'readwrite', (store) => store.delete(id));
    }

    // Cards CRUD
    async getCardsByTopic(topicId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction('cards', 'readonly');
            const store = transaction.objectStore('cards');
            const index = store.index('topicId');
            const request = index.getAll(topicId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getCard(id) {
        return this.transaction('cards', 'readonly', (store) => store.get(id));
    }

    async saveCard(card) {
        return this.transaction('cards', 'readwrite', (store) => store.put(card));
    }

    async deleteCard(id) {
        return this.transaction('cards', 'readwrite', (store) => store.delete(id));
    }
}

// =========================================
// App State
// =========================================

const state = {
    currentTopicId: null,
    currentView: 'welcome', // welcome, topic, study
    studyMode: 'random', // random, focus
    studyCards: [],
    currentCardIndex: 0,
    isCardFlipped: false,
    editingTopicId: null,
    editingCardId: null,
};

// =========================================
// DOM Elements
// =========================================

const elements = {
    // Sidebar
    sidebar: document.getElementById('sidebar'),
    sidebarOverlay: document.getElementById('sidebarOverlay'),
    closeSidebar: document.getElementById('closeSidebar'),
    menuBtn: document.getElementById('menuBtn'),
    topicList: document.getElementById('topicList'),
    addTopicBtn: document.getElementById('addTopicBtn'),
    themeToggle: document.getElementById('themeToggle'),
    exportDataBtn: document.getElementById('exportDataBtn'),
    importDataBtn: document.getElementById('importDataBtn'),
    importFileInput: document.getElementById('importFileInput'),

    // Header
    headerTitle: document.getElementById('headerTitle'),
    studyModeBtn: document.getElementById('studyModeBtn'),

    // Screens
    welcomeScreen: document.getElementById('welcomeScreen'),
    topicScreen: document.getElementById('topicScreen'),
    studyScreen: document.getElementById('studyScreen'),
    welcomeAddTopic: document.getElementById('welcomeAddTopic'),

    // Topic View
    topicTitle: document.getElementById('topicTitle'),
    editTopicBtn: document.getElementById('editTopicBtn'),
    deleteTopicBtn: document.getElementById('deleteTopicBtn'),
    cardCount: document.getElementById('cardCount'),
    successRate: document.getElementById('successRate'),
    progressRing: document.getElementById('progressRing'),
    addCardBtn: document.getElementById('addCardBtn'),
    startStudyBtn: document.getElementById('startStudyBtn'),
    cardsList: document.getElementById('cardsList'),
    emptyCards: document.getElementById('emptyCards'),

    // Study Mode
    flashcard: document.getElementById('flashcard'),
    questionContent: document.getElementById('questionContent'),
    answerContent: document.getElementById('answerContent'),
    studyProgress: document.getElementById('studyProgress'),
    missBtn: document.getElementById('missBtn'),
    notYetBtn: document.getElementById('notYetBtn'),
    goodBtn: document.getElementById('goodBtn'),
    exitStudyBtn: document.getElementById('exitStudyBtn'),

    // Modals
    modalOverlay: document.getElementById('modalOverlay'),
    topicModal: document.getElementById('topicModal'),
    cardModal: document.getElementById('cardModal'),
    confirmModal: document.getElementById('confirmModal'),

    // Topic Modal
    topicModalTitle: document.getElementById('topicModalTitle'),
    topicName: document.getElementById('topicName'),
    topicEmoji: document.getElementById('topicEmoji'),
    cancelTopicBtn: document.getElementById('cancelTopicBtn'),
    saveTopicBtn: document.getElementById('saveTopicBtn'),

    // Card Modal
    cardModalTitle: document.getElementById('cardModalTitle'),
    cardQuestion: document.getElementById('cardQuestion'),
    cardAnswer: document.getElementById('cardAnswer'),
    cancelCardBtn: document.getElementById('cancelCardBtn'),
    saveCardBtn: document.getElementById('saveCardBtn'),

    // Confirm Modal
    confirmTitle: document.getElementById('confirmTitle'),
    confirmMessage: document.getElementById('confirmMessage'),
    confirmCancel: document.getElementById('confirmCancel'),
    confirmDelete: document.getElementById('confirmDelete'),

    // Toast
    toastContainer: document.getElementById('toastContainer'),
};

// =========================================
// Utility Functions
// =========================================

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function renderMarkdown(text) {
    if (typeof marked !== 'undefined') {
        return marked.parse(text || '', { breaks: true });
    }
    return text || '';
}

function stripMarkdown(text) {
    // Simple strip for preview
    return (text || '')
        .replace(/[#*_`~\[\]]/g, '')
        .replace(/\n/g, ' ')
        .trim();
}

// =========================================
// Theme Management
// =========================================

function initTheme() {
    const savedTheme = localStorage.getItem('flashmind_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(theme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('flashmind_theme', theme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

// =========================================
// Sidebar Management
// =========================================

function openSidebar() {
    elements.sidebar.classList.add('open');
    elements.sidebarOverlay.classList.add('visible');
}

function closeSidebar() {
    elements.sidebar.classList.remove('open');
    elements.sidebarOverlay.classList.remove('visible');
}

// =========================================
// Modal Management
// =========================================

function openModal(modalId) {
    elements.modalOverlay.classList.remove('hidden');
    elements.modalOverlay.classList.add('visible');

    // Hide all modals first
    document.querySelectorAll('.modal').forEach((m) => m.classList.add('hidden'));

    // Show the requested modal
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeModal() {
    elements.modalOverlay.classList.remove('visible');
    setTimeout(() => {
        elements.modalOverlay.classList.add('hidden');
        document.querySelectorAll('.modal').forEach((m) => m.classList.add('hidden'));
    }, 250);
}

// =========================================
// View Management
// =========================================

function showView(viewName) {
    state.currentView = viewName;

    elements.welcomeScreen.classList.add('hidden');
    elements.topicScreen.classList.add('hidden');
    elements.studyScreen.classList.add('hidden');
    elements.studyModeBtn.classList.add('hidden');

    switch (viewName) {
        case 'welcome':
            elements.welcomeScreen.classList.remove('hidden');
            elements.headerTitle.textContent = 'Select a Topic';
            break;
        case 'topic':
            elements.topicScreen.classList.remove('hidden');
            break;
        case 'study':
            elements.studyScreen.classList.remove('hidden');
            elements.studyModeBtn.classList.remove('hidden');
            updateStudyModeButton();
            break;
    }
}

// =========================================
// Topic Rendering
// =========================================

async function renderTopicList() {
    const topics = await dataStore.getAllTopics();

    if (topics.length === 0) {
        elements.topicList.innerHTML = `
            <li class="empty-topics" style="padding: 1rem; color: var(--text-tertiary); font-size: 0.875rem; text-align: center;">
                No topics yet
            </li>
        `;
        return;
    }

    const topicsWithCounts = await Promise.all(
        topics.map(async (topic) => {
            const cards = await dataStore.getCardsByTopic(topic.id);
            return { ...topic, cardCount: cards.length };
        })
    );

    elements.topicList.innerHTML = topicsWithCounts
        .map(
            (topic) => `
            <li class="topic-item ${topic.id === state.currentTopicId ? 'active' : ''}" 
                data-topic-id="${topic.id}">
                <span class="emoji">${topic.emoji || '📚'}</span>
                <span class="name">${escapeHtml(topic.name)}</span>
                <span class="count">${topic.cardCount}</span>
            </li>
        `
        )
        .join('');

    // Check if we should show welcome screen
    if (topics.length === 0 || !state.currentTopicId) {
        showView('welcome');
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// =========================================
// Topic View
// =========================================

async function loadTopic(topicId) {
    const topic = await dataStore.getTopic(topicId);
    if (!topic) {
        showView('welcome');
        return;
    }

    state.currentTopicId = topicId;
    state.currentView = 'topic';

    // Update header and title
    elements.headerTitle.textContent = topic.name;
    elements.topicTitle.textContent = `${topic.emoji || '📚'} ${topic.name}`;

    // Load cards
    const cards = await dataStore.getCardsByTopic(topicId);

    // Calculate stats
    const cardCount = cards.length;
    let successRate = 0;

    if (cardCount > 0) {
        const totalScore = cards.reduce((sum, card) => sum + (card.score || 0), 0);
        const maxPossibleScore = cardCount * 10; // Assuming max score per card is around 10
        const minPossibleScore = cardCount * -10;
        const range = maxPossibleScore - minPossibleScore;
        successRate = Math.round(((totalScore - minPossibleScore) / range) * 100);
        successRate = Math.max(0, Math.min(100, successRate));
    }

    // Update stats display
    elements.cardCount.textContent = cardCount;
    elements.successRate.textContent = `${successRate}%`;
    elements.progressRing.setAttribute('stroke-dasharray', `${successRate}, 100`);

    // Render cards list
    renderCardsList(cards);

    // Update topic list selection
    document.querySelectorAll('.topic-item').forEach((item) => {
        item.classList.toggle('active', item.dataset.topicId === topicId);
    });

    // Enable/disable study button
    elements.startStudyBtn.disabled = cardCount === 0;
    elements.startStudyBtn.style.opacity = cardCount === 0 ? '0.5' : '1';

    showView('topic');
    closeSidebar();
}

function renderCardsList(cards) {
    if (cards.length === 0) {
        elements.cardsList.classList.add('hidden');
        elements.emptyCards.classList.remove('hidden');
        return;
    }

    elements.emptyCards.classList.add('hidden');
    elements.cardsList.classList.remove('hidden');

    elements.cardsList.innerHTML = cards
        .map((card) => {
            const score = card.score || 0;
            let scoreClass = 'neutral';
            if (score > 0) scoreClass = 'positive';
            else if (score < 0) scoreClass = 'negative';

            return `
            <div class="card-preview-item" data-card-id="${card.id}">
                <div class="card-preview-content">
                    <div class="card-preview-question">${escapeHtml(stripMarkdown(card.question))}</div>
                    <div class="card-preview-answer">${escapeHtml(stripMarkdown(card.answer))}</div>
                </div>
                <span class="card-preview-score ${scoreClass}">${score > 0 ? '+' : ''}${score}</span>
                <div class="card-preview-actions">
                    <button class="icon-btn small edit-card-btn" data-card-id="${card.id}" aria-label="Edit card">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="icon-btn small danger delete-card-btn" data-card-id="${card.id}" aria-label="Delete card">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
        })
        .join('');
}

// =========================================
// Study Mode
// =========================================

async function startStudy() {
    const cards = await dataStore.getCardsByTopic(state.currentTopicId);
    if (cards.length === 0) {
        showToast('Add some flashcards first!', 'error');
        return;
    }

    state.studyCards = [...cards];
    state.currentCardIndex = 0;
    state.isCardFlipped = false;

    shuffleCards();
    showView('study');
    displayCurrentCard();
}

function shuffleCards() {
    if (state.studyMode === 'random') {
        // Fisher-Yates shuffle
        for (let i = state.studyCards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [state.studyCards[i], state.studyCards[j]] = [state.studyCards[j], state.studyCards[i]];
        }
    } else if (state.studyMode === 'focus') {
        // Weighted shuffle - prioritize lower scores
        state.studyCards = weightedShuffle(state.studyCards);
    }
}

function weightedShuffle(cards) {
    // Calculate weights - lower scores get higher weights
    const minScore = Math.min(...cards.map((c) => c.score || 0));
    const maxScore = Math.max(...cards.map((c) => c.score || 0));
    const range = maxScore - minScore || 1;

    const weightedCards = cards.map((card) => {
        const score = card.score || 0;
        // Invert and normalize: lower scores get higher weights
        const weight = Math.pow(2, (maxScore - score) / range * 3);
        return { card, weight };
    });

    // Weighted random selection
    const result = [];
    const remaining = [...weightedCards];

    while (remaining.length > 0) {
        const totalWeight = remaining.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;

        for (let i = 0; i < remaining.length; i++) {
            random -= remaining[i].weight;
            if (random <= 0) {
                result.push(remaining[i].card);
                remaining.splice(i, 1);
                break;
            }
        }
    }

    return result;
}

function displayCurrentCard() {
    if (state.studyCards.length === 0) return;

    const card = state.studyCards[state.currentCardIndex];
    state.isCardFlipped = false;
    elements.flashcard.classList.remove('flipped');

    elements.questionContent.innerHTML = renderMarkdown(card.question);
    elements.answerContent.innerHTML = renderMarkdown(card.answer);
    elements.studyProgress.textContent = `Card ${state.currentCardIndex + 1} of ${state.studyCards.length}`;
}

function flipCard() {
    state.isCardFlipped = !state.isCardFlipped;
    elements.flashcard.classList.toggle('flipped', state.isCardFlipped);
}

async function recordScore(score) {
    if (!state.isCardFlipped) {
        showToast('Flip the card first!', 'info');
        return;
    }

    const card = state.studyCards[state.currentCardIndex];
    card.score = (card.score || 0) + score;
    await dataStore.saveCard(card);

    // Move to next card
    nextCard();
}

function nextCard() {
    state.currentCardIndex++;

    if (state.currentCardIndex >= state.studyCards.length) {
        // Completed all cards - reshuffle and start over
        showToast('Session complete! Starting over...', 'success');
        state.currentCardIndex = 0;
        shuffleCards();
    }

    displayCurrentCard();
}

function updateStudyModeButton() {
    const btn = elements.studyModeBtn;
    const modeText = btn.querySelector('.mode-text');
    const modeIcon = btn.querySelector('.mode-icon');

    if (state.studyMode === 'random') {
        modeText.textContent = 'Random';
        modeIcon.textContent = '🎲';
        btn.classList.remove('focus');
    } else {
        modeText.textContent = 'Focus';
        modeIcon.textContent = '🎯';
        btn.classList.add('focus');
    }
}

function toggleStudyMode() {
    state.studyMode = state.studyMode === 'random' ? 'focus' : 'random';
    updateStudyModeButton();

    // Reshuffle with new mode
    shuffleCards();
    state.currentCardIndex = 0;
    displayCurrentCard();

    showToast(`Switched to ${state.studyMode} mode`, 'info');
}

function exitStudy() {
    if (state.currentTopicId) {
        loadTopic(state.currentTopicId);
    } else {
        showView('welcome');
    }
}

// =========================================
// Topic CRUD
// =========================================

function openAddTopicModal() {
    state.editingTopicId = null;
    elements.topicModalTitle.textContent = 'New Topic';
    elements.topicName.value = '';
    elements.topicEmoji.value = '';
    openModal('topicModal');
    elements.topicName.focus();
}

async function openEditTopicModal() {
    if (!state.currentTopicId) return;

    const topic = await dataStore.getTopic(state.currentTopicId);
    if (!topic) return;

    state.editingTopicId = topic.id;
    elements.topicModalTitle.textContent = 'Edit Topic';
    elements.topicName.value = topic.name;
    elements.topicEmoji.value = topic.emoji || '';
    openModal('topicModal');
    elements.topicName.focus();
}

async function saveTopic() {
    const name = elements.topicName.value.trim();
    const emoji = elements.topicEmoji.value.trim();

    if (!name) {
        showToast('Please enter a topic name', 'error');
        return;
    }

    const topic = {
        id: state.editingTopicId || generateId(),
        name,
        emoji: emoji || '📚',
        createdAt: state.editingTopicId ? undefined : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    // Preserve createdAt for existing topics
    if (state.editingTopicId) {
        const existing = await dataStore.getTopic(state.editingTopicId);
        if (existing) {
            topic.createdAt = existing.createdAt;
        }
    }

    await dataStore.saveTopic(topic);
    closeModal();
    await renderTopicList();

    if (state.editingTopicId) {
        showToast('Topic updated!', 'success');
        loadTopic(state.editingTopicId);
    } else {
        showToast('Topic created!', 'success');
        loadTopic(topic.id);
    }

    state.editingTopicId = null;
}

function confirmDeleteTopic() {
    if (!state.currentTopicId) return;

    elements.confirmTitle.textContent = 'Delete Topic';
    elements.confirmMessage.textContent =
        'Are you sure you want to delete this topic and all its flashcards? This action cannot be undone.';
    openModal('confirmModal');

    elements.confirmDelete.onclick = async () => {
        await dataStore.deleteTopic(state.currentTopicId);
        state.currentTopicId = null;
        closeModal();
        await renderTopicList();
        showView('welcome');
        showToast('Topic deleted', 'success');
    };
}

// =========================================
// Card CRUD
// =========================================

function openAddCardModal() {
    state.editingCardId = null;
    elements.cardModalTitle.textContent = 'New Flashcard';
    elements.cardQuestion.value = '';
    elements.cardAnswer.value = '';
    openModal('cardModal');
    elements.cardQuestion.focus();
}

async function openEditCardModal(cardId) {
    const card = await dataStore.getCard(cardId);
    if (!card) return;

    state.editingCardId = cardId;
    elements.cardModalTitle.textContent = 'Edit Flashcard';
    elements.cardQuestion.value = card.question;
    elements.cardAnswer.value = card.answer;
    openModal('cardModal');
    elements.cardQuestion.focus();
}

async function saveCard() {
    const question = elements.cardQuestion.value.trim();
    const answer = elements.cardAnswer.value.trim();

    if (!question || !answer) {
        showToast('Please fill in both question and answer', 'error');
        return;
    }

    let card;
    if (state.editingCardId) {
        card = await dataStore.getCard(state.editingCardId);
        card.question = question;
        card.answer = answer;
        card.updatedAt = new Date().toISOString();
    } else {
        card = {
            id: generateId(),
            topicId: state.currentTopicId,
            question,
            answer,
            score: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
    }

    await dataStore.saveCard(card);
    closeModal();
    await loadTopic(state.currentTopicId);
    await renderTopicList();

    showToast(state.editingCardId ? 'Card updated!' : 'Card added!', 'success');
    state.editingCardId = null;
}

function confirmDeleteCard(cardId) {
    elements.confirmTitle.textContent = 'Delete Flashcard';
    elements.confirmMessage.textContent = 'Are you sure you want to delete this flashcard?';
    openModal('confirmModal');

    elements.confirmDelete.onclick = async () => {
        await dataStore.deleteCard(cardId);
        closeModal();
        await loadTopic(state.currentTopicId);
        await renderTopicList();
        showToast('Card deleted', 'success');
    };
}

// =========================================
// Event Listeners
// =========================================

function setupEventListeners() {
    // Sidebar
    elements.menuBtn.addEventListener('click', openSidebar);
    elements.closeSidebar.addEventListener('click', closeSidebar);
    elements.sidebarOverlay.addEventListener('click', closeSidebar);
    elements.themeToggle.addEventListener('click', toggleTheme);

    // Export/Import
    elements.exportDataBtn.addEventListener('click', exportData);
    elements.importDataBtn.addEventListener('click', triggerImport);
    elements.importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            importData(file);
            e.target.value = ''; // Reset for next import
        }
    });

    // Topic list click delegation
    elements.topicList.addEventListener('click', (e) => {
        const topicItem = e.target.closest('.topic-item');
        if (topicItem) {
            loadTopic(topicItem.dataset.topicId);
        }
    });

    // Add topic buttons
    elements.addTopicBtn.addEventListener('click', openAddTopicModal);
    elements.welcomeAddTopic.addEventListener('click', openAddTopicModal);

    // Topic actions
    elements.editTopicBtn.addEventListener('click', openEditTopicModal);
    elements.deleteTopicBtn.addEventListener('click', confirmDeleteTopic);

    // Card actions
    elements.addCardBtn.addEventListener('click', openAddCardModal);
    elements.startStudyBtn.addEventListener('click', startStudy);

    // Cards list click delegation
    elements.cardsList.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-card-btn');
        const deleteBtn = e.target.closest('.delete-card-btn');
        const cardItem = e.target.closest('.card-preview-item');

        if (editBtn) {
            e.stopPropagation();
            openEditCardModal(editBtn.dataset.cardId);
        } else if (deleteBtn) {
            e.stopPropagation();
            confirmDeleteCard(deleteBtn.dataset.cardId);
        } else if (cardItem) {
            openEditCardModal(cardItem.dataset.cardId);
        }
    });

    // Study mode
    elements.flashcard.addEventListener('click', flipCard);
    elements.studyModeBtn.addEventListener('click', toggleStudyMode);
    elements.missBtn.addEventListener('click', () => recordScore(-1));
    elements.notYetBtn.addEventListener('click', () => recordScore(0));
    elements.goodBtn.addEventListener('click', () => recordScore(1));
    elements.exitStudyBtn.addEventListener('click', exitStudy);

    // Modal buttons
    elements.cancelTopicBtn.addEventListener('click', closeModal);
    elements.saveTopicBtn.addEventListener('click', saveTopic);
    elements.cancelCardBtn.addEventListener('click', closeModal);
    elements.saveCardBtn.addEventListener('click', saveCard);
    elements.confirmCancel.addEventListener('click', closeModal);

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach((btn) => {
        btn.addEventListener('click', closeModal);
    });

    // Close modal on overlay click
    elements.modalOverlay.addEventListener('click', (e) => {
        if (e.target === elements.modalOverlay) {
            closeModal();
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Escape to close modals/sidebar
        if (e.key === 'Escape') {
            if (elements.modalOverlay.classList.contains('visible')) {
                closeModal();
            } else if (elements.sidebar.classList.contains('open')) {
                closeSidebar();
            } else if (state.currentView === 'study') {
                exitStudy();
            }
        }

        // Space to flip card in study mode
        if (e.key === ' ' && state.currentView === 'study' && !e.target.closest('input, textarea')) {
            e.preventDefault();
            flipCard();
        }

        // 1, 2, 3 for scoring in study mode
        if (state.currentView === 'study' && state.isCardFlipped) {
            if (e.key === '1') recordScore(-1);
            else if (e.key === '2') recordScore(0);
            else if (e.key === '3') recordScore(1);
        }

        // Enter to save in modals
        if (e.key === 'Enter' && !e.shiftKey) {
            if (!elements.topicModal.classList.contains('hidden')) {
                e.preventDefault();
                saveTopic();
            }
        }
    });
}

// =========================================
// Export / Import Functions
// =========================================

async function exportData() {
    try {
        const topics = await dataStore.getAllTopics();
        const allCards = [];

        for (const topic of topics) {
            const cards = await dataStore.getCardsByTopic(topic.id);
            allCards.push(...cards);
        }

        const exportData = {
            version: 1,
            exportDate: new Date().toISOString(),
            topics: topics,
            cards: allCards
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `flashmind-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast(`Exported ${topics.length} topics and ${allCards.length} cards`, 'success');
        closeSidebar();
    } catch (error) {
        console.error('Export failed:', error);
        showToast('Export failed. Please try again.', 'error');
    }
}

async function importData(file) {
    try {
        const text = await file.text();
        let importedData;

        if (file.name.endsWith('.csv')) {
            importedData = parseCSV(text);
        } else {
            importedData = JSON.parse(text);
        }

        // Validate structure
        if (!importedData.topics || !importedData.cards) {
            throw new Error('Invalid file format');
        }

        // Import topics
        let topicsImported = 0;
        let cardsImported = 0;

        for (const topic of importedData.topics) {
            // Check if topic with same ID exists
            const existing = await dataStore.getTopic(topic.id);
            if (!existing) {
                await dataStore.saveTopic(topic);
                topicsImported++;
            }
        }

        // Import cards
        for (const card of importedData.cards) {
            const existing = await dataStore.getCard(card.id);
            if (!existing) {
                await dataStore.saveCard(card);
                cardsImported++;
            }
        }

        await renderTopicList();

        if (topicsImported === 0 && cardsImported === 0) {
            showToast('No new data to import (all items already exist)', 'info');
        } else {
            showToast(`Imported ${topicsImported} topics and ${cardsImported} cards`, 'success');
        }

        closeSidebar();
    } catch (error) {
        console.error('Import failed:', error);
        showToast('Import failed. Please check the file format.', 'error');
    }
}

function parseCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
        throw new Error('CSV file is empty or has no data rows');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    // Detect CSV type: topics or cards
    if (headers.includes('question') && headers.includes('answer')) {
        // Cards CSV
        return parseCardsCSV(lines, headers);
    } else if (headers.includes('name') || headers.includes('topic')) {
        // Topics CSV
        return parseTopicsCSV(lines, headers);
    } else {
        throw new Error('Unrecognized CSV format. Expected columns: question,answer or name,emoji');
    }
}

function parseCardsCSV(lines, headers) {
    const questionIdx = headers.indexOf('question');
    const answerIdx = headers.indexOf('answer');
    const topicIdx = headers.indexOf('topic');
    const topicIdIdx = headers.indexOf('topicid');

    const topics = [];
    const cards = [];
    const topicMap = new Map();

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length < 2) continue;

        const question = values[questionIdx] || '';
        const answer = values[answerIdx] || '';
        const topicName = topicIdx >= 0 ? values[topicIdx] : 'Imported';
        let topicId = topicIdIdx >= 0 ? values[topicIdIdx] : null;

        if (!question || !answer) continue;

        // Create or get topic
        if (!topicId) {
            if (!topicMap.has(topicName)) {
                topicId = generateId();
                const topic = {
                    id: topicId,
                    name: topicName,
                    emoji: '📥',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                topics.push(topic);
                topicMap.set(topicName, topicId);
            } else {
                topicId = topicMap.get(topicName);
            }
        }

        const card = {
            id: generateId(),
            topicId: topicId,
            question: question,
            answer: answer,
            score: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        cards.push(card);
    }

    return { topics, cards };
}

function parseTopicsCSV(lines, headers) {
    const nameIdx = headers.indexOf('name') >= 0 ? headers.indexOf('name') : headers.indexOf('topic');
    const emojiIdx = headers.indexOf('emoji') >= 0 ? headers.indexOf('emoji') : headers.indexOf('icon');

    const topics = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length < 1) continue;

        const name = values[nameIdx] || '';
        const emoji = emojiIdx >= 0 ? values[emojiIdx] : '📚';

        if (!name) continue;

        const topic = {
            id: generateId(),
            name: name.trim(),
            emoji: emoji.trim() || '📚',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        topics.push(topic);
    }

    return { topics, cards: [] };
}

function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current.trim());

    return values;
}

function triggerImport() {
    elements.importFileInput.click();
}

// =========================================
// Service Worker Registration
// =========================================

async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('sw.js');
            console.log('Service Worker registered:', registration.scope);
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }
}

// =========================================
// App Initialization
// =========================================

let dataStore;

async function initApp() {
    try {
        // Initialize data store
        dataStore = new DataStore();
        await dataStore.init();

        // Initialize theme
        initTheme();

        // Setup event listeners
        setupEventListeners();

        // Render initial UI
        await renderTopicList();

        // Register service worker
        await registerServiceWorker();

        console.log('FlashMind initialized successfully!');
    } catch (error) {
        console.error('Failed to initialize app:', error);
        showToast('Failed to initialize app. Please refresh.', 'error');
    }
}

// Start the app
initApp();
