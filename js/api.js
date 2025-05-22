document.addEventListener('DOMContentLoaded', () => {
    const apiStatusElement = document.getElementById('api-status');
    const apiDataContainer = document.getElementById('api-data-container');
    const fetchDataButton = document.getElementById('fetch-new-data-button');

    const apiUrl = 'https://dummyjson.com/todos?limit=5';
    const apiCacheName = 'api-dummy-todos-cache-v1';

    function updateApiStatus(message, isError = false) {
        if (apiStatusElement) {
            apiStatusElement.innerHTML = `<p class="${isError ? 'error-message' : ''}">${message}</p>`;
        }
        if (typeof showMessage === 'function') {
            showMessage(message, isError ? 'error' : 'success');
        } else {
            console.log(`[API Status] ${message}`);
        }
    }

    function displayData(data) {
        if (!apiDataContainer) return;
        apiDataContainer.innerHTML = '';

        if (!data || !Array.isArray(data.todos) || data.todos.length === 0) {
            apiDataContainer.innerHTML = '<p>Nie znaleziono żadnych zadań do wyświetlenia.</p>';
            return;
        }

        const ul = document.createElement('ul');
        data.todos.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `
                <h3>${item.id}. ${item.todo}</h3>
                <p>Status: ${item.completed ? 'Ukończone' : 'Do zrobienia'}</p>
                <p><small>ID użytkownika: ${item.userId}</small></p>
            `;
            if (item.completed) {
                li.classList.add('completed-task');
            }
            ul.appendChild(li);
        });
        apiDataContainer.appendChild(ul);
    }

    async function fetchAndDisplayApiData(forceNetwork = false) {
        if (!navigator.onLine && !forceNetwork) {
            updateApiStatus('Jesteś offline. Próba załadowania danych z pamięci podręcznej...', false);
            try {
                const cachedResponse = await caches.match(apiUrl);
                if (cachedResponse) {
                    const data = await cachedResponse.json();
                    displayData(data);
                    updateApiStatus('Dane załadowane z pamięci podręcznej (tryb offline).', false);
                    return;
                } else {
                    updateApiStatus('Brak danych w pamięci podręcznej. Połącz się z internetem, aby pobrać dane.', true);
                    displayData({ todos: [] });
                    return;
                }
            } catch (error) {
                console.error('[API] Błąd podczas ładowania z cache:', error);
                updateApiStatus('Błąd podczas ładowania danych z pamięci podręcznej.', true);
                displayData({ todos: [] });
                return;
            }
        }

        updateApiStatus('Ładowanie danych z API (dummyjson.com/todos)...', false);
        try {
            const networkResponse = await fetch(apiUrl);
            if (!networkResponse.ok) {
                throw new Error(`HTTP error! status: ${networkResponse.status}. Próba załadowania z cache.`);
            }

            const data = await networkResponse.clone().json();

            const cache = await caches.open(apiCacheName);
            await cache.put(apiUrl, networkResponse);
            console.log('[API] Dane zapisane w pamięci podręcznej:', apiUrl);

            displayData(data);
            updateApiStatus('Dane pomyślnie załadowane z API i zaktualizowane w cache.', false);

        } catch (error) {
            console.error('[API] Błąd podczas pobierania danych z sieci:', error);
            updateApiStatus(`Błąd sieci: ${error.message}. Próba załadowania z pamięci podręcznej...`, true);
            try {
                const cachedResponse = await caches.match(apiUrl);
                if (cachedResponse) {
                    const data = await cachedResponse.json();
                    displayData(data);
                    updateApiStatus('Dane załadowane z pamięci podręcznej po błędzie sieci.', false);
                } else {
                    updateApiStatus('Błąd sieci i brak danych w pamięci podręcznej.', true);
                    displayData({ todos: [] });
                }
            } catch (cacheError) {
                console.error('[API] Błąd podczas ładowania z cache po błędzie sieci:', cacheError);
                updateApiStatus('Krytyczny błąd: Nie udało się pobrać danych ani z sieci, ani z cache.', true);
                displayData({ todos: [] });
            }
        }
    }

    if (fetchDataButton) {
        fetchDataButton.addEventListener('click', () => {
            fetchAndDisplayApiData(true);
        });
    }

    fetchAndDisplayApiData();

    window.addEventListener('online', () => {
        updateApiStatus('Połączenie internetowe przywrócone. Możesz pobrać świeże dane.', false);
    });
    window.addEventListener('offline', () => {
        updateApiStatus('Utracono połączenie z internetem. Aplikacja działa w trybie offline.', true);
    });
});
