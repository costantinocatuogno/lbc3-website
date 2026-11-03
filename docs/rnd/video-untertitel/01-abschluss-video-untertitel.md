<!-- © 2026 LBC3 -->
# Video-Untertitel in der Sprache des Besuchers – Abschluss

Stand: 03.11.2026 · Branch `untertitel-videos` · Verantwortlich: Head of R&D LBC3

## Ziel
Besucher der italienischen, englischen und französischen Seiten sehen bei den Videos mit Sprache Untertitel in ihrer Sprache – ganz unten am Bildrand. Deutsch bekommt keine zusätzliche Spur, weil die deutschen Untertitel bereits in die Videos eingebrannt sind (Vorgabe des Eigentümers).

## Was gemacht wurde
| Bereich | Änderung |
|---|---|
| Untertitel-Dateien | `public/uploads/videos/untertitel/<video>.<it|en|fr>.vtt` für **Luigis Motorsport-Story** (34 Untertitel), **Teamchef Mario Ljubic über Luigi** (17) und **Immer am Limit** (3) |
| Seiten-Einbau | `scripts/lib/untertitel.mjs`: baut automatisch ein `<track>` in der Seitensprache ein, sobald eine passende Datei existiert (Startseite: Story-Video; Über Luigi: Reel-Player und Film) |
| Reel-Player | `public/assets/js/site.js`: beim Wechsel des Reels wechselt die Untertitel-Spur mit (Reels ohne Sprache haben keine) |
| Aussehen | `public/assets/css/site.css`: `video::cue` – Schrift Manrope (lokal), weiß auf dunklem, halbtransparentem Grund |
| Position | jeder Untertitel mit `line:-1` = unterste Zeile, also unter den eingebrannten deutschen Untertiteln |
| Auslieferung | `netlify.toml`: Content-Type `text/vtt` für den Untertitel-Ordner; lokaler Vorschau-Server ebenso |
| Tests | `tests/untertitel.test.mjs`: Dateien gültig, alle Sprachen gleich getaktet, keine Überlappung, Position unten, DE ohne Spur, Videos ohne Datei ohne Spur |

## Wie die Texte entstanden sind
Die deutschen Untertitel sind eingebrannt. Sie wurden Bild für Bild aus den Videos abgelesen (Zeitpunkte auf 0,1 s genau), zu ganzen Sätzen zusammengefasst und ins Italienische, Englische und Französische übersetzt. Namen, Serien und Marken bleiben unübersetzt (ADAC Kart Masters, Ferrari, Kimi Räikkönen, Sebastian Vettel, Mini). Beim Versprecher „Motor, äh, Fernseher“ wurde der Sinn übernommen („spento il… ehm, televisore“).

## Videos ohne Untertitel
„Überholen mit Mut“, „Bei der Arbeit und auf der Strecke“, „Renntag“, das Intro-Video und die Galerie-Clips haben keine Sprache und keine eingebrannten Untertitel – daher keine Spur. Die Hochformat-Fassung `luigi-motorsport-story.mp4` wird auf der Website nicht verwendet.

## Pflege
- Text ändern: die `.vtt`-Datei im Ordner öffnen und die Zeile unter der Zeitangabe ändern.
- Neues Video mit Sprache: Dateien `<videoname>.it.vtt`, `.en.vtt`, `.fr.vtt` in denselben Ordner legen – der Einbau passiert beim nächsten Build automatisch.
- Besucher können die Untertitel über das Untertitel-Symbol des Players ausschalten.

## Geprüft
- `npm test`: alle neuen Tests grün. Die 5 abgebrochenen Tests in `squadra-functions.test.mjs` (R1, R2, R5) waren vorher schon so und haben mit dieser Änderung nichts zu tun.
- Build: 189 Seiten; Spuren nur auf `/it/`, `/en/`, `/fr/`, keine auf den deutschen Seiten.
- Chrome (Desktop 1280 px und Handy 390 px): Untertitel erscheinen am unteren Rand, überdecken die deutschen Untertitel nicht, wechseln beim Reel-Wechsel mit.

## Quellen
- WHATWG HTML, `track`-Element: https://html.spec.whatwg.org/multipage/media.html#the-track-element (abgerufen 03.11.2026)
- W3C WebVTT, Cue-Einstellungen `line`/`align`: https://www.w3.org/TR/webvtt1/#webvtt-cue-settings (abgerufen 03.11.2026)
- MDN `::cue`: https://developer.mozilla.org/en-US/docs/Web/CSS/::cue (abgerufen 03.11.2026)
- WCAG 2.2, Erfolgskriterium 1.2.2 Untertitel (aufgezeichnet): https://www.w3.org/TR/WCAG22/#captions-prerecorded

## Offene Punkte
- Übersetzungen bitte einmal von Muttersprachlern (IT/FR) gegenlesen lassen – NICHT VERIFIZIERT durch Muttersprachler.
- iPhone im Vollbild zeigt Untertitel im eigenen Apple-Stil; Position bleibt unten.
