(function () {
  "use strict";

  var slug =
    (typeof window.__SESSION_FEEDBACK_SLUG__ === "string" &&
      window.__SESSION_FEEDBACK_SLUG__) ||
    "";

  /** Local dev: Masters API / same-app routes expect port 32000; fix common typo ports. */
  function normalizeLocalDevApiPort(url) {
    if (!url || typeof url !== "string") return url;
    return url
      .replace(/:32900(\b|\/|$)/g, ":32000$1")
      .replace(/:3290(\b|\/|$)/g, ":32000$1");
  }

  var apiBase =
    document.body && document.body.getAttribute("data-api-base");
  if (!apiBase || !String(apiBase).trim()) {
    if (typeof window !== "undefined" && window.location) {
      var host = window.location.hostname || "";
      if (host === "localhost" || host === "127.0.0.1") {
        apiBase = "http://localhost:32000";
      } else {
        apiBase = "https://api.mastersunion.org";
      }
    } else {
      apiBase = "https://api.mastersunion.org";
    }
  } else {
    apiBase = String(apiBase).trim();
  }
  apiBase = normalizeLocalDevApiPort(apiBase);

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function show(el, on) {
    if (!el) return;
    el.classList.toggle("sf-hidden", !on);
  }

  function sessionLabelForEventType(eventType) {
    var t = (eventType || "").toLowerCase();
    if (t.indexOf("masterclass") !== -1) return "masterclass";
    if (t.indexOf("webinar") !== -1) return "webinar";
    return "session";
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text || "";
  }

  function setHtml(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html || "";
  }

  function escapeHtml(v) {
    return String(v || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function htmlWithLineBreaks(v) {
    return escapeHtml(v).replace(/\n/g, "<br>");
  }

  function renderSectionsHtml(sections) {
    if (!Array.isArray(sections) || !sections.length) return "";
    return sections
      .map(function (section) {
        var heading = htmlWithLineBreaks(section && section.heading);
        var paragraph = htmlWithLineBreaks(section && section.paragraph);
        var bullets = Array.isArray(section && section.bulletPoints)
          ? section.bulletPoints
          : [];
        var hasBullets = bullets.length > 0;
        var headingTag = hasBullets ? "h2" : "h1";
        var headingClass = hasBullets
          ? "sf-section-heading sf-heading-sm font-14 font-bold font-white"
          : "sf-section-heading sf-heading-lg font-24 font-bold font-white";
        var listHtml = hasBullets
          ? '<ul class="eventList">' +
            bullets
              .map(function (item) {
                return (
                  '<li class="font-14 font-regular font-white">' +
                  '<img src="https://files.mastersunion.link/resources/svg/listItemIcon.svg" alt="">' +
                  htmlWithLineBreaks(item) +
                  "</li>"
                );
              })
              .join("") +
            "</ul>"
          : "";
        var sectionClass =
          "sf-detail-section" +
          (hasBullets ? " sf-section-bullets" : " sf-section-paragraph-block");
        return (
          '<section class="' +
          sectionClass +
          '">' +
          (heading
            ? "<" +
              headingTag +
              ' class="' +
              headingClass +
              '">' +
              heading +
              "</" +
              headingTag +
              ">"
            : "") +
          (paragraph
            ? '<p class="sf-section-paragraph font-14 font-regular font-grey8 formDescriptiton">' +
              paragraph +
              "</p>"
            : "") +
          listHtml +
          "</section>"
        );
      })
      .join("");
  }

  /** Same banner wiring as `eventDetailPage.hbs` `bindEvent` (desktop + mobile art). */
  function applyEventBanner(ev) {
    var wrap = document.querySelector("#sf-main .headSction");
    var desk = document.getElementById("header_mainImage");
    var mob = document.getElementById("header_thumbNail");
    if (!desk || !mob) return;
    var mainImg = ev && ev.mainImage ? String(ev.mainImage).trim() : "";
    var thumb = ev && ev.thumbNail ? String(ev.thumbNail).trim() : "";
    if (!mainImg) {
      if (wrap) wrap.classList.add("hide");
      return;
    }
    if (wrap) wrap.classList.remove("hide");
    desk.src = mainImg;
    desk.alt = (ev && ev.title) || "Event";
    mob.src = thumb || mainImg;
    mob.alt = (ev && ev.title) || "Event";
  }

  function isFeedbackEnabled(sessionData) {
    var v = sessionData && sessionData.sessionFeedbackFormEnabled;
    return String(v).toLowerCase() === "true";
  }

  function validateMobileIndia(val) {
    return /^\d{10}$/.test(String(val || "").trim());
  }

  function validateEmail(val) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val || "").trim());
  }

  function collectPayload() {
    return {
      slug: slug,
      email: ($("#sf-email") && $("#sf-email").value) || "",
      name: ($("#sf-name") && $("#sf-name").value) || "",
      mobile: ($("#sf-mobile") && $("#sf-mobile").value) || "",
      valuable:
        ($('input[name="sf_valuable"]:checked') &&
          $('input[name="sf_valuable"]:checked').value) ||
        "",
      relevant:
        ($('input[name="sf_relevant"]:checked') &&
          $('input[name="sf_relevant"]:checked').value) ||
        "",
      mostUseful: ($("#sf-most-useful") && $("#sf-most-useful").value) || "",
      followUps: ($("#sf-followups") && $("#sf-followups").value) || "",
      consentCheck:
        (document.getElementById("consentCheckSf1") &&
          document.getElementById("consentCheckSf1").checked) ||
        false,
    };
  }

  /** Same UTM query keys as `eventDetailPage.hbs` formSubmitHandler */
  function parseUtmParams() {
    var q;
    try {
      q = new URLSearchParams(window.location.search);
    } catch (err) {
      q = new URLSearchParams();
    }
    var utmSource = q.get("utm_source") || "";
    var utmMedium = q.get("utm_medium") || "";
    var utmCampaign = q.get("utm_campaign") || "";
    var gclid = q.get("gclid") || "";
    var fbclid = q.get("fbclid") || "";
    var utmTerm = q.get("utm_term") || "";
    var utmPlacement = q.get("utm_placement") || "";
    var utmContent = q.get("utm_content") || "";
    var utmCampaignId = q.get("utm_campaign_id") || "";
    var utmAdGroupId = q.get("utm_adgroup_id") || "";
    var utmCreativeId = q.get("utm_creative_id") || "";
    var deviceType =
      typeof window !== "undefined" && window.innerWidth < 767
        ? "mobile"
        : "desktop";
    var fullUrl =
      typeof window !== "undefined" && window.location
        ? window.location.href
        : "";
    return {
      utmSource: utmSource,
      utmMedium: utmMedium,
      utmCampaign: utmCampaign,
      gclid: gclid,
      fbclid: fbclid,
      utmTerm: utmTerm,
      utmPlacement: utmPlacement,
      utmContent: utmContent,
      utmCampaignId: utmCampaignId,
      utmAdGroupId: utmAdGroupId,
      utmCreativeId: utmCreativeId,
      deviceType: deviceType,
      fullUrl: fullUrl,
    };
  }

  /**
   * Mirrors `eventDetailPage.hbs` getEventBySlug → LeadMatrix endpoint + formId.
   */
  function leadMatrixEndpointForEvent(ev) {
    var t = (ev && ev.eventCourseType) || "";
    var s = (ev && ev.slug) || "";
    var domain = (ev && ev.domain) || "";
    if (t === "PGP-TBM") {
      return { endpoint: "pgp_tbm_2026", formId: "0" };
    }
    if (t === "PGP Rise") {
      return { endpoint: "pgp_rise_general_management", formId: "104" };
    }
    if (t === "pgp-rise-general-management-global") {
      return { endpoint: "pgp_rise_general_global", formId: "65" };
    }
    if (
      t === "PGP Rise: Owners & Promoters Management" ||
      t === "PGP Family Business Management"
    ) {
      return { endpoint: "pgp_rise_owners_promoters_management", formId: "65" };
    }
    if (t === "UG") {
      if (
        s === "hydearabadstartupweekend" ||
        s === "aibuildathon" ||
        s === "summerskillsweek2026" ||
        s === "summerstartupweek" ||
        s === "testdrive2026"
      ) {
        return { endpoint: "ug_k-12", formId: "114" };
      }
      if (s === "bioschool") {
        return { endpoint: "ug_bio-school", formId: "116" };
      }
      if (domain === "Design") {
        return { endpoint: "ug_design", formId: "149" };
      }
      return { endpoint: "ug_tbm_psm", formId: "100" };
    }
    if (t === "DSAI") {
      return { endpoint: "ug_dsai", formId: "109" };
    }
    if (t === "PGP Bharat") {
      return { endpoint: "pgp_bharat", formId: "112" };
    }
    if (t === "Bharat-Fellowship") {
      return { endpoint: "Bharat_Fellowship", formId: "186" };
    }
    if (t === "PGP Rise: Capital Markets and Trading") {
      return { endpoint: "pgp_rise_cmt", formId: "31" };
    }
    if (t === "PGP-EBAP") {
      return { endpoint: "e_bap_pgp", formId: "116" };
    }
    if (t === "PGP-SBM") {
      return { endpoint: "sbm_pgp", formId: "187" };
    }
    if (t === "D2C-BOOTCAMP") {
      return { endpoint: "d2c_bootcamp", formId: "199" };
    }
    if (t === "PGP-SMG") {
      return { endpoint: "smg_pgp", formId: "131" };
    }
    if (t === "PGP-AI") {
      return { endpoint: "pgpai_pgp", formId: "124" };
    }
    if (t === "PGP-UI/UX") {
      return { endpoint: "uiux_pgp", formId: "150" };
    }
    if (t === "PGP-HR&OS") {
      return { endpoint: "pgp_hros", formId: "130" };
    }
    return { endpoint: "pgp_tbm_2026", formId: "0" };
  }

  /** `form_data` shape from event detail (registration), adapted for session feedback */
  function buildEventPayloadForLead(event, raw, utm) {
    var eventSlug = (event && event.slug) || "";
    return {
      email: String(raw.email || "").trim().toLowerCase(),
      name: String(raw.name || "").trim(),
      mobile: String(raw.mobile || "").trim(),
      countryCode: "+91",
      course: "Session feedback",
      programme: (event && event.eventCourseType) || "",
      medium: utm.utmMedium || null,
      campaign: utm.utmCampaign || null,
      source: utm.utmSource || null,
      gclid: utm.gclid || null,
      fbclid: utm.fbclid || null,
      utmTerm: utm.utmTerm || null,
      utmPlacement: utm.utmPlacement || null,
      utmContent: utm.utmContent || null,
      utmCampaignId: utm.utmCampaignId || null,
      utmAdGroupId: utm.utmAdGroupId || null,
      utmCreativeId: utm.utmCreativeId || null,
      device: utm.deviceType,
      event_Id: event && event._id,
      eventName: (event && event.title) || "",
      mode: (event && event.eventLocation) || "",
      full_utm_url: utm.fullUrl || null,
      leadSource: eventSlug,
      leadOrigin: eventSlug,
      consentCheck: raw.consentCheck || false,
      sessionFeedback: {
        valuable: raw.valuable,
        relevant: raw.relevant,
        mostUseful: String(raw.mostUseful || "").trim(),
        followUps: String(raw.followUps || "").trim(),
      },
    };
  }

  /** `form_dataNPF` shape → LeadMatrixCaptureLeads … /events (same as event detail second call) */
  function buildLeadMatrixPayload(event, eventPayload, raw, utm, lm) {
    var eventSlug = (event && event.slug) || "";
    return {
      Specialization: (event && event.eventCourseType) || "Event",
      course: "Course",
      campaign: utm.utmCampaign || null,
      email: String(raw.email || "").trim().toLowerCase(),
      device: utm.deviceType,
      medium: utm.utmMedium || null,
      mobile: String(raw.mobile || "").trim(),
      name: String(raw.name || "").trim(),
      source: utm.utmSource || null,
      state: null,
      city: null,
      countryCode: "+91",
      fullUrl: utm.fullUrl || "N/A",
      event_payload: eventPayload,
      leadSource: eventSlug,
      leadOrigin: eventSlug,
      formId: lm.formId,
      gclid: utm.gclid || null,
      fbclid: utm.fbclid || null,
      utmTerm: utm.utmTerm || null,
      utmPlacement: utm.utmPlacement || null,
      utmContent: utm.utmContent || null,
      utmCampaignId: utm.utmCampaignId || null,
      utmAdGroupId: utm.utmAdGroupId || null,
      utmCreativeId: utm.utmCreativeId || null,
    };
  }

  /** Flat body for POST /api/session-feedback (easy DB columns). */
  function buildDbPayload(event, sessionData, raw, utm, leadResult, leadUrl) {
    var v = raw.valuable ? parseInt(raw.valuable, 10) : null;
    var r = raw.relevant ? parseInt(raw.relevant, 10) : null;
    return {
      slug: String(raw.slug || "").trim(),
      submittedAt: new Date().toISOString(),
      email: String(raw.email || "").trim().toLowerCase(),
      name: String(raw.name || "").trim(),
      mobile: String(raw.mobile || "").trim(),
      sessionValue: v >= 1 && v <= 5 ? v : null,
      sessionRelevance: r >= 1 && r <= 5 ? r : null,
      mostUseful: String(raw.mostUseful || "").trim(),
      followUps: String(raw.followUps || "").trim(),
      consentCheck: raw.consentCheck || false,
      eventId: (event && event._id) || null,
      eventTitle: (event && event.title) || "",
      eventCourseType: (event && event.eventCourseType) || "",
      eventLocation: (event && event.eventLocation) || "",
      feedbackEnabled:
        sessionData && String(sessionData.sessionFeedbackFormEnabled || ""),
      utm_source: utm.utmSource || null,
      utm_medium: utm.utmMedium || null,
      utm_campaign: utm.utmCampaign || null,
      gclid: utm.gclid || null,
      fbclid: utm.fbclid || null,
      utm_term: utm.utmTerm || null,
      utm_placement: utm.utmPlacement || null,
      utm_content: utm.utmContent || null,
      utm_campaign_id: utm.utmCampaignId || null,
      utm_adgroup_id: utm.utmAdGroupId || null,
      utm_creative_id: utm.utmCreativeId || null,
      device: utm.deviceType || null,
      page_url: utm.fullUrl || null,
      leadOk: !!(leadResult && leadResult.ok),
      leadHttpStatus: (leadResult && leadResult.status) || null,
      leadEndpoint: (leadResult && leadResult.endpoint) || null,
      leadError: (leadResult && leadResult.error) || null,
      leadUrl: leadUrl || null,
    };
  }

  function feedbackSubmitUrl() {
    if (typeof window === "undefined" || !window.location) return "/api/session-feedback";
    var origin = normalizeLocalDevApiPort(
      window.location.origin.replace(/\/$/, "")
    );
    return origin + "/api/session-feedback";
  }

  function leadMatrixUrl(endpoint) {
    return (
      apiBase.replace(/\/$/, "") +
      "/api/leads/LeadMatrixCaptureLeads/" +
      encodeURIComponent(endpoint) +
      "/events"
    );
  }

  async function postJson(url, body) {
    var res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    var data = {};
    try {
      data = await res.json();
    } catch (e) {
      data = {};
    }
    return { ok: res.ok, status: res.status, data: data };
  }

  async function postSessionFeedback(payload) {
    var res = await fetch(feedbackSubmitUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    var data = {};
    try {
      data = await res.json();
    } catch (e) {
      data = {};
    }
    if (!res.ok) {
      var msg =
        (data && data.message) ||
        "Could not submit feedback. Please try again.";
      throw new Error(msg);
    }
    return data;
  }

  /**
   * 1) Lead — same LeadMatrix API as event detail page.
   * 2) DB — POST /api/session-feedback (flat simple payload).
   */
  async function submitFeedbackBundle(sessionData, event) {
    var raw = collectPayload();
    var utm = parseUtmParams();
    var lm = leadMatrixEndpointForEvent(event);
    var eventPayload = buildEventPayloadForLead(event, raw, utm);
    var leadBody = buildLeadMatrixPayload(event, eventPayload, raw, utm, lm);
    var leadUrl = leadMatrixUrl(lm.endpoint);

    var leadResult = {
      endpoint: lm.endpoint,
      ok: false,
      status: 0,
      data: null,
      error: null,
    };
    try {
      var lr = await postJson(leadUrl, leadBody);
      leadResult.ok = lr.ok;
      leadResult.status = lr.status;
      leadResult.data = lr.data;
    } catch (e) {
      leadResult.error = String((e && e.message) || e);
    }

    var dbPayload = buildDbPayload(
      event,
      sessionData,
      raw,
      utm,
      leadResult,
      leadUrl
    );

    await postSessionFeedback(dbPayload);

    if (typeof console !== "undefined" && console.log) {
      console.log("[session-feedback] LeadMatrix", leadResult);
    }
    return { leadResult: leadResult, db: true };
  }

  var scaleErrToPanel = {
    "sf-valuable-err": "sf-panel-valuable",
    "sf-relevant-err": "sf-panel-relevant",
  };

  function setFieldError(errId, message) {
    var el = document.getElementById(errId);
    if (!el) return;
    el.textContent = message || "";
    if (message) {
      el.classList.add("sf-error-visible");
      el.setAttribute("role", "alert");
    } else {
      el.classList.remove("sf-error-visible");
      el.removeAttribute("role");
    }
    var panelId = scaleErrToPanel[errId];
    if (panelId) {
      var panel = document.getElementById(panelId);
      if (panel) panel.classList.toggle("sf-scale-has-error", !!message);
    }
  }

  function scrollToFieldId(fieldId) {
    var el = document.getElementById(fieldId);
    if (!el || !el.scrollIntoView) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    if (fieldId.indexOf("-err") === -1) {
      try {
        el.focus({ preventScroll: true });
      } catch (e) {
        try {
          el.focus();
        } catch (e2) {}
      }
    }
  }

  function validateEmailField() {
    var v = (($("#sf-email") && $("#sf-email").value) || "").trim();
    if (!v) {
      setFieldError("sf-email-err", "Please enter your email.");
      return false;
    }
    if (!validateEmail(v)) {
      setFieldError("sf-email-err", "Please enter a valid email.");
      return false;
    }
    setFieldError("sf-email-err", "");
    return true;
  }

  function validateNameField() {
    var v = (($("#sf-name") && $("#sf-name").value) || "").trim();
    if (!v) {
      setFieldError("sf-name-err", "Please enter your name.");
      return false;
    }
    setFieldError("sf-name-err", "");
    return true;
  }

  function validateMobileField() {
    var v = (($("#sf-mobile") && $("#sf-mobile").value) || "").trim();
    if (!v) {
      setFieldError("sf-mobile-err", "Please enter your mobile number.");
      return false;
    }
    if (!validateMobileIndia(v)) {
      setFieldError(
        "sf-mobile-err",
        "Please enter a valid 10-digit mobile number."
      );
      return false;
    }
    setFieldError("sf-mobile-err", "");
    return true;
  }

  function validateValuableField() {
    var p = collectPayload();
    if (!p.valuable) {
      setFieldError(
        "sf-valuable-err",
        "Please select how valuable the session was."
      );
      return false;
    }
    setFieldError("sf-valuable-err", "");
    return true;
  }

  function validateRelevantField() {
    var p = collectPayload();
    if (!p.relevant) {
      setFieldError(
        "sf-relevant-err",
        "Please select how relevant the session was."
      );
      return false;
    }
    setFieldError("sf-relevant-err", "");
    return true;
  }

  function validateForm() {
    var firstScroll = null;
    if (!validateEmailField()) firstScroll = firstScroll || "sf-email";
    if (!validateNameField()) firstScroll = firstScroll || "sf-name";
    if (!validateMobileField()) firstScroll = firstScroll || "sf-mobile";
    if (!validateValuableField()) firstScroll = firstScroll || "sf-valuable-err";
    if (!validateRelevantField()) firstScroll = firstScroll || "sf-relevant-err";
    var consentEl = document.getElementById("consentCheckSf1");
    var consentErrEl = document.getElementById("consentCheckErrorSf1");
    if (consentEl && !consentEl.checked) {
      if (consentErrEl) consentErrEl.classList.remove("warning");
      firstScroll = firstScroll || "consentCheckErrorSf1";
    } else if (consentErrEl) {
      consentErrEl.classList.add("warning");
    }
    if (firstScroll) {
      window.setTimeout(function () {
        scrollToFieldId(firstScroll);
      }, 0);
      return false;
    }
    return true;
  }

  function bindRadiogroupFocusOut(groupEl, validateFn) {
    if (!groupEl) return;
    groupEl.addEventListener("focusout", function () {
      var self = this;
      window.setTimeout(function () {
        if (!self.contains(document.activeElement)) {
          validateFn();
        }
      }, 0);
    });
    groupEl.addEventListener("change", function () {
      validateFn();
    });
  }

  function renderThankYou(thankYouLine) {
    show($("#sf-loader"), false);
    show($("#sf-main"), false);
    show($("#sf-disabled"), false);
    show($("#sf-error"), false);
    show($("#sf-thanks"), true);
    setText("sf-thanks-body", thankYouLine || "Thank you for your feedback.");
  }

  function renderDisabled(inviteLine) {
    show($("#sf-loader"), false);
    show($("#sf-main"), false);
    show($("#sf-thanks"), false);
    show($("#sf-error"), false);
    show($("#sf-disabled"), true);
    setText(
      "sf-disabled-msg",
      inviteLine ||
        "Feedback is not open for this session at the moment."
    );
  }

  function renderError(msg) {
    show($("#sf-loader"), false);
    show($("#sf-main"), false);
    show($("#sf-thanks"), false);
    show($("#sf-disabled"), false);
    show($("#sf-error"), true);
    setText("sf-error-msg", msg || "Something went wrong. Please try again.");
  }

  function bindForm(sessionData, event) {
    var form = $("#sf-form");
    if (!form) return;

    var email = $("#sf-email");
    var name = $("#sf-name");
    var mobile = $("#sf-mobile");

    if (email) {
      email.addEventListener("blur", validateEmailField);
    }
    if (name) {
      name.addEventListener("blur", validateNameField);
    }
    if (mobile) {
      mobile.addEventListener("input", function () {
        this.value = this.value.replace(/[^0-9]/g, "").slice(0, 10);
      });
      mobile.addEventListener("blur", validateMobileField);
    }

    bindRadiogroupFocusOut(
      form.querySelector('[aria-labelledby="sf-q-valuable"]'),
      validateValuableField
    );
    bindRadiogroupFocusOut(
      form.querySelector('[aria-labelledby="sf-q-relevant"]'),
      validateRelevantField
    );

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validateForm()) return;

      var btn = $("#sessionFeedbackSubmitBtn");
      setFieldError("sf-submit-err", "");

      if (btn) {
        btn.disabled = true;
        btn.setAttribute("aria-busy", "true");
      }

      submitFeedbackBundle(sessionData, event)
        .then(function (data) {
          if (typeof console !== "undefined" && console.log) {
            console.log("[session-feedback] submitted", data);
          }
          renderThankYou(sessionData.sessionFeedbackThankYouLine);
        })
        .catch(function (err) {
          setFieldError(
            "sf-submit-err",
            (err && err.message) ||
              "Something went wrong. Please try again."
          );
        })
        .then(function () {
          if (btn) {
            btn.disabled = false;
            btn.removeAttribute("aria-busy");
          }
        });
    });
  }

  async function init() {
    if (!slug) {
      renderError("Missing event slug.");
      return;
    }

    var url = apiBase.replace(/\/$/, "") + "/api/eventbyslug/" + encodeURIComponent(slug);

    try {
      var res = await fetch(url);
      var json = await res.json();
      var event = json && json.Data;

      if (!res.ok || !event) {
        renderError("We could not find this event.");
        return;
      }

      var sessionData = event.sessionData || {};
      var org = event.organization || "Masters’ Union";
      var title = event.title || "Session";
      var sessionWord = sessionLabelForEventType(event.eventType);

      show($("#sf-loader"), false);

      if (!isFeedbackEnabled(sessionData)) {
        renderDisabled(sessionData.sessionFeedbackInviteLine);
        return;
      }

      show($("#sf-main"), true);
      applyEventBanner(event);

      document.title =
        (sessionData.sessionFeedbackEmailSubject || title) +
        " | " +
        org;

      setHtml(
        "sf-page-title",
        htmlWithLineBreaks(sessionData.sessionFeedbackEmailSubject || "")
      );
      setHtml(
        "sf-intro",
        htmlWithLineBreaks(sessionData.sessionFeedbackThankYouLine || "")
      );

      var introEl = document.getElementById("sf-intro");
      if (introEl) {
        introEl.style.display = (sessionData.sessionFeedbackThankYouLine || "")
          .trim()
          ? ""
          : "none";
      }

      setHtml(
        "sf-sections",
        renderSectionsHtml(sessionData.sessionFeedbackSections)
      );

      var sectionsEl = document.getElementById("sf-sections");
      if (sectionsEl) {
        sectionsEl.style.display =
          sessionData.sessionFeedbackSections &&
          sessionData.sessionFeedbackSections.length
            ? ""
            : "none";
      }

      var linkWrap = document.getElementById("sf-program-link-wrap");
      var linkEl = document.getElementById("sf-program-link");
      var programLink = (sessionData.sessionFeedbackProgramLink || "").trim();
      if (linkWrap && linkEl) {
        if (programLink) {
          linkEl.href = programLink;
          linkEl.textContent = "Explore the full programme ->";
          linkWrap.style.display = "";
        } else {
          linkEl.removeAttribute("href");
          linkEl.textContent = "";
          linkWrap.style.display = "none";
        }
      }

      var contactEl = document.getElementById("sf-contact-line");
      if (contactEl) {
        var contactPhone = String(sessionData.sessionFeedbackContactPhone || "").trim();
        var contactEmail = String(sessionData.sessionFeedbackContactEmail || "").trim();
        if (contactPhone || contactEmail) {
          var parts = ["For more information"];
          if (contactPhone) {
            parts.push(
              ', call on <a class="sf-contact-link" href="tel:' +
                escapeHtml(contactPhone.replace(/\s+/g, "")) +
                '">' +
                escapeHtml(contactPhone) +
                "</a>"
            );
          }
          if (contactEmail) {
            parts.push(
              (contactPhone ? " or " : ", ") +
                'drop your queries on <a class="sf-contact-link" href="mailto:' +
                escapeHtml(contactEmail) +
                '">' +
                escapeHtml(contactEmail) +
                "</a>"
            );
          }
          contactEl.innerHTML = parts.join("");
          contactEl.style.display = "";
        } else {
          contactEl.innerHTML = "";
          contactEl.style.display = "none";
        }
      }

      setText(
        "sf-q-valuable",
        "Overall, how valuable was this " + sessionWord + " for you?"
      );
      setText(
        "sf-q-relevant",
        "How relevant was the session to your current role or business context?"
      );

      bindForm(sessionData, event);
    } catch (err) {
      renderError("We could not load this form. Check your connection and try again.");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
