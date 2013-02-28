var indexedDB
  , IDBKeyRange

indexedDB = window.indexedDB
  || window.mozIndexedDB
  || window.webkitIndexedDB
  || window.msIndexedDB;
IDBKeyRange = window.IDBKeyRange
  || window.webkitIDBKeyRange
  || window.msIDBKeyRange;

function dbCreated() {
  reportAction('DB created');
  $('#delete-db, #load-data').prop('disabled', false);
  $('#open-db').prop('disabled', true);
  return;
}

function dbDeleted() {
  reportAction('DB deleted');
  $('#delete-db, #load-data, #textinput').prop('disabled', true);
  $('#open-db').prop('disabled', false);
  return;
}

var IDBBackend = function () {
  var that = this

  this.db = null;

  this.init = function () {
    var req;

    req = indexedDB.open('idb_test');
    req.onsuccess = function (e) {
      that.db = this.result;
      dbCreated();
    }
    req.onupgradeneeded = function (e) {
      var db = this.result
        , topicsObjectStore

      topicsObjectStore = db.createObjectStore('topics', {
        keyPath: 'id',
        autoIncrement: true
      });
      topicsObjectStore.createIndex('keywords', 'keywords', {
        unique: false,
        multiEntry: true
      });
    }
    req.onerror = function (e) {
      console.log('Database error', e);
    }
  }

  this.loadData = function (name) {
    var dataSource = dataSources[name]
      , req
      , db = this.db

    if (!dataSource) {
      console.log('no such data source: ' + name)
      return;
    }

    req = new XMLHttpRequest();
    req.onload = function () {
      var data = JSON.parse(this.responseText)
        , startTime = Date.now()
        , endTime
        , transaction
        , objectStore

        trans = transaction

      transaction = db.transaction([name], 'readwrite')
      transaction.oncomplete = function () {
        endTime = Date.now();
        reportAction('loaded ' + dataSource.src 
            + ' (' + data[name].length + ' records)', startTime, endTime);
        $('#textinput')
          .prop('disabled', false)
          .off('**')
          .on('input', function () {
            that.performSearch(this.value);
          });
      }
      objectStore = transaction.objectStore(name);

      data[name].forEach(function (item) {
        var keywords = [];
        dataSource.keyword_fields.forEach(function (field) {
          [].concat(item[field]).forEach(function (phrase) {
            keywords = keywords.concat(getKeywords(phrase));
          })
        });
        item.keywords = keywords;
        objectStore.put(item);
      });

    }
    req.open('get', dataSource.src);
    req.send();
    return;
  }

  this.performSearch = function (phrase) {
    var start = Date.now()
      , $container = $('#results').html('')
      , firstWord = phrase.split(' ')[0].toLowerCase()
      , range
      , transaction

    if (!firstWord || firstWord.length < 2) {
      if (that.currentTransaction) {
        that.currentTransaction.abort();
      }
      return;
    }

    // Search the keyword index for all those words that begin with the first
    // word of the searched phrase.
    range = IDBKeyRange.bound(firstWord, firstWord + '\uffff');

    transaction = that.db.transaction(['topics']);
    that.currentTransaction = transaction;

    transaction
      .objectStore('topics')
      .index('keywords')
      .openCursor(range)
      .onsuccess = function (e) {
        var cursor = e.target.result;
        if (cursor && that.currentTransaction === transaction) {
          $container.append('<div>' + cursor.value.name + '</div>');
          cursor.continue();
        } else if (!cursor) {
          var end = Date.now();
          reportAction('Searched for ' + phrase, start, end);
          that.currentTransaction = null;
        }
      }
  }

  this.teardown = function () {
    var req = indexedDB.deleteDatabase('idb_test').onsuccess = function () {
      dbDeleted();
    }
    if (that.db) {
      that.db.close();
    }
  }

  return this;
}
