const ext = typeof chrome !== 'undefined' ? chrome : typeof browser !== 'undefined' ? browser : null;

if (ext && (ext.browserAction || ext.action)) {
  const clickTarget = ext.browserAction || ext.action;
  clickTarget.onClicked.addListener(async () => {
    const tabs = await ext.tabs.query({ active: true, currentWindow: true });
    const url = tabs[0]?.url;
    if (!url) {
      return;
    }

    const id = await parseDeepLinkId(url);
    if (!id) {
      return;
    }

    const target = `violet://${id}`;
    if (ext?.tabs) {
      ext.tabs.create({ url: target });
    }
  });
}

async function parseDeepLinkId(value) {
  let uri;
  try {
    uri = new URL(value);
  } catch {
    return null;
  }

  if (uri.protocol.toLowerCase() === 'violet:') {
    const deeplinkId = Number.parseInt(uri.host, 10);
    return Number.isNaN(deeplinkId) ? null : deeplinkId;
  }

  const deeplinkId = Number.parseInt(uri.host, 10);
  if (!Number.isNaN(deeplinkId)) {
    return deeplinkId;
  }

  const host = uri.host.toLowerCase();
  const path = uri.pathname;

  if (host === 'hitomi.la') {
    const readerMatch = /^\/reader\/(\d+)\.html$/.exec(path);
    if (readerMatch) {
      return Number.parseInt(readerMatch[1], 10);
    }

    const galleryMatch = /^\/(?:cg|doujinshi|manga|imageset)\/.+-(\d+)\.html$/.exec(path);
    if (galleryMatch) {
      return Number.parseInt(galleryMatch[1], 10);
    }

    return null;
  }

  if (host === 'litomi.in') {
    const mangaMatch = /^\/manga\/(\d+)\/?$/.exec(path);
    return mangaMatch ? Number.parseInt(mangaMatch[1], 10) : null;
  }

  if (host === 'e-hentai.org' || host === 'exhentai.org') {
    const galleryMatch = /^\/g\/(\d+)\/[^/]+\/?$/.exec(path);
    if (galleryMatch) {
      return Number.parseInt(galleryMatch[1], 10);
    }

    const imageMatch = /^\/s\/[^/]+\/(\d+)-\d+$/.exec(path);
    return imageMatch ? Number.parseInt(imageMatch[1], 10) : null;
  }

  if (host === 'nhentai.net' || host === 'nhentai.to') {
    const segments = path.split('/');
    const nHentaiId = segments[2];
    if (!nHentaiId) {
      return null;
    }

    const mediaId = await fetchMediaId(nHentaiId);
    if (!mediaId) {
      return null;
    }

    const parsed = Number.parseInt(mediaId, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

async function fetchMediaId(nHentaiId) {
  const url = `https://nhentai-media-id.vercel.app/api/media-id?id=${encodeURIComponent(nHentaiId)}`;
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }
  const json = await response.json();
  return json?.mediaId ? String(json.mediaId) : null;
}
