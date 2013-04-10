var backend = null;

var sources = {
  'topics': {
    'method': 'ajax',
    'file': 'static/data/topics.json',
    'identifier': 'name',
    'keyword_fields': ['name', 'aliases']
  },
  'viaf': {
    'method': 'stream',
    'file': 'viaf_items_1M.json',
    'identifier': 'viaf',
    'identifier': 'primary_name',
    'keyword_fields': ['primary_name', 'alternate_names']
  },
  'geonames': {
    'method': 'stream',
    'file': 'geonames_items_1M.json',
    'identifier': 'name',
    'keyword_fields': ['name', 'alternate_names']
  }
}

function formatTemplate(template, dict) {
  return template.replace(/{{[ \w]+}}/g, function (match) {
    var name = match.replace(/[{} ]/g, '')
      , val = dict.hasOwnProperty(name) && dict[name]

    if (!val) return match;
    if (Array.isArray(val)) return val.join(' ');
    return val;

  });
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

function loadData(backend, sourceName, success) {
  var source = sources[sourceName]
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
      sources[sourceName].totalItems = data.items.length;
      backend.loadData(sourceName, source.file, data, success);
    }
    request.open('get', source.file);
    request.send();
  } else if (source.method === 'file') {
    backend.loadData(sourceName, source.file, source.data, success);
  } else if (source.method === 'stream') {
    streamdata(backend, sourceName, success);
  }
}

function streamdata(backend, sourceName, success, limit) {
  var source = sources[sourceName]
    , limit = document.querySelector('input[name="limit"]').value
    , chunksize = 10000
    , eventsource
    , i = 0

  limit = parseInt(limit, 10) * 1000;
  if (limit > 999000) {
    reportAction('Highest limit is 999,000 records');
    return;
  }

  eventsource = new EventSource(
      'streamdata?limit=' + limit + 
      '&chunksize=' + chunksize +
      '&src=' + sourceName)

  reportAction('loading ' + limit + ' records from ' + source.file);

  eventsource.onmessage = function (e) {
    var items = JSON.parse(e.data.trim());
    items.items.forEach(function (item) {
      item.keywords = getAllKeywords(item, source.keyword_fields);
    });
    backend.loadData(sourceName, source.file, items, function(backend) {
      i++;
      if (items.final) {
        eventsource.close();
        sources[sourceName].totalItems = limit;
        reportAction(limit + ' records loaded from ' + source.file);
        success.call(backend);
      } else {
        reportAction(
          ('' + ((100 * i * chunksize) / limit)).slice(0, 4)
          + '% of ' + limit + ' records loaded');
      }
    });
  }

}

function backendSelected() {
  reportAction(this.name + ' ready.');
  $('#backend-select').hide();
  $('#selected-backend').show().find('span').html(this.name);
  $('.load-data, #delete-db').prop('disabled', false);
  $('#filedrop').hide();
}

function backendDestroyed() {
  $('#backend-select').show();
  $('#selected-backend').hide().find('span').html('');
  $('.load-data, #delete-db, #textinput').prop('disabled', true);
  $('#filedrop').show();
  $('#results').html('&nbsp;');
}

function renderResults(results) {
  var msg = results.length + ' results for '
    + '"' + results.phrase.original + '" '
    + 'in ' + results.totalTime() + 'ms';
  var btn = '<a href="#" class="graph-result" style="color: green;">Graph result</a>';

  Array.prototype.sort.call(results);
  $('#results')
    .html('')
    .append('<p><strong>' + msg + '</strong> ' + btn + '</p>')
    .append(Array.prototype.join.call(results, ''))
    .find('.graph-result').click(function (e) {
      var iterations = 5
        , data

      e.preventDefault();
     
      data = {
        backend: backend,
        phrase: results.phrase.original,
        source: results.source,
        results: results.length
      };
      reportAction('Testing phrase "' + data.phrase + '" ' + iterations + ' times.');
      testPhrase(data, iterations, function (data, rtime, ptime) {
        resultsGraph.addResultSet(data, rtime, ptime);
      })
      $(this).remove();
    });
}

/*
 * @data: object containing 'backend', 'source', and 'phrase'
 *
 */

function testPhrase(data, iterations, success) {
  var allresults = [];

  test(iterations);

  function test(i) {
    if (i === 0) {
      var rtime, ptime;
      rtime = allresults.reduce(function (prev, cur) { return prev + cur.retrieval; }, 0);
      rtime = (rtime / allresults.length) || 0;

      ptime = allresults.reduce(function (prev, cur) { return prev + cur.processing; }, 0);
      ptime = (ptime / allresults.length) || 0;

      if (success) success.call(null, data, rtime, ptime);

      return;
    }
    data.backend.performSearch(data.source, data.phrase, function (results) {
      allresults.push({
        'retrieval': results.retrievalTime(),
        'processing': results.processingTime()
      });
      test(i - 1);
    });
  }

  return allresults;
}

function enableSearch(source) {
  var $results = $('#results');
  $('#textinput')
    .prop('disabled', false)
    .off()
    .on('input', function () {
      if (this.value.trim().length < 2) return;
      backend.performSearch(source, this.value, renderResults)
    });
  reportAction('Input bound. Type to search for keywords from ' + source + '.');
}

$(document).on('ready', function () {
  $('#delete-db').on('click', function (e) {
    e.preventDefault();
    backend.teardown(backendDestroyed);
  });

  $('#backend-select').on('click', 'button', function (e) {
    var selectedBackend = $(this).data('backend');

    e.preventDefault();

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
    case 'fileSystem':
      backend = new FileSystemBackend();
      break;
    }

    if (!backend.supported) {
      reportAction('Your browser does not support ' + selectedBackend);
      backend = null;
    }

    if (backend) backend.init(backendSelected);

  });
  
  $('#controls').on('click', '.load-data:enabled', function (e) {
    var source = $(this).data('name');
    e.preventDefault();
    reportAction('Loading data for ' + source);
    loadData(backend, source, function () {
      enableSearch(source);
    });
  });

  reportAction('Select a backend to begin.');
});

