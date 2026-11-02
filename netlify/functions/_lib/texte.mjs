// Feste Texte der automatischen E-Mails und Fehlermeldungen – in allen vier Sprachen.
// E-Mails gehen in der Sprache des Empfängers raus (Squadra Tre: gewählte Sprache; Partner: Sprache im Profil;
// Kontaktformular: Sprache der Seite, auf der geschrieben wurde).

export const LANGS = ['de', 'it', 'en', 'fr'];
export const pickLang = (v) => (LANGS.includes(String(v || '').toLowerCase()) ? String(v).toLowerCase() : 'de');
export const langPrefix = (l) => (l && l !== 'de' ? `/${l}` : '');
export const LOCALE = { de: 'de-DE', it: 'it-IT', en: 'en-GB', fr: 'fr-FR' };

// ---------- Squadra Tre: Anmeldung (Double-Opt-in, Eltern-Bestätigung) ----------
// Stand Einwilligungstexte: 2026-11-02 (EINWILLIGUNG_VERSION in squadra-rules.mjs)
export const JOIN = {
  de: {
    subject: 'Bitte bestätige deine Anmeldung zur Squadra Tre', title: 'Fast geschafft!', hello: 'Ciao',
    body: 'schön, dass du Teil der Squadra Tre wirst! Bitte bestätige deine Anmeldung mit einem Klick:', btn: 'Anmeldung bestätigen',
    valid: 'Der Link gilt 7 Tage. Ohne Bestätigung löschen wir die Anmeldung danach automatisch.',
    pay: 'So kannst du deinen Beitrag leisten:',
    child_u16: 'Du hast angegeben, dass du unter 16 bist. Deshalb muss ein Elternteil zustimmen – wir haben ihm gerade eine E-Mail geschickt. Sobald er zugestimmt hat, bist du dabei.',
    child_photo: 'Du bist 16 oder 17 und hast ein Foto hochgeladen. Das Foto zeigen wir nur, wenn ein Elternteil zustimmt – wir haben ihm eine E-Mail geschickt. Deine Mitgliedschaft bestätigst du selbst mit dem Knopf oben.',
    ignore: 'Falls du dich nicht angemeldet hast, ignoriere diese E-Mail einfach.', tag: 'Poste deine Fotos mit #SquadraTre und #LBC3!',
    psubject: 'Ihr Kind möchte der Squadra Tre von Luigi beitreten', ptitle: 'Zustimmung der Eltern',
    pbody: (n) => `<strong>${n}</strong> hat sich für die Squadra Tre angemeldet – den kostenlosen Fanclub des Kartfahrers Luigi Battista Catuogno (#3), betrieben von LBC3 / Familie Catuogno. Weil Ihr Kind unter 16 ist, braucht die Anmeldung Ihre Zustimmung. Auf der folgenden Seite sehen Sie, was Ihr Kind angegeben hat, und entscheiden selbst, wozu Sie zustimmen.`,
    pbody_foto: (n) => `<strong>${n}</strong> (16 oder 17 Jahre) ist jetzt in der Squadra Tre – dem kostenlosen Fanclub des Kartfahrers Luigi Battista Catuogno (#3), betrieben von LBC3 / Familie Catuogno – und hat ein Foto für die Wall of Fame hochgeladen. Fotos von Jugendlichen unter 18 zeigen wir nur mit Zustimmung der Eltern. Auf der folgenden Seite sehen Sie das Foto und entscheiden, ob es gezeigt werden darf.`,
    pbtn: 'Anmeldung ansehen und entscheiden',
    pvalid: 'Der Link gilt 7 Tage. Wenn Sie nichts tun, löschen wir die Anmeldung (bei 16- und 17-Jährigen nur das Foto) danach automatisch.',
    pignore: 'Falls Sie mit dieser Anmeldung nichts zu tun haben, ignorieren Sie diese E-Mail einfach.',
    asubject: 'Deine Anmeldung zur Squadra Tre', atitle: 'Du bist schon angemeldet',
    abody: 'mit dieser E-Mail-Adresse gibt es schon eine Anmeldung zur Squadra Tre. Über den Link unten kannst du deine Daten ansehen, ändern oder löschen.'
  },
  en: {
    subject: 'Please confirm your Squadra Tre sign-up', title: 'Almost there!', hello: 'Ciao',
    body: 'great to have you in Squadra Tre! Please confirm your sign-up with one click:', btn: 'Confirm sign-up',
    valid: 'The link is valid for 7 days. If you do not confirm, we will delete the sign-up automatically after that.',
    pay: 'How to make your contribution:',
    child_u16: 'You told us you are under 16. That is why a parent has to agree – we have just sent them an email. As soon as they agree, you are in.',
    child_photo: 'You are 16 or 17 and uploaded a photo. We will only show the photo if a parent agrees – we have sent them an email. You confirm your membership yourself with the button above.',
    ignore: 'If you did not sign up, simply ignore this email.', tag: 'Post your photos with #SquadraTre and #LBC3!',
    psubject: 'Your child would like to join Luigi\'s Squadra Tre', ptitle: 'Parental consent',
    pbody: (n) => `<strong>${n}</strong> signed up for Squadra Tre – the free fan club of kart driver Luigi Battista Catuogno (#3), run by LBC3 / Familie Catuogno. As your child is under 16, the sign-up needs your consent. On the next page you can see what your child entered and decide for yourself what you agree to.`,
    pbody_foto: (n) => `<strong>${n}</strong> (aged 16 or 17) is now a member of Squadra Tre – the free fan club of kart driver Luigi Battista Catuogno (#3), run by LBC3 / Familie Catuogno – and uploaded a photo for the Wall of Fame. We only show photos of young people under 18 with their parents’ consent. On the next page you can see the photo and decide whether it may be shown.`,
    pbtn: 'View sign-up and decide',
    pvalid: 'The link is valid for 7 days. If you do nothing, we will delete the sign-up (for 16- and 17-year-olds only the photo) automatically after that.',
    pignore: 'If this sign-up has nothing to do with you, simply ignore this email.',
    asubject: 'Your Squadra Tre sign-up', atitle: 'You have already signed up',
    abody: 'there is already a Squadra Tre sign-up with this email address. Use the link below to view, change or delete your data.'
  },
  it: {
    subject: 'Conferma la tua iscrizione alla Squadra Tre', title: 'Quasi fatto!', hello: 'Ciao',
    body: 'che bello averti nella Squadra Tre! Conferma la tua iscrizione con un clic:', btn: 'Conferma iscrizione',
    valid: 'Il link è valido 7 giorni. Senza conferma, dopo cancelliamo automaticamente l’iscrizione.',
    pay: 'Come dare il tuo contributo:',
    child_u16: 'Hai indicato di avere meno di 16 anni. Per questo serve il consenso di un genitore – gli abbiamo appena scritto un’e-mail. Appena acconsente, sei dei nostri.',
    child_photo: 'Hai 16 o 17 anni e hai caricato una foto. Mostriamo la foto solo se un genitore acconsente – gli abbiamo scritto un’e-mail. La tua iscrizione la confermi tu stesso con il pulsante qui sopra.',
    ignore: 'Se non ti sei iscritto, ignora semplicemente questa e-mail.', tag: 'Pubblica le tue foto con #SquadraTre e #LBC3!',
    psubject: 'Vostro figlio/a vuole entrare nella Squadra Tre di Luigi', ptitle: 'Consenso dei genitori',
    pbody: (n) => `<strong>${n}</strong> si è iscritto/a alla Squadra Tre – il fan club gratuito del pilota di kart Luigi Battista Catuogno (#3), gestito da LBC3 / Familie Catuogno. Poiché ha meno di 16 anni, l’iscrizione richiede il vostro consenso. Nella pagina seguente vedete che cosa ha indicato e decidete voi a che cosa acconsentire.`,
    pbody_foto: (n) => `<strong>${n}</strong> (16 o 17 anni) fa ora parte della Squadra Tre – il fan club gratuito del pilota di kart Luigi Battista Catuogno (#3), gestito da LBC3 / Familie Catuogno – e ha caricato una foto per la Wall of Fame. Le foto di ragazzi sotto i 18 anni le mostriamo solo con il consenso dei genitori. Nella pagina seguente vedete la foto e decidete se può essere mostrata.`,
    pbtn: 'Vedi l’iscrizione e decidi',
    pvalid: 'Il link è valido 7 giorni. Se non fate nulla, dopo cancelliamo automaticamente l’iscrizione (per chi ha 16 o 17 anni solo la foto).',
    pignore: 'Se questa iscrizione non vi riguarda, ignorate semplicemente questa e-mail.',
    asubject: 'La tua iscrizione alla Squadra Tre', atitle: 'Sei già iscritto',
    abody: 'con questo indirizzo e-mail esiste già un’iscrizione alla Squadra Tre. Con il link qui sotto puoi vedere, modificare o cancellare i tuoi dati.'
  },
  fr: {
    subject: 'Merci de confirmer ton inscription à la Squadra Tre', title: 'Presque fini !', hello: 'Ciao',
    body: 'super que tu rejoignes la Squadra Tre ! Confirme ton inscription d’un clic :', btn: 'Confirmer l’inscription',
    valid: 'Le lien est valable 7 jours. Sans confirmation, nous supprimons ensuite l’inscription automatiquement.',
    pay: 'Comment verser ta contribution :',
    child_u16: 'Tu as indiqué avoir moins de 16 ans. C’est pourquoi l’un de tes parents doit donner son accord – nous venons de lui écrire. Dès qu’il a accepté, tu fais partie de l’équipe.',
    child_photo: 'Tu as 16 ou 17 ans et tu as envoyé une photo. Nous ne montrons la photo que si l’un de tes parents est d’accord – nous lui avons écrit. Ton inscription, tu la confirmes toi-même avec le bouton ci-dessus.',
    ignore: 'Si tu ne t’es pas inscrit, ignore simplement cet e-mail.', tag: 'Publie tes photos avec #SquadraTre et #LBC3 !',
    psubject: 'Votre enfant souhaite rejoindre la Squadra Tre de Luigi', ptitle: 'Accord des parents',
    pbody: (n) => `<strong>${n}</strong> s’est inscrit(e) à la Squadra Tre – le fan-club gratuit du pilote de karting Luigi Battista Catuogno (#3), géré par LBC3 / Familie Catuogno. Votre enfant ayant moins de 16 ans, l’inscription nécessite votre accord. Sur la page suivante, vous voyez ce que votre enfant a indiqué et vous décidez vous-même à quoi vous consentez.`,
    pbody_foto: (n) => `<strong>${n}</strong> (16 ou 17 ans) fait maintenant partie de la Squadra Tre – le fan-club gratuit du pilote de karting Luigi Battista Catuogno (#3), géré par LBC3 / Familie Catuogno – et a envoyé une photo pour le Wall of Fame. Nous ne montrons les photos des jeunes de moins de 18 ans qu’avec l’accord des parents. Sur la page suivante, vous voyez la photo et décidez si elle peut être montrée.`,
    pbtn: 'Voir l’inscription et décider',
    pvalid: 'Le lien est valable 7 jours. Si vous ne faites rien, nous supprimons ensuite automatiquement l’inscription (pour les 16 et 17 ans, seulement la photo).',
    pignore: 'Si cette inscription ne vous concerne pas, ignorez simplement cet e-mail.',
    asubject: 'Ton inscription à la Squadra Tre', atitle: 'Tu es déjà inscrit',
    abody: 'il existe déjà une inscription à la Squadra Tre avec cette adresse e-mail. Avec le lien ci-dessous, tu peux voir, modifier ou supprimer tes données.'
  }
};

// ---------- Link „Daten ändern oder löschen“ in jeder E-Mail an Fans und Eltern (L9, L12) ----------
export const VERWALTEN = {
  de: { link: 'Daten ändern oder löschen', abmelden: 'Keine E-Mails mehr, Foto entfernen oder austreten:' },
  en: { link: 'Change or delete my data', abmelden: 'No more emails, remove the photo or leave:' },
  it: { link: 'Modifica o cancella i dati', abmelden: 'Niente più e-mail, togliere la foto o uscire:' },
  fr: { link: 'Modifier ou supprimer mes données', abmelden: 'Plus d’e-mails, retirer la photo ou quitter :' }
};

// ---------- Fehlermeldungen für Besucher (Formulare) ----------
export const ERR = {
  de: { post: 'Nur POST.', name_mail: 'Bitte Name und gültige E-Mail angeben.', privacy: 'Bitte der Datenschutzerklärung zustimmen.', parent: 'Bitte die E-Mail-Adresse eines Elternteils angeben (nicht deine eigene).', parent_photo: 'Für ein Foto brauchen wir unter 18 die E-Mail-Adresse eines Elternteils – oder lass das Foto weg.', age: 'Bitte dein Alter auswählen.', photo_type: 'Bitte ein JPG-, PNG- oder WebP-Foto hochladen.', photo_size: 'Das Foto ist zu groß (max. 5 MB).', photo_ok: 'Bitte der Veröffentlichung des Fotos zustimmen oder das Foto entfernen.', message: 'Bitte eine Nachricht schreiben.', link: 'Dieser Link ist ungültig oder abgelaufen.', rate: 'Zu viele Anmeldungen in kurzer Zeit. Bitte versuche es später noch einmal.', custody: 'Bitte bestätigen Sie, dass Sie sorgeberechtigt sind.', action: 'Bitte eine Auswahl treffen.' },
  it: { post: 'Solo POST.', name_mail: 'Inserisci nome e un indirizzo e-mail valido.', privacy: 'Accetta l’informativa sulla privacy.', parent: 'Inserisci l’indirizzo e-mail di un genitore (non il tuo).', parent_photo: 'Per una foto sotto i 18 anni ci serve l’e-mail di un genitore – oppure togli la foto.', age: 'Scegli la tua età.', photo_type: 'Carica una foto JPG, PNG o WebP.', photo_size: 'La foto è troppo grande (max. 5 MB).', photo_ok: 'Acconsenti alla pubblicazione della foto oppure rimuovila.', message: 'Scrivi un messaggio.', link: 'Questo link non è valido o è scaduto.', rate: 'Troppe iscrizioni in poco tempo. Riprova più tardi.', custody: 'Confermate di esercitare la responsabilità genitoriale.', action: 'Fai una scelta.' },
  en: { post: 'POST only.', name_mail: 'Please enter your name and a valid email address.', privacy: 'Please accept the privacy policy.', parent: 'Please enter a parent’s email address (not your own).', parent_photo: 'For a photo of someone under 18 we need a parent’s email address – or leave the photo out.', age: 'Please choose your age.', photo_type: 'Please upload a JPG, PNG or WebP photo.', photo_size: 'The photo is too large (max. 5 MB).', photo_ok: 'Please agree to the photo being published or remove the photo.', message: 'Please write a message.', link: 'This link is invalid or has expired.', rate: 'Too many sign-ups in a short time. Please try again later.', custody: 'Please confirm that you have parental responsibility.', action: 'Please make a choice.' },
  fr: { post: 'POST uniquement.', name_mail: 'Merci d’indiquer ton nom et une adresse e-mail valide.', privacy: 'Merci d’accepter la politique de confidentialité.', parent: 'Merci d’indiquer l’adresse e-mail d’un parent (pas la tienne).', parent_photo: 'Pour une photo avant 18 ans, il nous faut l’adresse e-mail d’un parent – ou retire la photo.', age: 'Merci de choisir ton âge.', photo_type: 'Merci d’envoyer une photo JPG, PNG ou WebP.', photo_size: 'La photo est trop grande (max. 5 Mo).', photo_ok: 'Merci d’accepter la publication de la photo ou de la retirer.', message: 'Merci d’écrire un message.', link: 'Ce lien n’est pas valide ou a expiré.', rate: 'Trop d’inscriptions en peu de temps. Merci de réessayer plus tard.', custody: 'Merci de confirmer que vous exercez l’autorité parentale.', action: 'Merci de faire un choix.' }
};

// ---------- Squadra Tre: Renn-Updates ----------
export const ABMELDEN = {
  de: 'Keine Updates mehr? Über den Link unten kannst du dich abmelden oder deine Daten löschen.',
  en: 'No more updates? Use the link below to unsubscribe or delete your data.',
  it: 'Non vuoi più aggiornamenti? Con il link qui sotto puoi disiscriverti o cancellare i tuoi dati.',
  fr: 'Plus de nouvelles ? Avec le lien ci-dessous, tu peux te désinscrire ou supprimer tes données.'
};

// ---------- Squadra Tre: Jahresbericht ----------
export const REPORT = {
  de: { subject: (y) => `Squadra Tre · Jahresbericht ${y}`, title: (y) => `Jahresbericht ${y}`, intro: (y) => `die Saison ${y} ist vorbei – und du warst als Teil der <strong>Squadra Tre</strong> dabei. Danke! Wie versprochen zeigen wir dir, wofür die Unterstützung eingesetzt wurde.`, total: 'Gesamt', carried: 'Davon getragen durch Partner und Squadra Tre:', review: 'Saisonrückblick', pdf: 'Den ausführlichen Jahresbericht findest du im Anhang.', bye: 'Forza #LBC3!<br>Luigi &amp; Familie', why: 'Du bekommst diese E-Mail, weil du bei der Anmeldung zur Squadra Tre den Jahresbericht angefordert hast. Abmelden oder Daten löschen: über den Link unten.', file: (y) => `LBC3-Jahresbericht-${y}.pdf` },
  it: { subject: (y) => `Squadra Tre · Resoconto annuale ${y}`, title: (y) => `Resoconto annuale ${y}`, intro: (y) => `la stagione ${y} è finita – e tu c’eri, come parte della <strong>Squadra Tre</strong>. Grazie! Come promesso ti mostriamo come è stato impiegato il sostegno.`, total: 'Totale', carried: 'Di cui coperto da partner e Squadra Tre:', review: 'Bilancio della stagione', pdf: 'Il resoconto annuale completo è in allegato (in tedesco).', bye: 'Forza #LBC3!<br>Luigi &amp; famiglia', why: 'Ricevi questa e-mail perché, iscrivendoti alla Squadra Tre, hai richiesto il resoconto annuale. Per disiscriverti o cancellare i dati: usa il link qui sotto.', file: (y) => `LBC3-resoconto-${y}.pdf` },
  en: { subject: (y) => `Squadra Tre · Annual report ${y}`, title: (y) => `Annual report ${y}`, intro: (y) => `the ${y} season is over – and you were part of it as a member of the <strong>Squadra Tre</strong>. Thank you! As promised, here is how the support was used.`, total: 'Total', carried: 'Of which covered by partners and the Squadra Tre:', review: 'Season review', pdf: 'You will find the full annual report attached (in German).', bye: 'Forza #LBC3!<br>Luigi &amp; family', why: 'You are receiving this email because you requested the annual report when you joined the Squadra Tre. To unsubscribe or delete your data, use the link below.', file: (y) => `LBC3-annual-report-${y}.pdf` },
  fr: { subject: (y) => `Squadra Tre · Rapport annuel ${y}`, title: (y) => `Rapport annuel ${y}`, intro: (y) => `la saison ${y} est terminée – et tu en as fait partie au sein de la <strong>Squadra Tre</strong>. Merci ! Comme promis, voici à quoi le soutien a servi.`, total: 'Total', carried: 'Dont pris en charge par les partenaires et la Squadra Tre :', review: 'Bilan de la saison', pdf: 'Le rapport annuel complet est en pièce jointe (en allemand).', bye: 'Forza #LBC3 !<br>Luigi et sa famille', why: 'Tu reçois cet e-mail car tu as demandé le rapport annuel lors de ton inscription à la Squadra Tre. Pour te désinscrire ou supprimer tes données : utilise le lien ci-dessous.', file: (y) => `LBC3-rapport-annuel-${y}.pdf` }
};

// Ausgabe-Kategorien (feste Liste) – in der Datenbank stehen die deutschen Namen
export const KATEGORIEN = {
  'Reisekosten Deutschland & Italien': { it: 'Viaggi Germania e Italia', en: 'Travel Germany & Italy', fr: 'Déplacements Allemagne et Italie' },
  'Wohnmobil (Anschaffung / Unterhalt)': { it: 'Camper (acquisto / manutenzione)', en: 'Motorhome (purchase / upkeep)', fr: 'Camping-car (achat / entretien)' },
  'Kart & Chassis': { it: 'Kart e telaio', en: 'Kart & chassis', fr: 'Kart et châssis' },
  'Motor, Vergaser & Ersatzteile': { it: 'Motore, carburatore e ricambi', en: 'Engine, carburettor & spare parts', fr: 'Moteur, carburateur et pièces' },
  Reifen: { it: 'Gomme', en: 'Tyres', fr: 'Pneus' },
  'Benzin & Öl': { it: 'Benzina e olio', en: 'Fuel & oil', fr: 'Essence et huile' },
  Nenngelder: { it: 'Iscrizioni', en: 'Entry fees', fr: 'Frais d’inscription' },
  'Team & Betreuung': { it: 'Team e assistenza', en: 'Team & support', fr: 'Équipe et encadrement' },
  Verpflegung: { it: 'Vitto', en: 'Food', fr: 'Repas' },
  'Training & Streckengebühren': { it: 'Allenamenti e pista', en: 'Training & track fees', fr: 'Entraînements et frais de piste' }
};
export const kategorie = (name, lang) => (lang !== 'de' && KATEGORIEN[name]?.[lang]) || name;

// ---------- Partner: Einladung ----------
export const INVITE = {
  de: { subject: 'Deine Einladung zum Partner-Bereich von LBC3', title: 'Willkommen im Team #LBC3', body: (f) => `du bist als Partner${f ? ` von <strong>${f}</strong>` : ''} zum geschützten Bereich von Luigi Battista Catuogno (#3) eingeladen. Dort siehst du jederzeit unseren aktuellen Ausgabenbericht und kannst euren Eintrag auf der Wall of Fame anlegen.`, btn: 'Einladung annehmen & Passwort festlegen', note: 'Der Link ist aus Sicherheitsgründen nur begrenzt gültig. Falls er abgelaufen ist, nutze auf der Login-Seite „Login-Link per E-Mail“.', adminBody: 'du bist zum Team-Bereich von LBC3 eingeladen.' },
  it: { subject: 'Il tuo invito all’area partner di LBC3', title: 'Benvenuto nel team #LBC3', body: (f) => `sei invitato come partner${f ? ` di <strong>${f}</strong>` : ''} all’area riservata di Luigi Battista Catuogno (#3). Lì puoi vedere in ogni momento il nostro resoconto spese aggiornato e creare il vostro spazio sulla Wall of Fame.`, btn: 'Accetta l’invito e imposta la password', note: 'Per sicurezza il link ha una validità limitata. Se è scaduto, usa «Link di accesso via e-mail» nella pagina di login.', adminBody: 'sei invitato all’area team di LBC3.' },
  en: { subject: 'Your invitation to the LBC3 partner area', title: 'Welcome to team #LBC3', body: (f) => `you have been invited as a partner${f ? ` of <strong>${f}</strong>` : ''} to the protected area of Luigi Battista Catuogno (#3). There you can see our up-to-date expense report at any time and create your entry on the Wall of Fame.`, btn: 'Accept invitation & set password', note: 'For security reasons the link is only valid for a limited time. If it has expired, use “Login link by email” on the login page.', adminBody: 'you have been invited to the LBC3 team area.' },
  fr: { subject: 'Ton invitation à l’espace partenaires de LBC3', title: 'Bienvenue dans l’équipe #LBC3', body: (f) => `tu es invité en tant que partenaire${f ? ` de <strong>${f}</strong>` : ''} dans l’espace protégé de Luigi Battista Catuogno (#3). Tu y consultes à tout moment notre rapport des dépenses à jour et tu peux créer votre fiche sur le Wall of Fame.`, btn: 'Accepter l’invitation et choisir un mot de passe', note: 'Pour des raisons de sécurité, le lien n’est valable que peu de temps. S’il a expiré, utilise « Lien de connexion par e-mail » sur la page de connexion.', adminBody: 'tu es invité dans l’espace équipe de LBC3.' }
};

// ---------- Kontaktformular: Eingangsbestätigung an den Absender ----------
export const KONTAKT = {
  de: { subject: 'Danke für deine Nachricht an LBC3', title: 'Deine Nachricht ist angekommen', body: 'vielen Dank für deine Nachricht! Wir melden uns so schnell wie möglich – meistens innerhalb weniger Tage.', copy: 'Deine Nachricht:', bye: 'Forza #LBC3!<br>Luigi &amp; Familie', auto: 'Diese E-Mail wurde automatisch verschickt.' },
  it: { subject: 'Grazie per il tuo messaggio a LBC3', title: 'Il tuo messaggio è arrivato', body: 'grazie mille per il tuo messaggio! Ti risponderemo il prima possibile – di solito entro pochi giorni.', copy: 'Il tuo messaggio:', bye: 'Forza #LBC3!<br>Luigi &amp; famiglia', auto: 'Questa e-mail è stata inviata automaticamente.' },
  en: { subject: 'Thank you for your message to LBC3', title: 'Your message has arrived', body: 'thank you very much for your message! We will get back to you as soon as possible – usually within a few days.', copy: 'Your message:', bye: 'Forza #LBC3!<br>Luigi &amp; family', auto: 'This email was sent automatically.' },
  fr: { subject: 'Merci pour ton message à LBC3', title: 'Ton message est bien arrivé', body: 'merci beaucoup pour ton message ! Nous te répondrons dès que possible – en général sous quelques jours.', copy: 'Ton message :', bye: 'Forza #LBC3 !<br>Luigi et sa famille', auto: 'Cet e-mail a été envoyé automatiquement.' }
};
