var dataSources = {
  'topics': {
    'src': 'data/topics.json',
    'items': 'topics',
    'keyword_fields': ['name', 'aliases']
  }
}

function reportAction(action, start, end) {
  var $time = $('#time')
    , msg

  if (end && start) {
    msg = action + ': ' + (end - start) + 'ms';
  } else {
    msg = action;
  }

  $time.prepend('<div>' + msg + '</div>')
  if ($time.children().length > 20) {
    $time.children().slice(20).remove();
  }
}

/**
 * Get all capitalized words of more than one letter from a phrase.
 *
 */
function getKeywords(phrase) {
  var keywords = phrase
    .replace(/[,'".]/, '')
    .split(/[ ]+/)
    .filter(function (token) {
      return /^[A-Z][^ ]+/.test(token);
    })
    .map(function (kw) {
      return kw.toLowerCase()
    });
  return keywords;
}

