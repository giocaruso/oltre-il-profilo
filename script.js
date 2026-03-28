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

        if (urlFile.includes('motore-universale-quiz.html')) {
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
        // Novità: Stampa il "timbro" invisibile nella memoria locale del browser
        localStorage.setItem('quizAT_sbloccato', 'true');
        caricaPagina('pagine/cruscotto-quiz-manuale-3-at.html');
    } else {
        alert("Password errata! Controlla la chiave indicata nel manuale.");
    }
}

// NUOVA FUNZIONE: Controlla se l'utente ha già il permesso
function controllaAccessoQuizAT() {
    // Controlla se il browser ha già il timbro di sblocco
    if (localStorage.getItem('quizAT_sbloccato') === 'true') {
        // Se sì, salta la password e vai dritto al cruscotto
        caricaPagina('pagine/cruscotto-quiz-manuale-3-at.html');
    } else {
        // Se no, mostra la pagina per chiedere la password
        caricaPagina('pagine/manuale-3-quiz-at.html');
    }
}
// NUOVA FUNZIONE: Resetta l'accesso (Logout)
function bloccaSimulatore() {
    // Rimuove il "timbro" dalla memoria
    localStorage.removeItem('quizAT_sbloccato');
    alert("Simulatore bloccato con successo.");
    // Torna alla pagina di inserimento password
    caricaPagina('pagine/manuale-3-quiz-at.html');
}

// ==========================================
// --- LOGICA DI AVVIO DELLE MODALITÀ ---
// ==========================================

// AGGIORNATO: Aggiunto il parametro tipoSimulazione (default 'studio')
function avviaSimulazione(sorgenteJson, modalita, filtro, nomeTest = "", tipoSimulazione = "studio") {
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

            // SALVATAGGIO DEL "SEGNALIBRO" DI RITORNO E MODALITÀ
            let urlRitorno = 'pagine/cruscotto-quiz-manuale-3-at.html';
            if (sorgenteJson.includes('antincendio')) {
                urlRitorno = 'pagine/cruscotto-quiz-antincendio-at.html';
            }
            sessionStorage.setItem('cruscottoRitorno', urlRitorno);
            sessionStorage.setItem('tipoSimulazione', tipoSimulazione);

            sessionStorage.setItem('domandeCorrenti', JSON.stringify(selezionate));
            sessionStorage.setItem('titoloQuiz', titoloVisibile); 

            caricaPagina('pagine/motore-universale-quiz.html');
        })
        .catch(error => {
            console.error(error);
            alert("Errore nel caricamento dei quiz. Verifica la cartella 'json'.");
        });
}

// ==========================================
// --- LOGICA INTERNA MOTORE QUIZ ---
// ==========================================

// AGGIORNATO: Smistamento tra Studio ed Esame
function inizializzaQuiz() {
    const data = sessionStorage.getItem('domandeCorrenti');
    const titolo = sessionStorage.getItem('titoloQuiz'); 
    const mode = sessionStorage.getItem('tipoSimulazione') || 'studio';
    
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

    if (mode === 'esame') {
        mostraPaginaEsame();
    } else {
        mostraDomanda();
    }
}

// === BINARIO 1: MODALITÀ STUDIO (Invariato) ===
function mostraDomanda() {
    const q = currentQuestions[currentIndex];
    const container = document.getElementById('options-container');
    const feedbackBox = document.getElementById('feedback-box');
    const btnPrev = document.getElementById('btn-prev'); 
    const progressBar = document.getElementById('progress-bar-fill'); 
    
    if (!q) return;

    if (btnPrev) {
        btnPrev.style.display = (currentIndex > 0) ? 'inline-block' : 'none';
    }

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
        
        if (q.rispostaUtente !== undefined) {
            btn.disabled = true;
            if (index === q.corretta) {
                btn.classList.add('correct');
            } else if (index === q.rispostaUtente) {
                btn.classList.add('wrong');
            }
        } else {
            btn.onclick = () => verificaRisposta(index, btn);
        }
        
        container.appendChild(btn);
    });

    if (q.rispostaUtente !== undefined) {
        mostraFeedback(q.rispostaUtente === q.corretta, q);
    }
}

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
            refElement.parentElement.style.display = 'block'; 
        } else {
            refElement.parentElement.style.display = 'none'; 
        }
    }

    feedbackBox.style.display = 'block';
    document.getElementById('score-display').innerText = score;
}

function verificaRisposta(selectedIndex, clickedBtn) {
    const q = currentQuestions[currentIndex];
    
    if (q.rispostaUtente !== undefined) return;
    
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

// === BINARIO 2: NUOVA MODALITÀ ESAME ===
function mostraPaginaEsame() {
    const containerMaster = document.getElementById('question-box');
    
    // Nasconde il layout a singola domanda
    document.getElementById('question-text').style.display = 'none';
    document.getElementById('options-container').style.display = 'none';
    document.getElementById('feedback-box').style.display = 'none';
    document.getElementById('score-display').parentElement.style.display = 'none'; // Nasconde il punteggio live
    
    // Crea o svuota il contenitore a lista
    let examContainer = document.getElementById('exam-container');
    if (!examContainer) {
        examContainer = document.createElement('div');
        examContainer.id = 'exam-container';
        containerMaster.insertBefore(examContainer, containerMaster.firstChild);
    }
    examContainer.innerHTML = '';

    const itemsPerPage = 10;
    const start = currentIndex;
    const end = Math.min(start + itemsPerPage, currentQuestions.length);

    document.getElementById('progress-text').innerText = `Domande ${start + 1} - ${end} di ${currentQuestions.length}`;
    
    const progressBar = document.getElementById('progress-bar-fill'); 
    if (progressBar) progressBar.style.width = ((end / currentQuestions.length) * 100) + '%';

    // Stampa il blocco di 10 domande
    for (let i = start; i < end; i++) {
        const q = currentQuestions[i];
        const block = document.createElement('div');
        block.style.marginBottom = '35px';
        block.style.textAlign = 'left';
        block.style.borderBottom = '1px solid #e2e8f0';
        block.style.paddingBottom = '25px';

        const title = document.createElement('h4');
        title.innerText = `${i + 1}. ${q.domanda}`;
        title.style.color = 'var(--secondary)';
        title.style.fontSize = '1.1rem';
        title.style.marginBottom = '15px';
        block.appendChild(title);

        const optsDiv = document.createElement('div');
        optsDiv.style.display = 'flex';
        optsDiv.style.flexDirection = 'column';
        optsDiv.style.gap = '10px';

        q.opzioni.forEach((opz, optIndex) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.innerText = opz;
            btn.style.textAlign = 'left';
            
            // Applica stile neutro se l'utente aveva già selezionato l'opzione
            if (q.rispostaUtente === optIndex) {
                btn.style.borderColor = 'var(--primary)';
                btn.style.backgroundColor = '#e1f5fe'; 
            }
            
            // Nessuna spiegazione o feedback, solo selezione visiva
            btn.onclick = () => {
                q.rispostaUtente = optIndex;
                Array.from(optsDiv.children).forEach(b => {
                    b.style.borderColor = '#cbd5e0'; 
                    b.style.backgroundColor = '#fff';
                });
                btn.style.borderColor = 'var(--primary)';
                btn.style.backgroundColor = '#e1f5fe';
            };
            optsDiv.appendChild(btn);
        });
        block.appendChild(optsDiv);
        examContainer.appendChild(block);
    }

    // Gestione bottoni di navigazione in basso
    const btnPrev = document.getElementById('btn-prev'); 
    if (btnPrev) btnPrev.style.display = (start > 0) ? 'inline-block' : 'none';

    // Trasforma il tasto Avanti nell'ultimo foglio
    const btnNext = document.querySelector('button[onclick="prossimaDomanda()"]');
    if (btnNext) {
        if (end >= currentQuestions.length) {
            btnNext.innerText = "Vedi Risultati 🏆";
            btnNext.style.backgroundColor = "#ff5e00"; // Colore di evidenza
            btnNext.style.color = "#fff";
        } else {
            btnNext.innerText = "Continua ➡️";
            btnNext.style.backgroundColor = ""; 
            btnNext.style.color = "";
        }
    }
}

// === NAVIGAZIONE DINAMICA E RISULTATI ===

function domandaPrecedente() {
    const mode = sessionStorage.getItem('tipoSimulazione');
    if (mode === 'esame') {
        if (currentIndex >= 10) {
            currentIndex -= 10;
            mostraPaginaEsame();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } else {
        if (currentIndex > 0) {
            currentIndex--;
            mostraDomanda();
        }
    }
}

function prossimaDomanda() {
    const mode = sessionStorage.getItem('tipoSimulazione');
    if (mode === 'esame') {
        currentIndex += 10;
        if (currentIndex < currentQuestions.length) {
            mostraPaginaEsame();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            mostraRisultatoFinale();
        }
    } else {
        currentIndex++;
        if (currentIndex < currentQuestions.length) {
            mostraDomanda();
        } else {
            mostraRisultatoFinale();
        }
    }
}

function mostraRisultatoFinale() {
    const mode = sessionStorage.getItem('tipoSimulazione');
    
    // Completa la barra
    const progressBar = document.getElementById('progress-bar-fill'); 
    if (progressBar) progressBar.style.width = '100%'; 

    // Nasconde box feedback e navigazione per entrambe le modalità
    document.getElementById('feedback-box').style.display = 'none';
    const navBox = document.getElementById('navigation-box');
    if (navBox) navBox.style.display = 'none';

    // Mostra il trofeo dei risultati
    document.getElementById('result-box').style.display = 'block';
    // Mostra il tasto finale a fondo pagina
    const fineBox = document.getElementById('fine-esame-box');
    if (fineBox) fineBox.style.display = 'block';

    if (mode === 'esame') {
        // Calcola il punteggio finale
        score = currentQuestions.filter(q => q.rispostaUtente === q.corretta).length;

        // Costruisce il "Foglio degli Errori"
        const containerMaster = document.getElementById('question-box');
        containerMaster.style.display = 'block'; // Assicura che sia visibile
        
        let examContainer = document.getElementById('exam-container');
        if (!examContainer) {
            examContainer = document.createElement('div');
            examContainer.id = 'exam-container';
            containerMaster.insertBefore(examContainer, containerMaster.firstChild);
        }
        examContainer.innerHTML = ''; // Svuota l'esame precedente

        // Titolo di revisione
        const intestazione = document.createElement('h3');
        intestazione.innerText = "📝 Foglio degli Errori";
        intestazione.style.color = 'var(--secondary)';
        intestazione.style.marginTop = '40px';
        intestazione.style.marginBottom = '30px';
        intestazione.style.textAlign = 'center';
        intestazione.style.borderBottom = '2px dashed #cbd5e0';
        intestazione.style.paddingBottom = '15px';
        examContainer.appendChild(intestazione);

        // Controllo se ci sono errori da mostrare
        if (score === currentQuestions.length) {
            const messaggioPerfetto = document.createElement('p');
            messaggioPerfetto.innerText = "🎉 Complimenti! Hai risposto correttamente a tutte le domande. Nessun errore da revisionare.";
            messaggioPerfetto.style.fontSize = '1.2rem';
            messaggioPerfetto.style.color = '#2f855a';
            messaggioPerfetto.style.fontWeight = 'bold';
            messaggioPerfetto.style.textAlign = 'center';
            examContainer.appendChild(messaggioPerfetto);
        } else {
            // Stampa SOLO le domande con errori, mantenendo la numerazione originale
            currentQuestions.forEach((q, i) => {
                // SE LA RISPOSTA E' CORRETTA, SALTA E NON STAMPARE
                if (q.rispostaUtente === q.corretta) return;

                const block = document.createElement('div');
                block.style.marginBottom = '35px';
                block.style.textAlign = 'left';
                block.style.borderBottom = '1px solid #e2e8f0';
                block.style.paddingBottom = '25px';

                const title = document.createElement('h4');
                title.innerText = `${i + 1}. ${q.domanda}`;
                title.style.color = 'var(--secondary)';
                title.style.fontSize = '1.1rem';
                title.style.marginBottom = '15px';
                block.appendChild(title);

                const optsDiv = document.createElement('div');
                optsDiv.style.display = 'flex';
                optsDiv.style.flexDirection = 'column';
                optsDiv.style.gap = '10px';

                q.opzioni.forEach((opz, optIndex) => {
                    const btn = document.createElement('button');
                    btn.className = 'option-btn';
                    btn.innerText = opz;
                    btn.style.textAlign = 'left';
                    btn.disabled = true; // Disabilita i click

                    // Logica dei colori
                    if (optIndex === q.corretta) {
                        btn.classList.add('correct'); // Evidenzia la risposta esatta di verde
                    } else if (q.rispostaUtente === optIndex) {
                        btn.classList.add('wrong'); // Evidenzia l'errore dell'utente di rosso
                    }

                    optsDiv.appendChild(btn);
                });
                block.appendChild(optsDiv);
                examContainer.appendChild(block);
            });
        }

    } else {
        // Modalità Studio: Nasconde solo il box delle domande
        document.getElementById('question-box').style.display = 'none';
    }

    // Scrive i punteggi
    document.getElementById('final-score').innerText = score;
    document.getElementById('total-questions').innerText = currentQuestions.length;

    // Riporta la visuale morbidamente in cima per mostrare il trofeo!
    window.scrollTo({ top: 0, behavior: 'smooth' });
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