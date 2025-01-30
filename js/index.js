document.addEventListener('DOMContentLoaded', () => {
    let notes = [];
    const debounceDelay = 300;
    let saveTimeout;
    let notificationTimeout;

    // Elementos da UI
    const addButton = document.getElementById('add-note-btn');
    const searchInput = document.getElementById('search-input');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsMenu = document.getElementById('settings-menu');
    const noteTemplate = document.getElementById('note-template');
    const colorOptions = document.querySelectorAll('.color-option');

    // Configurar Event Listeners
    addButton.addEventListener('click', createNewNote);
    searchInput.addEventListener('input', filterNotes);
    settingsBtn.addEventListener('click', toggleSettingsMenu);
    colorOptions.forEach(option => option.addEventListener('click', setDefaultColor));

    // Inicialização
    loadSavedNotes();
    initNotifications();

    function createNewNote() {
        const noteClone = noteTemplate.content.cloneNode(true);
        const postIt = noteClone.querySelector('.post-it');
        
        initializeNote(postIt);
        document.body.appendChild(postIt);
        
        setTimeout(() => postIt.classList.add('visible'), 10);
        setupNoteInteractions(postIt);
        debouncedSave();
    }

    function initializeNote(note) {
        const now = new Date();
        note.querySelector('.note-date').textContent = formatDate(now);
        note.style.backgroundColor = localStorage.getItem('defaultColor') || '#fff9c4';
        positionNewNote(note);
    }

    function positionNewNote(note) {
        const overlapMargin = 30;
        const lastNote = document.querySelector('.post-it:last-child');
        
        if(lastNote) {
            const lastRect = lastNote.getBoundingClientRect();
            note.style.left = `${lastRect.left + overlapMargin}px`;
            note.style.top = `${lastRect.top + overlapMargin}px`;
        } else {
            note.style.left = `${window.innerWidth * 0.3}px`;
            note.style.top = `${window.innerHeight * 0.3}px`;
        }
    }

    function setupNoteInteractions(note) {
        setupDrag(note);
        setupResize(note);
        setupNoteControls(note);
    }

    function setupDrag(element) {
        let isDragging = false;
        let startX, startY, initialX, initialY;
        const dragHandle = element.querySelector('.drag-handle');

        const startDrag = (e) => {
            e.preventDefault();
            isDragging = true;
            element.classList.add('dragging');
            const rect = element.getBoundingClientRect();
            
            const clientX = e.clientX || e.touches[0].clientX;
            const clientY = e.clientY || e.touches[0].clientY;
            
            startX = clientX - rect.left;
            startY = clientY - rect.top;
            initialX = rect.left;
            initialY = rect.top;

            document.addEventListener('mousemove', drag);
            document.addEventListener('touchmove', drag);
            document.addEventListener('mouseup', endDrag);
            document.addEventListener('touchend', endDrag);
        };

        const drag = (e) => {
            if (!isDragging) return;
            
            const clientX = e.clientX || e.touches[0].clientX;
            const clientY = e.clientY || e.touches[0].clientY;
            
            const newX = clientX - startX;
            const newY = clientY - startY;
            
            const maxX = window.innerWidth - element.offsetWidth;
            const maxY = window.innerHeight - element.offsetHeight;
            
            element.style.left = `${Math.max(0, Math.min(newX, maxX))}px`;
            element.style.top = `${Math.max(0, Math.min(newY, maxY))}px`;
        };

        const endDrag = () => {
            isDragging = false;
            element.classList.remove('dragging');
            removeDragListeners();
            debouncedSave();
        };

        const removeDragListeners = () => {
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('touchmove', drag);
            document.removeEventListener('mouseup', endDrag);
            document.removeEventListener('touchend', endDrag);
        };

        dragHandle.addEventListener('mousedown', startDrag);
        dragHandle.addEventListener('touchstart', startDrag, { passive: false });
    }

    function setupResize(element) {
        const handle = element.querySelector('.resize-handle');
        let isResizing = false;
        let startX, startY, startWidth, startHeight;

        const initResize = (e) => {
            e.preventDefault();
            isResizing = true;
            
            startX = e.clientX || e.touches[0].clientX;
            startY = e.clientY || e.touches[0].clientY;
            startWidth = element.offsetWidth;
            startHeight = element.offsetHeight;

            document.addEventListener('mousemove', resize);
            document.addEventListener('touchmove', resize);
            document.addEventListener('mouseup', stopResize);
            document.addEventListener('touchend', stopResize);
        };

        const resize = (e) => {
            if (!isResizing) return;
            
            const currentX = e.clientX || e.touches[0].clientX;
            const currentY = e.clientY || e.touches[0].clientY;
            
            element.style.width = `${Math.max(200, startWidth + (currentX - startX))}px`;
            element.style.height = `${Math.max(150, startHeight + (currentY - startY))}px`;
        };

        const stopResize = () => {
            isResizing = false;
            removeResizeListeners();
            debouncedSave();
        };

        const removeResizeListeners = () => {
            document.removeEventListener('mousemove', resize);
            document.removeEventListener('touchmove', resize);
            document.removeEventListener('mouseup', stopResize);
            document.removeEventListener('touchend', stopResize);
        };

        handle.addEventListener('mousedown', initResize);
        handle.addEventListener('touchstart', initResize, { passive: false });
    }

    function setupNoteControls(note) {
        note.querySelector('.delete-btn').addEventListener('click', () => {
            note.classList.remove('visible');
            setTimeout(() => {
                note.remove();
                debouncedSave();
            }, 300);
        });

        const inputs = note.querySelectorAll('textarea, select, input[type="datetime-local"]');
        inputs.forEach(input => {
            input.addEventListener('input', debouncedSave);
        });
    }

    function debouncedSave() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveNotes, debounceDelay);
    }

    function saveNotes() {
        notes = [];
        document.querySelectorAll('.post-it').forEach(note => {
            const rect = note.getBoundingClientRect();
            notes.push({
                x: rect.left,
                y: rect.top,
                width: note.offsetWidth,
                height: note.offsetHeight,
                content: note.querySelector('.post-it-content').value,
                color: note.style.backgroundColor,
                category: note.querySelector('.note-category').value,
                reminder: note.querySelector('.note-reminder').value,
                date: note.querySelector('.note-date').textContent
            });
        });
        localStorage.setItem('notes', JSON.stringify(notes));
    }

    function loadSavedNotes() {
        const savedNotes = JSON.parse(localStorage.getItem('notes')) || [];
        savedNotes.forEach(noteData => {
            const noteClone = noteTemplate.content.cloneNode(true);
            const postIt = noteClone.querySelector('.post-it');
            
            Object.assign(postIt.style, {
                left: `${noteData.x}px`,
                top: `${noteData.y}px`,
                width: `${noteData.width}px`,
                height: `${noteData.height}px`,
                backgroundColor: noteData.color
            });

            postIt.querySelector('.post-it-content').value = noteData.content;
            postIt.querySelector('.note-category').value = noteData.category;
            postIt.querySelector('.note-reminder').value = noteData.reminder;
            postIt.querySelector('.note-date').textContent = noteData.date;

            document.body.appendChild(postIt);
            setTimeout(() => postIt.classList.add('visible'), 10);
            setupNoteInteractions(postIt);
        });
    }

    function filterNotes() {
        const searchTerm = searchInput.value.toLowerCase();
        document.querySelectorAll('.post-it').forEach(note => {
            const content = note.querySelector('.post-it-content').value.toLowerCase();
            note.style.display = content.includes(searchTerm) ? 'block' : 'none';
        });
    }

    function toggleSettingsMenu() {
        settingsMenu.classList.toggle('hidden');
    }

    function setDefaultColor(e) {
        const color = e.target.dataset.color;
        localStorage.setItem('defaultColor', color);
        document.querySelectorAll('.color-option').forEach(opt => {
            opt.classList.toggle('selected', opt === e.target);
        });
    }

    function initNotifications() {
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
        startReminderChecker();
    }

    function startReminderChecker() {
        setInterval(() => {
            const now = new Date();
            document.querySelectorAll('.post-it').forEach(note => {
                const reminderInput = note.querySelector('.note-reminder');
                if (!reminderInput.value) return;

                const reminderTime = new Date(reminderInput.value);
                const timeDiff = reminderTime - now;
                const threshold = 60000; // 1 minuto

                if (Math.abs(timeDiff) <= threshold) {
                    triggerNotification(note);
                }
            });
        }, 60000);
    }

    function triggerNotification(note) {
        const content = note.querySelector('.post-it-content').value;
        const category = note.querySelector('.note-category').value;

        // Notificação do sistema
        if (Notification.permission === 'granted') {
            new Notification(`Lembrete: ${category}`, {
                body: content,
                icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAbwAAAG8B8aLcQwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAADLSURBVDiNpZIxCsJAEEXfJhoRsaGNFhaCja1X8AheQDyDjcVewEa8gIUiFgo2FkLUQkQkGkQj+LMQyB82u7Dww7DsvJk3u8Myxhj+EZuqgDzPAXieR9M0AKqqslwuAXieR5IkkiQBYJomRVFQVRWj0QjHcQBI05Q4jomiCMdxaJqG6XQKQJ7nrNdrJpMJAL7v0/c9AKPRiMPhQJZl3y3iOKbv+8+QrutwXZfdbvd9QZZlDIfDzxDHcRiPx2y325cXvDv/AFif3q0mDMM/AAAAAElFTkSuQmCC'
            });
        }

        // Notificação visual
        const visualAlert = document.createElement('div');
        visualAlert.className = 'visual-alert';
        visualAlert.innerHTML = `
            <div class="alert-content">
                <h3>${category}</h3>
                <p>${content}</p>
            </div>
        `;
        document.body.appendChild(visualAlert);
        
        setTimeout(() => visualAlert.remove(), 5000);
        note.style.animation = 'pulse 1s 3';
        setTimeout(() => note.style.animation = '', 3000);
    }

    function formatDate(date) {
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    // Carregar configurações salvas
    const savedColor = localStorage.getItem('defaultColor');
    if (savedColor) {
        document.querySelector(`.color-option[data-color="${savedColor}"]`).classList.add('selected');
    }

    // Evento de redimensionamento da janela
    window.addEventListener('resize', debouncedSave);
});