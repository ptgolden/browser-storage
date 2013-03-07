// Get all capitalized words of more than one letter from a phrase.
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

function isStrOrArr(thing) {
  return (typeof(thing) === 'string' || Array.isArray(thing));
}

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

function isMatch(phrase, kw) {
}

function makeSearchResult(phrase, item, identifier) {
  var val
    , identRegex = new RegExp('\\b(' + phrase + ')', 'ig');

  val = item[identifier].replace(identRegex, '<span class="search-matched">$1</span>');
  return '<div class="search-result">' + val + '</div>';
}
