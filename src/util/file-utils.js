'use strict'
const constraints = require('./constraints');

/**
 *
 * @param {string} format
 * @param {string} locale
 * @param {{}} options
 * @returns {string}
 */
module.exports.buildTranslationFileName = function (format, locale, options) {

  const base = options.fileBaseName ? options.fileBaseName + '-' : '';
  let extension;

  switch (format) {
    default:
      throw new Error('Unknown extension for translation format ' + format);
      break;
    case constraints.TRANSLATION_FORMATS.LOCALE_JSON:
      extension = 'json';
      break;
    case constraints.TRANSLATION_FORMATS.GETTEXT:
      extension = 'po';
      break;
  }

  return base + locale + '.' + extension;
}