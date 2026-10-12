import { squadraUi } from './i18n-squadra.mjs';

// Feste Beschriftungen der Website in drei Sprachen.
// Redaktionelle Texte (Hero, Partner-Intro …) kommen aus content/einstellungen/texte.json und sind im CMS änderbar.

export const LANGS = ['de', 'en', 'it'];
export const DEFAULT_LANG = 'de';

export function prefix(lang) {
  return lang === DEFAULT_LANG ? '' : `/${lang}`;
}

export function url(lang, path = '/') {
  return `${prefix(lang)}${path}`;
}

const ui = {
  de: {
    kartfahrer: 'Kartfahrer',
    nav_news: 'News', nav_ueber: 'Über Luigi', nav_kalender: 'Kalender', nav_galerie: 'Galerie', nav_partner: 'Partner', nav_kontakt: 'Kontakt',
    login: 'Login', menu: 'Menü', skip: 'Zum Inhalt springen',
    intro_skip: 'Überspringen', intro_replay: 'Intro erneut abspielen',
    kicker: 'Startnummer 3', ticker_goal: 'Ziel Formel 1',
    btn_story: 'Luigis Geschichte', btn_partner: 'Partner werden', btn_sponsor: 'Sponsor werden', btn_squadra: 'Squadra Tre beitreten',
    next_race: 'Nächstes Rennen', days: 'Tage', hours: 'Std', minutes: 'Min', seconds: 'Sek', full_calendar: 'Ganzer Rennkalender', no_race: 'Termin folgt',
    highlights: 'Highlights', highlights_title: 'Was gerade passiert', all_news: 'Alle News', prev: 'Zurück', next: 'Weiter',
    on_track_text: 'Rennkalender, Ergebnisse und Statistiken von der Strecke.', off_track_text: 'Training, Werkstatt, Fahrerlager – der Alltag hinter Nummer 3.',
    stat_races: 'Rennen gestartet', stat_podiums: 'Podien', stat_wins: 'Siege', stat_countries: 'Länder',
    to_gallery: 'Zur Galerie', our_sponsors: 'Unsere Sponsoren', squadra_link: '+ Squadra Tre – unsere Unterstützer',
    your_logo: 'Dein Logo hier',
    news_kicker: 'News', news_title: 'Aus dem Fahrerlager', all: 'Alle', cat_Rennen: 'Rennen', cat_Team: 'Team', cat_Partner: 'Partner',
    read_more: 'Weiterlesen', back_news: 'Alle News', news_lang_note: '',
    ueber_kicker: 'Über Luigi', story_kicker: 'Video · Luigis Story', story_title: 'Mein Weg in den Motorsport', story_text: 'Wie alles begann, was mich antreibt – und warum ich eines Tages Formel-1-Pilot werden will. Ton an!', story_more: 'Mehr über Luigi', videos_kicker: 'Videos', videos_title: 'Luigi in Bewegung', ueber_title: 'Vom ersten Kart<br>zum großen <span class="red">Traum.</span>',
    steckbrief: 'Steckbrief', f_startnummer: 'Startnummer', f_nationalitaet: 'Nationalität', f_chassis: 'Chassis', f_klasse: 'Klasse', f_team: 'Team',
    f_lieblingsstrecke: 'Lieblingsstrecke', f_idole: 'Idole', f_ziel: 'Ziel',
    chapters_title: 'Wähle dein Kapitel', week_title: 'Eine Rennwoche mit Luigi', next_chapter: 'Schreib das nächste Kapitel mit.',
    kal_title: 'Kalender & Ergebnisse', season: 'Saison', col_date: 'Datum', col_series: 'Serie', col_track: 'Strecke', col_quali: 'Qualifying',
    col_final: 'Finale', col_status: 'Status', st_gefahren: 'gefahren', st_bevorstehend: 'bevorstehend', best: 'Beste Platzierung',
    gal_kicker: 'Galerie · #LBC3', gal_intro: 'Fotos von jedem Rennwochenende – sortiert nach Serie, Jahr und Strecke.', gal_race: 'Rennen', gal_races: 'Rennen', gal_more: 'Mehr aus der', gal_empty: 'Bald gibt es hier die ersten Fotos.', gal_soon: 'Fotos folgen', gal_soon_long: 'Die Fotos von diesem Rennwochenende folgen in Kürze.', breadcrumb: 'Navigationspfad', photos: 'Fotos', cat_strecke: 'Strecke', cat_fahrerlager: 'Fahrerlager', photo_credit: 'Fotos',
    enlarge: 'Foto vergrößern', close: 'Schließen', more_insta: 'Weitere Bilder auf Instagram',
    partner_kicker: 'Partner', two_ways: 'Zwei Wege ins Team',
    for_companies: 'Für Unternehmen', sponsors: 'Sponsoren', sponsors_lead: 'Firmen, die ein Paket aus unserer Sponsorenmappe buchen.',
    sp_b1: 'Logo auf Kart, Helm, Rennanzug – je nach Paket', sp_b2: 'Logo auf der Website und im Sponsoren-Laufband',
    sp_b3: 'Erwähnung in #LBC3-Posts und Rennberichten', sp_b4: 'Eigener Login: jederzeit Zugriff auf den Ausgabenbericht',
    show_packages: 'Pakete ansehen', for_fans: 'Für Fans, Freunde & Familie',
    squadra_lead: 'Unser Fan- und Unterstützerclub – für alle, die Luigi mit einem Beitrag fördern, egal in welcher Höhe.',
    sq_b1: 'Dein Name auf der Squadra-3-Wand (wenn du möchtest)', sq_b2: 'Renn-Updates direkt per E-Mail',
    sq_b3: 'Einladung zu einem Rennwochenende im Fahrerlager', sq_b4: 'Jahresbericht mit allen Ausgaben am Saisonende per E-Mail',
    join_now: 'Jetzt beitreten', packages: 'Sponsoring-Pakete', request_kit: 'Sponsorenmappe anfordern',
    ad_spaces: 'Werbeflächen', ad1: 'Frontspoiler & Frontverkleidung', ad2: 'Seitenkästen', ad3: 'Helm & Rennanzug', ad4: 'Website, Laufband & Instagram #LBC3', ad5: 'Teamzelt & Fahrerlager',
    wall: 'Die Wand der Squadra Tre', join_title: 'Squadra Tre beitreten', f_name: 'Name', f_email: 'E-Mail',
    f_type: 'Wie möchtest du unterstützen?', type_once: 'Einmaliger Beitrag', type_yearly: 'Jährlicher Beitrag', type_kind: 'Sachleistung (z. B. Reifen, Fahrten)',
    f_amount: 'Betrag in € (frei wählbar)', f_report: 'Ich möchte den Jahresbericht mit allen Ausgaben am Saisonende per E-Mail erhalten.',
    f_wall: 'Mein Name darf auf der Squadra-3-Wand stehen.', f_privacy: 'Ich habe die <a href="{ds}">Datenschutzerklärung</a> gelesen und stimme der Verarbeitung meiner Daten zu.',
    join_btn: 'Beitreten', join_note: 'Du bekommst eine E-Mail zur Bestätigung – erst danach bist du dabei.',
    join_ok_title: 'Fast geschafft!', join_ok_text: 'Bitte bestätige deine E-Mail-Adresse über den Link, den wir dir gerade geschickt haben.',
    join_err: 'Das hat leider nicht geklappt. Bitte versuche es später noch einmal oder schreib uns.',
    transparency: 'Transparenz', transparency_title: 'So zeigen wir, wohin eure Unterstützung geht',
    tr1_t: 'Laufend erfasst', tr1: 'Während der Saison erfassen wir alle Ausgaben nach Kategorien: Reisen, Material, Reifen, Nenngelder.',
    tr2_t: 'Sponsoren: jederzeit', tr2: 'Sponsoren sehen den Ausgabenbericht über ihren Login – jederzeit und immer aktuell.',
    tr3_t: 'Squadra Tre: zum Saisonende', tr3: 'Alle Mitglieder der Squadra Tre bekommen den Jahresbericht am Saisonende per E-Mail.',
    login_sponsors: 'Login für Sponsoren',
    kontakt_kicker: 'Kontakt', kontakt_title: 'Lass uns<br>reden.', write_msg: 'Nachricht schreiben', f_company: 'Firma (optional)', f_topic: 'Anliegen',
    topic1: 'Sponsoring / Partnerschaft', topic2: 'Sponsorenmappe anfordern', topic3: 'Presse', topic4: 'Sonstiges', f_message: 'Nachricht',
    send: 'Absenden', impressum: 'Impressum', datenschutz: 'Datenschutz', rights: 'Alle Rechte vorbehalten. Texte, Fotos, Design und Software dürfen ohne unsere schriftliche Erlaubnis nicht kopiert oder weiterverwendet werden.',
    thanks_title: 'Danke!', thanks_text: 'Deine Nachricht ist angekommen. Wir melden uns so schnell wie möglich.',
    confirmed_title: 'Benvenuto in der Squadra Tre!', confirmed_text: 'Deine E-Mail-Adresse ist bestätigt. Danke, dass du Luigi unterstützt!',
    back_home: 'Zur Startseite', not_found: 'Diese Seite gibt es nicht.'
  },
  en: {
    kartfahrer: 'Kart racer',
    nav_news: 'News', nav_ueber: 'About Luigi', nav_kalender: 'Calendar', nav_galerie: 'Gallery', nav_partner: 'Partners', nav_kontakt: 'Contact',
    login: 'Login', menu: 'Menu', skip: 'Skip to content',
    intro_skip: 'Skip', intro_replay: 'Replay intro',
    kicker: 'Race number 3', ticker_goal: 'Goal: Formula 1',
    btn_story: "Luigi's story", btn_partner: 'Become a partner', btn_sponsor: 'Become a sponsor', btn_squadra: 'Join the Squadra Tre',
    next_race: 'Next race', days: 'Days', hours: 'Hrs', minutes: 'Min', seconds: 'Sec', full_calendar: 'Full race calendar', no_race: 'Date to follow',
    highlights: 'Highlights', highlights_title: "What's happening", all_news: 'All news', prev: 'Previous', next: 'Next',
    on_track_text: 'Race calendar, results and statistics from the track.', off_track_text: 'Training, workshop, paddock – everyday life behind number 3.',
    stat_races: 'Races started', stat_podiums: 'Podiums', stat_wins: 'Wins', stat_countries: 'Countries',
    to_gallery: 'To the gallery', our_sponsors: 'Our sponsors', squadra_link: '+ Squadra Tre – our supporters',
    your_logo: 'Your logo here',
    news_kicker: 'News', news_title: 'From the paddock', all: 'All', cat_Rennen: 'Racing', cat_Team: 'Team', cat_Partner: 'Partners',
    read_more: 'Read more', back_news: 'All news', news_lang_note: 'Articles are published in German.',
    ueber_kicker: 'About Luigi', story_kicker: 'Video · Luigi’s story', story_title: 'My road into motorsport', story_text: 'How it all began, what drives me – and why I want to become a Formula 1 driver one day. Sound on! (in German)', story_more: 'More about Luigi', videos_kicker: 'Videos', videos_title: 'Luigi in motion', ueber_title: 'From the first kart<br>to the big <span class="red">dream.</span>',
    steckbrief: 'Fact sheet', f_startnummer: 'Race number', f_nationalitaet: 'Nationality', f_chassis: 'Chassis', f_klasse: 'Class', f_team: 'Team',
    f_lieblingsstrecke: 'Favourite track', f_idole: 'Idols', f_ziel: 'Goal',
    chapters_title: 'Choose your chapter', week_title: 'A race week with Luigi', next_chapter: 'Help write the next chapter.',
    kal_title: 'Calendar & results', season: 'Season', col_date: 'Date', col_series: 'Series', col_track: 'Track', col_quali: 'Qualifying',
    col_final: 'Final', col_status: 'Status', st_gefahren: 'raced', st_bevorstehend: 'upcoming', best: 'Best result',
    gal_kicker: 'Gallery · #LBC3', gal_intro: 'Photos from every race weekend – sorted by series, year and track.', gal_race: 'race', gal_races: 'races', gal_more: 'More from', gal_empty: 'The first photos are coming soon.', gal_soon: 'Photos coming soon', gal_soon_long: 'Photos from this race weekend are coming soon.', breadcrumb: 'Breadcrumb', photos: 'Photos', cat_strecke: 'Track', cat_fahrerlager: 'Paddock', photo_credit: 'Photos',
    enlarge: 'Enlarge photo', close: 'Close', more_insta: 'More pictures on Instagram',
    partner_kicker: 'Partners', two_ways: 'Two ways to join the team',
    for_companies: 'For companies', sponsors: 'Sponsors', sponsors_lead: 'Companies that book a package from our sponsorship kit.',
    sp_b1: 'Logo on kart, helmet, race suit – depending on the package', sp_b2: 'Logo on the website and in the sponsor ticker',
    sp_b3: 'Mentions in #LBC3 posts and race reports', sp_b4: 'Own login: access to the expense report at any time',
    show_packages: 'See packages', for_fans: 'For fans, friends & family',
    squadra_lead: 'Our fan and supporter club – for everyone who supports Luigi with a contribution of any size.',
    sq_b1: 'Your name on the Squadra Tre wall (if you like)', sq_b2: 'Race updates by email',
    sq_b3: 'Invitation to a race weekend in the paddock', sq_b4: 'Annual report with all expenses by email at the end of the season',
    join_now: 'Join now', packages: 'Sponsorship packages', request_kit: 'Request sponsorship kit',
    ad_spaces: 'Advertising spaces', ad1: 'Front spoiler & nose', ad2: 'Side pods', ad3: 'Helmet & race suit', ad4: 'Website, ticker & Instagram #LBC3', ad5: 'Team tent & paddock',
    wall: 'The Squadra Tre wall', join_title: 'Join the Squadra Tre', f_name: 'Name', f_email: 'Email',
    f_type: 'How would you like to support?', type_once: 'One-off contribution', type_yearly: 'Yearly contribution', type_kind: 'In kind (e.g. tyres, travel)',
    f_amount: 'Amount in € (your choice)', f_report: 'I would like to receive the annual report with all expenses by email at the end of the season.',
    f_wall: 'My name may appear on the Squadra Tre wall.', f_privacy: 'I have read the <a href="{ds}">privacy policy</a> and agree to the processing of my data.',
    join_btn: 'Join', join_note: 'You will receive a confirmation email – you are in once you confirm.',
    join_ok_title: 'Almost there!', join_ok_text: 'Please confirm your email address using the link we just sent you.',
    join_err: 'Sorry, that did not work. Please try again later or write to us.',
    transparency: 'Transparency', transparency_title: 'How we show where your support goes',
    tr1_t: 'Tracked continuously', tr1: 'During the season we record all expenses by category: travel, equipment, tyres, entry fees.',
    tr2_t: 'Sponsors: any time', tr2: 'Sponsors see the expense report via their login – any time and always up to date.',
    tr3_t: 'Squadra Tre: at season end', tr3: 'All Squadra Tre members receive the annual report by email at the end of the season.',
    login_sponsors: 'Sponsor login',
    kontakt_kicker: 'Contact', kontakt_title: "Let's<br>talk.", write_msg: 'Write a message', f_company: 'Company (optional)', f_topic: 'Topic',
    topic1: 'Sponsorship / partnership', topic2: 'Request sponsorship kit', topic3: 'Press', topic4: 'Other', f_message: 'Message',
    send: 'Send', impressum: 'Legal notice', datenschutz: 'Privacy', rights: 'All rights reserved. Texts, photos, design and software may not be copied or reused without our written permission.',
    thanks_title: 'Thank you!', thanks_text: 'Your message has arrived. We will get back to you as soon as possible.',
    confirmed_title: 'Benvenuto to the Squadra Tre!', confirmed_text: 'Your email address is confirmed. Thank you for supporting Luigi!',
    back_home: 'Back to home', not_found: 'This page does not exist.'
  },
  it: {
    kartfahrer: 'Pilota di kart',
    nav_news: 'News', nav_ueber: 'Chi è Luigi', nav_kalender: 'Calendario', nav_galerie: 'Galleria', nav_partner: 'Partner', nav_kontakt: 'Contatti',
    login: 'Login', menu: 'Menu', skip: 'Vai al contenuto',
    intro_skip: 'Salta', intro_replay: "Rivedi l'intro",
    kicker: 'Numero 3', ticker_goal: 'Obiettivo Formula 1',
    btn_story: 'La storia di Luigi', btn_partner: 'Diventa partner', btn_sponsor: 'Diventa sponsor', btn_squadra: 'Entra nella Squadra Tre',
    next_race: 'Prossima gara', days: 'Giorni', hours: 'Ore', minutes: 'Min', seconds: 'Sec', full_calendar: 'Calendario completo', no_race: 'Data da definire',
    highlights: 'Highlights', highlights_title: 'Le ultime novità', all_news: 'Tutte le news', prev: 'Indietro', next: 'Avanti',
    on_track_text: 'Calendario, risultati e statistiche dalla pista.', off_track_text: 'Allenamento, officina, paddock – la vita dietro il numero 3.',
    stat_races: 'Gare disputate', stat_podiums: 'Podi', stat_wins: 'Vittorie', stat_countries: 'Paesi',
    to_gallery: 'Alla galleria', our_sponsors: 'I nostri sponsor', squadra_link: '+ Squadra Tre – i nostri sostenitori',
    your_logo: 'Il tuo logo qui',
    news_kicker: 'News', news_title: 'Dal paddock', all: 'Tutte', cat_Rennen: 'Gare', cat_Team: 'Team', cat_Partner: 'Partner',
    read_more: 'Leggi tutto', back_news: 'Tutte le news', news_lang_note: 'Gli articoli sono pubblicati in tedesco.',
    ueber_kicker: 'Chi è Luigi', story_kicker: 'Video · La storia di Luigi', story_title: 'La mia strada nel motorsport', story_text: 'Come è iniziato tutto, cosa mi spinge – e perché un giorno voglio diventare pilota di Formula 1. Audio on! (in tedesco)', story_more: 'Scopri Luigi', videos_kicker: 'Video', videos_title: 'Luigi in movimento', ueber_title: 'Dal primo kart<br>al grande <span class="red">sogno.</span>',
    steckbrief: 'Scheda', f_startnummer: 'Numero', f_nationalitaet: 'Nazionalità', f_chassis: 'Telaio', f_klasse: 'Categoria', f_team: 'Team',
    f_lieblingsstrecke: 'Circuito preferito', f_idole: 'Idoli', f_ziel: 'Obiettivo',
    chapters_title: 'Scegli il capitolo', week_title: 'Una settimana di gara con Luigi', next_chapter: 'Scrivi con noi il prossimo capitolo.',
    kal_title: 'Calendario e risultati', season: 'Stagione', col_date: 'Data', col_series: 'Serie', col_track: 'Circuito', col_quali: 'Qualifiche',
    col_final: 'Finale', col_status: 'Stato', st_gefahren: 'disputata', st_bevorstehend: 'in arrivo', best: 'Miglior risultato',
    gal_kicker: 'Galleria · #LBC3', gal_intro: 'Le foto di ogni weekend di gara – ordinate per serie, anno e circuito.', gal_race: 'gara', gal_races: 'gare', gal_more: 'Altro da', gal_empty: 'Presto le prime foto.', gal_soon: 'Foto in arrivo', gal_soon_long: 'Le foto di questo weekend di gara arriveranno presto.', breadcrumb: 'Percorso', photos: 'Foto', cat_strecke: 'Pista', cat_fahrerlager: 'Paddock', photo_credit: 'Foto',
    enlarge: 'Ingrandisci foto', close: 'Chiudi', more_insta: 'Altre foto su Instagram',
    partner_kicker: 'Partner', two_ways: 'Due modi per entrare nel team',
    for_companies: 'Per le aziende', sponsors: 'Sponsor', sponsors_lead: 'Aziende che scelgono un pacchetto dalla nostra cartella sponsor.',
    sp_b1: 'Logo su kart, casco, tuta – secondo il pacchetto', sp_b2: 'Logo sul sito e nella fascia sponsor',
    sp_b3: 'Menzioni nei post #LBC3 e nei resoconti di gara', sp_b4: 'Login personale: accesso al resoconto spese in ogni momento',
    show_packages: 'Vedi i pacchetti', for_fans: 'Per fan, amici e famiglia',
    squadra_lead: 'Il nostro fan club e club dei sostenitori – per tutti quelli che aiutano Luigi con un contributo di qualsiasi importo.',
    sq_b1: 'Il tuo nome sul muro della Squadra Tre (se vuoi)', sq_b2: 'Aggiornamenti sulle gare via e-mail',
    sq_b3: 'Invito a un weekend di gara nel paddock', sq_b4: 'Resoconto annuale con tutte le spese via e-mail a fine stagione',
    join_now: 'Entra ora', packages: 'Pacchetti sponsor', request_kit: 'Richiedi la cartella sponsor',
    ad_spaces: 'Spazi pubblicitari', ad1: 'Spoiler e musetto', ad2: 'Pance laterali', ad3: 'Casco e tuta', ad4: 'Sito, fascia sponsor e Instagram #LBC3', ad5: 'Tenda e paddock',
    wall: 'Il muro della Squadra Tre', join_title: 'Entra nella Squadra Tre', f_name: 'Nome', f_email: 'E-mail',
    f_type: 'Come vuoi sostenerci?', type_once: 'Contributo una tantum', type_yearly: 'Contributo annuale', type_kind: 'In natura (es. gomme, viaggi)',
    f_amount: 'Importo in € (a scelta)', f_report: 'Desidero ricevere il resoconto annuale con tutte le spese via e-mail a fine stagione.',
    f_wall: 'Il mio nome può apparire sul muro della Squadra Tre.', f_privacy: "Ho letto l'<a href=\"{ds}\">informativa sulla privacy</a> e acconsento al trattamento dei miei dati.",
    join_btn: 'Entra', join_note: 'Riceverai un\'e-mail di conferma – sei dentro dopo averla confermata.',
    join_ok_title: 'Quasi fatto!', join_ok_text: "Conferma il tuo indirizzo e-mail tramite il link che ti abbiamo appena inviato.",
    join_err: 'Purtroppo non ha funzionato. Riprova più tardi o scrivici.',
    transparency: 'Trasparenza', transparency_title: 'Come mostriamo dove va il vostro supporto',
    tr1_t: 'Registrato di continuo', tr1: 'Durante la stagione registriamo tutte le spese per categoria: viaggi, materiale, gomme, iscrizioni.',
    tr2_t: 'Sponsor: sempre', tr2: 'Gli sponsor vedono il resoconto spese con il loro login – sempre aggiornato.',
    tr3_t: 'Squadra Tre: a fine stagione', tr3: 'Tutti i membri della Squadra Tre ricevono il resoconto annuale via e-mail a fine stagione.',
    login_sponsors: 'Login sponsor',
    kontakt_kicker: 'Contatti', kontakt_title: 'Parliamone.', write_msg: 'Scrivi un messaggio', f_company: 'Azienda (facoltativo)', f_topic: 'Argomento',
    topic1: 'Sponsorizzazione / partnership', topic2: 'Richiedi cartella sponsor', topic3: 'Stampa', topic4: 'Altro', f_message: 'Messaggio',
    send: 'Invia', impressum: 'Note legali', datenschutz: 'Privacy', rights: 'Tutti i diritti riservati. Testi, foto, design e software non possono essere copiati o riutilizzati senza il nostro permesso scritto.',
    thanks_title: 'Grazie!', thanks_text: 'Il tuo messaggio è arrivato. Ti risponderemo il prima possibile.',
    confirmed_title: 'Benvenuto nella Squadra Tre!', confirmed_text: 'Il tuo indirizzo e-mail è confermato. Grazie per sostenere Luigi!',
    back_home: 'Torna alla home', not_found: 'Questa pagina non esiste.'
  }
};

export function t(lang) {
  const dict = { ...(ui[lang] || ui.de), ...(squadraUi[lang] || {}) };
  const fallback = { ...ui.de, ...squadraUi.de };
  return (key) => dict[key] ?? fallback[key] ?? key;
}

export const DATE_LOCALE = { de: 'de-DE', en: 'en-GB', it: 'it-IT' };

export function formatDate(iso, lang, opts = { day: '2-digit', month: '2-digit', year: 'numeric' }) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString(DATE_LOCALE[lang] || 'de-DE', { timeZone: 'Europe/Berlin', ...opts });
}
