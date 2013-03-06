var localStorageBackend = function() {
  var backend = this;

  this.oninit = undefined;
  this.onteardown = undefined;
  this.destroyed = false;

  this.cachedData = {};

  this.init = function () {
    if (backend.oninit) {
      backend.oninit.apply(backend);
    }
  }

  this.loadData = function (source) {
    var start = Date.now()
      , request = new XMLHttpRequest()
      , dataSource = dataSources[source]

    if (!dataSource) {
      console.log('no such data source: ' + source);
      return;
    }

    request.onload = function () {
      var msg;
      localStorage.setItem(source, this.responseText);
      backend.cachedData[source] = JSON.parse(localStorage.getItem(source));
      backend.cachedData[source].items.forEach(function (item) {
        kwFields = dataSource.keyword_fields.map(function (field) {
          return item[field]
        });
        item.keywords = buildKeywords(kwFields);
      });
      msg = 'Loaded ' + backend.cachedData[source].items.length + ' records from ' + dataSource.src;
      reportAction(msg, start, Date.now());
      enableSearch();
    }
    request.open('get', dataSource.src);
    request.send();

    return;
  }

  this.performSearch = function (source, phrase) {
    var start = Date.now()
      , lphrase = phrase.toLowerCase()
      , $container = $('#results').html('')
      , msg
      , raw
      , results
      , counter = 0

    if (!lphrase || lphrase.length < 2) {
      return;
    }

    backend.cachedData[source].items.forEach(function (topic) {
      var match;
      if (!topic.hasOwnProperty('keywords')) {
        topic.keywords = getKeywords(topic.name);
      }
      match = topic.keywords.filter(function(kw) {
        return kw.startsWith(lphrase);
      });
      if (match.length > 0) {
        $container.append('<div>' + topic.name + '</div>');
        counter += 1
      }
    });

    msg = counter + ' results for "' + phrase + '" in ' + (Date.now() - start) + 'ms';
    $container.prepend('<p><strong>' + msg + '</strong></p>');
  }

  this.teardown = function () {
    for (var key in localStorage) {
      localStorage.removeItem(key);
    }
    if (backend.onteardown) {
      backend.onteardown.apply(backend);
    }
  }

  return this;
}
