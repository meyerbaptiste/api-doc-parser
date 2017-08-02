'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = fetchJsonLd;
/**
 * Sends a JSON-LD request to the API.
 *
 * @param {string} url
 * @param {object} options
 * @return {Promise.<object>} An object with a response key (the original HTTP response) and an optional body key (the parsed JSON-LD body)
 */
function fetchJsonLd(url) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  var jsonLdMimeType = 'application/ld+json';

  if ('undefined' === typeof options.headers) {
    options.headers = new Headers();
  }

  if (null === options.headers.get('Accept')) {
    options.headers.set('Accept', jsonLdMimeType);
  }

  if ('undefined' !== options.body && !(typeof FormData !== 'undefined' && options.body instanceof FormData) && null === options.headers.get('Content-Type')) {
    options.headers.set('Content-Type', jsonLdMimeType);
  }

  return fetch(url, options).then(function (response) {
    if (!response.headers.has('Content-Type') || !response.headers.get('Content-Type').includes(jsonLdMimeType)) {
      return { response: response };
    }

    return response.json().then(function (body) {
      return { response: response, body: body, document: body };
    });
  });
}