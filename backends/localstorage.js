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
      var results = new SearchResultSet(source, phrase)
        , firstWord = results.phrase.tokens[0].toLowerCase()
        , items

      if (!firstWord.length) return;

      items = self.cachedData[source].items.filter(function (item) {
        return item.keywords.some(function (kw) {
          return kw.indexOf(firstWord) === 0;
        });
      });

      results.data(items);
      success.call(null, results);

    },

    teardown: function () {
      for (var key in localStorage) localStorage.removeItem(key);
      reportAction('localStorage cleared');
    }

  }
}
