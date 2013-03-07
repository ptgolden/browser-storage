var backend
  , dataSources
  , readFiles = {}

$(document).on('ready', function () {
  $('#delete-db').on('click', function() {
    backend.teardown();
    backendDestroyed();
  });

  $('#backend-select').on('click', 'button', function () {
    var selectedBackend = $(this).data('backend');

    backend = null;

    switch (selectedBackend) {
    case 'IndexedDB':
      backend = new IDBBackend();
      break;
    case 'localStorage':
      backend = new localStorageBackend();
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

dataSources = {
  'topics': {
    'src': 'data/topics.json',
    'keyword_fields': ['name', 'aliases']
  }
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

function backendSelected(backend) {
  $('#backend-select').hide();
  $('#selected-backend').show().find('span').html(backend);
  $('.load-data, #delete-db').prop('disabled', false);
  $('#filedrop').hide();
}

function backendDestroyed() {
  $('#backend-select').show();
  $('#selected-backend').hide().find('span').html('');
  $('.load-data, #delete-db, #textinput').prop('disabled', true);
  $('#filedrop').show();
}

function enableSearch() {
  $('#textinput').val('').prop('disabled', false);
  reportAction('Input bound. Type to search.');
}

