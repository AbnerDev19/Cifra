
// Importando o Firebase V10+ direto do CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// COLOQUE SUAS CHAVES AQUI
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

// Estado da aplicação
window.songs = []; // Colocado no window para o HTML acessar nos onclick
window.currentSongId = null;
window.scrollInterval = null;
window.transposeSteps = 0;
window.originalContent = "";
window.currentFontSize = 16;

// --- BUSCAR DADOS DO FIREBASE ---
async function loadSongsFromFirebase() {
    document.getElementById('songs-list').innerHTML = '<div class="empty-state">Carregando cifras da nuvem...</div>';
    const querySnapshot = await getDocs(songsCol);
    window.songs = [];
    querySnapshot.forEach((doc) => {
        window.songs.push({ id: doc.id, ...doc.data() });
    });
    window.songs.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)); // Mais recentes primeiro
    window.renderSongs();
}

// --- SALVAR NO FIREBASE ---
window.saveSong = async function () {
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
    btnSave.innerText = "Salvando...";

    try {
        if (window.currentSongId) {
            await updateDoc(doc(db, "songs", window.currentSongId), songData);
        } else {
            await addDoc(songsCol, songData);
        }
        await loadSongsFromFirebase();
        window.showHome();
    } catch (error) {
        console.error("Erro ao salvar: ", error);
        alert("Erro ao salvar no Firebase. Verifique as regras de segurança.");
    } finally {
        btnSave.innerText = "Salvar Cifra";
    }
}

// --- DELETAR NO FIREBASE ---
window.deleteSong = async function (event, id) {
    event.stopPropagation();
    if (confirm(`Tem certeza que deseja apagar esta cifra da nuvem?`)) {
        try {
            await deleteDoc(doc(db, "songs", id));
            await loadSongsFromFirebase();
        } catch (error) {
            console.error("Erro ao deletar: ", error);
        }
    }
}

// --- MANTER O RESTO DA LÓGICA DE UI INTACTA ---
// (Copie todas as funções de navegação, transposição, rolagem e upload de TXT 
// do script anterior e cole aqui. Lembre-se de colocar 'window.' antes do nome das 
// funções principais como showHome, showEditor, showPlayer, renderSongs, transpose, etc., 
// para que os botões do HTML consigam chamá-las de fora do 'type="module"').

window.showHome = function () {
    document.getElementById('view-home').classList.remove('hidden');
    document.getElementById('view-editor').classList.add('hidden');
    document.getElementById('view-player').classList.add('hidden');
    window.stopScroll();
    window.renderSongs();
};

// ... COLE O RESTO DAS FUNÇÕES AQUI (renderSongs, showEditor, showPlayer, etc.) ...

// Inicializa buscando do banco
loadSongsFromFirebase();

