'use strict'

const fs = require('fs');
const withoutError = require('../helpers').withoutError
const PropertiesReader = require('properties-reader');

module.exports.loadTranslationFile = function (filePath, callback) {
  const props = PropertiesReader(filePath);
  callback(props.getAllProperties());
}

/**
 * A wrapper to return a flat key: value object structure, used for uploading
 * @param {string} filePath
 * @param {function} callback
 */
module.exports.getTranslationKeys = function (filePath, callback) {
  this.loadTranslationFile(filePath, callback);
}


module.exports.updateTranslations = function (translationData, translationRootFolder, options, callback) {
  const constraints = require('../util/constraints');
  const path = require('path');
  const async = require('async');
  const mod = this;
  const fileUtils = require('../util/file-utils');

  if (! fs.existsSync(translationRootFolder)) {
    throw new Error('The folder ' + translationRootFolder + ' does not exist');
  }

  // console.log(translationData);

  async.each(Object.keys(translationData), function(locale, done) {

    // is it a comment or a real translation?
    if (locale.substr(0, constraints.commentCollumnName.length) !== constraints.commentCollumnName) {

      async.each(Object.keys(translationData[locale]), function (namespace, done2) {

        const localeFileName = fileUtils.buildTranslationFileName(constraints.TRANSLATION_FORMATS.PROPERTIES, namespace, locale, options);
        const file = path.resolve(translationRootFolder + '/' + localeFileName);

        if (! fs.existsSync(file)) {
          fs.writeFileSync(file, '');
        }

        const props = PropertiesReader(file, {write_sections: false});
        const potentiallyUpdatedTranslations = translationData[locale][namespace];

        Object.keys(potentiallyUpdatedTranslations).forEach(function (key) {
          props.set(key, potentiallyUpdatedTranslations[key]);
        });

        props.save(file, function () {
          done2();
        })
      }, function () {
        done();
      });
    }
  }, function (err) {
    if (withoutError(err, callback)) {
      callback(null);
    }
  })

}
