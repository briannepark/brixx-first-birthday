// Extra photos and videos for the hidden album on each milestone (tap the
// month's leaf photo to open it). Keys match the `album` field on a milestone
// in App.tsx, e.g. album: 'month-9'.
//
// The files live in the repo's /album folder and are served by jsDelivr's
// GitHub CDN, pinned to the commit that added them (so they never change under
// us). They load only when someone opens an album. If jsDelivr is unreachable,
// the viewer falls back to GitHub's raw file link.
//
// cover: a fuller version of the leaf photo, shown first. Without it the album
// starts with the leaf photo itself.

export type AlbumItem = { kind: 'photo'; src: string } | { kind: 'video'; src: string; poster?: string };
export type Album = { cover?: string; items: AlbumItem[] };

const REPO = 'briannepark/brixx-first-birthday';
const media = (commit: string, file: string) => `https://cdn.jsdelivr.net/gh/${REPO}@${commit}/album/${file}`;
export const fallbackUrl = (url: string) =>
  url.replace(/^https:\/\/cdn\.jsdelivr\.net\/gh\/([^/]+\/[^@]+)@([^/]+)\//, 'https://raw.githubusercontent.com/$1/$2/');

const M9 = 'b1212dbb11aeae4ba14d05f9f0525aa12c26ebfa';
const M10 = 'be7db6bfc5b582412c4cfc5c4af03aba1f0e300b';

export const ALBUMS: Record<string, Album> = {
  'month-9': {
    cover: media(M9, 'month-9-sitting.jpg'),
    items: [
      { kind: 'photo', src: media(M9, 'month-9-swing.jpg') },
      { kind: 'video', src: media(M9, 'month-9-swing.mp4'), poster: media(M9, 'month-9-swing-poster.jpg') },
      { kind: 'video', src: media(M10, 'month-9-rainbow.mp4'), poster: media(M10, 'month-9-rainbow-poster.jpg') },
    ],
  },
  'month-10': {
    cover: media(M10, 'month-10-grin.jpg'),
    items: [
      { kind: 'photo', src: media(M10, 'month-10-sitting.jpg') },
      { kind: 'photo', src: media(M10, 'month-10-crawl.jpg') },
      { kind: 'video', src: media(M10, 'month-10-bookshelf.mp4'), poster: media(M10, 'month-10-bookshelf-poster.jpg') },
      { kind: 'video', src: media(M10, 'month-10-book.mp4'), poster: media(M10, 'month-10-book-poster.jpg') },
      { kind: 'video', src: media(M10, 'month-10-sitting-up.mp4'), poster: media(M10, 'month-10-sitting-up-poster.jpg') },
      { kind: 'video', src: media(M10, 'month-10-snack.mp4'), poster: media(M10, 'month-10-snack-poster.jpg') },
    ],
  },
};
