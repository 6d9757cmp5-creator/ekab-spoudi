/**
 * PR #89 — staging only. Validate candidate AED artwork, no public display.
 * Human rights and clinical sign-off cannot be supplied by this technical test.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';

const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const poster='assets/aed-first-aid-poster.webp';
const expected='9cedfd2af3f1ef55ed5385756e6deb4d51fb51ce5fc5887690a102b2fdfab16f';
test('PR89 art is unchanged and still awaiting human signoff',()=>{
 const bytes=readFileSync(new URL(poster,root));
 assert.equal(bytes.length,28070);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),expected);
 const manifest=JSON.parse(read('media-review.json'));
 const item=manifest.files[poster];
 assert.ok(item);
 assert.equal(item.sha256,expected);
 assert.equal(item.status,'human-review-pending');
 assert.notEqual(item.rights_check,'passed');
 assert.notEqual(item.safety_check,'passed');
 assert.ok(manifest.files['assets/mentor-photo.webp'],'preserve other existing media-review records');
});
test('public contacts page keeps the official BLS poster, current guidelines and existing map',()=>{
 const html=read('contacts.html');
 assert.match(html,/href="tel:112"/);
 assert.match(html,/href="tel:166"/);
 assert.match(html,/https:\/\/apinidotes\.crete\.gov\.gr\/files\/afisaBLS\.pdf/);
 assert.match(html,/guidelines-2025/);
 assert.doesNotMatch(html,/assets\/aed-first-aid-poster\.webp/,'unreviewed poster must not load in public UI');
 assert.equal((html.match(/id="aedNearbyMap"/g)||[]).length,1);
 assert.equal((html.match(/id="aedFindNearby"/g)||[]).length,1);
 const js=read('contacts-nearby-aed.js');
 assert.match(js,/apinidotes-api\.crete\.gov\.gr/);
 assert.match(js,/item\.availability !== true \|\| item\.public !== true/);
 assert.doesNotMatch(js,/localStorage|sessionStorage/);
});
