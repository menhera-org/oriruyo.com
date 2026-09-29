
const normalizeURL = (url) => {
    if (url.pathname.endsWith('/index.html')) {
        url.pathname = '/';
    }
    if (url.pathname != '/' || url.search != '') {
        url.hash = `#${url.pathname}${url.search}`;
        url.search = '';
        url.pathname = '/';
    } else if (!url.hash.startsWith('#/')) {
        url.hash = '#/';
    }
    return url;
};

{
    const url = normalizeURL(new URL(location.href));
    history.replaceState({}, '', url.href);
}

const getRoute = () => {
    const base = location.origin;
    const origUrl = normalizeURL(new URL(location.href));
    const hash = origUrl.hash.slice(1);
    const url = new URL(hash, base);
    return { route: url.pathname, searchParams: url.searchParams };
};

const selectView = (name) => {
    const viewName = String(name);
    const views = document.getElementById('views');
    for (const view of views.children) {
        if (!(view instanceof HTMLElement)) continue;
        if (!view.classList.contains('view') || view.dataset.routeName != viewName) {
            view.hidden = true;
        } else {
            view.hidden = false;
        }
    }
};

// SPA soft 404
const setNotFound = (is404) => {
    const metaRobots = document.head.querySelector('meta[name="robots"]');
    if (is404) {
        metaRobots.setAttribute('content', 'noindex, follow');
    } else {
        metaRobots.setAttribute('content', 'index, follow');
    }
};

const handleRouteChange = () => {
    const { route, searchParams } = getRoute();
    switch (route) {
        case '/':
            routeHome();
            break;
        
        case '/configure':
            routeConfigure();
            break;

        case '/display':
            routeDisplay(searchParams);
            break;
        
        case '/history':
            routeHistory();
            break;
        
        default:
            routeNotFound();
            setNotFound(true);
            return;
    }

    setNotFound(false);
};

const routeHome = () => {
    selectView('root');
};

const routeNotFound = () => {
    selectView('not-found');
};

const routeConfigure = () => {
    selectView('configure');
};

const KINDS = new Map([
    ['train-station', '駅'],
    ['tram-stop', '電停'],
    ['bus-stop', 'バス停'],
    ['other', '地点'],
]);

const HIST_LS_KEY = 'oriruyo-history';
const readSavedHistory = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(HIST_LS_KEY) ?? '[]');
        return Array.isArray(saved) ? saved.filter(key => typeof key === 'string') : [];
    } catch (_) {
        return [];
    }
};

const addHistory = (kind, lineFor, dest) => {
    const key = JSON.stringify([kind, lineFor, dest]);
    const savedSet = new Set(readSavedHistory());
    savedSet.delete(key);
    const saving = [key, ... savedSet].slice(0, 20);
    try {
        localStorage.setItem(HIST_LS_KEY, JSON.stringify(saving));
    } catch (_) {
        // Displaying the destination must still work when storage is unavailable.
    }
};

const getHistory = () => {
    return readSavedHistory().flatMap(key => {
        try {
            const value = JSON.parse(key);
            if (!Array.isArray(value) || value.length !== 3) return [];
            const [kind, lineFor, dest] = value;
            return [{
                kind: String(kind),
                lineFor: String(lineFor),
                dest: String(dest),
            }];
        } catch (_) {
            return [];
        }
    });
};

const routeHistory = () => {
    const historyList = document.getElementById('history-list');
    const entries = getHistory();
    historyList.textContent = '';
    for (const {kind, lineFor, dest} of entries) {
        const kindName = KINDS.get(kind) ?? KINDS.get('other');
        const text = `${kindName}：${lineFor} | ${dest}`;
        const anchor = document.createElement('a');
        const url = new URL('/display', location.origin);
        url.searchParams.set('kind', kind);
        url.searchParams.set('line_for', lineFor);
        url.searchParams.set('dest', dest);

        anchor.href = normalizeURL(url);
        anchor.textContent = text;

        const item = document.createElement('li');
        item.append(anchor);
        historyList.append(item);
    }
    selectView('history');
};

const routeDisplay = (searchParams) => {
    const params = new URLSearchParams(String(searchParams));
    const kind = params.get('kind') || 'other';
    const kindName = KINDS.get(kind) ?? KINDS.get('other');
    const dest = params.get('dest') ?? 'エラー：不明な目的地！';
    const lineFor = params.get('line_for') ?? 'エラー：不明な路線！';
    const dispKindValue = document.getElementById('display-kind-value');
    const dispLineFor = document.getElementById('display-line-for');
    const dispDest = document.getElementById('display-dest');
    dispKindValue.textContent = kindName;
    dispLineFor.textContent = lineFor;
    dispDest.textContent = dest;
    const destCount = [... dest].length;
    const lineForCount = [... lineFor].length;
    const css = `
        #display-line-for {
            font-size: min(10vi, calc((75vi - 3rem) / ${lineForCount}));
        }
        #display-dest {
            font-size: min(17.5vi, calc((94vi - 3rem) / ${destCount}));
        }
    `;
    const style = new CSSStyleSheet;
    style.replaceSync(css);
    document.adoptedStyleSheets = [style];
    addHistory(kind, lineFor, dest);
    selectView('display');
};

const goTo = (url) => {
    history.pushState({}, '', normalizeURL(new URL(String(url), location.origin)));
    handleRouteChange();
};

window.onhashchange = () => handleRouteChange();
window.onpopstate = () => handleRouteChange();

const configureForm = document.getElementById('configure-form');
configureForm.onsubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const url = new URL('/display', location.origin);
    url.searchParams.set('line_for', String(configureForm.line_for.value).trim());
    url.searchParams.set('dest', String(configureForm.dest.value).trim());
    url.searchParams.set('kind', configureForm.kind.value);
    configureForm.reset();
    goTo(url.href);
};

const buttonStart = document.getElementById('button-start');
const buttonHistory = document.getElementById('button-history');
buttonStart.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    goTo('/configure');
};

buttonHistory.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    goTo('/history');
};

handleRouteChange();

if ('serviceWorker' in navigator) {
    let registrationPending = false;
    const registerServiceWorker = () => {
        // An existing worker still controls offline launches; avoid an update request.
        if (registrationPending || navigator.onLine === false) return;
        registrationPending = true;
        navigator.serviceWorker.register('/sw.js')
            .then(() => window.removeEventListener('online', registerServiceWorker))
            .catch((error) => {
                registrationPending = false;
                console.warn('Service Worker registration failed:', error);
            });
    };
    registerServiceWorker();
    window.addEventListener('online', registerServiceWorker);
}
