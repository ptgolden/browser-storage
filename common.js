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

    backendDestroyed();
    backend = null;

    switch (selectedBackend) {
    case 'IndexedDB':
      backend = new IDBBackend();
      backend.oninit = function () {
        reportAction('IndexedDB opened');
      }
      backend.onteardown = function () {
        reportAction('IndexedDB deleted');
        backend.destroyed = true;
      }
      break;
    case 'localStorage':
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
      backendSelected(selectedBackend);
    }

  });
  reportAction('Select a backend to begin.');
});

// Report an action, optionally with a start and end time
function reportAction(action, start, end) {
  var $actionsContainer = $('#messages')
    , $action = $('<div>')
    , msg

  msg = !(end && start) ? action : action + ': ' + (end - start) + 'ms';
  $action.html(msg).prependTo($actionsContainer);

  if (end && start) {
    $action.addClass('time');
  }

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

function isStrOrArr(thing) {
  return (typeof(thing) === 'string' || Array.isArray(thing));
}

function buildKeywords(arr) {
  var keywords = [];
  arr.forEach(function(grp) {
    var words;
    if (grp.length === 0 || !isStrOrArr(grp)) {
      return;
    }
    words = Array.isArray(grp) ? grp.slice(0) : [grp];
    words.forEach(function (word) {
      keywords = keywords.concat(getKeywords(word));
    });
  });
  return keywords;
}

function backendSelected(backend) {
  $('#backend-choices').hide();
  $('#selected-backend').show().find('span').html(backend);
  $('#load-data, #delete-db').prop('disabled', false);
}

function backendDestroyed() {
  $('#backend-choices').show();
  $('#selected-backend').hide().find('span').html('');
  $('#load-data, #delete-db, #textinput').prop('disabled', true);
}

function enableSearch() {
  $('#textinput').val('').prop('disabled', false);
  reportAction('Input bound. Type to search.');
}

