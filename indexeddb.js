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

  this.performSearch = function (source, phrase, success) {
    var start = Date.now()
      , firstWord = phrase.trim().split(/\s/)[0].toLowerCase()
      , results = new SearchResults(source, phrase)
      , range
      , transaction
      , req
      , vals = []
      , keys = []

    if (backend.currentTransaction !== null) {
      backend.currentTransaction.abort();
      backend.currentTransaction = null;
    }

    if (!firstWord.length) { return; }

    transaction = backend.db.transaction([source]);
    backend.currentTransaction = transaction;

    // Search the keyword index for all those words that begin with the first
    // word of the searched phrase.
    range = IDBKeyRange.bound(firstWord, firstWord + '\uffff');
    req = transaction.objectStore(source).index('keywords').openCursor(range);
    req.onerror = function (e) {
      // Request is aborted if another search is started before it's finished
      if (e.target.error.name === 'AbortError') { e.preventDefault(); }
    }
    req.onsuccess = function (e) {
      var cursor = e.target.result;
      if (cursor) {
        if (keys.indexOf(cursor.primaryKey) === -1) {
          keys.push(cursor.primaryKey);
          vals.push(cursor.value);
        }
        cursor.continue();
      } else {
        vals.forEach(function (item) {
          results.add(item);
        });
        backend.currentTransaction = null;
        success.call(null, results, start, Date.now());
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
