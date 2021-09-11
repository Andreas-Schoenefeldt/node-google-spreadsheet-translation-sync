'use strict'


/**
 *
 * @param translationFormat
 * @return {{loadTranslationFile: function, getTranslationKeys: function, updateTranslations: function}}
 */
module.exports.getHandler = function (translationFormat) {

  const TRANSLATION_FORMATS = require('./util/constraints').TRANSLATION_FORMATS;

  switch (translationFormat) {
    default:
      throw new Error('No handler available for the translation format ' + translationFormat);
    case TRANSLATION_FORMATS.LOCALE_JSON:
      return require('./handlers/locale_json');
    case TRANSLATION_FORMATS.GETTEXT:
      return require('./handlers/gettext');
    case TRANSLATION_FORMATS.PROPERTIES:
      return require('./handlers/properties');
    case 'yaml':
    case TRANSLATION_FORMATS.YAML:
      return require('./handlers/yaml');
  }
}
