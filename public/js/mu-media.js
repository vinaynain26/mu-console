/**
 * Playback for a video an editor dropped into an image slot.
 *
 * Deliberately tiny and delegated: the page it lands on already carries a lot
 * of JavaScript, and this must not fight any of it. One listener, no library,
 * and it only ever touches nodes inside .mu-media.
 */
(function () {
  "use strict";
  var ART = window.__MU_MEDIA__ || {};

  function reset(wrap) {
    var v = wrap.querySelector(".mu-media__video");
    var poster = wrap.querySelector("[data-mu-poster]");
    var icon = wrap.querySelector(".mu-media__play img");
    if (v) { v.pause(); v.classList.remove("is-playing"); }
    if (poster) poster.style.visibility = "";
    if (icon && ART.play) icon.src = ART.play;
    wrap.classList.remove("is-playing");
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest(".mu-media__play");
    if (!btn) return;
    var wrap = btn.closest(".mu-media");
    if (!wrap) return;

    e.preventDefault();
    e.stopPropagation();          // the page has its own click handlers everywhere

    var v = wrap.querySelector(".mu-media__video");
    var poster = wrap.querySelector("[data-mu-poster]");
    var icon = btn.querySelector("img");
    if (!v) return;

    // the real file is held on data-src so nothing downloads until asked for
    if (!v.src && v.dataset.src) v.src = v.dataset.src;

    if (v.paused) {
      // only one video at a time
      Array.prototype.forEach.call(document.querySelectorAll(".mu-media.is-playing"), function (other) {
        if (other !== wrap) reset(other);
      });
      var p = v.play();
      if (p && p.catch) p.catch(function () { reset(wrap); });
      v.classList.add("is-playing");
      wrap.classList.add("is-playing");
      if (poster) poster.style.visibility = "hidden";
      if (icon && ART.pause) icon.src = ART.pause;
    } else {
      reset(wrap);
    }
  }, true);

  document.addEventListener("ended", function (e) {
    if (e.target.classList && e.target.classList.contains("mu-media__video")) {
      var w = e.target.closest(".mu-media");
      if (w) reset(w);
    }
  }, true);
})();
