import { extractPrice, parseRobots, isAllowed } from "../src/lib/price-check.ts";

let fail = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log(ok ? "PASS" : "FAIL", label, ok ? "" : `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
};

check("json-ld product",
  extractPrice(`<script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"TV","offers":{"@type":"Offer","price":"259.99","priceCurrency":"USD"}}</script>`), 259.99);
check("json-ld @graph + array offers (lowest)",
  extractPrice(`<script type='application/ld+json'>{"@graph":[{"@type":"WebPage"},{"@type":["Product"],"offers":[{"price":119},{"price":"109.50"}]}]}</script>`), 109.5);
check("aggregate offer lowPrice",
  extractPrice(`<script type="application/ld+json">[{"@type":"Product","offers":{"@type":"AggregateOffer","lowPrice":"49.00","highPrice":"79.00"}}]</script>`), 49);
check("broken json then meta",
  extractPrice(`<script type="application/ld+json">{oops</script><meta property="product:price:amount" content="1,299.00">`), 1299);
check("itemprop content",
  extractPrice(`<span itemprop="price" content="23.99">$23.99</span>`), 23.99);
check("no price", extractPrice(`<html><body>Hello</body></html>`), null);
check("ignores non-product json-ld", extractPrice(`<script type="application/ld+json">{"@type":"Organization","offers":{"price":5}}</script>`), null);

const robots = parseRobots(`
User-agent: *
Disallow: /cart
Disallow: /*?*sort=
Allow: /p/
Disallow: /p/private

User-agent: BadBot
Disallow: /
`, "PriceDropBuddyBot");
check("allowed product", isAllowed(robots, "/p/tv-50/A-123"), true);
check("disallowed cart", isAllowed(robots, "/cart/view"), false);
check("longer disallow wins", isAllowed(robots, "/p/private/x"), false);
check("wildcard", isAllowed(robots, "/s/tv?q=1&sort=price"), false);
check("other bot's rules ignored", isAllowed(robots, "/anything"), true);
const own = parseRobots("User-agent: *\nAllow: /\n\nUser-agent: pricedropbuddybot\nDisallow: /", "PriceDropBuddyBot");
check("own group used", isAllowed(own, "/p/x"), false);
check("empty robots", isAllowed(parseRobots("", "x"), "/p/x"), true);
process.exit(fail);
