/* ===========================================================
   Herrera Contractors — homepage interactions
   =========================================================== */
(function () {
  "use strict";

  /* ---- sticky header shadow ---- */
  var header = document.getElementById("header");
  function onScroll() {
    if (window.scrollY > 8) header.classList.add("scrolled");
    else header.classList.remove("scrolled");
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---- mobile drawer ---- */
  var burger = document.getElementById("burger");
  var drawer = document.getElementById("drawer");
  if (burger && drawer) {
    burger.addEventListener("click", function () { drawer.classList.add("open"); });
    drawer.addEventListener("click", function (e) {
      if (e.target.closest("[data-close]")) drawer.classList.remove("open");
    });
  }

  /* ---- scroll reveal ---- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---- projects filter ---- */
  var filters = document.getElementById("filters");
  var projects = Array.prototype.slice.call(document.querySelectorAll("#gallery .proj"));
  if (filters) {
    filters.addEventListener("click", function (e) {
      var btn = e.target.closest("button");
      if (!btn) return;
      filters.querySelectorAll("button").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      var cat = btn.getAttribute("data-filter");
      projects.forEach(function (p) {
        var show = cat === "all" || p.getAttribute("data-cat") === cat;
        p.classList.toggle("hide", !show);
      });
    });
  }

  /* ---- reviews slider ---- */
  var track = document.getElementById("revTrack");
  var prev = document.getElementById("revPrev");
  var next = document.getElementById("revNext");
  if (track && prev && next) {
    var index = 0;

    function perView() {
      var w = window.innerWidth;
      if (w <= 640) return 1;
      if (w <= 980) return 2;
      return 3;
    }
    function maxIndex() {
      return Math.max(0, track.children.length - perView());
    }
    function update() {
      if (index > maxIndex()) index = maxIndex();
      var card = track.children[0];
      var gap = parseFloat(getComputedStyle(track).gap) || 24;
      var step = card.getBoundingClientRect().width + gap;
      track.style.transform = "translateX(" + (-index * step) + "px)";
      // hide nav entirely when every review already fits on screen
      var navWrap = prev.parentElement;
      if (navWrap) navWrap.style.display = maxIndex() <= 0 ? "none" : "flex";
    }
    next.addEventListener("click", function () {
      index = index >= maxIndex() ? 0 : index + 1;
      update();
    });
    prev.addEventListener("click", function () {
      index = index <= 0 ? maxIndex() : index - 1;
      update();
    });
    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(update, 150);
    });
    update();
  }

  /* ---- form validation ---- */
  function isPhone(v) { return (v.replace(/[^0-9]/g, "").length >= 10); }
  function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  function validateField(field) {
    var input = field.querySelector("input, select, textarea");
    if (!input) return true;
    if (field.hasAttribute("data-optional")) return true;
    var v = (input.value || "").trim();
    var ok = true;
    if (!v) ok = false;
    else if (input.type === "tel" && !isPhone(v)) ok = false;
    else if (input.type === "email" && !isEmail(v)) ok = false;
    field.classList.toggle("err", !ok);
    return ok;
  }

  function wireForm(formId, successId) {
    var form = document.getElementById(formId);
    var success = document.getElementById(successId);
    if (!form) return;
    var fields = Array.prototype.slice.call(form.querySelectorAll("[data-field]"));

    fields.forEach(function (f) {
      var input = f.querySelector("input, select, textarea");
      if (!input) return;
      input.addEventListener("input", function () {
        if (f.classList.contains("err")) validateField(f);
      });
      input.addEventListener("blur", function () { validateField(f); });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var allOk = true;
      fields.forEach(function (f) { if (!validateField(f)) allOk = false; });
      if (!allOk) {
        var firstErr = form.querySelector(".field.err input, .field.err select");
        if (firstErr) firstErr.focus();
        return;
      }

      var btn = form.querySelector('button[type="submit"]');
      var origLabel = btn ? btn.textContent : "";
      if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
      clearFormError(form);

      fetch("/api/estimate", { method: "POST", body: new FormData(form) })
        .then(function (r) {
          return r.json().catch(function () { return {}; });
        })
        .then(function (data) {
          if (data && data.ok) {
            form.style.display = "none";
            if (success) success.classList.add("show");
          } else {
            showFormError(form, (data && data.error) || "Something went wrong. Please try again or call us.");
            if (btn) { btn.disabled = false; btn.textContent = origLabel; }
            if (window.turnstile) { try { window.turnstile.reset(); } catch (err) {} }
          }
        })
        .catch(function () {
          showFormError(form, "Network problem — please try again, or call us.");
          if (btn) { btn.disabled = false; btn.textContent = origLabel; }
          if (window.turnstile) { try { window.turnstile.reset(); } catch (err) {} }
        });
    });
  }

  function showFormError(form, msg) {
    var el = form.querySelector(".form-error");
    if (!el) {
      el = document.createElement("p");
      el.className = "form-error";
      el.setAttribute("role", "alert");
      el.style.cssText = "color:#c0392b;font-weight:600;margin:0 0 12px;";
      form.insertBefore(el, form.firstChild);
    }
    el.textContent = msg;
  }

  function clearFormError(form) {
    var el = form.querySelector(".form-error");
    if (el) el.textContent = "";
  }

  wireForm("heroForm", "heroSuccess");
  wireForm("contactForm", "contactSuccess");

  /* ---- before / after sliders (works for every .ba-slider) ---- */
  function wireBaSlider(slider) {
    var dragging = false;
    function set(clientX) {
      var rect = slider.getBoundingClientRect();
      var pct = ((clientX - rect.left) / rect.width) * 100;
      pct = Math.max(0, Math.min(100, pct));
      slider.style.setProperty("--pos", pct + "%");
      slider.setAttribute("aria-valuenow", Math.round(pct));
    }
    slider.addEventListener("pointerdown", function (e) {
      // ignore drags on non-active carousel items (they navigate instead)
      var item = slider.closest(".bac-item");
      if (item && !item.classList.contains("is-active")) return;
      dragging = true;
      slider.setPointerCapture(e.pointerId);
      set(e.clientX);
    });
    slider.addEventListener("pointermove", function (e) {
      if (dragging) set(e.clientX);
    });
    function stop() { dragging = false; }
    slider.addEventListener("pointerup", stop);
    slider.addEventListener("pointercancel", stop);
    slider.addEventListener("keydown", function (e) {
      var cur = parseFloat(slider.getAttribute("aria-valuenow")) || 50;
      if (e.key === "ArrowLeft") { cur = Math.max(0, cur - 4); }
      else if (e.key === "ArrowRight") { cur = Math.min(100, cur + 4); }
      else return;
      e.preventDefault();
      slider.style.setProperty("--pos", cur + "%");
      slider.setAttribute("aria-valuenow", Math.round(cur));
    });
  }
  document.querySelectorAll(".ba-slider").forEach(wireBaSlider);

  /* ---- before/after coverflow carousel ---- */
  var bac = document.getElementById("baCarousel");
  if (bac) {
    var items = Array.prototype.slice.call(bac.querySelectorAll(".bac-item"));
    var dotsWrap = document.getElementById("bacDots");
    var n = items.length;
    var active = 0;

    // build dots
    items.forEach(function (_, i) {
      var b = document.createElement("button");
      b.setAttribute("aria-label", "Show comparison " + (i + 1));
      b.addEventListener("click", function () { go(i); });
      dotsWrap.appendChild(b);
    });
    var dots = Array.prototype.slice.call(dotsWrap.children);

    function render() {
      items.forEach(function (item, i) {
        item.classList.remove("is-active", "is-prev", "is-next", "is-hidden");
        if (i === active) item.classList.add("is-active");
        else if (i === (active - 1 + n) % n) item.classList.add("is-prev");
        else if (i === (active + 1) % n) item.classList.add("is-next");
        else item.classList.add("is-hidden");
      });
      dots.forEach(function (d, i) { d.classList.toggle("active", i === active); });
    }
    function go(i) { active = (i + n) % n; render(); }

    document.getElementById("bacPrev").addEventListener("click", function () { go(active - 1); });
    document.getElementById("bacNext").addEventListener("click", function () { go(active + 1); });

    // clicking a side item brings it to center
    items.forEach(function (item, i) {
      item.addEventListener("click", function () {
        if (item.classList.contains("is-prev")) go(active - 1);
        else if (item.classList.contains("is-next")) go(active + 1);
      });
    });

    render();
  }

  /* ---- "How It Works" sequential animation ---- */
  var howSteps = document.getElementById("howSteps");
  if (howSteps) {
    var steps = Array.prototype.slice.call(howSteps.querySelectorAll(".how-step"));
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function resetSteps() {
      steps.forEach(function (s) {
        s.classList.remove("active", "done", "fill");
      });
    }

    function runSequence() {
      resetSteps();
      if (reduce) {
        steps.forEach(function (s) { s.classList.add("active"); s.classList.add("fill"); });
        return;
      }
      var i = 0;
      function lightStep() {
        if (i >= steps.length) {
          // settle: all numbers navy, lines filled, last step keeps the orange accent
          steps.forEach(function (s, idx) {
            s.classList.remove("active");
            if (idx === steps.length - 1) s.classList.add("active");
          });
          return;
        }
        var step = steps[i];
        // demote the previous step
        if (i > 0) {
          steps[i - 1].classList.remove("active");
          steps[i - 1].classList.add("done");
          steps[i - 1].classList.add("fill"); // fill the line leaving the previous step
        }
        step.classList.add("active");
        i++;
        setTimeout(lightStep, 620);
      }
      lightStep();
    }

    if ("IntersectionObserver" in window) {
      var howPlaying = false;
      var howIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            // replay every time the section re-enters the viewport
            if (!howPlaying) {
              howPlaying = true;
              setTimeout(runSequence, 250);
            }
          } else {
            // left the viewport — reset so it can play fresh next time
            howPlaying = false;
            resetSteps();
          }
        });
      }, { threshold: 0.4 });
      howIO.observe(howSteps);
    } else {
      runSequence();
    }
  }

  /* ---- smooth-scroll offset for sticky header on anchor clicks ---- */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      var y = target.getBoundingClientRect().top + window.scrollY - 88;
      window.scrollTo({ top: y, behavior: "smooth" });
    });
  });
})();
