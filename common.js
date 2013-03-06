var backend
  , dataSources

dataSources = {
  'topics': {
    'src': 'data/topics.json',
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
      backend = new localStorageBackend();
      backend.oninit = function () {
        reportAction('Using localStorage');
      }
      backend.onteardown = function () {
        reportAction('localStorage cleared');
        backend.destroyed = true;
      }
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
  var $actionsContainer = $('#messages')
    , $action = $('<div>')
    , msg

  msg = !(end && start) ? action : action + ': ' + (end - start) + 'ms';
  $action.html(msg).prependTo($actionsContainer);

  if ($actionsContainer.children().length > 20) {
    $actionsContainer.children().slice(20).remove();
  }

  return $action;
}

// Get all capitalized words of more than one letter from a phrase.
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

function buildKeywords(arr) {
  var keywords = [];
  arr.forEach(function(grp) {
    if (grp.length === 0 || !(typeof(grp) === 'string' || Array.isArray(grp))) {
      return;
    }
    [].concat(grp).forEach(function (phrase) {
      keywords = keywords.concat(getKeywords(phrase));
    });
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

