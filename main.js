var backend = null

var sources = {
  'topics': {
    'method': 'ajax',
    'file': 'data/topics.json',
    'identifier': 'name',
    'keyword_fields': ['name', 'aliases']
  }
}

function loadData(name) {
  var source = sources[name]
    , request

  if (!source) {
    reportAction('No such source: ' + name);
    return;
  }
  if (source.method === 'ajax') {
    request = new XMLHttpRequest();
    request.onload = function () {
      var data = JSON.parse(this.responseText);
      data.items.forEach(function(item) {
        item.keywords = getAllKeywords(item, source.keyword_fields);
      });
      backend.loadData(name, source.file, data);
    }
    request.open('get', source.file);
    request.send();
  } else if (source.method === 'file') {
    backend.loadData(name, source.file, source.data);
  }
}

// Report an action, optionally with a start and end time
function reportAction(action, start, end) {
  var $actionsContainer = $('#messages')
    , $action = $('<div>')
    , msg

  msg = !(end && start) ? action : action + ': ' + (end - start) + 'ms';
  $action.html(msg).prependTo($actionsContainer);

  if (end && start) $action.addClass('time');
  if ($actionsContainer.children().length > 20) {
    $actionsContainer.children().slice(20).remove();
  }

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
  var $results = $('#results');
  $('#textinput')
    .prop('disabled', false)
    .off()
    .on('input', function () {
      if (this.value.trim().length < 2) {
        $('#results').html('');
        return;
      } 
      backend.performSearch(source, this.value, function (results, start, end) {
        var msg = results.length + ' results for '
          + '"' + results.phrase + '" '
          + 'in ' + (end - start) + 'ms';
        Array.prototype.sort.call(results);
        $('#results')
          .html('')
          .append('<p><strong>' + msg + '</strong></p>')
          .append(Array.prototype.join.call(results, ''));
      });
    });
  reportAction('Input bound. Type to search for keywords from ' + source + '.');
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
    case 'WebSQL':
      backend = new WebSQLBackend();
      break;
    }

    if (!backend.supported) {
      reportAction('Your browser does not support ' + selectedBackend);
      backend = null;
    }

    if (backend) {
      backend.init();
      backendSelected(selectedBackend);
    }
  });
  
  $('#controls').on('click', '.load-data:enabled', function () {
    var $this = $(this);
    reportAction('Loading data for ' + $this.data('name'));
    loadData($this.data('name'));
  });

  reportAction('Select a backend to begin.');
});

