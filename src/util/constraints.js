const formats = {
  LOCALE_JSON: 'locale_json', // just a plain array - lorem.ipsum keys will be {'lorem.ipsum': 'whatever'}
  JSON_STRUCTURE: 'json_structure', // lorem.ipsum keys will be converted into a json structure: {lorem: {ipsum: 'whatever'}}
  GETTEXT: 'gettext',
  PROPERTIES: 'properties',
  YAML: 'yml'
};

module.exports.TRANSLATION_FORMATS = formats;

module.exports.translationFormats = Object.values(formats);

module.exports.commentCollumnName = '#';
