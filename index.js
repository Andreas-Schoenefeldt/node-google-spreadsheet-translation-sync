'use strict'

/**
 * Adds commas to a number
 */

/**
 * @param {string} localPath the path where to export the translations locally, before uploading
 * @param sheetId the google spreadsheet id
 * @param credentials the google json credentials
 * @param {function} callback
 */
module.exports.exportToSpreadsheet = require('./src/export-to-spreadsheet');


module.exports.importFromSpreadsheet = require('./src/import-from-spreadsheet');


module.exports.possibleTranslationFormats = require('./src/util/constraints').translationFormats;


module.exports.interaction = require('./src/interaction');