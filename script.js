// ==========================================
// --- CONFIGURAZIONI E VARIABILI GLOBALI ---
// ==========================================
const SECRET_HASH = "cGFzc3dlYg=="; 

let currentQuestions = [];
let currentIndex = 0;
let score = 0;

// ==========================================
// --- SISTEMA DI NAVIGAZIONE (SPA) ---
// ==========================================

async function caricaPagina(urlFile) {
    try {
        const response = await fetch(urlFile);
        if (!response.ok) throw new Error("Pagina non trovata: " + urlFile);
        const html = await response.text();
        
        const homeHub = document.getElementById('home-hub');
        if(homeHub) homeHub.style.display = 'none';
        
        const hero = document.querySelector('.hero');
        if(hero) hero.style.display = 'none';
        
        const contenitore = document.getElementById('contenuto-pagina');
        if(contenitore) contenitore.innerHTML = html;
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
        sessionStorage.setItem('paginaSalvata', urlFile);

        if (urlFile.includes('motore-quiz-manuale-3-at.html')) {
            setTimeout(inizializzaQuiz, 150);
        }

    } catch (e) {
        console.error(e);
        alert("Errore nel caricamento della sezione richiesta.");
    }
}

function tornaAllHub() {
    const contenitore = document.getElementById('contenuto-pagina');
    if(contenitore) contenitore.innerHTML = '';
    
    const homeHub = document.getElementById('home-hub');
    if(homeHub) homeHub.style.display = 'block';
    
    const hero = document.querySelector('.hero');
    if(hero) hero.style.display = 'block';
    
    sessionStorage.removeItem('paginaSalvata');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function vaiANewsletter() {
    tornaAllHub();
    setTimeout(() => {
        const newsletterSection = document.getElementById('newsletter');
        if (newsletterSection) {
            newsletterSection.scrollIntoView({ behavior: 'smooth' });
        }
    }, 150);
}

// NUOVA FUNZIONE: Gestisce l'uscita dinamica dal motore quiz
function esciDalQuiz() {
    const urlRitorno = sessionStorage.getItem('cruscottoRitorno') || 'pagine/area-test.html';
    caricaPagina(urlRitorno);
}

// ==========================================
// --- GESTIONE PASSWORD ---
// ==========================================

function sbloccaSimulatore() {
    const inputPwd = document.getElementById('pass-word');
    if (!inputPwd) return;

    // Rimuove spazi vuoti e trasforma tutto in minuscolo
    const pwd = inputPwd.value.trim().toLowerCase();

    if (btoa(pwd) === SECRET_HASH) {
        caricaPagina('pagine/cruscotto-quiz-manuale-3-at.html');
    } else {
        alert("Password errata! Controlla la chiave indicata nel manuale.");
    }
}

// ==========================================
// --- LOGICA DI AVVIO DELLE MODALITÀ ---
// ==========================================

// AGGIORNATO: Aggiunto il parametro opzionale nomeTest per ricevere il titolo dal cruscotto
function avviaSimulazione(sorgenteJson, modalita, filtro, nomeTest = "") {
    fetch('json/' + sorgenteJson) 
        .then(response => {
            if (!response.ok) throw new Error('Database quiz non trovato.');
            return response.json();
        })
        .then(data => {
            let selezionate = [];
            let titoloVisibile = nomeTest || "Quiz Assistente Tecnico"; 

            if (modalita === 'random') {
                selezionate = data.sort(() => 0.5 - Math.random()).slice(0, filtro);
                titoloVisibile = nomeTest ? nomeTest + " (" + filtro + " quesiti)" : "Simulazione Esame (" + filtro + " quesiti)";
            } 
            else if (modalita === 'categoria') {
                selezionate = data.filter(d => d.categoria && d.categoria.trim() === filtro.trim());
                selezionate = selezionate.sort(() => 0.5 - Math.random());
                titoloVisibile = nomeTest ? nomeTest + " - " + filtro : "Argomento: " + filtro; 
            } 
            else if (modalita === 'all') {
                selezionate = data.sort(() => 0.5 - Math.random());
                titoloVisibile = nomeTest ? nomeTest + " (" + selezionate.length + " quesiti)" : "Maratona Completa (" + selezionate.length + " quesiti)";
            }

            if (selezionate.length === 0) {
                alert("Nessuna domanda trovata per la categoria selezionata.");
                return;
            }

            // SALVATAGGIO DEL "SEGNALIBRO" DI RITORNO
            let urlRitorno = 'pagine/cruscotto-quiz-manuale-3-at.html';
            if (sorgenteJson.includes('antincendio')) {
                urlRitorno = 'pagine/cruscotto-quiz-antincendio-at.html';
            }
            sessionStorage.setItem('cruscottoRitorno', urlRitorno);

            sessionStorage.setItem('domandeCorrenti', JSON.stringify(selezionate));
            sessionStorage.setItem('titoloQuiz', titoloVisibile); 

            caricaPagina('pagine/motore-quiz-manuale-3-at.html');
        })
        .catch(error => {
            console.error(error);
            alert("Errore nel caricamento dei quiz. Verifica la cartella 'json'.");
        });
}

// ==========================================
// --- LOGICA INTERNA MOTORE QUIZ ---
// ==========================================

function inizializzaQuiz() {
    const data = sessionStorage.getItem('domandeCorrenti');
    const titolo = sessionStorage.getItem('titoloQuiz'); 
    
    if (!data) {
        tornaAllHub();
        return;
    }

    currentQuestions = JSON.parse(data);
    currentIndex = 0;
    score = 0;
    
    const titleEl = document.getElementById('quiz-title');
    if (titleEl) {
        titleEl.innerText = titolo;
    }

    mostraDomanda();
}

function mostraDomanda() {
    const q = currentQuestions[currentIndex];
    const container = document.getElementById('options-container');
    const feedbackBox = document.getElementById('feedback-box');
    const btnPrev = document.getElementById('btn-prev'); 
    const progressBar = document.getElementById('progress-bar-fill'); 
    
    if (!q) return;

    // Gestione visibilità Tasto Indietro
    if (btnPrev) {
        btnPrev.style.display = (currentIndex > 0) ? 'inline-block' : 'none';
    }

    // Calcolo Barra di avanzamento
    if (progressBar) {
        const percentuale = (currentIndex / currentQuestions.length) * 100;
        progressBar.style.width = percentuale + '%';
    }

    if (feedbackBox) feedbackBox.style.display = 'none';
    if (container) container.innerHTML = '';
    
    document.getElementById('progress-text').innerText = `Domanda ${currentIndex + 1} di ${currentQuestions.length}`;
    document.getElementById('question-text').innerText = q.domanda;
    document.getElementById('score-display').innerText = score;

    q.opzioni.forEach((opzione, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opzione;
        
        // Verifica se l'utente aveva già risposto a questa domanda (Ripasso)
        if (q.rispostaUtente !== undefined) {
            btn.disabled = true;
            if (index === q.corretta) {
                btn.classList.add('correct');
            } else if (index === q.rispostaUtente) {
                btn.classList.add('wrong');
            }
        } else {
            // Se è la prima volta che vede la domanda, assegna l'evento click
            btn.onclick = () => verificaRisposta(index, btn);
        }
        
        container.appendChild(btn);
    });

    // Mostra il feedback immediatamente se stiamo ripassando una domanda già risposta
    if (q.rispostaUtente !== undefined) {
        mostraFeedback(q.rispostaUtente === q.corretta, q);
    }
}

// Funzione helper per gestire la grafica del feedback
function mostraFeedback(isCorrect, q) {
    const feedbackBox = document.getElementById('feedback-box');
    
    if (isCorrect) {
        document.getElementById('feedback-status').innerText = "✅ Risposta Esatta!";
        feedbackBox.style.backgroundColor = "#f0fff4";
        document.getElementById('feedback-status').style.color = "#2f855a";
    } else {
        document.getElementById('feedback-status').innerText = "❌ Risposta non corretta";
        feedbackBox.style.backgroundColor = "#fff5f5";
        document.getElementById('feedback-status').style.color = "#c53030";
    }

    // Gestione gracefully dell'assenza di spiegazioni (es. test antincendio)
    const expElement = document.getElementById('feedback-explanation');
    if (expElement) {
        if (q.spiegazione) {
            expElement.innerText = q.spiegazione;
            expElement.style.display = 'block';
        } else {
            expElement.style.display = 'none';
        }
    }

    const refElement = document.getElementById('feedback-ref');
    if (refElement) {
        if (q._ref) {
            refElement.innerText = q._ref;
            refElement.parentElement.style.display = 'block'; // Mostra l'intera riga se c'è il riferimento
        } else {
            refElement.parentElement.style.display = 'none'; // Nasconde l'intera riga (compresa la scritta fissa) se manca
        }
    }

    feedbackBox.style.display = 'block';
    
    document.getElementById('score-display').innerText = score;
}

function verificaRisposta(selectedIndex, clickedBtn) {
    const q = currentQuestions[currentIndex];
    
    // Evita doppi click o alterazioni se c'è già una risposta
    if (q.rispostaUtente !== undefined) return;
    
    // Salva la scelta dell'utente in memoria
    q.rispostaUtente = selectedIndex;

    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach(btn => btn.disabled = true);

    const isCorrect = (selectedIndex === q.corretta);
    
    if (isCorrect) {
        clickedBtn.classList.add('correct');
        score++;
    } else {
        clickedBtn.classList.add('wrong');
        buttons[q.corretta].classList.add('correct'); 
    }

    mostraFeedback(isCorrect, q);
}

// NUOVA FUNZIONE: Tasto Indietro
function domandaPrecedente() {
    if (currentIndex > 0) {
        currentIndex--;
        mostraDomanda();
    }
}

function prossimaDomanda() {
    currentIndex++;
    if (currentIndex < currentQuestions.length) {
        mostraDomanda();
    } else {
        mostraRisultatoFinale();
    }
}

function mostraRisultatoFinale() {
    const progressBar = document.getElementById('progress-bar-fill'); 
    if (progressBar) progressBar.style.width = '100%'; // Completa la barra

    document.getElementById('question-box').style.display = 'none';
    document.getElementById('feedback-box').style.display = 'none';
    document.getElementById('result-box').style.display = 'block';
    document.getElementById('final-score').innerText = score;
    document.getElementById('total-questions').innerText = currentQuestions.length;
}

// ==========================================
// --- CARICAMENTO COMPONENTI ESTERNI ---
// ==========================================

async function caricaComponente(idContenitore, fileHtml) {
    try {
        const response = await fetch(fileHtml);
        if (response.ok) {
            const html = await response.text();
            document.getElementById(idContenitore).innerHTML = html;
        }
    } catch (e) {
        console.error("Errore componente:", fileHtml);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    caricaComponente('header-placeholder', 'pagine/header.html');
    caricaComponente('footer-placeholder', 'pagine/footer.html');

    const pagina = sessionStorage.getItem('paginaSalvata');
    if (pagina) {
        caricaPagina(pagina);
    }
});