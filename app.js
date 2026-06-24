// Database Setup & Configuration
const DB_NAME = 'DriveCloneDB_v8';
const DB_VERSION = 1;
const STORE_NAME = 'items';
const MAX_STORAGE_GB = 15;
const MAX_STORAGE_BYTES = MAX_STORAGE_GB * 1024 * 1024 * 1024;

let db = null;
let appItems = [];
let selectedItemId = null;
let currentFolderId = null; // null represents Root
let currentView = 'all'; // 'all' (My Drive), 'shared', 'recent', 'starred', 'trash'
let searchQuery = '';
let sortBy = 'name'; // 'name', 'date', 'size'
let sortAscending = true;
let viewLayout = 'grid'; // 'grid', 'list'
let detailsOpen = false;

// Check if device is mobile or touch-enabled
function isMobileDevice() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isMobileUA = /android|bb\d+|meego.+bnm|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(userAgent) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)\-|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|lf(i|\-)|ml(50|74|ot|v\-)|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up\.b|upg1|upsi|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(userAgent.substring(0, 4));
    return isMobileUA || window.innerWidth <= 1024 || ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
}

// Initialize Database
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        };

        request.onsuccess = (e) => {
            db = e.target.result;
            resolve(db);
        };

        request.onerror = (e) => {
            console.error('Database failed to open', e);
            reject(e);
        };
    });
}

// Database Operations
function getAllItemsFromDB() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function saveItemToDB(item) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(item);
        request.onsuccess = (e) => {
            item.id = e.target.result;
            resolve(item);
        };
        request.onerror = () => reject(request.error);
    });
}

function updateItemInDB(item) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(item);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

function deleteItemFromDB(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Seed Mock Data
async function seedMockDataIfEmpty() {
    const items = await getAllItemsFromDB();
    if (items.length > 0) return;

    showToast('Initializing sample drive files...');

    // 1. Folders
    const folders = [
        { name: 'Documents', isFolder: true, parentId: null, starred: false, trashed: false, createdAt: Date.now() - 50000000 },
        { name: 'Images', isFolder: true, parentId: null, starred: false, trashed: false, createdAt: Date.now() - 40000000 },
        { name: 'Projects', isFolder: true, parentId: null, starred: false, trashed: false, createdAt: Date.now() - 30000000 },
        { name: 'Videos', isFolder: true, parentId: null, starred: false, trashed: false, createdAt: Date.now() - 20000000 }
    ];

    const seededFolders = [];
    for (const folder of folders) {
        const saved = await saveItemToDB(folder);
        seededFolders.push(saved);
    }

    const docFolder = seededFolders.find(f => f.name === 'Documents');
    const imgFolder = seededFolders.find(f => f.name === 'Images');

    // Helper to fetch local asset as Blob or fallback to canvas/generic blob
    const fetchAssetAsBlob = async (path, mimeType) => {
        try {
            const response = await fetch(path);
            if (response.ok) {
                return await response.blob();
            }
        } catch (e) {
            console.warn('Failed to fetch asset, falling back to dummy blob', path);
        }
        return new Blob(['Mock Data'], { type: mimeType });
    };

    const natureBlob = await fetchAssetAsBlob('assets/nature.png', 'image/png');
    const travelVideoThumbnail = await fetchAssetAsBlob('assets/travel_video.png', 'image/png');
    const sunsetBlob = await fetchAssetAsBlob('assets/sunset.png', 'image/png');
    const forestBlob = await fetchAssetAsBlob('assets/forest.png', 'image/png');
    const cityBlob = await fetchAssetAsBlob('assets/city.png', 'image/png');
    const oceanBlob = await fetchAssetAsBlob('assets/ocean.png', 'image/png');
    const bannerBlob = await fetchAssetAsBlob('assets/profile_banner.jpg', 'image/jpeg');
    const avatarBlob = await fetchAssetAsBlob('assets/profile_avatar.jpg', 'image/jpeg');

    // 2. Files
    const createMockBlob = (type, content = 'Mock Data') => {
        return new Blob([content], { type: type });
    };

    const files = [
        {
            name: 'Project Proposal.pdf',
            isFolder: false,
            parentId: docFolder ? docFolder.id : null,
            type: 'application/pdf',
            size: 2.4 * 1024 * 1024,
            data: createMockBlob('application/pdf', 'PDF content'),
            starred: false,
            trashed: false,
            createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5
        },
        {
            name: 'Report.docx',
            isFolder: false,
            parentId: docFolder ? docFolder.id : null,
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            size: 1.1 * 1024 * 1024,
            data: createMockBlob('application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
            starred: false,
            trashed: false,
            createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7
        },
        {
            name: 'Budget.xlsx',
            isFolder: false,
            parentId: null,
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            size: 98 * 1024,
            data: createMockBlob('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
            starred: false,
            trashed: false,
            createdAt: Date.now() - 1000 * 60 * 60 * 24 * 12
        },
        {
            name: 'Nature.jpg',
            isFolder: false,
            parentId: imgFolder ? imgFolder.id : null,
            type: 'image/png',
            size: 2.3 * 1024 * 1024,
            data: natureBlob,
            starred: true,
            trashed: false,
            createdAt: Date.now() - 1000 * 60 * 60 * 24 * 15
        },
        {
            name: 'Sunset.png',
            isFolder: false,
            parentId: imgFolder ? imgFolder.id : null,
            type: 'image/png',
            size: 1.8 * 1024 * 1024,
            data: sunsetBlob,
            starred: false,
            trashed: false,
            createdAt: Date.now() - 1000 * 60 * 60 * 24 * 16
        },
        {
            name: 'ForestPath.png',
            isFolder: false,
            parentId: imgFolder ? imgFolder.id : null,
            type: 'image/png',
            size: 2.1 * 1024 * 1024,
            data: forestBlob,
            starred: false,
            trashed: false,
            createdAt: Date.now() - 1000 * 60 * 60 * 24 * 17
        },
        {
            name: 'CityAtNight.png',
            isFolder: false,
            parentId: imgFolder ? imgFolder.id : null,
            type: 'image/png',
            size: 2.5 * 1024 * 1024,
            data: cityBlob,
            starred: false,
            trashed: false,
            createdAt: Date.now() - 1000 * 60 * 60 * 24 * 18
        },
        {
            name: 'CoralReef.png',
            isFolder: false,
            parentId: imgFolder ? imgFolder.id : null,
            type: 'image/png',
            size: 2.9 * 1024 * 1024,
            data: oceanBlob,
            starred: false,
            trashed: false,
            createdAt: Date.now() - 1000 * 60 * 60 * 24 * 19
        },
        {
            name: 'DeveloperBanner.jpg',
            isFolder: false,
            parentId: imgFolder ? imgFolder.id : null,
            type: 'image/jpeg',
            size: 86 * 1024,
            data: bannerBlob,
            starred: false,
            trashed: false,
            createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3
        },
        {
            name: 'DeveloperAvatar.jpg',
            isFolder: false,
            parentId: imgFolder ? imgFolder.id : null,
            type: 'image/jpeg',
            size: 134 * 1024,
            data: avatarBlob,
            starred: false,
            trashed: false,
            createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2
        },
        {
            name: 'Presentation.pptx',
            isFolder: false,
            parentId: null,
            type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            size: 3.6 * 1024 * 1024,
            data: createMockBlob('application/vnd.openxmlformats-officedocument.presentationml.presentation'),
            starred: false,
            trashed: false,
            createdAt: Date.now() - 1000 * 60 * 60 * 24 * 20
        },
        {
            name: 'Notes.txt',
            isFolder: false,
            parentId: docFolder ? docFolder.id : null,
            type: 'text/plain',
            size: 12 * 1024,
            data: createMockBlob('text/plain', 'Welcome to CloudBox notes!\nThis is a sample text file contents.'),
            starred: false,
            trashed: false,
            createdAt: Date.now() - 1000 * 60 * 60 * 24 * 25
        },
        {
            name: 'Travel Video.mp4',
            isFolder: false,
            parentId: null,
            type: 'video/mp4',
            size: 12.4 * 1024 * 1024,
            data: createMockBlob('video/mp4'),
            thumbnail: travelVideoThumbnail,
            starred: false,
            trashed: false,
            createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30
        },
        {
            name: 'Archive.zip',
            isFolder: false,
            parentId: null,
            type: 'application/zip',
            size: 45 * 1024 * 1024,
            data: createMockBlob('application/zip'),
            starred: false,
            trashed: false,
            createdAt: Date.now() - 1000 * 60 * 60 * 24 * 40
        }
    ];

    for (const file of files) {
        await saveItemToDB(file);
    }
}

// App Initialization
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initDB();
        await seedMockDataIfEmpty();
        await loadItems();
        setupEventListeners();
        initTheme();
        updateStorageInfo();
        clearSelection();

        // Dynamically set profile avatar icon
        const avatarContainer = document.querySelector('.profile-avatar');
        if (avatarContainer) {
            avatarContainer.innerHTML = `<img src="assets/profile_avatar.jpg" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        }
    } catch (err) {
        console.error('Error starting app:', err);
        showToast('Error initializing drive app.', true);
    }
});

// Load and Refresh
async function loadItems() {
    appItems = await getAllItemsFromDB();
    renderContent();
    updateStorageInfo();
}

// Render Content View
function renderContent() {
    const foldersContainer = document.getElementById('folders-container');
    const filesContainer = document.getElementById('files-container');
    const foldersWrapper = document.getElementById('folders-section-wrapper');
    const filesWrapper = document.getElementById('files-section-wrapper');
    const emptyState = document.getElementById('empty-state');

    // 1. Filter folders and files based on active view and current folder
    let visibleItems = [];

    if (currentView === 'all') {
        // My Drive: show children of currentFolderId, not trashed
        visibleItems = appItems.filter(item => item.parentId === currentFolderId && !item.trashed);
    } else if (currentView === 'starred') {
        visibleItems = appItems.filter(item => item.starred && !item.trashed);
    } else if (currentView === 'trash') {
        visibleItems = appItems.filter(item => item.trashed);
    } else if (currentView === 'recent') {
        // Flat list of files, sorted newest, not trashed
        visibleItems = appItems.filter(item => !item.isFolder && !item.trashed);
    } else if (currentView === 'shared') {
        // Mock shared files (files that have some flag, we can just display a subset of root files)
        visibleItems = appItems.filter(item => !item.isFolder && item.id % 3 === 0 && !item.trashed);
    }

    // 2. Filter by search query
    if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        visibleItems = visibleItems.filter(item => item.name.toLowerCase().includes(query));
    }

    // 3. Sort items
    visibleItems.sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];

        // Handle string casing
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        // Place folders first always when in My Drive / Grid view
        if (currentView === 'all' && a.isFolder !== b.isFolder) {
            return a.isFolder ? -1 : 1;
        }

        if (sortBy === 'date') {
            valA = a.createdAt;
            valB = b.createdAt;
        }
        if (sortBy === 'size') {
            valA = a.isFolder ? 0 : a.size;
            valB = b.isFolder ? 0 : b.size;
        }

        if (valA < valB) return sortAscending ? -1 : 1;
        if (valA > valB) return sortAscending ? 1 : -1;
        return 0;
    });

    // 4. Split into folders and files
    const folders = visibleItems.filter(item => item.isFolder);
    const files = visibleItems.filter(item => !item.isFolder);

    // 5. Render Folders
    foldersContainer.innerHTML = '';
    if (viewLayout === 'list') {
        foldersContainer.className = 'folders-list';
    } else {
        foldersContainer.className = 'folders-grid';
    }
    if (folders.length > 0 && currentView !== 'recent' && currentView !== 'shared') {
        foldersWrapper.style.display = 'block';
        folders.forEach(folder => {
            const card = document.createElement('div');
            card.className = `folder-card ${selectedItemId === folder.id ? 'selected' : ''}`;
            card.dataset.id = folder.id;

            // Get child items count inside this folder
            const childCount = appItems.filter(item => item.parentId === folder.id && !item.trashed).length;

            card.innerHTML = `
                <div class="folder-left">
                    <span class="material-icons-round folder-icon">folder</span>
                    <div class="folder-info">
                        <span class="folder-name">${folder.name}</span>
                        <span class="folder-meta">${childCount} items</span>
                    </div>
                </div>
                <button class="card-btn options-btn-trigger" data-id="${folder.id}">
                    <span class="material-icons-round">more_vert</span>
                </button>
            `;

            // Double click to enter folder (desktop only)
            card.addEventListener('dblclick', () => {
                if (!isMobileDevice()) {
                    enterFolder(folder.id, folder.name);
                }
            });

            // Single click to select (or enter folder directly on mobile/touch)
            card.addEventListener('click', (e) => {
                if (e.target.closest('.options-btn-trigger')) return;
                selectItem(folder.id);
                if (isMobileDevice()) {
                    enterFolder(folder.id, folder.name);
                }
            });

            // Options menu trigger
            card.querySelector('.options-btn-trigger').addEventListener('click', (e) => {
                e.stopPropagation();
                showOptionsMenu(e.currentTarget, folder);
            });

            foldersContainer.appendChild(card);
        });
    } else {
        foldersWrapper.style.display = 'none';
    }

    // 6. Render Files
    filesContainer.innerHTML = '';
    if (viewLayout === 'list') {
        filesContainer.className = 'files-container list-view';
    } else {
        filesContainer.className = 'files-container grid-view';
    }
    if (files.length > 0) {
        filesWrapper.style.display = 'block';

        // Hide Files title if folders are hidden or view is recent/shared to look clean
        const filesTitle = document.getElementById('files-section-title');
        filesTitle.style.display = (folders.length > 0) ? 'block' : 'none';

        files.forEach(file => {
            const card = document.createElement('div');
            card.className = `file-card ${selectedItemId === file.id ? 'selected' : ''}`;
            card.dataset.id = file.id;

            const iconClass = getFileIconClass(file.type);
            const fileIcon = getFileIcon(file.type);
            const sizeStr = formatBytes(file.size);
            const dateStr = new Date(file.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

            let previewHtml = '';
            if (viewLayout === 'grid') {
                if (file.type.startsWith('image/')) {
                    const objectUrl = URL.createObjectURL(file.data);
                    previewHtml = `<img src="${objectUrl}" alt="${file.name}">`;
                } else if (file.type.startsWith('video/')) {
                    if (file.thumbnail) {
                        const objectUrl = URL.createObjectURL(file.thumbnail);
                        previewHtml = `
                            <div class="video-preview-wrapper" style="width:100%; height:100%;">
                                <img src="${objectUrl}" alt="${file.name}" style="width:100%; height:100%; object-fit:cover;">
                                <div class="video-play-overlay">
                                    <span class="material-icons-round">play_arrow</span>
                                </div>
                            </div>
                        `;
                    } else {
                        previewHtml = `
                            <div class="video-preview-wrapper">
                                <span class="material-icons-round type-icon video">${fileIcon}</span>
                                <div class="video-play-overlay">
                                    <span class="material-icons-round">play_arrow</span>
                                </div>
                            </div>
                        `;
                    }
                } else {
                    previewHtml = `<span class="material-icons-round type-icon ${iconClass}">${fileIcon}</span>`;
                }
            } else {
                // List view preview
                if (file.type.startsWith('image/')) {
                    const objectUrl = URL.createObjectURL(file.data);
                    previewHtml = `<img src="${objectUrl}" alt="${file.name}">`;
                } else if (file.type.startsWith('video/') && file.thumbnail) {
                    const objectUrl = URL.createObjectURL(file.thumbnail);
                    previewHtml = `<img src="${objectUrl}" alt="${file.name}">`;
                } else {
                    previewHtml = `<span class="material-icons-round type-icon ${iconClass}">${fileIcon}</span>`;
                }
            }

            card.innerHTML = `
                <div class="file-card-preview">
                    ${previewHtml}
                </div>
                <div class="file-card-info">
                    <div class="file-card-details">
                        <span class="file-card-name">${file.name}</span>
                        <span class="file-card-meta">${sizeStr} • ${dateStr}</span>
                    </div>
                    <button class="card-btn options-btn-trigger" data-id="${file.id}">
                        <span class="material-icons-round">more_vert</span>
                    </button>
                </div>
            `;

            // Double click to open preview (desktop only)
            card.addEventListener('dblclick', () => {
                if (!isMobileDevice()) {
                    openPreviewModal(file);
                }
            });

            // Single click to select (or open preview directly on mobile/touch)
            card.addEventListener('click', (e) => {
                if (e.target.closest('.options-btn-trigger')) return;
                selectItem(file.id);
                if (isMobileDevice()) {
                    openPreviewModal(file);
                }
            });

            // Options menu trigger
            card.querySelector('.options-btn-trigger').addEventListener('click', (e) => {
                e.stopPropagation();
                showOptionsMenu(e.currentTarget, file);
            });

            filesContainer.appendChild(card);
        });
    } else {
        filesWrapper.style.display = 'none';
    }

    // 7. Toggle Empty State
    if (folders.length === 0 && files.length === 0) {
        emptyState.style.display = 'flex';
        // Tailor empty state text
        const title = document.getElementById('empty-state-title');
        const desc = document.getElementById('empty-state-desc');
        const icon = emptyState.querySelector('.empty-icon');

        if (searchQuery.trim() !== '') {
            icon.textContent = 'search_off';
            title.textContent = 'No matches found';
            desc.textContent = 'Try adjusting your keywords.';
        } else if (currentView === 'starred') {
            icon.textContent = 'star_border';
            title.textContent = 'No starred files';
            desc.textContent = 'Add stars to important items to find them easily.';
        } else if (currentView === 'trash') {
            icon.textContent = 'delete_outline';
            title.textContent = 'Trash is empty';
            desc.textContent = 'No files in Trash.';
        } else {
            icon.textContent = 'cloud_off';
            title.textContent = 'Folder is empty';
            desc.textContent = 'Drop files here or click "New" to upload.';
        }
    } else {
        emptyState.style.display = 'none';
    }
}

// Select Item
function selectItem(id) {
    selectedItemId = id;

    // Highlight card
    document.querySelectorAll('.file-card, .folder-card').forEach(card => {
        if (Number(card.dataset.id) === id) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });

    const item = appItems.find(i => i.id === id);
    if (item && detailsOpen) {
        updateDetailsPane(item);
    }
}

// Update Details Pane
function updateDetailsPane(item) {
    const noSelection = document.getElementById('no-selection');
    const detailsContent = document.getElementById('details-content');

    noSelection.style.display = 'none';
    detailsContent.style.display = 'block';

    const nameEl = document.getElementById('detail-name');
    nameEl.textContent = item.name;

    const iconEl = document.getElementById('detail-icon');
    const imgEl = document.getElementById('detail-img-preview');

    if (imgEl.src) {
        URL.revokeObjectURL(imgEl.src);
        imgEl.src = '';
    }

    if (!item.isFolder && item.type.startsWith('image/')) {
        iconEl.style.display = 'none';
        imgEl.style.display = 'block';
        imgEl.src = URL.createObjectURL(item.data);
    } else if (!item.isFolder && item.type.startsWith('video/') && item.thumbnail) {
        iconEl.style.display = 'none';
        imgEl.style.display = 'block';
        imgEl.src = URL.createObjectURL(item.thumbnail);
    } else {
        imgEl.style.display = 'none';
        iconEl.style.display = 'block';

        if (item.isFolder) {
            iconEl.textContent = 'folder';
            iconEl.className = 'material-icons-round detail-type-icon';
            iconEl.style.color = '#ffbb00';
        } else {
            iconEl.textContent = getFileIcon(item.type);
            iconEl.className = `material-icons-round detail-type-icon ${getFileIconClass(item.type)}`;
            iconEl.style.color = '';
        }
    }

    // Set properties
    document.getElementById('detail-type').textContent = item.isFolder ? 'Folder' : getFriendlyTypeName(item.type);
    document.getElementById('detail-size').textContent = item.isFolder ? '--' : formatBytes(item.size);
    document.getElementById('detail-created').textContent = new Date(item.createdAt).toLocaleString();

    // Star icon state
    const starBtn = document.getElementById('action-star');
    if (item.starred) {
        starBtn.classList.add('starred');
        starBtn.querySelector('span').textContent = 'star';
    } else {
        starBtn.classList.remove('starred');
        starBtn.querySelector('span').textContent = 'star_border';
    }

    // Actions depending on Trash
    const deleteBtn = document.getElementById('action-delete');
    const restoreBtn = document.getElementById('action-restore');

    if (item.trashed) {
        deleteBtn.title = 'Delete Permanently';
        deleteBtn.querySelector('span').textContent = 'delete_forever';
        restoreBtn.style.display = 'flex';
    } else {
        deleteBtn.title = 'Move to Trash';
        deleteBtn.querySelector('span').textContent = 'delete';
        restoreBtn.style.display = 'none';
    }
}

// Clear Selection
function clearSelection() {
    selectedItemId = null;
    document.querySelectorAll('.file-card, .folder-card').forEach(card => card.classList.remove('selected'));

    document.getElementById('no-selection').style.display = 'flex';
    document.getElementById('details-content').style.display = 'none';
}

// Enter Folder navigation
function enterFolder(folderId, folderName) {
    currentFolderId = folderId;
    currentView = 'all';

    // Update active nav state
    document.querySelectorAll('.nav-menu a').forEach(el => el.classList.remove('active'));
    document.querySelector('[data-view="all"]').classList.add('active');

    // Update Breadcrumbs
    const titleEl = document.getElementById('view-title');
    if (folderId === null) {
        titleEl.textContent = 'My Drive';
    } else {
        titleEl.textContent = folderName;
    }

    clearSelection();
    renderContent();
}

// Float Menu positioning and triggers
let activeMenuId = null;

function showOptionsMenu(anchor, item) {
    closeAllDropdowns();

    const menu = document.getElementById('options-dropdown');
    const rect = anchor.getBoundingClientRect();

    menu.style.display = 'block';

    // Calculate positioning to avoid boundary clip
    let top = rect.bottom + window.scrollY;
    let left = rect.left - 150 + window.scrollX;

    if (top + menu.offsetHeight > window.innerHeight) {
        top = rect.top - menu.offsetHeight + window.scrollY;
    }
    if (left < 0) {
        left = 10;
    }

    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;

    // Configure item details on context menu
    const downloadAction = document.getElementById('opt-download');
    const starAction = document.getElementById('opt-star');
    const restoreAction = document.getElementById('opt-restore');
    const detailsAction = document.getElementById('opt-details');
    const deleteAction = document.getElementById('opt-delete');

    // Hide download for folders
    downloadAction.style.display = item.isFolder ? 'none' : 'flex';

    // Star toggle label
    starAction.querySelector('span').textContent = item.starred ? 'star' : 'star_border';
    starAction.querySelector('span').nextElementSibling.textContent = item.starred ? 'Remove Star' : 'Star';

    if (item.trashed) {
        restoreAction.style.display = 'flex';
        deleteAction.querySelector('span').textContent = 'delete_forever';
        deleteAction.querySelector('span').nextElementSibling.textContent = 'Delete Permanently';
    } else {
        restoreAction.style.display = 'none';
        deleteAction.querySelector('span').textContent = 'delete';
        deleteAction.querySelector('span').nextElementSibling.textContent = 'Delete';
    }

    // Attach click events
    downloadAction.onclick = () => {
        downloadFile(item);
        closeAllDropdowns();
    };

    starAction.onclick = async () => {
        item.starred = !item.starred;
        await updateItemInDB(item);
        showToast(item.starred ? 'Starred item' : 'Removed star');
        await loadItems();
        closeAllDropdowns();
    };

    detailsAction.onclick = () => {
        selectItem(item.id);
        detailsOpen = true;
        const detailsPane = document.getElementById('details-pane');
        detailsPane.classList.remove('collapsed');
        updateDetailsPane(item);
        closeAllDropdowns();
    };

    restoreAction.onclick = async () => {
        item.trashed = false;
        await updateItemInDB(item);
        showToast(`Restored "${item.name}"`);
        await loadItems();
        closeAllDropdowns();
    };

    deleteAction.onclick = async () => {
        closeAllDropdowns();
        if (item.trashed) {
            const conf = confirm(`Are you sure you want to permanently delete "${item.name}"?`);
            if (conf) {
                await deleteItemFromDB(item.id);
                showToast(`Permanently deleted "${item.name}"`);
                clearSelection();
                await loadItems();
            }
        } else {
            item.trashed = true;
            await updateItemInDB(item);
            showToast(`Moved "${item.name}" to Trash`);
            clearSelection();
            await loadItems();
        }
    };
}

// Close Dropdowns helper
function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-menu-floating').forEach(el => el.style.display = 'none');
}

// Update Storage Pool Info
function updateStorageInfo() {
    const totalBytes = appItems.filter(i => !i.isFolder).reduce((sum, f) => sum + f.size, 0);
    const storageBar = document.getElementById('storage-bar');
    const storageText = document.getElementById('storage-text');

    // Add mock seeded constant so it reflects screenshot values nicely
    const mockSeededGB = 2.45;
    const mockSeededBytes = mockSeededGB * 1024 * 1024 * 1024;

    const displayBytes = totalBytes + mockSeededBytes;
    const percentage = Math.min((displayBytes / MAX_STORAGE_BYTES) * 100, 100);

    storageBar.style.width = `${percentage}%`;
    storageText.textContent = `${(displayBytes / (1024 * 1024 * 1024)).toFixed(2)} GB of ${MAX_STORAGE_GB} GB used`;
}

// Setup Event Listeners
function setupEventListeners() {
    // Dropdowns close on click elsewhere
    window.addEventListener('click', (e) => {
        if (!e.target.closest('.options-btn-trigger') &&
            !e.target.closest('#btn-new-trigger') &&
            !e.target.closest('#sort-trigger')) {
            closeAllDropdowns();
        }
    });

    // New Menu Toggle
    const newBtn = document.getElementById('btn-new-trigger');
    newBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllDropdowns();
        const menu = document.getElementById('new-dropdown');
        const rect = newBtn.getBoundingClientRect();
        menu.style.display = 'block';
        menu.style.top = `${rect.bottom + window.scrollY}px`;
        menu.style.left = `${rect.left + window.scrollX}px`;
    });

    // New Folder Modal actions
    document.getElementById('new-folder-action').addEventListener('click', () => {
        closeAllDropdowns();
        document.getElementById('new-folder-modal').classList.add('active');
        document.getElementById('folder-name-input').focus();
    });

    document.getElementById('cancel-folder-btn').addEventListener('click', () => {
        document.getElementById('new-folder-modal').classList.remove('active');
        document.getElementById('folder-name-input').value = '';
    });

    document.getElementById('create-folder-btn').addEventListener('click', async () => {
        const nameInput = document.getElementById('folder-name-input');
        const name = nameInput.value.trim() || 'Untitled folder';

        const folder = {
            name: name,
            isFolder: true,
            parentId: currentFolderId,
            starred: false,
            trashed: false,
            createdAt: Date.now()
        };

        await saveItemToDB(folder);
        showToast(`Created folder "${name}"`);
        nameInput.value = '';
        document.getElementById('new-folder-modal').classList.remove('active');
        await loadItems();
    });

    // New File Trigger
    const uploadInput = document.getElementById('file-upload-input');
    document.getElementById('new-file-action').addEventListener('click', () => {
        closeAllDropdowns();
        uploadInput.click();
    });

    // Direct Upload Button
    document.getElementById('btn-direct-upload').addEventListener('click', () => {
        uploadInput.click();
    });

    uploadInput.addEventListener('change', (e) => {
        handleFileUploads(e.target.files);
        uploadInput.value = '';
    });

    // Drag and Drop
    const dropZone = document.getElementById('drop-zone');
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFileUploads(e.dataTransfer.files);
        }
    });

    // Sort Dropdown Trigger
    const sortTrigger = document.getElementById('sort-trigger');
    sortTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllDropdowns();
        const menu = document.getElementById('sort-dropdown');
        const rect = sortTrigger.getBoundingClientRect();
        menu.style.display = 'block';
        menu.style.top = `${rect.bottom + window.scrollY}px`;
        menu.style.left = `${rect.left - 50 + window.scrollX}px`;
    });

    // Sort Direction Switch
    const sortDirectionIcon = document.getElementById('sort-direction-icon');
    sortDirectionIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        sortAscending = !sortAscending;
        sortDirectionIcon.textContent = sortAscending ? 'arrow_upward' : 'arrow_downward';
        renderContent();
    });

    // Sort options click
    document.querySelectorAll('#sort-dropdown .sort-opt').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('#sort-dropdown .sort-opt').forEach(el => el.classList.remove('active'));
            opt.classList.add('active');

            sortBy = opt.dataset.sort;
            document.getElementById('current-sort-label').textContent = opt.firstElementChild.textContent;

            renderContent();
            closeAllDropdowns();
        });
    });

    // Navigation Click Handlers
    document.querySelectorAll('.nav-menu a').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-menu a').forEach(el => el.classList.remove('active'));
            item.classList.add('active');

            currentView = item.dataset.view;
            currentFolderId = null; // Return to root when switching views

            const titleEl = document.getElementById('view-title');
            if (currentView === 'all') titleEl.textContent = 'My Drive';
            if (currentView === 'shared') titleEl.textContent = 'Shared with me';
            if (currentView === 'recent') titleEl.textContent = 'Recent';
            if (currentView === 'starred') titleEl.textContent = 'Starred';
            if (currentView === 'trash') titleEl.textContent = 'Trash';

            clearSelection();
            renderContent();
        });
    });

    // Breadcrumbs Navigation (Click view title to return to root)
    document.getElementById('view-title').addEventListener('click', () => {
        if (currentFolderId !== null) {
            enterFolder(null, 'My Drive');
        }
    });

    // Search bar functionality
    const searchInput = document.getElementById('search-input');
    const clearSearch = document.getElementById('clear-search');

    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        clearSearch.style.display = (searchQuery.length > 0) ? 'block' : 'none';
        renderContent();
    });

    clearSearch.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearch.style.display = 'none';
        renderContent();
    });

    // Grid/List Layout View Switcher via Pill Capsule
    const btnLayoutList = document.getElementById('btn-layout-list');
    const btnLayoutGrid = document.getElementById('btn-layout-grid');
    const filesContainer = document.getElementById('files-container');

    if (btnLayoutList && btnLayoutGrid) {
        btnLayoutList.addEventListener('click', () => {
            viewLayout = 'list';
            btnLayoutList.classList.add('active');
            btnLayoutGrid.classList.remove('active');
            filesContainer.classList.remove('grid-view');
            filesContainer.classList.add('list-view');
            renderContent();
        });
        btnLayoutGrid.addEventListener('click', () => {
            viewLayout = 'grid';
            btnLayoutGrid.classList.add('active');
            btnLayoutList.classList.remove('active');
            filesContainer.classList.remove('list-view');
            filesContainer.classList.add('grid-view');
            renderContent();
        });
    }

    // Camera FAB uploader
    const cameraTrigger = document.getElementById('btn-camera-trigger');
    const cameraInput = document.getElementById('camera-upload-input');
    if (cameraTrigger && cameraInput) {
        cameraTrigger.addEventListener('click', () => {
            cameraInput.click();
        });
        cameraInput.addEventListener('change', (e) => {
            handleFileUploads(e.target.files);
            cameraInput.value = '';
        });
    }

    // Trash Header Button
    const trashHeaderBtn = document.getElementById('trash-header-btn');
    if (trashHeaderBtn) {
        trashHeaderBtn.addEventListener('click', () => {
            currentView = 'trash';
            currentFolderId = null;
            document.querySelectorAll('.nav-menu a').forEach(el => el.classList.remove('active'));
            document.getElementById('view-title').textContent = 'Trash';
            clearSelection();
            renderContent();
        });
    }

    // Mobile Tabs Suggested/Activity switching
    const mobileTabs = document.querySelectorAll('.mobile-tab');
    mobileTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            mobileTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        });
    });

    // Detail Pane Toggle
    const detailsToggle = document.getElementById('details-toggle');
    const detailsPane = document.getElementById('details-pane');

    detailsToggle.addEventListener('click', () => {
        detailsOpen = !detailsOpen;
        if (detailsOpen) {
            detailsPane.classList.remove('collapsed');
            if (selectedItemId) {
                const item = appItems.find(i => i.id === selectedItemId);
                if (item) updateDetailsPane(item);
            }
        } else {
            detailsPane.classList.add('collapsed');
        }
    });

    document.getElementById('close-details').addEventListener('click', () => {
        detailsOpen = false;
        detailsPane.classList.add('collapsed');
    });

    // Detail Pane actions
    document.getElementById('action-star').addEventListener('click', async () => {
        if (!selectedItemId) return;
        const item = appItems.find(i => i.id === selectedItemId);
        if (item) {
            item.starred = !item.starred;
            await updateItemInDB(item);
            showToast(item.starred ? 'Starred item' : 'Removed star');
            await loadItems();
            updateDetailsPane(item);
        }
    });

    document.getElementById('action-delete').addEventListener('click', async () => {
        if (!selectedItemId) return;
        const item = appItems.find(i => i.id === selectedItemId);
        if (!item) return;

        if (item.trashed) {
            const conf = confirm(`Are you sure you want to permanently delete "${item.name}"?`);
            if (conf) {
                await deleteItemFromDB(item.id);
                showToast(`Permanently deleted "${item.name}"`);
                clearSelection();
                await loadItems();
            }
        } else {
            item.trashed = true;
            await updateItemInDB(item);
            showToast(`Moved "${item.name}" to Trash`);
            clearSelection();
            await loadItems();
        }
    });

    document.getElementById('action-restore').addEventListener('click', async () => {
        if (!selectedItemId) return;
        const item = appItems.find(i => i.id === selectedItemId);
        if (item && item.trashed) {
            item.trashed = false;
            await updateItemInDB(item);
            showToast(`Restored "${item.name}"`);
            clearSelection();
            await loadItems();
        }
    });

    document.getElementById('action-download').addEventListener('click', () => {
        if (!selectedItemId) return;
        const item = appItems.find(i => i.id === selectedItemId);
        if (item && !item.isFolder) downloadFile(item);
    });

    // Modal view close
    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('preview-modal').addEventListener('click', (e) => {
        if (e.target.id === 'preview-modal') closeModal();
    });

    document.getElementById('modal-download').addEventListener('click', () => {
        if (!selectedItemId) return;
        const item = appItems.find(i => i.id === selectedItemId);
        if (item && !item.isFolder) downloadFile(item);
    });

    // Theme Switch
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    // Upgrade Storage Click Alert
    document.getElementById('upgrade-storage-btn').addEventListener('click', () => {
        showToast('Upgrading storage plan...');
        setTimeout(() => showToast('Plan updated to 100 GB!'), 1000);
    });
}

// Upload file implementation
async function handleFileUploads(fileList) {
    let uploadedCount = 0;
    for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];

        const record = {
            name: file.name,
            isFolder: false,
            parentId: currentFolderId,
            type: file.type || 'application/octet-stream',
            size: file.size,
            data: file,
            starred: false,
            trashed: false,
            createdAt: Date.now()
        };

        try {
            await saveItemToDB(record);
            uploadedCount++;
        } catch (err) {
            console.error('File save error:', file.name, err);
        }
    }

    if (uploadedCount > 0) {
        showToast(`Uploaded ${uploadedCount} file(s) successfully`);
        await loadItems();
    }
}

// Download File Implementation
function downloadFile(file) {
    if (file.isFolder) return;
    const url = URL.createObjectURL(file.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
    showToast(`Downloading "${file.name}"`);
}

// Open File Preview
function openPreviewModal(file) {
    if (file.isFolder) {
        enterFolder(file.id, file.name);
        return;
    }

    const modal = document.getElementById('preview-modal');
    const title = document.getElementById('modal-title');
    const bodyContent = document.getElementById('modal-body-content');

    title.textContent = file.name;
    bodyContent.innerHTML = '';

    modal.classList.add('active');

    if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file.data);
        bodyContent.appendChild(img);
    } else if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file.data);
        video.controls = true;
        video.autoplay = true;
        video.style.maxWidth = '100%';
        video.style.maxHeight = '60vh';
        bodyContent.appendChild(video);
    } else if (file.type === 'text/plain' || file.type.startsWith('text/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const pre = document.createElement('pre');
            pre.className = 'text-preview';
            pre.textContent = e.target.result;
            bodyContent.appendChild(pre);
        };
        reader.readAsText(file.data);
    } else if (file.type === 'application/pdf') {
        const iframe = document.createElement('iframe');
        iframe.src = URL.createObjectURL(file.data);
        bodyContent.appendChild(iframe);
    } else {
        const container = document.createElement('div');
        container.className = 'generic-preview';

        const icon = document.createElement('span');
        icon.className = `material-icons-round type-icon ${getFileIconClass(file.type)}`;
        icon.textContent = getFileIcon(file.type);

        const text = document.createElement('p');
        text.textContent = 'Preview not available for this type.';

        container.appendChild(icon);
        container.appendChild(text);
        bodyContent.appendChild(container);
    }
}

function closeModal() {
    const modal = document.getElementById('preview-modal');
    modal.classList.remove('active');

    const bodyContent = document.getElementById('modal-body-content');
    const iframe = bodyContent.querySelector('iframe');
    const img = bodyContent.querySelector('img');
    const video = bodyContent.querySelector('video');
    if (iframe && iframe.src) URL.revokeObjectURL(iframe.src);
    if (img && img.src) URL.revokeObjectURL(img.src);
    if (video && video.src) URL.revokeObjectURL(video.src);

    bodyContent.innerHTML = '';
}

// Helpers
function getFileIcon(mimeType) {
    if (!mimeType) return 'insert_drive_file';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'videocam';
    if (mimeType.startsWith('audio/')) return 'audiotrack';
    if (mimeType.startsWith('text/')) return 'description';
    if (mimeType === 'application/pdf') return 'picture_as_pdf';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'archive';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'table_chart';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'slideshow';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'article';
    return 'insert_drive_file';
}

function getFileIconClass(mimeType) {
    if (!mimeType) return 'generic';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'word';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'excel';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'ppt';
    if (mimeType.startsWith('text/')) return 'text';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'archive';
    return 'generic';
}

function getFriendlyTypeName(mimeType) {
    if (!mimeType) return 'Unknown File';
    if (mimeType.startsWith('image/')) return 'Image File';
    if (mimeType.startsWith('video/')) return 'Video File';
    if (mimeType.startsWith('audio/')) return 'Audio File';
    if (mimeType === 'text/plain') return 'Text Document';
    if (mimeType.startsWith('text/')) return 'Code / Text File';
    if (mimeType === 'application/pdf') return 'PDF Document';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'Archive (ZIP/RAR)';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'Spreadsheet';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'Presentation';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'Word Document';
    return mimeType;
}

function formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Toast System
function showToast(message, isError = false) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    if (isError) toast.style.backgroundColor = 'var(--danger-color)';

    toast.innerHTML = `
        <span class="material-icons-round">${isError ? 'error_outline' : 'info'}</span>
        <span>${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3250);
}

// Theme Handlers
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
}

function toggleTheme() {
    if (document.body.classList.contains('dark-theme')) {
        document.body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
        showToast('Settings saved: Light Mode');
    } else {
        document.body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
        showToast('Settings saved: Dark Mode');
    }
}
