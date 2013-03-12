var indexedDB
  , IDBKeyRange
  , IDBName = 'idb_test'

  indexedDB = window.indexedDB
    || window.mozIndexedDB
    || window.webkitIndexedDB
    || window.msIndexedDB;
  IDBKeyRange = window.IDBKeyRange
    || window.webkitIDBKeyRange
    || window.msIDBKeyRange;

indexedDB.deleteDatabase(IDBName);

var IDBBackend = function () {
  var backend = this;

  function createObjectStore(db, source) {
    var objectStore = db.createObjectStore(source, {
      keyPath: 'id',
      autoIncrement: true
    });
    objectStore.createIndex('keywords', 'keywords', {
      unique: false,
      multiEntry: true
    });
  }

  this.db = null;
  this.currentTransaction = null;
  this.oninit = undefined;
  this.ondestroyed = undefined;

  this.init = function () {
    var req = indexedDB.open(IDBName);
    req.onsuccess = function (e) {
      backend.db = this.result;
      if (backend.oninit) {
        backend.oninit.apply(backend);
      }
      reportAction('IndexedDB ' + IDBName + ' opened.');
    }
    req.onupgradeneeded = function (e) {
      var db = this.result;
      for (var source in sources) {
        createObjectStore(db, source);
      }
    }
    req.onerror = function (e) {
      console.log('Database error', e);
    }
  }

  this.loadData = function (name, file, data) {
    var db = this.db
      , start = Date.now()
      , transaction = db.transaction([name], 'readwrite')
      , objectStore = transaction.objectStore(name)

    transaction.oncomplete = function () {
      var msg = 'Loaded ' + data.items.length + ' records from ' + file;
      reportAction(msg, start, Date.now());
      enableSearch(name);
    }

    data.items.forEach(function (item) {
      objectStore.put(item);
    });
  }

  this.performSearch = function (phrase, source, identifier) {
    var start = Date.now()
      , $container = $('#results').html('')
      , firstWord = phrase.split(' ')[0].toLowerCase()
      , results = []
      , range
      , transaction

    if (backend.currentTransaction !== null) {
      backend.currentTransaction.abort();
      backend.currentTransaction = null;
    }

    if (!firstWord || firstWord.length < 2) {
      return;
    }

    // Search the keyword index for all those words that begin with the first
    // word of the searched phrase.
    range = IDBKeyRange.bound(firstWord, firstWord + '\uffff');

    transaction = backend.db.transaction([source]);
    backend.currentTransaction = transaction;

    var req = transaction.objectStore(source).index('keywords').openCursor(range);
    req.onerror = function (e) {
      if (e.target.error.name === 'AbortError') {
        e.preventDefault();
      }
    }
    req.onsuccess = function (e) {
        var cursor = e.target.result;
        if (cursor) {
          results.push(makeSearchResult(phrase, cursor.value, identifier))
          cursor.continue();
        } else if (!cursor) {
          var msg = results.length + ' results for "' + phrase + '" in ' + (Date.now() - start) + 'ms';
          $container.append(results.join(''));
          $container.prepend('<p><strong>' + msg + '</strong></p>');
          backend.currentTransaction = null;
        }
      }
  }

  this.teardown = function () {
    indexedDB.deleteDatabase(IDBName).onsuccess = function () {
      reportAction('IndexedDB ' + IDBName + ' deleted.');
      if (backend.onteardown) {
        backend.onteardown.apply(backend);
      }
    }
    if (backend.db) {
      backend.db.close();
    }
  }

  return this;
}
