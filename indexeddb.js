var indexedDB
  , IDBKeyRange
  , db
  , DB_NAME = 'topicsdb'
  , DB_VERSION = 1
  , OBJECT_STORE_NAME = 'topics'

indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

function getKeywords(phrase) {
  var tokens = phrase.split(/[, ]+/)
    , keywords = [];
  for (var i = 0; i < tokens.length; i++) {
    if (/^[A-Z][^.]+/.test(tokens[i])) {
      keywords.push(tokens[i].toLowerCase())
    }
  }
  return keywords;
}

function openDB() {
  var request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onsuccess = function (e) {
    console.log('ready');
    db = this.result;
    $('#textinput').on('input', function () {
      performSearch(this.value);
    });
  }
  request.onerror = function (e) {
    console.log('Database error: ' + e.target.errorCode);
  }
  request.onupgradeneeded = function (e) {
    var db = this.result;
    var objectStore = db.createObjectStore(OBJECT_STORE_NAME, {
      keyPath: 'id',
      autoIncrement: true
    });
    objectStore.createIndex('name', 'name', {
      unique: false
    });
    objectStore.createIndex('keywords', 'keywords', {
      unique: false,
      multiEntry: true
    });

    // Populate the db
    topic_data.topics.forEach(function (topic) {
      topic.keywords = getKeywords(topic.name);
      topic.aliases.forEach(function (alias) {
        topic.keywords = topic.keywords.concat(getKeywords(alias));
      });
      objectStore.add(topic);
    });

  }
}

function performSearch(phrase) {
  var $container = $('#results').html('');
  var firstWord = phrase.split(' ')[0].toLowerCase();
  if (!firstWord || firstWord.length < 2) {
    return;
  }
  console.log('searching keywords for ' + firstWord);
  var range = IDBKeyRange.bound(firstWord + 'a', firstWord + 'z')
  var index = db.transaction(['topics']).objectStore('topics').index('keywords');
  index.openCursor(range).onsuccess = function (e) {
    var cursor = e.target.result;
    if (cursor) {
      $container.append( '<div>' + cursor.value.name + '</div>' );
      cursor.continue();
    }
  }
}

openDB();
