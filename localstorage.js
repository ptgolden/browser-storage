function localStorageBackend() {
  var self = this;
  this.cachedData = {};

  return {

    supported: !!window.localStorage,

    init: function () {
      // Nothing really needs to be done
      reportAction('localStorage ready');
    },

    loadData: function (name, file, data) {
      var start = Date.now()
        , msg
      
      localStorage.setItem(name, JSON.stringify(data));
      self.cachedData[name] = data;
      msg = 'Loaded ' + data.items.length + ' records from ' + file;
      reportAction(msg, start, Date.now());
      enableSearch(name);
    },

    performSearch: function (source, phrase, success) {
      var start = Date.now()
        , firstWord = phrase.trim().replace(/^([^\s]+).*/, '$1').toLowerCase()
        , results = new SearchResults(source, phrase)

      if (!firstWord.length) {
        return;
      }

      self.cachedData[source].items.forEach(function (item) {
        // This performs the same way as IndexedDB.
        var match = item.keywords.some(function (kw) {
          return kw.indexOf(firstWord) === 0;
        });
        if (match) results.add(item);
      });
      success.call(null, results, start, Date.now());
    },

    teardown: function () {
      for (var key in localStorage) localStorage.removeItem(key);
      reportAction('localStorage cleared');
    }

  }
}
