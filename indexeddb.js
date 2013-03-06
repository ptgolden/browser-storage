var IDBBackend = function () {
  var backend = this
    , indexedDB
    , IDBKeyRange

  indexedDB = window.indexedDB
    || window.mozIndexedDB
    || window.webkitIndexedDB
    || window.msIndexedDB;
  IDBKeyRange = window.IDBKeyRange
    || window.webkitIDBKeyRange
    || window.msIDBKeyRange;

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
  this.oninit = undefined;
  this.ondestroyed = undefined;
  this.destroyed = false;

  this.init = function () {
    var req = indexedDB.open('idb_test');
    req.onsuccess = function (e) {
      backend.db = this.result;
      if (backend.oninit) {
        backend.oninit.apply(backend);
      }
    }
    req.onupgradeneeded = function (e) {
      var db = this.result;
      for (var source in dataSources) {
        createObjectStore(db, source);
      }
    }
    req.onerror = function (e) {
      console.log('Database error', e);
    }
  }

  this.loadData = function (source) {
    var db = this.db
      , req = new XMLHttpRequest()
      , dataSource = dataSources[source]

    if (!dataSource) {
      console.log('no such data source: ' + source)
      return;
    }

    req.onload = function () {
      var data = JSON.parse(this.responseText)
        , start = Date.now()
        , transaction = db.transaction([source], 'readwrite')
        , objectStore = transaction.objectStore(source)

      transaction.oncomplete = function () {
        var msg = 'Loaded ' + data.items.length + ' records from ' + dataSource.src;
        reportAction(msg, start, Date.now());
        enableSearch();
      }

      data.items.forEach(function (item) {
        var kwFields = dataSource.keyword_fields.map(function (field) {
          return item[field];
        });
        item.keywords = buildKeywords(kwFields);
        objectStore.put(item);
      });

    }
    req.open('get', dataSource.src);
    req.send();
    return;
  }

  this.performSearch = function (source, phrase) {
    var start = Date.now()
      , $container = $('#results').html('')
      , firstWord = phrase.split(' ')[0].toLowerCase()
      , range
      , transaction
      , counter = 0

    if (!firstWord || firstWord.length < 2) {
      return;
    }

    // Search the keyword index for all those words that begin with the first
    // word of the searched phrase.
    range = IDBKeyRange.bound(firstWord, firstWord + '\uffff');

    transaction = backend.db.transaction(['topics']);
    backend.currentTransaction = transaction;

    transaction
      .objectStore('topics')
      .index('keywords')
      .openCursor(range)
      .onsuccess = function (e) {
        var cursor = e.target.result;
        if (cursor && backend.currentTransaction === transaction) {
          $container.append('<div>' + cursor.value.name + '</div>');
          counter += 1;
          cursor.continue();
        } else if (!cursor) {
          var end = Date.now(), msg;
          msg = counter + ' results for "' + phrase + '" in ' + (end - start) + 'ms';
          $container.prepend('<p><strong>' + msg + '</strong></p>');
          backend.currentTransaction = null;
        }
      }
  }

  this.teardown = function () {
    var req = indexedDB.deleteDatabase('idb_test').onsuccess = function () {
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
