/**
 * Get all tokens of more than one letter from a given string after
 * punctuation marks, etc. are stripped. Could be improved.
 *
 */
function getKeywords(phrase) {
  var keywords = phrase
    .replace(/[,'".]/, '')
    .split(/[ ]+/)
    .filter(function (token) {
      return /^[A-Za-z]{2,}/.test(token);
    })
    .map(function (kw) {
      return kw.toLowerCase()
    });
  return keywords;
}

/**
 * Please don't make me explain
 *
 */
function isStrOrArr(thing) {
  return (typeof(thing) === 'string' || Array.isArray(thing));
}


/**
 * Given an object and fields to check, return all words that could be
 * considered 'keywords' by the criteria given above.
 *
 * @item: object
 * @kwfields: array or string of fields to check
 *
 */
function getAllKeywords(item, kwfields) {
  var keywords = [];
  kwfields.forEach(function (key) {
    var field = item[key];
    if (field.length === 0 || !isStrOrArr(field)) {
      return;
    }
    [].concat(field).forEach(function (word) {
      keywords = keywords.concat(getKeywords(word));
    });
  });
  return keywords;
}

/**
 * Constructor for an object containing search results. Must be given a
 * phrase and fields that a given item will be checked for.
 *
 */
function SearchResults(source, phrase) {
  this.identField = sources[source].identifier
  this.kwFields = sources[source].keyword_fields

  this.phrase = phrase.replace(/[()\[\]`~.*\-]/g, '');
  this.phraseSplit = this.phrase.split(/\s/).filter(function (token) {
    return token.length > 0;
  });
  this.phrasePatterns = this.phraseSplit.map(function (phrase) {
    return new RegExp('(' + phrase + ')', 'ig');
  });
  this.fullPattern = new RegExp('\\b(' + this.phrase + ')', 'ig');

  this.results = [];
}

SearchResults.prototype = {

  /**
   * Find the first value in one of the 'keyword fields' of a given item
   * that, along with its main identifier, matches all the words in the
   * searched phrase.
   *
   * If a keyword field value is found, returns an object with the key and
   * value of that keyword field.
   *
   * If not, returns null.
   *
   */
  getMatchingKeyword: function (item) {
    var identifier = item[this.identField]
      , key
      , match
      , kwmatch

    for (var i = 0; i < this.kwFields.length; i++) {
      key = this.kwFields[i];
      for (var j = 0, kws = [].concat(item[key]); j < kws.length; j++) {
        match = this.phrasePatterns.every(function(pattern) {
          return identifier.match(pattern) || kws[j].match(pattern);
        });
        if (match) {
          kwmatch = {key: key, val: kws[j]}
          break;
        }
      }
      if (match) { break; }
    }

    return (match || null) && kwmatch;
  },

  /**
   * Add an item to this search result.
   *
   * If the search's phrase can match the item, a highlighted search result
   * is appended to the object's result. If not, nothing happens.
   *
   */
  add: function (item) {
    var identifier = item[this.identField]
      , result
      , fullIdentMatch
      , identMatch
      , kwMatch

    // Ignoring case, does the phrase exactly match the item's identifier?
    strictIdentMatch = identifier.match(this.fullPattern);

    // Ignoring case, does every token in the phrase match the item's identifier?
    // Skipped if there was already a match.
    looseIdentMatch = strictIdentMatch || this.phrasePatterns.every(function (pattern) {
      return identifier.match(pattern);
    });

    if (strictIdentMatch) {
      result = identifier.replace(this.fullPattern, '~$1`');
    } else if (looseIdentMatch) {
      result = identifier;
      this.phrasePatterns.forEach(function(pattern) {
        result = result.replace(pattern, '~$1`');
      });
    } else {
      // The phrase did not match just from the item's identifier, so check if
      // it matches with keyword fields included as well.
      kwMatch = this.getMatchingKeyword(item, identifier);
      if (kwMatch) {
        result = identifier;
        this.phrasePatterns.forEach(function(pattern) {
          result = result.replace(pattern, '~$1`');
          kwMatch.val = kwMatch.val.replace(pattern, '~$1`');
        });
      }
    }

    // This is a shameful display of string mangling which should be improved
    // with a template. We just deal with strings, though, instead of creating
    // new DOM nodes for every result. This would obviously break (or worse) if
    // someone searched for something that could be parsed as html.
    if (result) {
      result = '<div class="result-main">' + result + '</div>';
      if (kwMatch) {
        result += '<div class="result-sub">'
          + '<span class="keyword">' + kwMatch.key + ': </span>'
          + kwMatch.val + '</div>';
      }
      result = result
        .replace(/[~]/g, '<span class="search-matched">')
        .replace(/[`]/g, '</span>');

      result = '<div class="search-result">' + result + '</div>'

      // Add this result to the search result object
      this.results.push(result);
    }

    // return the result just in case anyone would want it
    return result;
  },

  /**
   * write me
   *
   */
  appendTo: function (el) {
  }

}
