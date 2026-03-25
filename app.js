// Importando o Firebase V10+ direto do CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// SUAS CHAVES DO FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyCQWFymbRCgWxBT0pnhPGoUfmpM7gcujRQ",
    authDomain: "cifra-a2b7d.firebaseapp.com",
    projectId: "cifra-a2b7d",
    storageBucket: "cifra-a2b7d.firebasestorage.app",
    messagingSenderId: "590751453731",
    appId: "1:590751453731:web:593d478ad0aa1a8b1f5796",
    measurementId: "G-19RHFHVF00"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const songsCol = collection(db, "songs");

// ESTADO GLOBAL DA APLICAÇÃO
window.songs = []; 
window.currentSongId = null;
window.scrollInterval = null;
window.transposeSteps = 0;
window.originalContent = "";
window.currentFontSize = 16;

const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const enharmonics = { 'Cb': 'B', 'Db': 'C#', 'Eb': 'D#', 'Fb': 'E', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#', 'E#': 'F', 'B#': 'C' };
const chordRegex = /\b([CDEFGAB](?:#|b)?(?:maj7|maj9|maj|m7|m9|m11|m13|m|dim7|dim|aug|sus2|sus4|sus|add9|add|\d+)*(?:\/[CDEFGAB](?:#|b)?)?)\b/g;

// --- INTEGRAÇÃO COM FIREBASE ---
window.loadSongsFromFirebase = async function() {
    document.getElementById('songs-list').innerHTML = '<div class="empty-state">Carregando cifras da nuvem...</div>';
    try {
        const querySnapshot = await getDocs(songsCol);
        window.songs = [];
        querySnapshot.forEach((doc) => {
            window.songs.push({ id: doc.id, ...doc.data() });
        });
        window.songs.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)); 
        window.renderSongs();
    } catch (error) {
        console.error("Erro ao carregar: ", error);
        document.getElementById('songs-list').innerHTML = '<div class="empty-state" style="color:red;">Erro ao carregar cifras.</div>';
    }
};

window.saveSong = async function() {
    const title = document.getElementById('song-title').value.trim() || 'Sem título';
    const artist = document.getElementById('song-artist').value.trim() || 'Artista desconhecido';
    const key = document.getElementById('song-key').value.trim();
    const tempo = document.getElementById('song-tempo').value.trim();
    const content = document.getElementById('song-content').value;

    if (!content.trim()) {
        alert('A cifra não pode ficar vazia.');
        return;
    }

    const songData = {
        title, artist, key, tempo, content,
        updatedAt: new Date().getTime()
    };

    const btnSave = document.querySelector('.btn-primary[onclick="saveSong()"]');
    if(btnSave) btnSave.innerText = "Salvando...";

    try {
        if (window.currentSongId) {
            await updateDoc(doc(db, "songs", window.currentSongId), songData);
        } else {
            await addDoc(songsCol, songData);
        }
        await window.loadSongsFromFirebase();
        window.showHome();
    } catch (error) {
        console.error("Erro ao salvar: ", error);
        alert("Erro ao salvar no Firebase.");
    } finally {
        if(btnSave) btnSave.innerText = "Salvar Cifra";
    }
};

window.deleteSong = async function(event, id) {
    event.stopPropagation();
    if (confirm(`Tem certeza que deseja apagar esta cifra da nuvem?`)) {
        try {
            await deleteDoc(doc(db, "songs", id));
            await window.loadSongsFromFirebase();
        } catch (error) {
            console.error("Erro ao deletar: ", error);
        }
    }
};

// --- NAVEGAÇÃO E UI ---
window.hideAll = function() {
    document.getElementById('view-home').classList.add('hidden');
    document.getElementById('view-editor').classList.add('hidden');
    document.getElementById('view-player').classList.add('hidden');
    window.stopScroll();
};

window.showHome = function() {
    window.hideAll();
    document.getElementById('view-home').classList.remove('hidden');
    window.renderSongs();
};

window.showEditor = function(id = null) {
    window.hideAll();
    document.getElementById('view-editor').classList.remove('hidden');
    document.getElementById('txt-upload').value = '';

    if (id) {
        const song = window.songs.find(s => s.id === id);
        if (!song) return window.showHome();
        window.currentSongId = song.id;
        document.getElementById('editor-heading').innerText = 'Editar Cifra';
        document.getElementById('song-title').value = song.title || '';
        document.getElementById('song-artist').value = song.artist || '';
        document.getElementById('song-key').value = song.key || '';
        document.getElementById('song-tempo').value = song.tempo || '';
        document.getElementById('song-content').value = song.content || '';
    } else {
        window.currentSongId = null;
        document.getElementById('editor-heading').innerText = 'Nova Cifra';
        document.getElementById('song-title').value = '';
        document.getElementById('song-artist').value = '';
        document.getElementById('song-key').value = '';
        document.getElementById('song-tempo').value = '';
        document.getElementById('song-content').value = '';
    }
};

window.showPlayer = function(id) {
    window.hideAll();
    document.getElementById('view-player').classList.remove('hidden');

    const song = window.songs.find(s => s.id === id);
    if (!song) return window.showHome();

    window.currentSongId = song.id;
    window.transposeSteps = 0;
    window.originalContent = song.content || '';
    window.currentFontSize = 16;
    document.getElementById('chords-display').style.fontSize = window.currentFontSize + 'px';

    document.getElementById('display-title').innerText = song.title || 'Sem título';
    document.getElementById('display-artist').innerText = song.artist || 'Artista desconhecido';
    document.getElementById('display-key').innerText = 'Tom: ' + (song.key || '-');
    document.getElementById('display-tempo').innerText = 'Tempo: ' + (song.tempo || '-');
    document.getElementById('current-key-badge').innerText = song.key || '-';

    window.renderChords();
    window.scrollTo(0, 0);
};

window.loadTxtFile = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('song-content').value = e.target.result;
    };
    reader.readAsText(file);
};

window.editCurrentSong = function() {
    if (window.currentSongId) window.showEditor(window.currentSongId);
};

window.renderSongs = function() {
    const term = document.getElementById('search-input').value.toLowerCase();
    const sortBy = document.getElementById('sort-select').value;
    const list = document.getElementById('songs-list');
    list.innerHTML = '';

    let filtered = window.songs.filter(song => {
        return (song.title || '').toLowerCase().includes(term) ||
               (song.artist || '').toLowerCase().includes(term);
    });

    if (sortBy === 'title') {
        filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else {
        filtered.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    }

    if (window.songs.length === 0) {
        list.innerHTML = `<div class="empty-state">Nenhuma cifra criada ainda. Clique em "+ Nova Cifra" para começar.</div>`;
        return;
    }

    if (filtered.length === 0) {
        list.innerHTML = `<div class="empty-state" style="border:none;">Nenhum resultado encontrado.</div>`;
        return;
    }

    filtered.forEach(song => {
        const card = document.createElement('div');
        card.className = 'song-card';
        card.onclick = () => window.showPlayer(song.id);
        card.innerHTML = `
            <button class="btn btn-danger song-card-delete" onclick="window.deleteSong(event, '${song.id}')">✕</button>
            <div class="song-card-title">${window.escapeHtml(song.title)}</div>
            <div class="song-card-artist">${window.escapeHtml(song.artist)}</div>
            <div class="song-card-meta">
                <span>Tom: ${window.escapeHtml(song.key || '-')}</span>
                <span>Tempo: ${window.escapeHtml(song.tempo || '-')}</span>
            </div>
        `;
        list.appendChild(card);
    });
};

// --- CIFRAS, TOM E ROLAGEM ---
window.transposeChord = function(chordText, steps) {
    const match = chordText.match(/^([CDEFGAB](?:#|b)?)(.*)$/);
    if (!match) return chordText;
    let base = match[1];
    const extension = match[2] || '';
    if (enharmonics[base]) base = enharmonics[base];
    const index = notes.indexOf(base);
    if (index === -1) return chordText;
    let newIndex = (index + steps) % 12;
    if (newIndex < 0) newIndex += 12;
    return notes[newIndex] + extension;
};

window.transpose = function(steps) {
    window.transposeSteps += steps;
    window.renderChords();
};

window.isLikelyChordLine = function(line) {
    const trimmed = line.trim();
    if (!trimmed) return false;
    const tokens = trimmed.split(/\s+/).filter(Boolean);
    if (!tokens.length) return false;
    const chordMatches = tokens.filter(token => /^([CDEFGAB](?:#|b)?)(?:maj7|maj9|maj|m7|m9|m11|m13|m|dim7|dim|aug|sus2|sus4|sus|add9|add|\d+)*(?:\/[CDEFGAB](?:#|b)?)?$/.test(token));
    return chordMatches.length > 0 && chordMatches.length / tokens.length >= 0.5;
};

window.renderChords = function() {
    const lines = window.originalContent.split('\n');
    const htmlLines = lines.map(line => window.renderLine(line));
    document.getElementById('chords-display').innerHTML = htmlLines.join('\n');
    const song = window.songs.find(s => s.id === window.currentSongId);
    if (song && song.key) {
        document.getElementById('current-key-badge').innerText = window.transposeChord(song.key, window.transposeSteps);
    } else {
        document.getElementById('current-key-badge').innerText = window.transposeSteps === 0 ? '-' : (window.transposeSteps > 0 ? `+${window.transposeSteps}` : window.transposeSteps);
    }
};

window.renderLine = function(line) {
    if (!line.trim()) return '';
    const escapedLine = window.escapeHtml(line);
    if (!window.isLikelyChordLine(line)) return escapedLine;
    return escapedLine.replace(chordRegex, (match) => {
        if (match.includes('/')) {
            const [left, right] = match.split('/');
            return `<span class="chord">${window.escapeHtml(window.transposeChord(left, window.transposeSteps))}/${window.escapeHtml(window.transposeChord(right, window.transposeSteps))}</span>`;
        }
        return `<span class="chord">${window.escapeHtml(window.transposeChord(match, window.transposeSteps))}</span>`;
    });
};

window.changeFontSize = function(direction) {
    window.currentFontSize += direction;
    if (window.currentFontSize < 12) window.currentFontSize = 12;
    if (window.currentFontSize > 32) window.currentFontSize = 32;
    document.getElementById('chords-display').style.fontSize = window.currentFontSize + 'px';
};

window.toggleScroll = function() {
    const btn = document.getElementById('btn-scroll');
    if (window.scrollInterval) {
        window.stopScroll();
        return;
    }
    btn.innerText = '⏸ Pausar';
    btn.classList.add('btn-primary');
    window.startScroll();
};

window.startScroll = function() {
    const speedVal = Number(document.getElementById('scroll-speed').value);
    const intervalTime = Math.max(10, 110 - speedVal * 9);
    window.scrollInterval = setInterval(() => {
        window.scrollBy(0, 1);
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 2) window.stopScroll();
    }, intervalTime);
};

window.stopScroll = function() {
    if (window.scrollInterval) {
        clearInterval(window.scrollInterval);
        window.scrollInterval = null;
    }
    const btn = document.getElementById('btn-scroll');
    if (btn) {
        btn.innerText = '▶ Rolagem';
        btn.classList.remove('btn-primary');
    }
};

window.escapeHtml = function(text) {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};

// Event Listeners base da tela
document.getElementById('search-input').addEventListener('input', window.renderSongs);
document.getElementById('sort-select').addEventListener('change', window.renderSongs);
document.getElementById('scroll-speed').addEventListener('input', () => {
    if (window.scrollInterval) { window.stopScroll(); window.toggleScroll(); }
});

// Dá o pontapé inicial puxando os dados do Firebase e renderizando a tela inicial
window.loadSongsFromFirebase();