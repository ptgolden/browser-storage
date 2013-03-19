$(document).ready(function() {
  var dropbox = document.getElementById('filedrop');

  function dragover(e) { e.preventDefault(); e.stopPropagation(); return; }
  function dragenter(e) { e.preventDefault(); dropbox.classList.add('drop-active'); return; }
  function dragleave(e) { dropbox.classList.remove('drop-active'); return; }

  function drop(e) {
    var files = e.dataTransfer.files;
    e.preventDefault();
    e.stopPropagation();
    dropbox.classList.remove('drop-active');
    if (files.length > 0) handleFiles(files);
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
      if (data) chooseKeywordFields(file.name, data);
    }
    reader.readAsText(file);
  }

  function chooseKeywordFields(filename, data) {
    var $kwSection = $('#choose-keywords')
      , $controlsSection = $('#controls')
      , template = document.getElementById('filedrop-template').innerHTML
      , potentialKWFields = []
      , kwinputs = []
      , identopts = []

    $kwSection
      .css('min-height', $controlsSection.innerHeight())
      .html('<p>Detecting keywords...</p>')
      .show()
      .on('click', '.filedrop-accept', function () {
        var kwfields, identifier;
        kwfields = $('input:checked', $kwSection).toArray().map(function (el) {
          return el.name;
        });
        identifier = $('select', $kwSection).val() || 'name';
        addDataSource(filename, data, kwfields, identifier);
      })
      .on('click', 'button', function () {
        $controlsSection.show();
        $kwSection.hide();
        setTimeout(function () { $kwSection.html(''); }, 150);
      });
    $controlsSection.hide();

    data.items.forEach(function (item) {
      for (var field in item) {
        if (potentialKWFields.indexOf(field) === -1) potentialKWFields.push(field);
      }
    });

    potentialKWFields.forEach(function (kw) {
      var input = '<li><input type="checkbox" name="{{kw}}" />{{kw}}</li>'
        , opt = '<option value="{{kw}}">{{kw}}</option>';
      kwinputs.push(formatTemplate(input, {kw: kw}));
      identopts.push(formatTemplate(opt, {kw: kw}));
    });

    $kwSection
      .html('')
      .append(formatTemplate(template, {
        filename: filename,
        ident_options: identopts,
        kw_choices: kwinputs
      }))
      .find('option[value="name"]').prop('selected', 'selected')
  }

  function addDataSource(filename, data, kwfields, identifier) {
    var name = filename.replace(/\.json$/, '').replace(/[^\w]/, '_')
      , btn

    // name must be unique
    while (sources.hasOwnProperty(name)) name += 'x';

    data.items.forEach(function(item, idx) {
      item.keywords = getAllKeywords(item, kwfields);
      if (!item.hasOwnProperty('id')) {
        item.id = 'dummyid' + idx;
      }
    });

    sources[name] = {
      'method': 'file',
      'file': filename,
      'identifier': identifier,
      'keyword_fields': kwfields,
      'data': data
    }

    btn = '<button class="load-data" disabled="disabled" '
      + 'data-name="' + name + '">' + filename + '</button>';

    $('#data-sources').append(btn);

    reportAction('Added ' + filename + ' as a data source.');

  }

  dropbox.addEventListener('dragenter', dragenter, false);
  dropbox.addEventListener('dragover', dragover, false);
  dropbox.addEventListener('dragleave', dragleave, false);
  dropbox.addEventListener('drop', drop, false);

});
