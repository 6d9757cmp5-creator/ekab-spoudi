/**
 * Study add-ons shared by the learning pages (no AI, nothing leaves the device):
 * - the local spaced-review popup,
 * - the end-of-chapter recall practice ("Σύγκριση με SOS") in the SAEK courses,
 * - links from ECG chapters and EOPPEP ECG questions to the matching part of the ECG lab.
 */
import './services/recall/popup.mjs';

const page = location.pathname.split('/').pop() || '';
const saekCourse = /^saek-course-(?:0[1-9]|1[0-9]|20)\.html$/.test(page);

if (saekCourse) {
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = new URL('./atla/practice/saek-practice.css', import.meta.url).href;
  document.head.append(css);
  void import('./atla/practice/saek-practice.mjs').catch(() => {});
}
if (saekCourse || page === 'theory.html') void import('./atla/practice/ecg-links.mjs').catch(() => {});
