(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var Stringify = require('./stringify');
var Parse = require('./parse');

module.exports = {
    stringify: Stringify,
    parse: Parse
};

},{"./parse":2,"./stringify":3}],2:[function(require,module,exports){
'use strict';

var Utils = require('./utils');

var has = Object.prototype.hasOwnProperty;

var defaults = {
    delimiter: '&',
    depth: 5,
    arrayLimit: 20,
    parameterLimit: 1000,
    strictNullHandling: false,
    plainObjects: false,
    allowPrototypes: false,
    allowDots: false,
    decoder: Utils.decode
};

var parseValues = function parseValues(str, options) {
    var obj = {};
    var parts = str.split(options.delimiter, options.parameterLimit === Infinity ? undefined : options.parameterLimit);

    for (var i = 0; i < parts.length; ++i) {
        var part = parts[i];
        var pos = part.indexOf(']=') === -1 ? part.indexOf('=') : part.indexOf(']=') + 1;

        var key, val;
        if (pos === -1) {
            key = options.decoder(part);
            val = options.strictNullHandling ? null : '';
        } else {
            key = options.decoder(part.slice(0, pos));
            val = options.decoder(part.slice(pos + 1));
        }
        if (has.call(obj, key)) {
            obj[key] = [].concat(obj[key]).concat(val);
        } else {
            obj[key] = val;
        }
    }

    return obj;
};

var parseObject = function parseObject(chain, val, options) {
    if (!chain.length) {
        return val;
    }

    var root = chain.shift();

    var obj;
    if (root === '[]') {
        obj = [];
        obj = obj.concat(parseObject(chain, val, options));
    } else {
        obj = options.plainObjects ? Object.create(null) : {};
        var cleanRoot = root[0] === '[' && root[root.length - 1] === ']' ? root.slice(1, root.length - 1) : root;
        var index = parseInt(cleanRoot, 10);
        if (
            !isNaN(index) &&
            root !== cleanRoot &&
            String(index) === cleanRoot &&
            index >= 0 &&
            (options.parseArrays && index <= options.arrayLimit)
        ) {
            obj = [];
            obj[index] = parseObject(chain, val, options);
        } else {
            obj[cleanRoot] = parseObject(chain, val, options);
        }
    }

    return obj;
};

var parseKeys = function parseKeys(givenKey, val, options) {
    if (!givenKey) {
        return;
    }

    // Transform dot notation to bracket notation
    var key = options.allowDots ? givenKey.replace(/\.([^\.\[]+)/g, '[$1]') : givenKey;

    // The regex chunks

    var parent = /^([^\[\]]*)/;
    var child = /(\[[^\[\]]*\])/g;

    // Get the parent

    var segment = parent.exec(key);

    // Stash the parent if it exists

    var keys = [];
    if (segment[1]) {
        // If we aren't using plain objects, optionally prefix keys
        // that would overwrite object prototype properties
        if (!options.plainObjects && has.call(Object.prototype, segment[1])) {
            if (!options.allowPrototypes) {
                return;
            }
        }

        keys.push(segment[1]);
    }

    // Loop through children appending to the array until we hit depth

    var i = 0;
    while ((segment = child.exec(key)) !== null && i < options.depth) {
        i += 1;
        if (!options.plainObjects && has.call(Object.prototype, segment[1].replace(/\[|\]/g, ''))) {
            if (!options.allowPrototypes) {
                continue;
            }
        }
        keys.push(segment[1]);
    }

    // If there's a remainder, just add whatever is left

    if (segment) {
        keys.push('[' + key.slice(segment.index) + ']');
    }

    return parseObject(keys, val, options);
};

module.exports = function (str, opts) {
    var options = opts || {};

    if (options.decoder !== null && options.decoder !== undefined && typeof options.decoder !== 'function') {
        throw new TypeError('Decoder has to be a function.');
    }

    options.delimiter = typeof options.delimiter === 'string' || Utils.isRegExp(options.delimiter) ? options.delimiter : defaults.delimiter;
    options.depth = typeof options.depth === 'number' ? options.depth : defaults.depth;
    options.arrayLimit = typeof options.arrayLimit === 'number' ? options.arrayLimit : defaults.arrayLimit;
    options.parseArrays = options.parseArrays !== false;
    options.decoder = typeof options.decoder === 'function' ? options.decoder : defaults.decoder;
    options.allowDots = typeof options.allowDots === 'boolean' ? options.allowDots : defaults.allowDots;
    options.plainObjects = typeof options.plainObjects === 'boolean' ? options.plainObjects : defaults.plainObjects;
    options.allowPrototypes = typeof options.allowPrototypes === 'boolean' ? options.allowPrototypes : defaults.allowPrototypes;
    options.parameterLimit = typeof options.parameterLimit === 'number' ? options.parameterLimit : defaults.parameterLimit;
    options.strictNullHandling = typeof options.strictNullHandling === 'boolean' ? options.strictNullHandling : defaults.strictNullHandling;

    if (str === '' || str === null || typeof str === 'undefined') {
        return options.plainObjects ? Object.create(null) : {};
    }

    var tempObj = typeof str === 'string' ? parseValues(str, options) : str;
    var obj = options.plainObjects ? Object.create(null) : {};

    // Iterate over the keys and setup the new object

    var keys = Object.keys(tempObj);
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        var newObj = parseKeys(key, tempObj[key], options);
        obj = Utils.merge(obj, newObj, options);
    }

    return Utils.compact(obj);
};

},{"./utils":4}],3:[function(require,module,exports){
'use strict';

var Utils = require('./utils');

var arrayPrefixGenerators = {
    brackets: function brackets(prefix) {
        return prefix + '[]';
    },
    indices: function indices(prefix, key) {
        return prefix + '[' + key + ']';
    },
    repeat: function repeat(prefix) {
        return prefix;
    }
};

var defaults = {
    delimiter: '&',
    strictNullHandling: false,
    skipNulls: false,
    encode: true,
    encoder: Utils.encode
};

var stringify = function stringify(object, prefix, generateArrayPrefix, strictNullHandling, skipNulls, encoder, filter, sort, allowDots) {
    var obj = object;
    if (typeof filter === 'function') {
        obj = filter(prefix, obj);
    } else if (obj instanceof Date) {
        obj = obj.toISOString();
    } else if (obj === null) {
        if (strictNullHandling) {
            return encoder ? encoder(prefix) : prefix;
        }

        obj = '';
    }

    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean' || Utils.isBuffer(obj)) {
        if (encoder) {
            return [encoder(prefix) + '=' + encoder(obj)];
        }
        return [prefix + '=' + String(obj)];
    }

    var values = [];

    if (typeof obj === 'undefined') {
        return values;
    }

    var objKeys;
    if (Array.isArray(filter)) {
        objKeys = filter;
    } else {
        var keys = Object.keys(obj);
        objKeys = sort ? keys.sort(sort) : keys;
    }

    for (var i = 0; i < objKeys.length; ++i) {
        var key = objKeys[i];

        if (skipNulls && obj[key] === null) {
            continue;
        }

        if (Array.isArray(obj)) {
            values = values.concat(stringify(obj[key], generateArrayPrefix(prefix, key), generateArrayPrefix, strictNullHandling, skipNulls, encoder, filter, sort, allowDots));
        } else {
            values = values.concat(stringify(obj[key], prefix + (allowDots ? '.' + key : '[' + key + ']'), generateArrayPrefix, strictNullHandling, skipNulls, encoder, filter, sort, allowDots));
        }
    }

    return values;
};

module.exports = function (object, opts) {
    var obj = object;
    var options = opts || {};
    var delimiter = typeof options.delimiter === 'undefined' ? defaults.delimiter : options.delimiter;
    var strictNullHandling = typeof options.strictNullHandling === 'boolean' ? options.strictNullHandling : defaults.strictNullHandling;
    var skipNulls = typeof options.skipNulls === 'boolean' ? options.skipNulls : defaults.skipNulls;
    var encode = typeof options.encode === 'boolean' ? options.encode : defaults.encode;
    var encoder = encode ? (typeof options.encoder === 'function' ? options.encoder : defaults.encoder) : null;
    var sort = typeof options.sort === 'function' ? options.sort : null;
    var allowDots = typeof options.allowDots === 'undefined' ? false : options.allowDots;
    var objKeys;
    var filter;

    if (options.encoder !== null && options.encoder !== undefined && typeof options.encoder !== 'function') {
        throw new TypeError('Encoder has to be a function.');
    }

    if (typeof options.filter === 'function') {
        filter = options.filter;
        obj = filter('', obj);
    } else if (Array.isArray(options.filter)) {
        objKeys = filter = options.filter;
    }

    var keys = [];

    if (typeof obj !== 'object' || obj === null) {
        return '';
    }

    var arrayFormat;
    if (options.arrayFormat in arrayPrefixGenerators) {
        arrayFormat = options.arrayFormat;
    } else if ('indices' in options) {
        arrayFormat = options.indices ? 'indices' : 'repeat';
    } else {
        arrayFormat = 'indices';
    }

    var generateArrayPrefix = arrayPrefixGenerators[arrayFormat];

    if (!objKeys) {
        objKeys = Object.keys(obj);
    }

    if (sort) {
        objKeys.sort(sort);
    }

    for (var i = 0; i < objKeys.length; ++i) {
        var key = objKeys[i];

        if (skipNulls && obj[key] === null) {
            continue;
        }

        keys = keys.concat(stringify(obj[key], key, generateArrayPrefix, strictNullHandling, skipNulls, encoder, filter, sort, allowDots));
    }

    return keys.join(delimiter);
};

},{"./utils":4}],4:[function(require,module,exports){
'use strict';

var hexTable = (function () {
    var array = new Array(256);
    for (var i = 0; i < 256; ++i) {
        array[i] = '%' + ((i < 16 ? '0' : '') + i.toString(16)).toUpperCase();
    }

    return array;
}());

exports.arrayToObject = function (source, options) {
    var obj = options.plainObjects ? Object.create(null) : {};
    for (var i = 0; i < source.length; ++i) {
        if (typeof source[i] !== 'undefined') {
            obj[i] = source[i];
        }
    }

    return obj;
};

exports.merge = function (target, source, options) {
    if (!source) {
        return target;
    }

    if (typeof source !== 'object') {
        if (Array.isArray(target)) {
            target.push(source);
        } else if (typeof target === 'object') {
            target[source] = true;
        } else {
            return [target, source];
        }

        return target;
    }

    if (typeof target !== 'object') {
        return [target].concat(source);
    }

    var mergeTarget = target;
    if (Array.isArray(target) && !Array.isArray(source)) {
        mergeTarget = exports.arrayToObject(target, options);
    }

    return Object.keys(source).reduce(function (acc, key) {
        var value = source[key];

        if (Object.prototype.hasOwnProperty.call(acc, key)) {
            acc[key] = exports.merge(acc[key], value, options);
        } else {
            acc[key] = value;
        }
        return acc;
    }, mergeTarget);
};

exports.decode = function (str) {
    try {
        return decodeURIComponent(str.replace(/\+/g, ' '));
    } catch (e) {
        return str;
    }
};

exports.encode = function (str) {
    // This code was originally written by Brian White (mscdex) for the io.js core querystring library.
    // It has been adapted here for stricter adherence to RFC 3986
    if (str.length === 0) {
        return str;
    }

    var string = typeof str === 'string' ? str : String(str);

    var out = '';
    for (var i = 0; i < string.length; ++i) {
        var c = string.charCodeAt(i);

        if (
            c === 0x2D || // -
            c === 0x2E || // .
            c === 0x5F || // _
            c === 0x7E || // ~
            (c >= 0x30 && c <= 0x39) || // 0-9
            (c >= 0x41 && c <= 0x5A) || // a-z
            (c >= 0x61 && c <= 0x7A) // A-Z
        ) {
            out += string.charAt(i);
            continue;
        }

        if (c < 0x80) {
            out = out + hexTable[c];
            continue;
        }

        if (c < 0x800) {
            out = out + (hexTable[0xC0 | (c >> 6)] + hexTable[0x80 | (c & 0x3F)]);
            continue;
        }

        if (c < 0xD800 || c >= 0xE000) {
            out = out + (hexTable[0xE0 | (c >> 12)] + hexTable[0x80 | ((c >> 6) & 0x3F)] + hexTable[0x80 | (c & 0x3F)]);
            continue;
        }

        i += 1;
        c = 0x10000 + (((c & 0x3FF) << 10) | (string.charCodeAt(i) & 0x3FF));
        out += hexTable[0xF0 | (c >> 18)] + hexTable[0x80 | ((c >> 12) & 0x3F)] + hexTable[0x80 | ((c >> 6) & 0x3F)] + hexTable[0x80 | (c & 0x3F)];
    }

    return out;
};

exports.compact = function (obj, references) {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    var refs = references || [];
    var lookup = refs.indexOf(obj);
    if (lookup !== -1) {
        return refs[lookup];
    }

    refs.push(obj);

    if (Array.isArray(obj)) {
        var compacted = [];

        for (var i = 0; i < obj.length; ++i) {
            if (obj[i] && typeof obj[i] === 'object') {
                compacted.push(exports.compact(obj[i], refs));
            } else if (typeof obj[i] !== 'undefined') {
                compacted.push(obj[i]);
            }
        }

        return compacted;
    }

    var keys = Object.keys(obj);
    for (var j = 0; j < keys.length; ++j) {
        var key = keys[j];
        obj[key] = exports.compact(obj[key], refs);
    }

    return obj;
};

exports.isRegExp = function (obj) {
    return Object.prototype.toString.call(obj) === '[object RegExp]';
};

exports.isBuffer = function (obj) {
    if (obj === null || typeof obj === 'undefined') {
        return false;
    }

    return !!(obj.constructor && obj.constructor.isBuffer && obj.constructor.isBuffer(obj));
};

},{}],5:[function(require,module,exports){
'use strict';

var _qs = require('qs');

var _qs2 = _interopRequireDefault(_qs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(function () {

  /**
   *  @namespace LibraryControls
   */

  var libResizers = document.getElementsByClassName('library__sizer-link');
  var libWrap = document.getElementById('library-wrap');
  var libNavTrigger = document.getElementById('library-nav-trigger');
  var libOuter = document.getElementById('library-outer');
  var libNav = document.getElementById('library-nav');
  var libNavItems = document.getElementsByClassName('updates-content');
  var libNavItemParents = document.getElementsByClassName('library__nav-link--parent');
  var libIndexButton = document.getElementById('library-index');
  var libIframe = document.getElementById('library-content');

  /**
   * @function resizeContent
   * @memberOf LibraryControls
   */

  function resizeContent(e) {
    e.preventDefault();

    // Update wrapper with new size
    var newSize = this.getAttribute('href').substr(1);
    libWrap.className = "";
    libWrap.classList.add('library__content-inner');
    libWrap.classList.add('library__content-inner--' + newSize);

    // Update nav with current size
    Array.from(libResizers).forEach(function (size) {
      return size.classList.remove('current');
    });
    this.classList.add('current');
  }

  /**
   * @function toggleLibNav
   * @memberOf LibraryControls
   */

  function toggleLibNav(e) {
    e.preventDefault();
    libNav.classList.toggle('library__nav--active');
    libOuter.classList.toggle('library--active');
    this.classList.toggle('is-active');
  }

  /**
   * @function updateComponent
   * @memberOf LibraryControls
   */

  function updateComponent(e) {
    e.preventDefault();
    var newModule = this.getAttribute('href');
    libIframe.src = newModule;
    //  scroll to top of page
    window.scroll(0, 0);

    // keep track of current component
    var queries = _qs2.default.parse(newModule.substr(1));
    window.history.pushState(queries, null, '#' + queries.type + '-' + queries.component);
  }

  /**
   * @function toggleSubNav
   * @memberOf LibraryControls
   */

  function toggleSubNav(e) {
    e.preventDefault();
    var targetSubNav = document.getElementById(this.getAttribute('href').substr(1));
    targetSubNav.classList.toggle('active');
  }

  window.onload = function () {

    if (window.location.hash) {
      var component = window.location.hash.substr(1);
      var link = document.querySelector('.library__nav-link[data-component=' + component + ']');
      libIframe.src = link.href;
    }

    Array.from(libResizers).forEach(function (size) {
      return size.addEventListener('click', resizeContent);
    });

    Array.from(libNavItems).forEach(function (navItem) {
      return navItem.addEventListener('click', updateComponent);
    });

    Array.from(libNavItemParents).forEach(function (navItemParent) {
      return navItemParent.addEventListener('click', toggleSubNav);
    });

    if (libNavTrigger) {
      libNavTrigger.addEventListener('click', toggleLibNav);
    }

    if (libIndexButton) {
      libIndexButton.addEventListener('click', updateComponent);
    }
  };
})();

},{"qs":1}]},{},[5])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvcXMvbGliL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3FzL2xpYi9wYXJzZS5qcyIsIm5vZGVfbW9kdWxlcy9xcy9saWIvc3RyaW5naWZ5LmpzIiwibm9kZV9tb2R1bGVzL3FzL2xpYi91dGlscy5qcyIsInNjcmlwdHMvc3JjL3NoZWxsLXNjcmlwdHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3BLQTs7Ozs7O0FBRUEsQ0FBQyxZQUFVOztBQUVUOzs7O0FBSUEs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RDhCO0FBQUEsS0FBaEM7O0FBSUEsVUFBTSxJQUFOLENBQVcsV0FBWCxFQUF3QixPQUF4QixDQUFnQztBQUFBLGFBQzlCLFFBQVEsZ0JBQVIsQ0FBeUIsT0FBekIsRUFBa0MsZUFBbEMsQ0FEOEI7QUFBQSxLQUFoQzs7QUFJQSxVQUFNLElBQU4sQ0FBVyxpQkFBWCxFQUE4QixPQUE5QixDQUFzQztBQUFBLGFBQ3BDLGNBQWMsZ0JBQWQsQ0FBK0IsT0FBL0IsRUFBd0MsWUFBeEMsQ0FEb0M7QUFBQSxLQUF0Qzs7QUFJQSxRQUFHLGFBQUgsRUFBaUI7QUFDZixvQkFBYyxnQkFBZCxDQUErQixPQUEvQixFQUF3QyxZQUF4QztBQUNEOztBQUVELFFBQUcsY0FBSCxFQUFrQjtBQUNoQixxQkFBZSxnQkFBZixDQUFnQyxPQUFoQyxFQUF5QyxlQUF6QztBQUNEO0FBRUYsR0E5QkQ7QUFnQ0QsQ0EvR0QiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgU3RyaW5naWZ5ID0gcmVxdWlyZSgnLi9zdHJpbmdpZnknKTtcbnZhciBQYXJzZSA9IHJlcXVpcmUoJy4vcGFyc2UnKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgc3RyaW5naWZ5OiBTdHJpbmdpZnksXG4gICAgcGFyc2U6IFBhcnNlXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgVXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciBoYXMgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG52YXIgZGVmYXVsdHMgPSB7XG4gICAgZGVsaW1pdGVyOiAnJicsXG4gICAgZGVwdGg6IDUsXG4gICAgYXJyYXlMaW1pdDogMjAsXG4gICAgcGFyYW1ldGVyTGltaXQ6IDEwMDAsXG4gICAgc3RyaWN0TnVsbEhhbmRsaW5nOiBmYWxzZSxcbiAgICBwbGFpbk9iamVjdHM6IGZhbHNlLFxuICAgIGFsbG93UHJvdG90eXBlczogZmFsc2UsXG4gICAgYWxsb3dEb3RzOiBmYWxzZSxcbiAgICBkZWNvZGVyOiBVdGlscy5kZWNvZGVcbn07XG5cbnZhciBwYXJzZVZhbHVlcyA9IGZ1bmN0aW9uIHBhcnNlVmFsdWVzKHN0ciwgb3B0aW9ucykge1xuICAgIHZhciBvYmogPSB7fTtcbiAgICB2YXIgcGFydHMgPSBzdHIuc3BsaXQob3B0aW9ucy5kZWxpbWl0ZXIsIG9wdGlvbnMucGFyYW1ldGVyTGltaXQgPT09IEluZmluaXR5ID8gdW5kZWZpbmVkIDogb3B0aW9ucy5wYXJhbWV0ZXJMaW1pdCk7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciBwYXJ0ID0gcGFydHNbaV07XG4gICAgICAgIHZhciBwb3MgPSBwYXJ0LmluZGV4T2YoJ109JykgPT09IC0xID8gcGFydC5pbmRleE9mKCc9JykgOiBwYXJ0LmluZGV4T2YoJ109JykgKyAxO1xuXG4gICAgICAgIHZhciBrZXksIHZhbDtcbiAgICAgICAgaWYgKHBvcyA9PT0gLTEpIHtcbiAgICAgICAgICAgIGtleSA9IG9wdGlvbnMuZGVjb2RlcihwYXJ0KTtcbiAgICAgICAgICAgIHZhbCA9IG9wdGlvbnMuc3RyaWN0TnVsbEhhbmRsaW5nID8gbnVsbCA6ICcnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAga2V5ID0gb3B0aW9ucy5kZWNvZGVyKHBhcnQuc2xpY2UoMCwgcG9zKSk7XG4gICAgICAgICAgICB2YWwgPSBvcHRpb25zLmRlY29kZXIocGFydC5zbGljZShwb3MgKyAxKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGhhcy5jYWxsKG9iaiwga2V5KSkge1xuICAgICAgICAgICAgb2JqW2tleV0gPSBbXS5jb25jYXQob2JqW2tleV0pLmNvbmNhdCh2YWwpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb2JqW2tleV0gPSB2YWw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gb2JqO1xufTtcblxudmFyIHBhcnNlT2JqZWN0ID0gZnVuY3Rpb24gcGFyc2VPYmplY3QoY2hhaW4sIHZhbCwgb3B0aW9ucykge1xuICAgIGlmICghY2hhaW4ubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiB2YWw7XG4gICAgfVxuXG4gICAgdmFyIHJvb3QgPSBjaGFpbi5zaGlmdCgpO1xuXG4gICAgdmFyIG9iajtcbiAgICBpZiAocm9vdCA9PT0gJ1tdJykge1xuICAgICAgICBvYmogPSBbXTtcbiAgICAgICAgb2JqID0gb2JqLmNvbmNhdChwYXJzZU9iamVjdChjaGFpbiwgdmFsLCBvcHRpb25zKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgb2JqID0gb3B0aW9ucy5wbGFpbk9iamVjdHMgPyBPYmplY3QuY3JlYXRlKG51bGwpIDoge307XG4gICAgICAgIHZhciBjbGVhblJvb3QgPSByb290WzBdID09PSAnWycgJiYgcm9vdFtyb290Lmxlbmd0aCAtIDFdID09PSAnXScgPyByb290LnNsaWNlKDEsIHJvb3QubGVuZ3RoIC0gMSkgOiByb290O1xuICAgICAgICB2YXIgaW5kZXggPSBwYXJzZUludChjbGVhblJvb3QsIDEwKTtcbiAgICAgICAgaWYgKFxuICAgICAgICAgICAgIWlzTmFOKGluZGV4KSAmJlxuICAgICAgICAgICAgcm9vdCAhPT0gY2xlYW5Sb290ICYmXG4gICAgICAgICAgICBTdHJpbmcoaW5kZXgpID09PSBjbGVhblJvb3QgJiZcbiAgICAgICAgICAgIGluZGV4ID49IDAgJiZcbiAgICAgICAgICAgIChvcHRpb25zLnBhcnNlQXJyYXlzICYmIGluZGV4IDw9IG9wdGlvbnMuYXJyYXlMaW1pdClcbiAgICAgICAgKSB7XG4gICAgICAgICAgICBvYmogPSBbXTtcbiAgICAgICAgICAgIG9ialtpbmRleF0gPSBwYXJzZU9iamVjdChjaGFpbiwgdmFsLCBvcHRpb25zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9ialtjbGVhblJvb3RdID0gcGFyc2VPYmplY3QoY2hhaW4sIHZhbCwgb3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gb2JqO1xufTtcblxudmFyIHBhcnNlS2V5cyA9IGZ1bmN0aW9uIHBhcnNlS2V5cyhnaXZlbktleSwgdmFsLCBvcHRpb25zKSB7XG4gICAgaWYgKCFnaXZlbktleSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gVHJhbnNmb3JtIGRvdCBub3RhdGlvbiB0byBicmFja2V0IG5vdGF0aW9uXG4gICAgdmFyIGtleSA9IG9wdGlvbnMuYWxsb3dEb3RzID8gZ2l2ZW5LZXkucmVwbGFjZSgvXFwuKFteXFwuXFxbXSspL2csICdbJDFdJykgOiBnaXZlbktleTtcblxuICAgIC8vIFRoZSByZWdleCBjaHVua3NcblxuICAgIHZhciBwYXJlbnQgPSAvXihbXlxcW1xcXV0qKS87XG4gICAgdmFyIGNoaWxkID0gLyhcXFtbXlxcW1xcXV0qXFxdKS9nO1xuXG4gICAgLy8gR2V0IHRoZSBwYXJlbnRcblxuICAgIHZhciBzZWdtZW50ID0gcGFyZW50LmV4ZWMoa2V5KTtcblxuICAgIC8vIFN0YXNoIHRoZSBwYXJlbnQgaWYgaXQgZXhpc3RzXG5cbiAgICB2YXIga2V5cyA9IFtdO1xuICAgIGlmIChzZWdtZW50WzFdKSB7XG4gICAgICAgIC8vIElmIHdlIGFyZW4ndCB1c2luZyBwbGFpbiBvYmplY3RzLCBvcHRpb25hbGx5IHByZWZpeCBrZXlzXG4gICAgICAgIC8vIHRoYXQgd291bGQgb3ZlcndyaXRlIG9iamVjdCBwcm90b3R5cGUgcHJvcGVydGllc1xuICAgICAgICBpZiAoIW9wdGlvbnMucGxhaW5PYmplY3RzICYmIGhhcy5jYWxsKE9iamVjdC5wcm90b3R5cGUsIHNlZ21lbnRbMV0pKSB7XG4gICAgICAgICAgICBpZiAoIW9wdGlvbnMuYWxsb3dQcm90b3R5cGVzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAga2V5cy5wdXNoKHNlZ21lbnRbMV0pO1xuICAgIH1cblxuICAgIC8vIExvb3AgdGhyb3VnaCBjaGlsZHJlbiBhcHBlbmRpbmcgdG8gdGhlIGFycmF5IHVudGlsIHdlIGhpdCBkZXB0aFxuXG4gICAgdmFyIGkgPSAwO1xuICAgIHdoaWxlICgoc2VnbWVudCA9IGNoaWxkLmV4ZWMoa2V5KSkgIT09IG51bGwgJiYgaSA8IG9wdGlvbnMuZGVwdGgpIHtcbiAgICAgICAgaSArPSAxO1xuICAgICAgICBpZiAoIW9wdGlvbnMucGxhaW5PYmplY3RzICYmIGhhcy5jYWxsKE9iamVjdC5wcm90b3R5cGUsIHNlZ21lbnRbMV0ucmVwbGFjZSgvXFxbfFxcXS9nLCAnJykpKSB7XG4gICAgICAgICAgICBpZiAoIW9wdGlvbnMuYWxsb3dQcm90b3R5cGVzKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAga2V5cy5wdXNoKHNlZ21lbnRbMV0pO1xuICAgIH1cblxuICAgIC8vIElmIHRoZXJlJ3MgYSByZW1haW5kZXIsIGp1c3QgYWRkIHdoYXRldmVyIGlzIGxlZnRcblxuICAgIGlmIChzZWdtZW50KSB7XG4gICAgICAgIGtleXMucHVzaCgnWycgKyBrZXkuc2xpY2Uoc2VnbWVudC5pbmRleCkgKyAnXScpO1xuICAgIH1cblxuICAgIHJldHVybiBwYXJzZU9iamVjdChrZXlzLCB2YWwsIG9wdGlvbnMpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoc3RyLCBvcHRzKSB7XG4gICAgdmFyIG9wdGlvbnMgPSBvcHRzIHx8IHt9O1xuXG4gICAgaWYgKG9wdGlvbnMuZGVjb2RlciAhPT0gbnVsbCAmJiBvcHRpb25zLmRlY29kZXIgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb3B0aW9ucy5kZWNvZGVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0RlY29kZXIgaGFzIHRvIGJlIGEgZnVuY3Rpb24uJyk7XG4gICAgfVxuXG4gICAgb3B0aW9ucy5kZWxpbWl0ZXIgPSB0eXBlb2Ygb3B0aW9ucy5kZWxpbWl0ZXIgPT09ICdzdHJpbmcnIHx8IFV0aWxzLmlzUmVnRXhwKG9wdGlvbnMuZGVsaW1pdGVyKSA/IG9wdGlvbnMuZGVsaW1pdGVyIDogZGVmYXVsdHMuZGVsaW1pdGVyO1xuICAgIG9wdGlvbnMuZGVwdGggPSB0eXBlb2Ygb3B0aW9ucy5kZXB0aCA9PT0gJ251bWJlcicgPyBvcHRpb25zLmRlcHRoIDogZGVmYXVsdHMuZGVwdGg7XG4gICAgb3B0aW9ucy5hcnJheUxpbWl0ID0gdHlwZW9mIG9wdGlvbnMuYXJyYXlMaW1pdCA9PT0gJ251bWJlcicgPyBvcHRpb25zLmFycmF5TGltaXQgOiBkZWZhdWx0cy5hcnJheUxpbWl0O1xuICAgIG9wdGlvbnMucGFyc2VBcnJheXMgPSBvcHRpb25zLnBhcnNlQXJyYXlzICE9PSBmYWxzZTtcbiAgICBvcHRpb25zLmRlY29kZXIgPSB0eXBlb2Ygb3B0aW9ucy5kZWNvZGVyID09PSAnZnVuY3Rpb24nID8gb3B0aW9ucy5kZWNvZGVyIDogZGVmYXVsdHMuZGVjb2RlcjtcbiAgICBvcHRpb25zLmFsbG93RG90cyA9IHR5cGVvZiBvcHRpb25zLmFsbG93RG90cyA9PT0gJ2Jvb2xlYW4nID8gb3B0aW9ucy5hbGxvd0RvdHMgOiBkZWZhdWx0cy5hbGxvd0RvdHM7XG4gICAgb3B0aW9ucy5wbGFpbk9iamVjdHMgPSB0eXBlb2Ygb3B0aW9ucy5wbGFpbk9iamVjdHMgPT09ICdib29sZWFuJyA/IG9wdGlvbnMucGxhaW5PYmplY3RzIDogZGVmYXVsdHMucGxhaW5PYmplY3RzO1xuICAgIG9wdGlvbnMuYWxsb3dQcm90b3R5cGVzID0gdHlwZW9mIG9wdGlvbnMuYWxsb3dQcm90b3R5cGVzID09PSAnYm9vbGVhbicgPyBvcHRpb25zLmFsbG93UHJvdG90eXBlcyA6IGRlZmF1bHRzLmFsbG93UHJvdG90eXBlcztcbiAgICBvcHRpb25zLnBhcmFtZXRlckxpbWl0ID0gdHlwZW9mIG9wdGlvbnMucGFyYW1ldGVyTGltaXQgPT09ICdudW1iZXInID8gb3B0aW9ucy5wYXJhbWV0ZXJMaW1pdCA6IGRlZmF1bHRzLnBhcmFtZXRlckxpbWl0O1xuICAgIG9wdGlvbnMuc3RyaWN0TnVsbEhhbmRsaW5nID0gdHlwZW9mIG9wdGlvbnMuc3RyaWN0TnVsbEhhbmRsaW5nID09PSAnYm9vbGVhbicgPyBvcHRpb25zLnN0cmljdE51bGxIYW5kbGluZyA6IGRlZmF1bHRzLnN0cmljdE51bGxIYW5kbGluZztcblxuICAgIGlmIChzdHIgPT09ICcnIHx8IHN0ciA9PT0gbnVsbCB8fCB0eXBlb2Ygc3RyID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm4gb3B0aW9ucy5wbGFpbk9iamVjdHMgPyBPYmplY3QuY3JlYXRlKG51bGwpIDoge307XG4gICAgfVxuXG4gICAgdmFyIHRlbXBPYmogPSB0eXBlb2Ygc3RyID09PSAnc3RyaW5nJyA/IHBhcnNlVmFsdWVzKHN0ciwgb3B0aW9ucykgOiBzdHI7XG4gICAgdmFyIG9iaiA9IG9wdGlvbnMucGxhaW5PYmplY3RzID8gT2JqZWN0LmNyZWF0ZShudWxsKSA6IHt9O1xuXG4gICAgLy8gSXRlcmF0ZSBvdmVyIHRoZSBrZXlzIGFuZCBzZXR1cCB0aGUgbmV3IG9iamVjdFxuXG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh0ZW1wT2JqKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdmFyIGtleSA9IGtleXNbaV07XG4gICAgICAgIHZhciBuZXdPYmogPSBwYXJzZUtleXMoa2V5LCB0ZW1wT2JqW2tleV0sIG9wdGlvbnMpO1xuICAgICAgICBvYmogPSBVdGlscy5tZXJnZShvYmosIG5ld09iaiwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIFV0aWxzLmNvbXBhY3Qob2JqKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBVdGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxudmFyIGFycmF5UHJlZml4R2VuZXJhdG9ycyA9IHtcbiAgICBicmFja2V0czogZnVuY3Rpb24gYnJhY2tldHMocHJlZml4KSB7XG4gICAgICAgIHJldHVybiBwcmVmaXggKyAnW10nO1xuICAgIH0sXG4gICAgaW5kaWNlczogZnVuY3Rpb24gaW5kaWNlcyhwcmVmaXgsIGtleSkge1xuICAgICAgICByZXR1cm4gcHJlZml4ICsgJ1snICsga2V5ICsgJ10nO1xuICAgIH0sXG4gICAgcmVwZWF0OiBmdW5jdGlvbiByZXBlYXQocHJlZml4KSB7XG4gICAgICAgIHJldHVybiBwcmVmaXg7XG4gICAgfVxufTtcblxudmFyIGRlZmF1bHRzID0ge1xuICAgIGRlbGltaXRlcjogJyYnLFxuICAgIHN0cmljdE51bGxIYW5kbGluZzogZmFsc2UsXG4gICAgc2tpcE51bGxzOiBmYWxzZSxcbiAgICBlbmNvZGU6IHRydWUsXG4gICAgZW5jb2RlcjogVXRpbHMuZW5jb2RlXG59O1xuXG52YXIgc3RyaW5naWZ5ID0gZnVuY3Rpb24gc3RyaW5naWZ5KG9iamVjdCwgcHJlZml4LCBnZW5lcmF0ZUFycmF5UHJlZml4LCBzdHJpY3ROdWxsSGFuZGxpbmcsIHNraXBOdWxscywgZW5jb2RlciwgZmlsdGVyLCBzb3J0LCBhbGxvd0RvdHMpIHtcbiAgICB2YXIgb2JqID0gb2JqZWN0O1xuICAgIGlmICh0eXBlb2YgZmlsdGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIG9iaiA9IGZpbHRlcihwcmVmaXgsIG9iaik7XG4gICAgfSBlbHNlIGlmIChvYmogaW5zdGFuY2VvZiBEYXRlKSB7XG4gICAgICAgIG9iaiA9IG9iai50b0lTT1N0cmluZygpO1xuICAgIH0gZWxzZSBpZiAob2JqID09PSBudWxsKSB7XG4gICAgICAgIGlmIChzdHJpY3ROdWxsSGFuZGxpbmcpIHtcbiAgICAgICAgICAgIHJldHVybiBlbmNvZGVyID8gZW5jb2RlcihwcmVmaXgpIDogcHJlZml4O1xuICAgICAgICB9XG5cbiAgICAgICAgb2JqID0gJyc7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBvYmogPT09ICdzdHJpbmcnIHx8IHR5cGVvZiBvYmogPT09ICdudW1iZXInIHx8IHR5cGVvZiBvYmogPT09ICdib29sZWFuJyB8fCBVdGlscy5pc0J1ZmZlcihvYmopKSB7XG4gICAgICAgIGlmIChlbmNvZGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gW2VuY29kZXIocHJlZml4KSArICc9JyArIGVuY29kZXIob2JqKV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFtwcmVmaXggKyAnPScgKyBTdHJpbmcob2JqKV07XG4gICAgfVxuXG4gICAgdmFyIHZhbHVlcyA9IFtdO1xuXG4gICAgaWYgKHR5cGVvZiBvYmogPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgfVxuXG4gICAgdmFyIG9iaktleXM7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZmlsdGVyKSkge1xuICAgICAgICBvYmpLZXlzID0gZmlsdGVyO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMob2JqKTtcbiAgICAgICAgb2JqS2V5cyA9IHNvcnQgPyBrZXlzLnNvcnQoc29ydCkgOiBrZXlzO1xuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2JqS2V5cy5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIga2V5ID0gb2JqS2V5c1tpXTtcblxuICAgICAgICBpZiAoc2tpcE51bGxzICYmIG9ialtrZXldID09PSBudWxsKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KG9iaikpIHtcbiAgICAgICAgICAgIHZhbHVlcyA9IHZhbHVlcy5jb25jYXQoc3RyaW5naWZ5KG9ialtrZXldLCBnZW5lcmF0ZUFycmF5UHJlZml4KHByZWZpeCwga2V5KSwgZ2VuZXJhdGVBcnJheVByZWZpeCwgc3RyaWN0TnVsbEhhbmRsaW5nLCBza2lwTnVsbHMsIGVuY29kZXIsIGZpbHRlciwgc29ydCwgYWxsb3dEb3RzKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YWx1ZXMgPSB2YWx1ZXMuY29uY2F0KHN0cmluZ2lmeShvYmpba2V5XSwgcHJlZml4ICsgKGFsbG93RG90cyA/ICcuJyArIGtleSA6ICdbJyArIGtleSArICddJyksIGdlbmVyYXRlQXJyYXlQcmVmaXgsIHN0cmljdE51bGxIYW5kbGluZywgc2tpcE51bGxzLCBlbmNvZGVyLCBmaWx0ZXIsIHNvcnQsIGFsbG93RG90cykpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbHVlcztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9iamVjdCwgb3B0cykge1xuICAgIHZhciBvYmogPSBvYmplY3Q7XG4gICAgdmFyIG9wdGlvbnMgPSBvcHRzIHx8IHt9O1xuICAgIHZhciBkZWxpbWl0ZXIgPSB0eXBlb2Ygb3B0aW9ucy5kZWxpbWl0ZXIgPT09ICd1bmRlZmluZWQnID8gZGVmYXVsdHMuZGVsaW1pdGVyIDogb3B0aW9ucy5kZWxpbWl0ZXI7XG4gICAgdmFyIHN0cmljdE51bGxIYW5kbGluZyA9IHR5cGVvZiBvcHRpb25zLnN0cmljdE51bGxIYW5kbGluZyA9PT0gJ2Jvb2xlYW4nID8gb3B0aW9ucy5zdHJpY3ROdWxsSGFuZGxpbmcgOiBkZWZhdWx0cy5zdHJpY3ROdWxsSGFuZGxpbmc7XG4gICAgdmFyIHNraXBOdWxscyA9IHR5cGVvZiBvcHRpb25zLnNraXBOdWxscyA9PT0gJ2Jvb2xlYW4nID8gb3B0aW9ucy5za2lwTnVsbHMgOiBkZWZhdWx0cy5za2lwTnVsbHM7XG4gICAgdmFyIGVuY29kZSA9IHR5cGVvZiBvcHRpb25zLmVuY29kZSA9PT0gJ2Jvb2xlYW4nID8gb3B0aW9ucy5lbmNvZGUgOiBkZWZhdWx0cy5lbmNvZGU7XG4gICAgdmFyIGVuY29kZXIgPSBlbmNvZGUgPyAodHlwZW9mIG9wdGlvbnMuZW5jb2RlciA9PT0gJ2Z1bmN0aW9uJyA/IG9wdGlvbnMuZW5jb2RlciA6IGRlZmF1bHRzLmVuY29kZXIpIDogbnVsbDtcbiAgICB2YXIgc29ydCA9IHR5cGVvZiBvcHRpb25zLnNvcnQgPT09ICdmdW5jdGlvbicgPyBvcHRpb25zLnNvcnQgOiBudWxsO1xuICAgIHZhciBhbGxvd0RvdHMgPSB0eXBlb2Ygb3B0aW9ucy5hbGxvd0RvdHMgPT09ICd1bmRlZmluZWQnID8gZmFsc2UgOiBvcHRpb25zLmFsbG93RG90cztcbiAgICB2YXIgb2JqS2V5cztcbiAgICB2YXIgZmlsdGVyO1xuXG4gICAgaWYgKG9wdGlvbnMuZW5jb2RlciAhPT0gbnVsbCAmJiBvcHRpb25zLmVuY29kZXIgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb3B0aW9ucy5lbmNvZGVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0VuY29kZXIgaGFzIHRvIGJlIGEgZnVuY3Rpb24uJyk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBvcHRpb25zLmZpbHRlciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBmaWx0ZXIgPSBvcHRpb25zLmZpbHRlcjtcbiAgICAgICAgb2JqID0gZmlsdGVyKCcnLCBvYmopO1xuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShvcHRpb25zLmZpbHRlcikpIHtcbiAgICAgICAgb2JqS2V5cyA9IGZpbHRlciA9IG9wdGlvbnMuZmlsdGVyO1xuICAgIH1cblxuICAgIHZhciBrZXlzID0gW107XG5cbiAgICBpZiAodHlwZW9mIG9iaiAhPT0gJ29iamVjdCcgfHwgb2JqID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9XG5cbiAgICB2YXIgYXJyYXlGb3JtYXQ7XG4gICAgaWYgKG9wdGlvbnMuYXJyYXlGb3JtYXQgaW4gYXJyYXlQcmVmaXhHZW5lcmF0b3JzKSB7XG4gICAgICAgIGFycmF5Rm9ybWF0ID0gb3B0aW9ucy5hcnJheUZvcm1hdDtcbiAgICB9IGVsc2UgaWYgKCdpbmRpY2VzJyBpbiBvcHRpb25zKSB7XG4gICAgICAgIGFycmF5Rm9ybWF0ID0gb3B0aW9ucy5pbmRpY2VzID8gJ2luZGljZXMnIDogJ3JlcGVhdCc7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgYXJyYXlGb3JtYXQgPSAnaW5kaWNlcyc7XG4gICAgfVxuXG4gICAgdmFyIGdlbmVyYXRlQXJyYXlQcmVmaXggPSBhcnJheVByZWZpeEdlbmVyYXRvcnNbYXJyYXlGb3JtYXRdO1xuXG4gICAgaWYgKCFvYmpLZXlzKSB7XG4gICAgICAgIG9iaktleXMgPSBPYmplY3Qua2V5cyhvYmopO1xuICAgIH1cblxuICAgIGlmIChzb3J0KSB7XG4gICAgICAgIG9iaktleXMuc29ydChzb3J0KTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9iaktleXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdmFyIGtleSA9IG9iaktleXNbaV07XG5cbiAgICAgICAgaWYgKHNraXBOdWxscyAmJiBvYmpba2V5XSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBrZXlzID0ga2V5cy5jb25jYXQoc3RyaW5naWZ5KG9ialtrZXldLCBrZXksIGdlbmVyYXRlQXJyYXlQcmVmaXgsIHN0cmljdE51bGxIYW5kbGluZywgc2tpcE51bGxzLCBlbmNvZGVyLCBmaWx0ZXIsIHNvcnQsIGFsbG93RG90cykpO1xuICAgIH1cblxuICAgIHJldHVybiBrZXlzLmpvaW4oZGVsaW1pdGVyKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBoZXhUYWJsZSA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGFycmF5ID0gbmV3IEFycmF5KDI1Nik7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCAyNTY7ICsraSkge1xuICAgICAgICBhcnJheVtpXSA9ICclJyArICgoaSA8IDE2ID8gJzAnIDogJycpICsgaS50b1N0cmluZygxNikpLnRvVXBwZXJDYXNlKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFycmF5O1xufSgpKTtcblxuZXhwb3J0cy5hcnJheVRvT2JqZWN0ID0gZnVuY3Rpb24gKHNvdXJjZSwgb3B0aW9ucykge1xuICAgIHZhciBvYmogPSBvcHRpb25zLnBsYWluT2JqZWN0cyA/IE9iamVjdC5jcmVhdGUobnVsbCkgOiB7fTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNvdXJjZS5sZW5ndGg7ICsraSkge1xuICAgICAgICBpZiAodHlwZW9mIHNvdXJjZVtpXSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIG9ialtpXSA9IHNvdXJjZVtpXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBvYmo7XG59O1xuXG5leHBvcnRzLm1lcmdlID0gZnVuY3Rpb24gKHRhcmdldCwgc291cmNlLCBvcHRpb25zKSB7XG4gICAgaWYgKCFzb3VyY2UpIHtcbiAgICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHNvdXJjZSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodGFyZ2V0KSkge1xuICAgICAgICAgICAgdGFyZ2V0LnB1c2goc291cmNlKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdGFyZ2V0ID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgdGFyZ2V0W3NvdXJjZV0gPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFt0YXJnZXQsIHNvdXJjZV07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGFyZ2V0O1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgdGFyZ2V0ICE9PSAnb2JqZWN0Jykge1xuICAgICAgICByZXR1cm4gW3RhcmdldF0uY29uY2F0KHNvdXJjZSk7XG4gICAgfVxuXG4gICAgdmFyIG1lcmdlVGFyZ2V0ID0gdGFyZ2V0O1xuICAgIGlmIChBcnJheS5pc0FycmF5KHRhcmdldCkgJiYgIUFycmF5LmlzQXJyYXkoc291cmNlKSkge1xuICAgICAgICBtZXJnZVRhcmdldCA9IGV4cG9ydHMuYXJyYXlUb09iamVjdCh0YXJnZXQsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIHJldHVybiBPYmplY3Qua2V5cyhzb3VyY2UpLnJlZHVjZShmdW5jdGlvbiAoYWNjLCBrZXkpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gc291cmNlW2tleV07XG5cbiAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChhY2MsIGtleSkpIHtcbiAgICAgICAgICAgIGFjY1trZXldID0gZXhwb3J0cy5tZXJnZShhY2Nba2V5XSwgdmFsdWUsIG9wdGlvbnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWNjW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYWNjO1xuICAgIH0sIG1lcmdlVGFyZ2V0KTtcbn07XG5cbmV4cG9ydHMuZGVjb2RlID0gZnVuY3Rpb24gKHN0cikge1xuICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoc3RyLnJlcGxhY2UoL1xcKy9nLCAnICcpKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiBzdHI7XG4gICAgfVxufTtcblxuZXhwb3J0cy5lbmNvZGUgPSBmdW5jdGlvbiAoc3RyKSB7XG4gICAgLy8gVGhpcyBjb2RlIHdhcyBvcmlnaW5hbGx5IHdyaXR0ZW4gYnkgQnJpYW4gV2hpdGUgKG1zY2RleCkgZm9yIHRoZSBpby5qcyBjb3JlIHF1ZXJ5c3RyaW5nIGxpYnJhcnkuXG4gICAgLy8gSXQgaGFzIGJlZW4gYWRhcHRlZCBoZXJlIGZvciBzdHJpY3RlciBhZGhlcmVuY2UgdG8gUkZDIDM5ODZcbiAgICBpZiAoc3RyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gc3RyO1xuICAgIH1cblxuICAgIHZhciBzdHJpbmcgPSB0eXBlb2Ygc3RyID09PSAnc3RyaW5nJyA/IHN0ciA6IFN0cmluZyhzdHIpO1xuXG4gICAgdmFyIG91dCA9ICcnO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyaW5nLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciBjID0gc3RyaW5nLmNoYXJDb2RlQXQoaSk7XG5cbiAgICAgICAgaWYgKFxuICAgICAgICAgICAgYyA9PT0gMHgyRCB8fCAvLyAtXG4gICAgICAgICAgICBjID09PSAweDJFIHx8IC8vIC5cbiAgICAgICAgICAgIGMgPT09IDB4NUYgfHwgLy8gX1xuICAgICAgICAgICAgYyA9PT0gMHg3RSB8fCAvLyB+XG4gICAgICAgICAgICAoYyA+PSAweDMwICYmIGMgPD0gMHgzOSkgfHwgLy8gMC05XG4gICAgICAgICAgICAoYyA+PSAweDQxICYmIGMgPD0gMHg1QSkgfHwgLy8gYS16XG4gICAgICAgICAgICAoYyA+PSAweDYxICYmIGMgPD0gMHg3QSkgLy8gQS1aXG4gICAgICAgICkge1xuICAgICAgICAgICAgb3V0ICs9IHN0cmluZy5jaGFyQXQoaSk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjIDwgMHg4MCkge1xuICAgICAgICAgICAgb3V0ID0gb3V0ICsgaGV4VGFibGVbY107XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjIDwgMHg4MDApIHtcbiAgICAgICAgICAgIG91dCA9IG91dCArIChoZXhUYWJsZVsweEMwIHwgKGMgPj4gNildICsgaGV4VGFibGVbMHg4MCB8IChjICYgMHgzRildKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGMgPCAweEQ4MDAgfHwgYyA+PSAweEUwMDApIHtcbiAgICAgICAgICAgIG91dCA9IG91dCArIChoZXhUYWJsZVsweEUwIHwgKGMgPj4gMTIpXSArIGhleFRhYmxlWzB4ODAgfCAoKGMgPj4gNikgJiAweDNGKV0gKyBoZXhUYWJsZVsweDgwIHwgKGMgJiAweDNGKV0pO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpICs9IDE7XG4gICAgICAgIGMgPSAweDEwMDAwICsgKCgoYyAmIDB4M0ZGKSA8PCAxMCkgfCAoc3RyaW5nLmNoYXJDb2RlQXQoaSkgJiAweDNGRikpO1xuICAgICAgICBvdXQgKz0gaGV4VGFibGVbMHhGMCB8IChjID4+IDE4KV0gKyBoZXhUYWJsZVsweDgwIHwgKChjID4+IDEyKSAmIDB4M0YpXSArIGhleFRhYmxlWzB4ODAgfCAoKGMgPj4gNikgJiAweDNGKV0gKyBoZXhUYWJsZVsweDgwIHwgKGMgJiAweDNGKV07XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dDtcbn07XG5cbmV4cG9ydHMuY29tcGFjdCA9IGZ1bmN0aW9uIChvYmosIHJlZmVyZW5jZXMpIHtcbiAgICBpZiAodHlwZW9mIG9iaiAhPT0gJ29iamVjdCcgfHwgb2JqID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgfVxuXG4gICAgdmFyIHJlZnMgPSByZWZlcmVuY2VzIHx8IFtdO1xuICAgIHZhciBsb29rdXAgPSByZWZzLmluZGV4T2Yob2JqKTtcbiAgICBpZiAobG9va3VwICE9PSAtMSkge1xuICAgICAgICByZXR1cm4gcmVmc1tsb29rdXBdO1xuICAgIH1cblxuICAgIHJlZnMucHVzaChvYmopO1xuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkob2JqKSkge1xuICAgICAgICB2YXIgY29tcGFjdGVkID0gW107XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvYmoubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIGlmIChvYmpbaV0gJiYgdHlwZW9mIG9ialtpXSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICBjb21wYWN0ZWQucHVzaChleHBvcnRzLmNvbXBhY3Qob2JqW2ldLCByZWZzKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBvYmpbaV0gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgY29tcGFjdGVkLnB1c2gob2JqW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjb21wYWN0ZWQ7XG4gICAgfVxuXG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhvYmopO1xuICAgIGZvciAodmFyIGogPSAwOyBqIDwga2V5cy5sZW5ndGg7ICsraikge1xuICAgICAgICB2YXIga2V5ID0ga2V5c1tqXTtcbiAgICAgICAgb2JqW2tleV0gPSBleHBvcnRzLmNvbXBhY3Qob2JqW2tleV0sIHJlZnMpO1xuICAgIH1cblxuICAgIHJldHVybiBvYmo7XG59O1xuXG5leHBvcnRzLmlzUmVnRXhwID0gZnVuY3Rpb24gKG9iaikge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgUmVnRXhwXSc7XG59O1xuXG5leHBvcnRzLmlzQnVmZmVyID0gZnVuY3Rpb24gKG9iaikge1xuICAgIGlmIChvYmogPT09IG51bGwgfHwgdHlwZW9mIG9iaiA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiAhIShvYmouY29uc3RydWN0b3IgJiYgb2JqLmNvbnN0cnVjdG9yLmlzQnVmZmVyICYmIG9iai5jb25zdHJ1Y3Rvci5pc0J1ZmZlcihvYmopKTtcbn07XG4iLCJpbXBvcnQgcXMgZnJvbSAncXMnXG5cbihmdW5jdGlvbigpe1xuXG4gIC8qKlxuICAgKiAgQG5hbWVzcGFjZSBMaWJyYXJ5Q29udHJvbHNcbiAgICovXG5cbiAgY29uc3QgbGliUmVzaXplcnMgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdsaWJyYXJ5X19zaXplci1saW5rJyk7XG4gIGNvbnN0IGxpYldyYXAgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbGlicmFyeS13cmFwJyk7XG4gIGNvbnN0IGxpYk5hdlRyaWdnZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbGlicmFyeS1uYXYtdHJpZ2dlcicpO1xuICBjb25zdCBsaWJPdXRlciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsaWJyYXJ5LW91dGVyJyk7XG4gIGNvbnN0IGxpYk5hdiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsaWJyYXJ5LW5hdicpO1xuICBjb25zdCBsaWJOYXZJdGVtcyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ3VwZGF0ZXMtY29udGVudCcpO1xuICBjb25zdCBsaWJOYXZJdGVtUGFyZW50cyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ2xpYnJhcnlfX25hdi1saW5rLS1wYXJlbnQnKTtcbiAgY29uc3QgbGliSW5kZXhCdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbGlicmFyeS1pbmRleCcpO1xuICBjb25zdCBsaWJJZnJhbWUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbGlicmFyeS1jb250ZW50Jyk7XG5cbiAgLyoqXG4gICAqIEBmdW5jdGlvbiByZXNpemVDb250ZW50XG4gICAqIEBtZW1iZXJPZiBMaWJyYXJ5Q29udHJvbHNcbiAgICovXG5cbiAgZnVuY3Rpb24gcmVzaXplQ29udGVudChlKXtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAvLyBVcGRhdGUgd3JhcHBlciB3aXRoIG5ldyBzaXplXG4gICAgY29uc3QgbmV3U2l6ZSA9IHRoaXMuZ2V0QXR0cmlidXRlKCdocmVmJykuc3Vic3RyKDEpO1xuICAgIGxpYldyYXAuY2xhc3NOYW1lID0gXCJcIjtcbiAgICBsaWJXcmFwLmNsYXNzTGlzdC5hZGQoJ2xpYnJhcnlfX2NvbnRlbnQtaW5uZXInKTtcbiAgICBsaWJXcmFwLmNsYXNzTGlzdC5hZGQoJ2xpYnJhcnlfX2NvbnRlbnQtaW5uZXItLScgKyBuZXdTaXplKTtcblxuICAgIC8vIFVwZGF0ZSBuYXYgd2l0aCBjdXJyZW50IHNpemVcbiAgICBBcnJheS5mcm9tKGxpYlJlc2l6ZXJzKS5mb3JFYWNoKHNpemUgPT5cbiAgICAgIHNpemUuY2xhc3NMaXN0LnJlbW92ZSgnY3VycmVudCcpXG4gICAgKTtcbiAgICB0aGlzLmNsYXNzTGlzdC5hZGQoJ2N1cnJlbnQnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAZnVuY3Rpb24gdG9nZ2xlTGliTmF2XG4gICAqIEBtZW1iZXJPZiBMaWJyYXJ5Q29udHJvbHNcbiAgICovXG5cbiAgZnVuY3Rpb24gdG9nZ2xlTGliTmF2KGUpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgbGliTmF2LmNsYXNzTGlzdC50b2dnbGUoJ2xpYnJhcnlfX25hdi0tYWN0aXZlJyk7XG4gICAgbGliT3V0ZXIuY2xhc3NMaXN0LnRvZ2dsZSgnbGlicmFyeS0tYWN0aXZlJylcbiAgICB0aGlzLmNsYXNzTGlzdC50b2dnbGUoJ2lzLWFjdGl2ZScpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBmdW5jdGlvbiB1cGRhdGVDb21wb25lbnRcbiAgICogQG1lbWJlck9mIExpYnJhcnlDb250cm9sc1xuICAgKi9cblxuICBmdW5jdGlvbiB1cGRhdGVDb21wb25lbnQoZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICBjb25zdCBuZXdNb2R1bGUgPSB0aGlzLmdldEF0dHJpYnV0ZSgnaHJlZicpO1xuICAgIGxpYklmcmFtZS5zcmMgPSBuZXdNb2R1bGU7XG4gICAgLy8gIHNjcm9sbCB0byB0b3Agb2YgcGFnZVxuICAgIHdpbmRvdy5zY3JvbGwoMCwgMClcblxuICAgIC8vIGtlZXAgdHJhY2sgb2YgY3VycmVudCBjb21wb25lbnRcbiAgICB2YXIgcXVlcmllcyA9IHFzLnBhcnNlKG5ld01vZHVsZS5zdWJzdHIoMSkpXG4gICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKHF1ZXJpZXMsIG51bGwsIGAjJHtxdWVyaWVzLnR5cGV9LSR7cXVlcmllcy5jb21wb25lbnR9YClcbiAgfVxuXG5cbiAgLyoqXG4gICAqIEBmdW5jdGlvbiB0b2dnbGVTdWJOYXZcbiAgICogQG1lbWJlck9mIExpYnJhcnlDb250cm9sc1xuICAgKi9cblxuICBmdW5jdGlvbiB0b2dnbGVTdWJOYXYoZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICBjb25zdCB0YXJnZXRTdWJOYXYgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh0aGlzLmdldEF0dHJpYnV0ZSgnaHJlZicpLnN1YnN0cigxKSk7XG4gICAgdGFyZ2V0U3ViTmF2LmNsYXNzTGlzdC50b2dnbGUoJ2FjdGl2ZScpO1xuICB9XG5cblxuICB3aW5kb3cub25sb2FkID0gZnVuY3Rpb24oKSB7XG5cbiAgICBpZih3aW5kb3cubG9jYXRpb24uaGFzaCkge1xuICAgICAgY29uc3QgY29tcG9uZW50ID0gd2luZG93LmxvY2F0aW9uLmhhc2guc3Vic3RyKDEpXG4gICAgICBjb25zdCBsaW5rID1cbiAgICAgICAgZG9jdW1lbnRcbiAgICAgICAgICAucXVlcnlTZWxlY3RvcihgLmxpYnJhcnlfX25hdi1saW5rW2RhdGEtY29tcG9uZW50PSR7Y29tcG9uZW50fV1gKVxuICAgICAgbGliSWZyYW1lLnNyYyA9IGxpbmsuaHJlZlxuICAgIH1cblxuICAgIEFycmF5LmZyb20obGliUmVzaXplcnMpLmZvckVhY2goc2l6ZSA9PlxuICAgICAgc2l6ZS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHJlc2l6ZUNvbnRlbnQpXG4gICAgKTtcblxuICAgIEFycmF5LmZyb20obGliTmF2SXRlbXMpLmZvckVhY2gobmF2SXRlbSA9PlxuICAgICAgbmF2SXRlbS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHVwZGF0ZUNvbXBvbmVudClcbiAgICApO1xuXG4gICAgQXJyYXkuZnJvbShsaWJOYXZJdGVtUGFyZW50cykuZm9yRWFjaChuYXZJdGVtUGFyZW50ID0+XG4gICAgICBuYXZJdGVtUGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdG9nZ2xlU3ViTmF2KVxuICAgICk7XG5cbiAgICBpZihsaWJOYXZUcmlnZ2VyKXtcbiAgICAgIGxpYk5hdlRyaWdnZXIuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0b2dnbGVMaWJOYXYpO1xuICAgIH1cblxuICAgIGlmKGxpYkluZGV4QnV0dG9uKXtcbiAgICAgIGxpYkluZGV4QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdXBkYXRlQ29tcG9uZW50KTtcbiAgICB9XG5cbiAgfVxuXG59KSgpO1xuIl19
