<!-- © 2026 LBC3 -->
# Bildschutz: Bilder nicht kopieren oder teilen – Abschluss

Stand: 05.11.2026 · **Live seit 05.11.2026, 07:35 Uhr** (PR #5, Commit 66f6f65, Netlify-Deploy 6aec237c, Freigabe des Eigentümers 07:34) · Verantwortlich: Head of R&D LBC3

## Ziel
Auf der ganzen Website (auch Squadra Tre / Wall of Fame) lassen sich Bilder und Videos nicht mehr per langem Drücken, Rechtsklick oder Ziehen speichern, kopieren oder teilen (Vorgabe des Eigentümers, 05.11.2026).

## Was gemacht wurde
| Bereich | Änderung |
|---|---|
| `public/assets/css/site.css` | `img, video, picture`: `-webkit-touch-callout: none` (iPhone/iPad: kein Menü beim langen Drücken), `user-select: none`, `-webkit-user-drag: none`. Auch Links/Knöpfe mit Bild (Galerie, Wall of Fame) und die Großansicht ohne Menü. Gilt auf allen Seiten mit site.css. |
| `public/assets/js/site.js` | Kontextmenü (Rechtsklick, langes Drücken auf Android) und Ziehen auf Bildern/Videos gesperrt; Videos ohne „Herunterladen“ (`controlslist="nodownload noremoteplayback"`) und ohne Bild-in-Bild; auch nachgeladene Bilder (Wall of Fame, Großansicht) werden erfasst. Steht am Anfang, damit es immer läuft. |
| `tests/bildschutz.test.mjs` | 8 Tests: CSS-Regeln, Kontextmenü, Ziehen, Video-Download, nachgeladene Bilder, Reihenfolge. |

Text bleibt markierbar und kopierbar (nur Medien sind gesperrt).

## Geprüft
- `npm test`: 78 grün, 0 Fehler, 5 bekannte Abbrüche (Squadra-Functions, vorher schon so).
- Build: 189 Seiten.
- Chrome (Handy-Ansicht 390 px), Seiten `/`, `/squadra-tre/`, Galerie, `/it/luigi/`, News: Kontextmenü und Ziehen auf allen Bildern gesperrt, alle Videos ohne Download-Knopf, Kontextmenü auf Text weiter frei.
- Unabhängige Agenten-Prüfung: Ampel GRÜN. Hinweise: Bild-in-Bild bei Videos entfällt (gewollt); `controlslist` wirkt nur in Chrome/Edge; Seiten ohne site.js nur mit CSS-Schutz; Test prüft Dateien, nicht das Verhalten im Browser.
- Live-Deploy: fertig (Netlify-Status „ready“), 27 Functions aktiv, Secret-Scan ohne Fund. Die Live-Dateien konnten von hier nicht abgerufen werden (Netzwerksperre) – NICHT VERIFIZIERT direkt auf luigi-catuogno.com.
- iPhone: `-webkit-touch-callout` wirkt nur in Safari/iOS – auf echtem iPhone noch einmal ansehen (NICHT VERIFIZIERT auf Gerät).

## Grenzen (ehrlich)
Eine Website kann das Kopieren nur erschweren, nicht verhindern: Bildschirmfoto, Entwicklerwerkzeuge oder der direkte Link zur Bilddatei funktionieren weiter. Für echten Schutz der Fan-Fotos zählt weiter, dass nur freigegebene, verkleinerte Bilder öffentlich sind. Seiten ohne `site.js` (Login, Partner-Bericht, Team-Bereich) haben nur den CSS-Schutz (iPhone).

## Quellen
- MDN `-webkit-touch-callout`: https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-touch-callout (abgerufen 05.11.2026)
- MDN `user-select`: https://developer.mozilla.org/en-US/docs/Web/CSS/user-select (abgerufen 05.11.2026)
- MDN `contextmenu`-Event: https://developer.mozilla.org/en-US/docs/Web/API/Element/contextmenu_event (abgerufen 05.11.2026)
- MDN `HTMLMediaElement.controlsList`: https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/controlsList (abgerufen 05.11.2026)
- WHATWG HTML, Drag and drop (`draggable`): https://html.spec.whatwg.org/multipage/dnd.html (abgerufen 05.11.2026)

## Offene Punkte
- Auf echtem iPhone und Android-Handy einmal lange auf ein Bild drücken (Vorschau-Link).
- Prüfkette (GitHub Actions) weiterhin nicht eingerichtet.
