var indexedDB = window.indexedDB
    || window.mozIndexedDB
    || window.webkitIndexedDB
    || window.msIndexedDB;

if (indexedDB) indexedDB.deleteDatabase('idb_test');
 
function IDBBackend(name) {
  var self = this
    , IDBKeyRange
    , IDBName = 'idb_test'

  IDBKeyRange = window.IDBKeyRange
    || window.webkitIDBKeyRange
    || window.msIDBKeyRange;
  this.db = null;
  this.currentTransaction = null;

  this.name = 'IndexedDB (name: ' + IDBName + ')';
  this.supported = !!(indexedDB && IDBKeyRange);

  this.init = function (success) {
    var req = indexedDB.open(IDBName);
    req.onsuccess = function (e) {
      self.db = this.result;
      if (success) success.call(self);
    }
    req.onerror = function (e) {
      console.log('Database error', e);
    }
    req.onupgradeneeded = function (e) {
      var db = this.result
        , objectStore

      for (var source in sources) {
        objectStore = db.createObjectStore(source, {
          keyPath: 'id',
          autoIncrement: true
        });
        objectStore.createIndex('keywords', 'keywords', {
          unique: false,
          multiEntry: true
        });
      }
    }
  }

  this.loadData = function (name, file, data, success) {
    var db = self.db
      , start = Date.now()
      , transaction = db.transaction([name], 'readwrite')
      , objectStore = transaction.objectStore(name)

    transaction.oncomplete = function () {
      var msg = 'Loaded ' + data.items.length + ' records from ' + file;
      reportAction(msg, start, Date.now());
      if (success) success.call(self);
    }
    data.items.forEach(function (item) { objectStore.put(item) });
  }

  this.performSearch = function (source, phrase, success, limit) {
    var results = new SearchResultSet(source, phrase)
      , firstWord = results.phrase.tokens[0].toLowerCase()
      , vals = []
      , keys = []
      , range
      , transaction
      , req

    if (self.currentTransaction !== null) {
      self.currentTransaction.abort();
      self.currentTransaction = null;
    }

    if (!firstWord.length) return;

    // Search the keyword index for all those words that begin with the first
    // word of the searched phrase.
    range = IDBKeyRange.bound(firstWord, firstWord + '\uffff');
    transaction = self.currentTransaction = self.db.transaction([source]);

    req = transaction.objectStore(source).index('keywords').openCursor(range);
    req.onerror = function (e) {
      // Request is aborted if another search is started before it's finished
      if (e.target.error.name === 'AbortError') e.preventDefault();
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
        results.data(vals);
        if (success) success.call(null, results);
        self.currentTransaction = null;
      }
    }
  }

  this.teardown = function (success) {
    indexedDB.deleteDatabase(IDBName).onsuccess = function () {
      if (success) success.call(self);
      reportAction('IndexedDB ' + IDBName + ' deleted.');
    }
    if (self.db) self.db.close();
  }
}
