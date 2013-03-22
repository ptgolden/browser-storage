function FileSystemBackend() {
  var self = this
    , requestFileSystem

  requestFileSystem = window.requestFileSystem
    || window.webkitRequestFileSystem;

  this.fs = null;
  this.currentPhrase = null;
  this.cachedData = {};

  this.name = 'File System';
  this.supported = !!requestFileSystem;

  function errorhandler (e) {
    console.log(e);
  }

  this.init = function (success) {
    requestFileSystem(
        window.TEMPORARY, // Could be window.PERSISTENT as well
        20 * 1024 * 1042,
        oninit, errorhandler);
    function oninit(fs) {
      self.fs = fs;
      self.name += ': ' + fs.name;
      fs.root.getDirectory('data', {create: true});
      if (success) success.call(self);
    }
  }

  this.loadData = function (name, file, data, success) {
    var start = Date.now();
    self.fs.root.getFile('data/' + name + '.json', {create: true}, function (fileEntry) {
      var filename = fileEntry.fullPath;
      fileEntry.createWriter(function (writer) {
        var dataBlob = new Blob([JSON.stringify(data)], {type: 'application/json'});
        writer.onwriteend = function (e) {
          reportAction('Wrote file ' + filename, start, Date.now());
          self.loadFile(filename, success);
        };
        writer.onerror = errorhandler;
        writer.write(dataBlob);
      }, errorhandler);
    }, errorhandler);
  }

  this.loadFile = function (filename, success) {
    reportAction('Loading file ' + filename);

    self.fs.root.getFile(filename, {}, function (fileEntry) {
      var start = Date.now();
      fileEntry.file(function (file) {
        var reader = new FileReader();
        reader.onerror = errorhandler;
        reader.onloadend = function (e) {
          self.cachedData.file = fileEntry.fullPath;
          self.cachedData.data = JSON.parse(this.result);
          reportAction('Loaded & cached ' + self.cachedData.data.items.length +
            ' items from ' + filename, start, Date.now());
          if (success) success.call(self);
        }
        reader.readAsText(file)
      }, errorhandler);
    }, errorhandler);

  }

  this.performSearch = function (source, phrase, success) {
      var results = new SearchResultSet(source, phrase)
        , firstWord = results.phrase.tokens[0].toLowerCase()
        , items

      if (!firstWord.length) return;

      items = self.cachedData.data.items.filter(function (item) {
        return item.keywords.some(function (kw) {
          return kw.indexOf(firstWord) === 0;
        });
      });

      results.data(items);
      if (success) success.call(null, results);
  }

  this.teardown = function (success) {
    self.fs.root.getDirectory('data', {}, function (dir) {
      dir.removeRecursively(function () {
        reportAction('data directory in filesystem removed');
        if (success) success.call(self);
      }, errorhandler);
    }, errorhandler);
  }

}
