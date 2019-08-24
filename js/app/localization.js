const LANGUAGES = {
  English: "_en",
  Japanese: "_ja",
  German: "_de",
  French: "_fr",
  Korean: "_ko"
};

class LocalizationHelper {

  constructor() {
    // Default to English (_en).
    this.language_suffix = LANGUAGES.English;
    // Unless... the URL has a "lang" defined...
    let url = new URL(window.location);
    if (url.searchParams.has('lang')) {
      var lang = url.searchParams.get('lang');
      if (_(LANGUAGES).chain().values().contains("_" + lang).value()) {
        this.language_suffix = "_" + lang;
      }
    }
    // Otherwise, check saved preferences from last visit.
    else if (window.localStorage.getItem('lang')) {
      var lang = window.localStorage.getItem('lang');
      if (_(LANGUAGES).chain().values().contains("_" + lang).value()) {
        this.language_suffix = "_" + lang;
      }
    }
    this.languageChanged = new rxjs.BehaviorSubject(this.language_suffix);
  }

  getLocalizedProperty(obj, name) {
    return obj[name + this.language_suffix];
  }

  getLocalizedDataObject(obj) {
    // This function creates a /clone/ of the object, substituting all i18n
    // fields with their specific language.
    var tmp = _(obj).chain()
      .pairs()
      .partition((x) => _(LANGUAGES).any((l) => x[0].endsWith(l)))
      .value();
    return _(tmp[0]).chain()
      .filter((x) => x[0].endsWith(this.language_suffix))
      .map((x) => [x[0].slice(0, this.language_suffix.length), x[1]])
      .object()
      .extend(_(tmp[1].object()))
      .value();
  }

  setLanguage(lang) {
    if (_(LANGUAGES).chain().values().contains("_" + lang).value()) {
      this.language_suffix = "_" + lang;
      window.localStorage.setItem('lang', lang);
      this.languageChanged.next(this.language_suffix);
    } else {
      console.error("Invalid language choice:", lang);
    }
  }

  getLanguage() {
    return this.language_suffix.slice(1);
  }
}

let localizationHelper = new LocalizationHelper();
let __p = _.bind(localizationHelper.getLocalizedProperty, localizationHelper);
