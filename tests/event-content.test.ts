import assert from "node:assert/strict";
import { test } from "node:test";
import { descriptionHtml, descriptionText, eventMediaDefaults, legacyEventMediaPatch, normalizeYouTubeUrls, safeExternalUrl, sanitizeDescription, youtubeVideoId } from "../lib/event-content";

test("rich descriptions retain formatting but remove executable content and unsafe links", () => {
  const result = sanitizeDescription('<h2>Heading</h2><p><strong>Bold</strong><u>Underline</u><code>code</code><a href="javascript:alert(1)" onclick="alert(1)">bad</a><a href="https://example.com">good</a></p><ul><li>Point</li></ul><script>alert(1)</script><img src=x onerror=alert(1)>');
  assert.match(result, /<strong>Bold<\/strong>/);
  assert.match(result, /<ul><li>Point<\/li><\/ul>/);
  assert.match(result, /<code>code<\/code>/);
  assert.match(result, /rel="noopener noreferrer"/);
  assert.doesNotMatch(result, /javascript:|onclick|onerror|<script|<img|alert\(1\)/);
});

test("editor text size, alignment, font and colors survive sanitization", () => {
  const result = sanitizeDescription('<p style="text-align: center"><span style="font-family: Georgia; font-size: 24px; color: rgb(255, 0, 0); position:fixed">Styled</span></p>');
  assert.match(result, /text-align:center/);
  assert.match(result, /font-size:24px/);
  assert.match(result, /font-family:Georgia/);
  assert.match(result, /color:rgb\(255, 0, 0\)/);
  assert.doesNotMatch(result, /position/);
});

test("legacy descriptions stay literal and preserve line breaks when edited", () => {
  assert.equal(descriptionHtml('First\n<b>literal</b> & last', "text"), '<p>First</p><p>&lt;b&gt;literal&lt;/b&gt; &amp; last</p>');
  assert.equal(descriptionText('<p>A &amp; B</p><ul><li>One</li><li>Two</li></ul>', "html"), 'A & B One Two');
  assert.equal(descriptionText('Cost < 20', "text"), 'Cost < 20');
});

test("YouTube watch, short, shorts, embed and live links normalize to video URLs", () => {
  const id = "dQw4w9WgXcQ";
  for (const url of [`https://youtube.com/watch?v=${id}&t=10`, `https://youtu.be/${id}?si=test`, `https://www.youtube.com/shorts/${id}`, `https://www.youtube-nocookie.com/embed/${id}`, `https://m.youtube.com/live/${id}`]) assert.equal(youtubeVideoId(url), id);
  assert.deepEqual(normalizeYouTubeUrls([`https://youtu.be/${id}`, ""]), [`https://www.youtube.com/watch?v=${id}`, null]);
});

test("invalid and impersonating video links are rejected", () => {
  for (const url of ["javascript:alert(1)", "https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ", "https://example.com/watch?v=dQw4w9WgXcQ", "https://youtube.com/watch?v=bad", "https://youtube.com/playlist?list=test", null]) assert.equal(youtubeVideoId(url), null);
  assert.equal(safeExternalUrl("javascript:alert(1)"), null);
  assert.deepEqual(normalizeYouTubeUrls(undefined), [null, null]);
});

test("legacy and null media fields get safe defaults without changing descriptions", () => {
  const result = eventMediaDefaults({ description: "Original", gallery: null, youtubeUrls: null });
  assert.equal(result.description, "Original");
  assert.equal(result.descriptionFormat, "text");
  assert.deepEqual(result.youtubeUrls, [null, null]);
  assert.deepEqual(result.gallery, []);
});

test("all four gallery photos survive independently of the banner", () => {
  const gallery = [1, 2, 3, 4].map((i) => `https://example.com/gallery-${i}.jpg`);
  assert.deepEqual(eventMediaDefaults({ image: "https://example.com/banner.jpg", gallery }).gallery, gallery);
});

test("legacy backfill only adds missing fields and is idempotent", () => {
  const data = { description: "Original", image: "banner", gallery: ["photo"], youtubeUrls: ["existing", null], descriptionFormat: "html" };
  assert.deepEqual(legacyEventMediaPatch(data), {});
  const legacy = { description: "Original", gallery: null };
  const patch = legacyEventMediaPatch(legacy);
  assert.deepEqual(patch, { youtubeUrls: [null, null], descriptionFormat: "text", gallery: [] });
  assert.deepEqual(legacyEventMediaPatch({ ...legacy, ...patch }), {});
});
