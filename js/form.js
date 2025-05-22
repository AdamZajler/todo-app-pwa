document.addEventListener('DOMContentLoaded', () => {
    const taskForm = document.getElementById('task-form');
    const dbName = 'todoDB';
    const storeName = 'tasks';
    let db;

    function initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, 1);

            request.onerror = (event) => {
                console.error('[DB] Błąd otwierania IndexedDB:', event.target.error);
                if (typeof showMessage === 'function') {
                    showMessage('Błąd inicjalizacji lokalnej bazy danych!', 'error');
                }
                reject('Błąd otwierania IndexedDB');
            };

            request.onsuccess = (event) => {
                db = event.target.result;
                console.log('[DB] IndexedDB otwarta pomyślnie.');
                resolve(db);
            };

            request.onupgradeneeded = (event) => {
                db = event.target.result;
                console.log('[DB] Aktualizacja IndexedDB lub tworzenie nowej bazy.');
                if (!db.objectStoreNames.contains(storeName)) {
                    const objectStore = db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
                    objectStore.createIndex('title', 'title', { unique: false });
                    objectStore.createIndex('dueDate', 'dueDate', { unique: false });
                    objectStore.createIndex('priority', 'priority', { unique: false });
                    objectStore.createIndex('completed', 'completed', { unique: false });
                    console.log(`[DB] Utworzono magazyn obiektów: ${storeName}`);
                }
            };
        });
    }

    function addTaskToDB(task) {
        return new Promise((resolve, reject) => {
            if (!db) {
                console.error('[DB] Baza danych nie jest zainicjalizowana.');
                reject('Baza danych nie jest zainicjalizowana.');
                return;
            }
            const transaction = db.transaction([storeName], 'readwrite');
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.add(task);

            request.onsuccess = () => {
                console.log('[DB] Zadanie dodane do IndexedDB:', task);
                resolve(request.result);
            };

            request.onerror = (event) => {
                console.error('[DB] Błąd dodawania zadania do IndexedDB:', event.target.error);
                reject('Błąd dodawania zadania');
            };
        });
    }

    initDB().catch(error => {
        console.error("Nie udało się zainicjować IndexedDB na stronie formularza:", error);
    });

    if (taskForm) {
        taskForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const titleInput = document.getElementById('task-title');
            const descriptionInput = document.getElementById('task-description');
            const dueDateInput = document.getElementById('task-due-date');
            const priorityInput = document.getElementById('task-priority');

            if (!titleInput.value.trim()) {
                if (typeof showMessage === 'function') {
                    showMessage('Tytuł zadania nie może być pusty!', 'error');
                } else {
                    alert('Tytuł zadania nie może być pusty!');
                }
                titleInput.focus();
                return;
            }

            const newTask = {
                title: titleInput.value.trim(),
                description: descriptionInput.value.trim(),
                dueDate: dueDateInput.value,
                priority: priorityInput.value,
                completed: false,
                createdAt: new Date().toISOString()
            };

            try {
                await addTaskToDB(newTask);
                if (typeof showMessage === 'function') {
                    showMessage('Zadanie zostało pomyślnie dodane!', 'success');
                } else {
                    alert('Zadanie zostało pomyślnie dodane!');
                }
                taskForm.reset();
                titleInput.focus();
            } catch (error) {
                if (typeof showMessage === 'function') {
                    showMessage(`Nie udało się dodać zadania: ${error}`, 'error');
                } else {
                    alert(`Nie udało się dodać zadania: ${error}`);
                }
            }
        });
    } else {
        // console.log("Formularz 'task-form' nie został znaleziony na tej stronie.");
    }

    if (typeof showMessage === 'undefined') {
        console.warn('[form.js] Funkcja showMessage nie jest zdefiniowana. Komunikaty mogą nie działać poprawnie.');
        window.showMessage = function(message, type) {
            console.log(`[Fallback Message] ${type}: ${message}`);
            alert(`${type.toUpperCase()}: ${message}`);
        };
    }
});
