'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

exports.getDocumentationUrlFromHeaders = getDocumentationUrlFromHeaders;
exports.default = parseHydraDocumentation;

var _jsonld = require('jsonld');

var _Api = require('../Api');

var _Api2 = _interopRequireDefault(_Api);

var _Field = require('../Field');

var _Field2 = _interopRequireDefault(_Field);

var _Resource = require('../Resource');

var _Resource2 = _interopRequireDefault(_Resource);

var _fetchJsonLd = require('./fetchJsonLd');

var _fetchJsonLd2 = _interopRequireDefault(_fetchJsonLd);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Extracts the short name of a resource.
 *
 * @param {string} url
 * @param {string} entrypointUrl
 * @return {string}
 */
function guessNameFromUrl(url, entrypointUrl) {
  return url.substr(entrypointUrl.length + 1);
}

/**
 * Finds the description of the class with the given id.
 *
 * @param {object[]} docs
 * @param {string} supportedClass
 * @return {object}
 */
function findSupportedClass(docs, supportedClass) {
  var supportedClasses = docs[0]['http://www.w3.org/ns/hydra/core#supportedClass'];

  for (var i = 0; i < supportedClasses.length; i++) {
    if (supportedClasses[i]['@id'] === supportedClass) {
      return supportedClasses[i];
    }
  }

  throw new Error('The class ' + supportedClass + ' doesn\'t exist.');
}

function getDocumentationUrlFromHeaders(headers) {
  var linkHeader = headers.get('Link');
  if (!linkHeader) {
    _promise2.default.reject(new Error('The response has no "Link" HTTP header.'));
  }

  var matches = linkHeader.match(/<(.+)>; rel="http:\/\/www.w3.org\/ns\/hydra\/core#apiDocumentation"/);
  if (!matches[1]) {
    _promise2.default.reject(new Error('The "Link" HTTP header is not of the type "http://www.w3.org/ns/hydra/core#apiDocumentation".'));
  }

  return matches[1];
}

/**
 * Retrieves Hydra's entrypoint and API docs.
 *
 * @param {string} entrypointUrl
 * @param {object} options
 * @return {Promise}
 */
function fetchEntrypointAndDocs(entrypointUrl) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  return (0, _fetchJsonLd2.default)(entrypointUrl, options).then(function (d) {
    return {
      entrypointUrl: entrypointUrl,
      docsUrl: getDocumentationUrlFromHeaders(d.response.headers),
      entrypoint: d.body
    };
  }).then(function (data) {
    return (0, _fetchJsonLd2.default)(data.docsUrl, options).then(function (d) {
      data.docs = d.body;

      return data;
    }).then(function (data) {
      return _jsonld.promises.expand(data.docs, { base: data.docsUrl, documentLoader: function documentLoader(input) {
          return (0, _fetchJsonLd2.default)(input, options);
        } }).then(function (docs) {
        data.docs = docs;

        return data;
      });
    }).then(function (data) {
      return _jsonld.promises.expand(data.entrypoint, { base: data.entrypointUrl, documentLoader: function documentLoader(input) {
          return (0, _fetchJsonLd2.default)(input, options);
        } }).then(function (entrypoint) {
        data.entrypoint = entrypoint;

        return data;
      });
    });
  });
}

/**
 * Parses a Hydra documentation and converts it to an intermediate representation.
 *
 * @param {string} entrypointUrl
 * @param {object} options
 * @return {Promise.<Api>}
 */
function parseHydraDocumentation(entrypointUrl) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  return fetchEntrypointAndDocs(entrypointUrl, options).then(function (_ref) {
    var entrypoint = _ref.entrypoint,
        docs = _ref.docs;

    var title = 'undefined' === typeof docs[0]['http://www.w3.org/ns/hydra/core#title'] ? 'API Platform' : docs[0]['http://www.w3.org/ns/hydra/core#title'][0]['@value'];
    var entrypointSupportedClass = findSupportedClass(docs, entrypoint[0]['@type'][0]);

    var resources = [];
    var fields = [];

    // Add resources
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = (0, _getIterator3.default)(entrypointSupportedClass['http://www.w3.org/ns/hydra/core#supportedProperty']), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var properties = _step.value;

        var property = properties['http://www.w3.org/ns/hydra/core#property'][0];
        var entrypointSupportedOperations = property['http://www.w3.org/ns/hydra/core#supportedOperation'];

        var readableFields = [];
        var resourceFields = [];
        var writableFields = [];

        // Add fields
        for (var j = 0; j < entrypointSupportedOperations.length; j++) {
          var className = entrypointSupportedOperations[j]['http://www.w3.org/ns/hydra/core#returns'][0]['@id'];
          if (0 === className.indexOf('http://www.w3.org/ns/hydra/core')) {
            continue;
          }

          var supportedClass = findSupportedClass(docs, className);
          var _iteratorNormalCompletion3 = true;
          var _didIteratorError3 = false;
          var _iteratorError3 = undefined;

          try {
            for (var _iterator3 = (0, _getIterator3.default)(supportedClass['http://www.w3.org/ns/hydra/core#supportedProperty']), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
              var supportedProperties = _step3.value;

              var supportedProperty = supportedProperties['http://www.w3.org/ns/hydra/core#property'][0];
              var range = supportedProperty['http://www.w3.org/2000/01/rdf-schema#range'] ? supportedProperty['http://www.w3.org/2000/01/rdf-schema#range'][0]['@id'] : null;

              var field = new _Field2.default(supportedProperty['http://www.w3.org/2000/01/rdf-schema#label'][0]['@value'], {
                id: supportedProperty['@id'],
                range: range,
                reference: 'http://www.w3.org/ns/hydra/core#Link' === property['@type'][0] ? range : null, // Will be updated in a subsequent pass
                required: supportedProperties['http://www.w3.org/ns/hydra/core#required'] ? supportedProperties['http://www.w3.org/ns/hydra/core#required'][0]['@value'] : false,
                description: supportedProperties['http://www.w3.org/ns/hydra/core#description'] ? supportedProperties['http://www.w3.org/ns/hydra/core#description'][0]['@value'] : ''
              });

              fields.push(field);
              resourceFields.push(field);

              if (supportedProperties['http://www.w3.org/ns/hydra/core#readable'][0]['@value']) {
                readableFields.push(field);
              }

              if (supportedProperties['http://www.w3.org/ns/hydra/core#writable'][0]['@value']) {
                writableFields.push(field);
              }
            }
          } catch (err) {
            _didIteratorError3 = true;
            _iteratorError3 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion3 && _iterator3.return) {
                _iterator3.return();
              }
            } finally {
              if (_didIteratorError3) {
                throw _iteratorError3;
              }
            }
          }

          resources.push(new _Resource2.default(guessNameFromUrl(entrypoint[0][property['@id']][0]['@id'], entrypointUrl), entrypoint[0][property['@id']][0]['@id'], {
            id: supportedClass['@id'],
            title: supportedClass['http://www.w3.org/ns/hydra/core#title'][0]['@value'],
            fields: resourceFields,
            readableFields: readableFields,
            writableFields: writableFields
          }));

          break;
        }
      }

      // Resolve references
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      var _loop = function _loop() {
        var field = _step2.value;

        if (null !== field.reference) {
          field.reference = resources.find(function (resource) {
            return resource.id === field.reference;
          }) || null;
        }
      };

      for (var _iterator2 = (0, _getIterator3.default)(fields), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        _loop();
      }
    } catch (err) {
      _didIteratorError2 = true;
      _iteratorError2 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion2 && _iterator2.return) {
          _iterator2.return();
        }
      } finally {
        if (_didIteratorError2) {
          throw _iteratorError2;
        }
      }
    }

    return new _Api2.default(entrypointUrl, { title: title, resources: resources });
  });
}