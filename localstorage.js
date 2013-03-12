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

  this.performSearch = function (source, phrase, success) {
    var start = Date.now()
      , firstWord = phrase.trim().replace(/^([^\s]+).*/, '$1').toLowerCase()
      , results = new SearchResults(source, phrase)

    if (!firstWord.length) { return; }

    backend.cachedData[source].items.forEach(function (item) {
      // This performs the same way as IndexedDB.
      var match = item.keywords.some(function (kw) {
        return kw.indexOf(firstWord) === 0;
      });
      if (match) { results.add(item); }
    });

    success.call(null, results, start, Date.now());
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
