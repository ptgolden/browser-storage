function localStorageBackend() {
  var self = this;
  this.cachedData = {};

  this.name = 'localStorage (loaded in memory)';
  this.supported = !!window.localStorage;

  this.init = function (success) {
    // Nothing really needs to be done
    if (success) success.call(self);
  }

  this.loadData = function (name, file, data, success) {
    var start = Date.now()
      , msg
    
    localStorage.setItem(name, JSON.stringify(data));
    self.cachedData[name] = data;
    msg = 'Loaded ' + data.items.length + ' records from ' + file;
    reportAction(msg, start, Date.now());
    if (success) success.call(self);
  }

  this.performSearch = function (source, phrase, success) {
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
    if (success) success.call(null, results);

  }

  this.teardown = function (success) {
    for (var key in localStorage) localStorage.removeItem(key);
    reportAction('localStorage cleared');
    if (success) success.call(self);
  }

}
