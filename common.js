var backend
  , dataSources

dataSources = {
  'topics': {
    'src': 'data/topics.json',
    'items': 'topics',
    'keyword_fields': ['name', 'aliases']
  }
}

$(document).on('ready', function () {
  $('#backend button').on('click', function () {
    var selectedBackend = $(this).data('backend');
    if (backend && !backend.destroyed) {
      backend.teardown();
    }

    disableInputs();
    backend = null;

    switch (selectedBackend) {
    case 'indexeddb':
      backend = new IDBBackend();
      backend.oninit = function () {
        reportAction('IndexedDB opened');
      }
      backend.onteardown = function () {
        reportAction('IndexedDB deleted');
        backend.destroyed = true;
      }
      break;
    case 'localstorage':
      break;
    }

    if (backend) {
      backend.init();
      enableInputs();
    }

  });
});

// Report an action, optionally with a start and end time
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

function enableInputs() {
  $('#load-data, #delete-db').prop('disabled', false);
}

function disableInputs() {
  $('#load-data, #delete-db, #textinput').prop('disabled', true);
}

function enableSearch() {
  $('#textinput').val('').prop('disabled', false);
  reportAction('Type into input to search.');
}

