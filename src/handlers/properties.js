'use strict'

const fs = require('fs');
const withoutError = require('../helpers').withoutError
const PropertiesReader = require('properties-reader');

module.exports.loadTranslationFile = function (filePath, callback) {
  const props = PropertiesReader(filePath);
  callback(props.getAllProperties());
}

/**
 * A wrapper to return a key: value object structure
 * @param {string} filePath
 * @param {function} callback
 */
module.exports.getTranslationKeys = function (filePath, callback) {
  this.loadTranslationFile(filePath, callback);
}


module.exports.updateTranslations = function (translationData, translationRootFolder, options, callback) {

  throw 'not implemented';

}
