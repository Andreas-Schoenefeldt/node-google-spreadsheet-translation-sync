/**
 * Created by Andreas on 22/06/17.
 */

module.exports.withoutError = function (err, callback) {
  if (err) {
    callback(err)
    return false
  }

  return true
}
