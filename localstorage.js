var localStorageBackend = function() {
  var backend = this;

  this.cachedData = {};
  this.oninit = undefined;
  this.ondestroyed = undefined;

  this.init = function () {
    if (backend.oninit) {
      backend.oninit.apply(backend);
    }
    reportAction('localStorage ready');
  }

  this.loadData = function (name, file, data) {
    var start = Date.now()
      , msg

    localStorage.setItem(name, JSON.stringify(data));
    backend.cachedData[name] = data;

    msg = 'Loaded ' + data.items.length + ' records from ' + file;
    reportAction(msg, start, Date.now());

    enableSearch(name);
  }

  this.performSearch = function (source, phrase) {
    var start = Date.now()
      , lphrase = phrase.toLowerCase()
      , $container = $('#results').html('')
      , results = []
      , msg

    if (!lphrase || lphrase.length < 2) {
      return;
    }

    backend.cachedData[source].items.forEach(function (topic) {
      var match;
      match = topic.keywords.filter(function(kw) {
        return kw.indexOf(lphrase) === 0;
      });
      if (match.length > 0) {
        results.push('<div>' + topic.name + '</div>');
      }
    });

    $container.append(results.join(''));
    msg = results.length + ' results for "' + phrase + '" in ' + (Date.now() - start) + 'ms';
    $container.prepend('<p><strong>' + msg + '</strong></p>');
  }

  this.teardown = function () {
    for (var key in localStorage) {
      localStorage.removeItem(key);
    }
    if (backend.onteardown) {
      backend.onteardown.apply(backend);
    }
    reportAction('localStorage cleared');
  }

  return this;
}
