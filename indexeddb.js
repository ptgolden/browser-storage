var indexedDB
  , IDBKeyRange
  , db
  , DB_NAME = 'topicsdb'
  , DB_VERSION = 1
  , OBJECT_STORE_NAME = 'topics'

indexedDB = window.indexedDB
  || window.mozIndexedDB
  || window.webkitIndexedDB
  || window.msIndexedDB;

IDBKeyRange = window.IDBKeyRange
  || window.webkitIDBKeyRange
  || window.msIDBKeyRange;


/**
 * Since indexedDB does not allow for full-text searching, to improve the
 * returns of results-as-you-type, we'll create an index for each term that
 * includes every 'keyword': in our case, simply every capital word of more
 * than one character.
 */
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
    // Save the db to the global scope so we can use it later without re-opening
    db = this.result;

    // Bind the search function to the input & enable it
    $('#textinput')
      .on('input', function () { performSearch(this.value); })
      .prop('disabled', false)
      .after('<div>DB loaded, ready</div>')
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
  var startTime = Date.now()
    , $container = $('#results').html('')
    , firstWord = phrase.split(' ')[0].toLowerCase()
    , range
    , transaction
    , endTime

  // Search the keyword index for all those words that begin with the first
  // word of the searched phrase.
  range = IDBKeyRange.bound(firstWord, firstWord + '\uffff')

  if (!firstWord || firstWord.length < 2) {
    return;
  }

  // Store this transaction in this function-- on the onsuccess handler, abort
  // if a new search has started. Since indexedDB is asynchronous, this is
  // a way to prevent mixing the results of two separate searches.
  transaction = db.transaction(['topics'])
  performSearch.currentTransaction = transaction

  transaction
    .objectStore('topics')
    .index('keywords')
    .openCursor(range)
    .onsuccess = function (e) {
      var cursor = e.target.result;
      if (cursor && performSearch.currentTransaction === transaction) {
        $container.append( '<div>' + cursor.value.name + '</div>' );
        cursor.continue();
      } else if (!cursor) {
        endTime = Date.now();
        reportTime(phrase, startTime, endTime);
      }
    }

}

function reportTime(phrase, start, end) {
  var $time = $('#time');
  $time.prepend(
    '<div>' + 
    'Search time for ' + phrase + ': ' +
    (end - start) + 'ms' +
    '</div>')
  if ($time.children().length > 20) {
    $time.children().slice(20).remove();
  }
}

openDB();
