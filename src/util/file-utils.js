'use strict'
const constraints = require('./constraints');

/**
 *
 * @param {string} format
 * @param {string} namespace
 * @param {string} locale
 * @param {{}} options
 * @returns {string}
 */
module.exports.buildTranslationFileName = function (format, namespace, locale, options) {
  const namespaceSeparator = options.namespaceSeparator || '-';
  const base = options.namespaces ? namespace : (options.fileBaseName || '');
  let extension;

  switch (format) {
    default:
      throw new Error('Unknown extension for translation format ' + format);
      break;
    case constraints.TRANSLATION_FORMATS.LOCALE_JSON:
    case constraints.TRANSLATION_FORMATS.JSON_STRUCTURE:
      extension = 'json';
      break;
    case constraints.TRANSLATION_FORMATS.GETTEXT:
      extension = 'po';
      break;
    case constraints.TRANSLATION_FORMATS.YAML:
      extension = 'yml';
      break;
    case constraints.TRANSLATION_FORMATS.PROPERTIES:

      if (options.defaultLocaleName === locale) {
        locale = '';
      }

      extension = 'properties'
      break;
  }

  return base + (base && locale ? namespaceSeparator : '' ) + locale + '.' + extension;
}
