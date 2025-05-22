const dbName = 'todoDB';
const storeName = 'tasks';
let db;

function initDB() {
    return new Promise((resolve, reject) => {
        if (window.location.pathname.endsWith('form.html')) {
            const requestCheck = indexedDB.open(dbName);
            requestCheck.onsuccess = (event) => {
                db = event.target.result;
                if (db) {
                    resolve(db);
                    return;
                }
                proceedWithInit();
            };
            requestCheck.onerror = () => proceedWithInit();

            function proceedWithInit() {
                const request = indexedDB.open(dbName, 1);
                standardDBHandlers(request, resolve, reject);
            }
            return;
        }

        const request = indexedDB.open(dbName, 1);
        standardDBHandlers(request, resolve, reject);
    });
}

function standardDBHandlers(request, resolve, reject) {
    request.onerror = (event) => {
        console.error('[DB] Błąd otwierania IndexedDB:', event.target.error);
        if (typeof showMessage === 'function') {
            showMessage('Błąd inicjalizacji lokalnej bazy danych!', 'error');
        }
        reject('Błąd otwierania IndexedDB');
    };

    request.onsuccess = (event) => {
        db = event.target.result;
        resolve(db);
    };

    request.onupgradeneeded = (event) => {
        db = event.target.result;
        if (!db.objectStoreNames.contains(storeName)) {
            const objectStore = db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
            objectStore.createIndex('title', 'title', { unique: false });
            objectStore.createIndex('dueDate', 'dueDate', { unique: false });
            objectStore.createIndex('priority', 'priority', { unique: false });
            objectStore.createIndex('completed', 'completed', { unique: false });
            objectStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
    };
}

function getAllTasksFromDB() {
    return new Promise((resolve, reject) => {
        if (!db) {
            initDB().then(() => proceed()).catch(reject);
        } else {
            proceed();
        }
        function proceed() {
            const transaction = db.transaction([storeName], 'readonly');
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };
            request.onerror = (event) => {
                console.error('[DB] Błąd pobierania zadań:', event.target.error);
                reject('Błąd pobierania zadań');
            };
        }
    });
}

function addTaskToDB(task) {
    return new Promise((resolve, reject) => {
        if (!db) {
            initDB().then(() => proceed()).catch(reject);
        } else {
            proceed();
        }
        function proceed() {
            const transaction = db.transaction([storeName], 'readwrite');
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.add(task);

            request.onsuccess = () => {
                resolve(request.result);
            };
            request.onerror = (event) => {
                console.error('[DB] Błąd dodawania zadania (szybkie dodawanie):', event.target.error);
                reject('Błąd dodawania zadania');
            };
        }
    });
}

function deleteTaskFromDB(taskId) {
    return new Promise((resolve, reject) => {
        if (!db) {
            initDB().then(() => proceed()).catch(reject);
        } else {
            proceed();
        }
        function proceed() {
            const transaction = db.transaction([storeName], 'readwrite');
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.delete(taskId);

            request.onsuccess = () => {
                resolve();
            };
            request.onerror = (event) => {
                console.error('[DB] Błąd usuwania zadania:', event.target.error);
                reject('Błąd usuwania zadania');
            };
        }
    });
}

function updateTaskInDB(task) {
    return new Promise((resolve, reject) => {
        if (!db) {
            initDB().then(() => proceed()).catch(reject);
        } else {
            proceed();
        }
        function proceed() {
            const transaction = db.transaction([storeName], 'readwrite');
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.put(task);

            request.onsuccess = () => {
                resolve();
            };
            request.onerror = (event) => {
                console.error('[DB] Błąd aktualizacji zadania:', event.target.error);
                reject('Błąd aktualizacji zadania');
            };
        }
    });
}

function showMessage(message, type = 'success') {
    const mainElement = document.querySelector('main');
    if (!mainElement) {
        console.warn("Element 'main' nie został znaleziony. Komunikat nie zostanie wyświetlony.");
        return;
    }

    let messageContainer = document.getElementById('message-container');
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.id = 'message-container';
        if (mainElement.firstChild) {
            mainElement.insertBefore(messageContainer, mainElement.firstChild);
        } else {
            mainElement.appendChild(messageContainer);
        }
    } else {
        messageContainer.innerHTML = '';
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    messageContainer.appendChild(messageDiv);

    setTimeout(() => {
        if (messageDiv.parentNode === messageContainer) {
            messageDiv.remove();
        }
    }, 5000);
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(() => {
                showMessage('Aplikacja jest gotowa do pracy offline!', 'success');
            })
            .catch((error) => {
                console.error('[App] Błąd rejestracji Service Workera:', error);
                showMessage('Nie udało się zainstalować funkcji offline.', 'error');
            });
    });
} else {
    console.warn('[App] Service Worker nie jest wspierany w tej przeglądarce.');
    showMessage('Twoja przeglądarka nie wspiera funkcji offline.', 'error');
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!document.getElementById('todo-list-section')) {
        try {
            if(!db) await initDB();
        } catch (error) {
            console.error("[App.js] Błąd inicjalizacji DB na innej stronie:", error);
        }
        return;
    }

    const quickAddForm = document.getElementById('quick-add-form');
    const quickTaskInput = document.getElementById('quick-task-input');
    const todoListElement = document.getElementById('todo-list');
    const placeholder = todoListElement ? todoListElement.querySelector('.placeholder') : null;

    const addTaskShortcutSection = document.getElementById('add-task-shortcut');
    if (addTaskShortcutSection) {
        addTaskShortcutSection.style.display = 'block';
    }

    function renderTask(task) {
        if (!todoListElement) return;

        if (placeholder && todoListElement.contains(placeholder)) {
            placeholder.remove();
        }

        const listItem = document.createElement('li');
        listItem.dataset.id = task.id;
        if (task.completed) {
            listItem.classList.add('completed');
        }

        const taskSpan = document.createElement('span');
        taskSpan.textContent = task.title;
        if (task.description) {
            const descEl = document.createElement('small');
            descEl.textContent = ` - ${task.description.substring(0, 50)}${task.description.length > 50 ? '...' : ''}`;
            descEl.style.display = 'block';
            descEl.style.color = '#777';
            taskSpan.appendChild(descEl);
        }
        if (task.dueDate) {
            const dateEl = document.createElement('small');
            try {
                dateEl.textContent = ` (Termin: ${new Date(task.dueDate).toLocaleDateString('pl-PL')})`;
            } catch (e) {
                dateEl.textContent = ` (Termin: ${task.dueDate})`;
            }
            dateEl.style.display = 'block';
            dateEl.style.color = '#555';
            taskSpan.appendChild(dateEl);
        }

        listItem.appendChild(taskSpan);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Usuń';
        deleteButton.addEventListener('click', async () => {
            try {
                await deleteTaskFromDB(task.id);
                listItem.remove();
                if (todoListElement.children.length === 0 && placeholder) {
                    todoListElement.appendChild(placeholder);
                }
                showMessage(`Zadanie "${task.title.substring(0,20)}..." usunięte.`);
            } catch (error) {
                showMessage('Nie udało się usunąć zadania z bazy.', 'error');
                console.error("Błąd usuwania zadania z DB:", error);
            }
        });
        listItem.appendChild(deleteButton);

        taskSpan.addEventListener('click', async () => {
            task.completed = !task.completed;
            try {
                await updateTaskInDB(task);
                listItem.classList.toggle('completed');
                showMessage(`Zadanie "${task.title.substring(0,20)}..." ${task.completed ? 'ukończone' : 'przywrócone'}.`);
            } catch (error) {
                showMessage('Nie udało się zaktualizować statusu zadania.', 'error');
                console.error("Błąd aktualizacji zadania w DB:", error);
                task.completed = !task.completed;
            }
        });

        todoListElement.appendChild(listItem);
    }

    async function loadAndDisplayTasks() {
        if (!todoListElement) return;
        try {
            if(!db) await initDB();
            const tasks = await getAllTasksFromDB();
            todoListElement.innerHTML = '';
            if (tasks.length === 0 && placeholder) {
                todoListElement.appendChild(placeholder);
            } else {
                tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                tasks.forEach(task => renderTask(task));
            }
        } catch (error) {
            showMessage('Nie udało się załadować zadań z lokalnej bazy.', 'error');
            console.error("Błąd ładowania zadań z DB:", error);
            if (placeholder && !todoListElement.contains(placeholder)) {
                todoListElement.appendChild(placeholder);
            }
        }
    }

    if (quickAddForm && quickTaskInput) {
        quickAddForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const taskText = quickTaskInput.value.trim();
            if (taskText) {
                const newTask = {
                    title: taskText,
                    description: '',
                    dueDate: '',
                    priority: 'sredni',
                    completed: false,
                    createdAt: new Date().toISOString()
                };
                try {
                    const newId = await addTaskToDB(newTask);
                    newTask.id = newId;
                    renderTask(newTask);
                    quickTaskInput.value = '';
                    showMessage('Zadanie dodane do listy!', 'success');
                } catch (error) {
                    showMessage('Nie udało się dodać zadania do bazy.', 'error');
                    console.error("Błąd dodawania zadania (szybkie dodawanie) do DB:", error);
                }
            } else {
                showMessage('Treść zadania nie może być pusta!', 'error');
            }
        });
    }

    await loadAndDisplayTasks();
});
