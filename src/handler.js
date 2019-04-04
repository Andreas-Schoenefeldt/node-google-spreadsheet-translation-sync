'use strict'

module.exports.TRANSLATION_FORMATS = {
  LOCALE_JSON: 'locale_json'
}

/**
 *
 * @param translationFormat
 * @return {TranslationHandler}
 */
module.exports.getHandler = function (translationFormat) {

  switch (translationFormat) {
    default:
      throw new Error('No handler available for the translation format ' + translationFormat);
      break;
    case this.TRANSLATION_FORMATS.LOCALE_JSON:
      return require('./handlers/locale_json');
      break;

  }
}