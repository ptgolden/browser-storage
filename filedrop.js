$(document).ready(function() {
  var dropbox = document.getElementById('filedrop');

  function dragover(e) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  function dragenter(e) {
    e.preventDefault();
    dropbox.classList.add('drop-active');
    return;
  }

  function dragleave(e) {
    dropbox.classList.remove('drop-active');
    return;
  }

  function drop(e) {
    var files = e.dataTransfer.files;
    e.preventDefault();
    e.stopPropagation();
    dropbox.classList.remove('drop-active');
    if (files.length > 0) {
      handleFiles(files);
    }
    return;
  }

  function handleFiles(files) { 
    var file = files[0]
      , data
      , reader = new FileReader()

    if (files.length > 1) {
      reportAction('Only drop one file at a time.');
      return;
    }

    reader.onload = function (e) {
      try {
        data = JSON.parse(e.target.result);
      } catch (error) {
        reportAction('Could not parse file as JSON.');
      }
      if (data) {
        chooseKeywordFields(file.name, data);
      }
    }
    reader.readAsText(file);
  }

  function chooseKeywordFields(filename, data) {
    var potentialKWFields = []
      , $kwSection = $('#choose-keywords')
      , $controlsSection = $('#controls')

    $kwSection
      .css('min-height', $controlsSection.innerHeight())
      .html('<p>Detecting keywords...</p>')
      .show()
      .on('click', 'button', function () {
        $controlsSection.show();
        $kwSection.html('').hide();
      });

    $controlsSection.hide();

    data.items.forEach(function (item) {
      for (var field in item) {
        if (potentialKWFields.indexOf(field) === -1) {
          potentialKWFields.push(field)
        }
      }
    });

    $kwSection.html('<h3>Choose keyword fields for ' + filename + '</h3>');

    potentialKWFields.forEach(function(kw) {
      $kwSection.append('<input type="checkbox" name="' + kw + '" />' + '<span style="margin-right: 16px;">' + kw + '</span>' );
    });

    $kwSection.append('<br />');

    $('<button>OK</button>').appendTo($kwSection)
      .one('click', function () {
        var kwfields = $('input:checked', $kwSection).toArray().map(function (el) {
          return el.name;
        });
        addDataSource(filename, data, kwfields);
      });

    $('<button>Cancel</button>').appendTo($kwSection)

  }

  function addDataSource(filename, data, kwfields) {
    var name = filename.replace(/\.json$/, '').replace(/[^\w]/, '_')
      , btn

    // name must be unique
    while (readFiles.hasOwnProperty(name) || dataSources.hasOwnProperty(name)) {
      name += 'x';
    }

    data.items.forEach(function(item, idx) {
      item.keywords = getAllKeywords(item, kwfields);
      if (!item.hasOwnProperty('id')) {
        item.id = 'dummyid' + idx;
      }
    });

    readFiles[name] = {
      'file': filename,
      'data': data
    }

    btn = '<button class="load-data" disabled="disabled" '
      + 'data-method="file" data-name="' + name + '" >'
      + filename + '</button>';

    $('#data-sources').append(btn);

    reportAction('Added ' + filename + ' as a data source.');

  }

  dropbox.addEventListener('dragenter', dragenter, false);
  dropbox.addEventListener('dragover', dragover, false);
  dropbox.addEventListener('dragleave', dragleave, false);
  dropbox.addEventListener('drop', drop, false);

});
