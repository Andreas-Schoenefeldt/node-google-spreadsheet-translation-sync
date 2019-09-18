'use strict'


/**
 *
 * @param translationFormat
 * @return {TranslationHandler}
 */
module.exports.getHandler = function (translationFormat) {

  const TRANSLATION_FORMATS = require('./util/constraints').TRANSLATION_FORMATS;

  switch (translationFormat) {
    default:
      throw new Error('No handler available for the translation format ' + translationFormat);
      break;
    case TRANSLATION_FORMATS.LOCALE_JSON:
      return require('./handlers/locale_json');
    case TRANSLATION_FORMATS.GETTEXT:
      return require('./handlers/gettext');
    case TRANSLATION_FORMATS.PROPERTIES:
      return require('./handlers/properties');
  }
}
