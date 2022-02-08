'use strict'

const fs = require('fs');
const withoutError = require('../helpers').withoutError
const constraints = require('../util/constraints');
const {resolveStructureToTree} = require("../util/structure-utils");


module.exports.loadTranslationFile = function (filePath, callback) {

    fs.access(filePath, function (err) {

        if (err) {
            callback({}); // we return the empty json
        } else {

            fs.readFile(filePath, function (err, data) {

                const existingTranslations = err ? {} : JSON.parse(data);
                const cleanResult = {};

                resolveStructureToTree(cleanResult, existingTranslations);

                callback(cleanResult);
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
    const result = {};

    const keyFlattener = function(structure, prefix) {
        prefix = prefix || '';

        Object.keys(structure).forEach((key) => {

            const subStructure = structure[key];

            if (typeof subStructure === 'object' && subStructure !== null && subStructure !== undefined) {
                keyFlattener(subStructure, prefix + key + '.');
            } else {
                result[prefix + key] = subStructure;
            }
        })

    }

    this.loadTranslationFile(filePath, (parsedObject) => {
        keyFlattener(parsedObject);
        callback(result);
    });
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

                const localeFileName = fileUtils.buildTranslationFileName(constraints.TRANSLATION_FORMATS.JSON_STRUCTURE, namespace, locale, options);
                const file = path.resolve(translationRootFolder + '/' + localeFileName);

                mod.loadTranslationFile(file, function (translations) {
                    const potentiallyUpdatedTranslations = translationData[locale][namespace];

                    resolveStructureToTree(translations, potentiallyUpdatedTranslations);

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