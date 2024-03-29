'use strict'

const fs = require('fs');
const withoutError = require('../helpers').withoutError
const constraints = require('../util/constraints');

module.exports.loadTranslationFile = function (filePath, callback) {

  fs.access(filePath, function (err) {

    if (err) {
      callback({}); // we return the empty json
    } else {

      fs.readFile(filePath, function (err, data) {
        callback(err ? {} : JSON.parse(data));
      })
    }
  });
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
  const path = require('path');
  const async = require('async');
  const mod = this;
  const fileUtils = require('../util/file-utils');

  if (! fs.existsSync(translationRootFolder)) {
    throw new Error('The folder ' + translationRootFolder + ' does not exist');
  }

  async.each(Object.keys(translationData), function(locale, done) {

    // is it a comment or a real translation?
    if (locale.substr(0, constraints.commentCollumnName.length) !== constraints.commentCollumnName) {

      async.each(Object.keys(translationData[locale]), function (namespace, done2) {

        const localeFileName = fileUtils.buildTranslationFileName(constraints.TRANSLATION_FORMATS.LOCALE_JSON, namespace, locale, options);
        const file = path.resolve(translationRootFolder + '/' + localeFileName);

        mod.loadTranslationFile(file, function (translations) {
          const potentiallyUpdatedTranslations = translationData[locale][namespace];

          Object.assign(translations, potentiallyUpdatedTranslations);

          // now we write
          fs.writeFile(file, JSON.stringify(translations, null, 4), function (err) {
            if (withoutError(err)) {
              // console.info('Updated translations of %o', localeFileName);
            }
            done2();
          })
        })
      }, function () {
        done();
      })

    } else {
      done();
    }
  }, function (err) {
    if (withoutError(err, callback)) {
      callback(null);
    }
  });


}
