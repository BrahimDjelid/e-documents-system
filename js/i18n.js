(function () {
  "use strict";

  const STORAGE_KEY = "language";
  const DEFAULT_LANGUAGE = "en";
  const SUPPORTED_LANGUAGES = ["en", "fr", "ar"];
  const RTL_LANGUAGES = ["ar"];

  function getCatalog(lang) {
    const catalogs = {
      en: window.I18N_EN,
      fr: window.I18N_FR,
      ar: window.I18N_AR,
    };
    return catalogs[lang] || window.I18N_EN;
  }

  function getSavedLanguage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return SUPPORTED_LANGUAGES.includes(saved) ? saved : DEFAULT_LANGUAGE;
  }

  let currentLanguage = getSavedLanguage();

  function readPath(source, path) {
    return String(path || "")
      .split(".")
      .reduce((value, part) => (value && value[part] !== undefined ? value[part] : undefined), source);
  }

  function interpolate(value, params) {
    if (!params) return value;
    return String(value).replace(/\{(\w+)\}/g, (_, key) =>
      params[key] === undefined ? `{${key}}` : String(params[key]),
    );
  }

  function t(path, params) {
    const catalog = getCatalog(currentLanguage) || {};
    const fallback = getCatalog(DEFAULT_LANGUAGE) || {};
    const value = readPath(catalog, path) ?? readPath(fallback, path) ?? path;
    return interpolate(value, params);
  }

  function setText(el, value) {
    el.textContent = String(value).replace(/\\n/g, "\n");
  }

  function renderLanguageOptions(select) {
    if (!select) return;
    select.innerHTML = `
        <option value="en">${t("language.english")}</option>
        <option value="fr">${t("language.french")}</option>
        <option value="ar">${t("language.arabic")}</option>
      `;
    select.value = currentLanguage;
    select.setAttribute("aria-label", t("language.label"));
  }

  function applyTranslations(root) {
    const scope = root || document;

    scope.querySelectorAll("[data-i18n]").forEach((el) => {
      setText(el, t(el.dataset.i18n));
    });

    scope.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      el.setAttribute("placeholder", t(el.dataset.i18nPlaceholder));
    });

    scope.querySelectorAll("[data-i18n-title]").forEach((el) => {
      el.setAttribute("title", t(el.dataset.i18nTitle));
    });

    scope.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
      el.setAttribute("aria-label", t(el.dataset.i18nAriaLabel));
    });

    const isRtl = RTL_LANGUAGES.includes(currentLanguage);
    document.documentElement.lang = currentLanguage;
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    document.documentElement.classList.toggle("rtl", isRtl);
    document.title = t(document.body?.dataset.i18nTitle || "login.pageTitle");

    document.querySelectorAll("[data-language-switcher] select").forEach((select) => {
      renderLanguageOptions(select);
    });
  }

  function setLanguage(lang) {
    if (!SUPPORTED_LANGUAGES.includes(lang)) return;
    currentLanguage = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    applyTranslations(document);
    document.dispatchEvent(new CustomEvent("i18n:change", { detail: { language: lang } }));
  }

  function initLanguageSwitcher(root) {
    const scope = root || document;
    scope.querySelectorAll("[data-language-switcher]").forEach((mount) => {
      if (mount.dataset.languageSwitcherReady === "true") {
        const select = mount.querySelector("select");
        renderLanguageOptions(select);
        return;
      }

      mount.dataset.languageSwitcherReady = "true";
      mount.innerHTML = `
        <label class="language-switcher-label" for="language-switcher-${Math.random().toString(36).slice(2)}">
          <span data-i18n="language.label">Language</span>
        </label>
      `;

      const label = mount.querySelector("label");
      const select = document.createElement("select");
      select.className = "language-switcher-select";
      select.id = label.getAttribute("for");
      renderLanguageOptions(select);
      select.addEventListener("change", () => setLanguage(select.value));
      mount.appendChild(select);
    });
  }

  window.t = t;
  window.i18n = {
    t,
    setLanguage,
    getLanguage: () => currentLanguage,
    applyTranslations,
    initLanguageSwitcher,
  };

  document.addEventListener("DOMContentLoaded", () => {
    initLanguageSwitcher(document);
    applyTranslations(document);
  });
})();
