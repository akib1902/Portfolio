/*
 * Applies the visitor's saved theme before the first paint.
 *
 * The server renders the administrator-configured default theme on <html>.
 * This script only overrides it when the visitor has a valid saved choice, so
 * there is no flash of the wrong theme and no inline script for CSP to allow.
 */
(function () {
  var key = 'akib-portfolio-theme';
  var colours = {
    'amber-minimal': '#f5f0e8',
    'graphite-terminal': '#16181a',
    'swiss-editorial': '#fbfaf7',
    'warm-bento': '#f1e7db',
    'forest-sand': '#efe4d2',
  };

  try {
    var saved = window.localStorage.getItem(key);
    if (!saved || !Object.prototype.hasOwnProperty.call(colours, saved)) return;

    var root = document.documentElement;
    root.setAttribute('data-theme', saved);

    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', colours[saved]);
  } catch (error) {
    /* Storage or DOM access can be unavailable; the default theme stays. */
  }
})();
