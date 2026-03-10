module.exports.escapeSingleQuotes = function(str) {
    return str.replace(/'/g, "\\'");
};