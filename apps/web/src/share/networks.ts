/** What a player shares: the page the link opens, its name, and the words posted with it. */
export interface Shared {
  url: string;
  title: string;
  text: string;
}

/** A network's own page for posting a link, by the name a player knows it by. */
export interface Network {
  name: string;
  href: string;
}

const q = encodeURIComponent;

/**
 * Where a link can be posted from a browser that cannot share by itself: each network's own page
 * for posting one, filled in. Email opens the reader's own mail.
 */
export function networks({ url, title, text }: Shared): Network[] {
  const withLink = `${text} ${url}`;
  return [
    { name: 'X', href: `https://x.com/intent/post?text=${q(text)}&url=${q(url)}` },
    { name: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${q(url)}` },
    { name: 'WhatsApp', href: `https://wa.me/?text=${q(withLink)}` },
    { name: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${q(url)}` },
    { name: 'Bluesky', href: `https://bsky.app/intent/compose?text=${q(withLink)}` },
    { name: 'Reddit', href: `https://www.reddit.com/submit?url=${q(url)}&title=${q(title)}` },
    { name: 'Email', href: `mailto:?subject=${q(title)}&body=${q(`${text}\n\n${url}`)}` },
  ];
}
