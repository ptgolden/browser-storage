var backend = null
  , readFiles = {}
  , dataSources = {
      'topics': {
        'src': 'data/topics.json',
        'keyword_fields': ['name', 'aliases']
      }
    }

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
  
  $('#controls').on('click', '.load-data:enabled', function () {
    var $this = $(this);
    reportAction('Loading data for ' + $this.data('name'));
    loadData($this.data('method'), $this.data('name'), $this.data('identifier'));
  });

  reportAction('Select a backend to begin.');
});

function loadData(method, name) {
  var request
    , file

  if (method === 'ajax') {
    file = dataSources[name].file;
    request = new XMLHttpRequest();
    request.onload = function () {
      var data = JSON.parse(this.responseText);
      data.items.forEach(function(item) {
        item.keywords = getAllKeywords(item, dataSources[name].keyword_fields);
      });
      backend.loadData(name, file, data);
    }
    request.open('get', dataSources[name].src);
    request.send();
  } else if (method === 'file') {
    backend.loadData(name, readFiles[name].file, readFiles[name].data);
  }
}

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

function enableSearch(source) {
  var identifier = $('button[data-name="' + source + '"]').data('identifier');
  $('#textinput')
    .prop('disabled', false)
    .off()
    .on('input', function () {
      backend.performSearch(this.value, source, identifier);
    });
  reportAction('Input bound. Type to search for keywords from ' + source + '.');
}

