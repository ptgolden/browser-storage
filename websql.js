function WebSQLBackend() {
  var self = this;
  this.db = null;
  this.currentTransaction = null;

  return {

    init: function () {
      var db = self.db = window.openDatabase(
          'websql_test', '1.0', 'blah blah blah', 4 * 1024 * 1024);
      if (!db) {
        reportAction('error creating WebSQL db');
        return;
      }
      db.transaction(function (tx) {
        for (var source in sources) {
          var statements = [];
          statements.push('DROP TABLE IF EXISTS ' + source + ';');
          statements.push('DROP TABLE IF EXISTS ' + source + '_keywords;');
          statements.push('CREATE TABLE ' + source + ' ('
            + 'id INTEGER PRIMARY KEY, '
            + 'identifier TEXT, '
            + 'json TEXT '
            + '); ');
          statements.push('CREATE TABLE ' + source + '_keywords' + ' ('
            + 'id INTEGER PRIMARY KEY AUTOINCREMENT, '
            + 'item_id INTEGER NOT NULL, '
            + 'word TEXT, '
            + 'FOREIGN KEY(item_id) REFERENCES ' + source + '(id)'
            + '); ');
          statements.forEach(function (statement) { tx.executeSql(statement) });
        }
      });
      reportAction('WebSQL database opened.');
    },

    loadData: function (source, file, data) {
      var start = Date.now()
        , identField = sources[source].identifier

      self.db.transaction(function (tx) {

        data.items.forEach(function (item, i) {
          var statement = 'INSERT INTO ' + source + ' (id, identifier, json) VALUES (?, ?, ?)'
          tx.executeSql(statement, [i, item[identField], JSON.stringify(item)])

          item.keywords.forEach(function (word) {
            var statement = 'INSERT INTO ' + source + '_keywords '
              + '(word, item_id) VALUES (?, ?)';
            tx.executeSql(statement, [word, i]);
          });
        });

      }, null, function success() {
        var msg = 'Loaded ' + data.items.length + ' items from ' + sources[source].file;
        reportAction(msg, start, Date.now());
        enableSearch(source);
      });
    },

    performSearch: function (source, phrase, success) {
      var start = Date.now()
        , firstWord = phrase.trim().split(/\s/)[0].toLowerCase()
        , results = new SearchResults(source, phrase)

      if (!firstWord.length) return;

      function itworked() {
        success.call(null, results, start, Date.now());
      }

      self.db.readTransaction(function (tx) {
        var statement = 'SELECT DISTINCT main.id, main.identifier, main.json '
          + 'FROM ' + source + ' main '
          + 'INNER JOIN ' + source + '_keywords kw ON main.id=kw.item_id '
          + 'WHERE kw.word LIKE "' + firstWord + '%"';
        tx.executeSql(statement, [], function display(tx, res) {
          for (var i = 0; i < res.rows.length; i++) {
            results.add(JSON.parse(res.rows.item(i).json));
          }
        })
      }, null, itworked);

    },

    teardown: function () {
      // there's no way to delete a database, cool
    }

  }
}
