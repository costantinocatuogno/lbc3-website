// © 2026 LBC3
// Untertitel für Videos in der Sprache des Besuchers.
// Die deutschen Untertitel sind in die Videos eingebrannt – deshalb gibt es nur Spuren für IT, EN und FR.
// Ablage: public/uploads/videos/untertitel/<videoname>.<sprache>.vtt
// Liegt für ein Video und eine Sprache keine Datei vor, wird keine Spur eingebaut.
import { existsSync } from 'node:fs';
import { dirname, join, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc } from './html.mjs';
import { LANG_NAMES } from './i18n.mjs';

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public');

/** Pfad der Untertitel-Datei (für die Website) oder '' wenn keine vorhanden ist. */
export function untertitelSrc(video, lang, root = PUBLIC) {
  if (!video || !lang || lang === 'de' || !/^\/uploads\//.test(video)) return '';
  const name = basename(video, extname(video));
  const src = `${dirname(video)}/untertitel/${name}.${lang}.vtt`;
  return existsSync(join(root, src)) ? src : '';
}

/** <track>-Element für ein Video in der Seitensprache (standardmäßig eingeschaltet) oder ''. */
export function untertitelTrack(video, lang, root = PUBLIC) {
  const src = untertitelSrc(video, lang, root);
  if (!src) return '';
  return `<track kind="subtitles" srclang="${esc(lang)}" label="${esc(LANG_NAMES[lang] || lang)}" src="${esc(src)}" default>`;
}
