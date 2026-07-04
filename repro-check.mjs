// Probes the PPR route with a browser UA and a Googlebot UA and reports whether
// the metadata tree-shape diverges (the observable side of #93401).
//
// Usage:  node repro-check.mjs [baseUrl]
//   baseUrl defaults to http://localhost:3210
const base = process.argv[2] ?? 'http://localhost:3210';
const path = '/product/abc';

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const GOOGLE_UA =
  'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Safari/537.36';

async function fetchHead(ua) {
  const res = await fetch(base + path, { headers: { 'user-agent': ua } });
  const html = await res.text();
  const head = html.slice(html.indexOf('<head>'), html.indexOf('</head>'));
  return {
    status: res.status,
    titleInHead: /<title>Product abc<\/title>/.test(head),
    hiddenMetadataWrapper: /<div hidden[^>]*><!--\$\?--><template id="B:0"/.test(html),
  };
}

const browser = await fetchHead(BROWSER_UA);
const google = await fetchHead(GOOGLE_UA);

console.log('browser  :', browser);
console.log('googlebot:', google);

const diverged = browser.titleInHead !== google.titleInHead;
if (diverged && !browser.titleInHead && google.titleInHead) {
  console.log(
    '\nMISMATCH SHAPE CONFIRMED: browser streams metadata via a hidden <div> wrapper ' +
      '(title missing from initial <head>) while Googlebot gets blocking metadata. ' +
      'On the server this logs: "Expected the resume to render <div> ... ' +
      '<__next_metadata_boundary__> ... React will fallback to client rendering." (#93401)',
  );
  process.exit(0);
}
console.log('\nNo divergence observed on this run.');
process.exit(1);
