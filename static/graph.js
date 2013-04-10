var resultsGraph = { 

  chart: undefined,
  scales: undefined,

  dataSet: [],

  init: function (opts) {
    var options = opts || {}
      , width = this.width = options.width || 700
      , height = this.height = options.height || 550
      , padding = this.padding = options.padding || [12, 15, 150, 64]

    this.svg = d3.select('#d3')
      .append('svg:svg')
        .attr('width', width)
        .attr('height', height);

    this.chart = this.svg
      .append('svg:g')
        .attr('class', 'barchart')
        .attr('transform', 'translate(6,' + padding[0] + ')');

    this.scales = {
      x: d3.scale.linear().range([0, width]),
      y: d3.scale.linear().range([height - padding[0] - padding[2], 0]),
      color: d3.scale.ordinal().range(['red', 'blue', 'green', 'grey'])
    }
    this.scales.color.domain(['in-memory', 'IndexedDB', 'WebSQL', 'processing'])
  },

  addResultSet: function (data, rtime, ptime) {
    var backend = data.backend.name.replace(/(^\w+).*/, '$1')
      , inmemory = ['localStorage', 'File'].indexOf(backend) > -1
      , browser = document.getElementById('d3-browser').value
      , title = document.getElementById('d3-chart-title').value

    if (browser) {
      this.dataSet.forEach(function(item) {
        item.browser = browser;
      });
    }

    this.dataSet.push({
      backend: backend,
      browser: browser || 'undefined',
      title: title || '',
      total: rtime + ptime,
      phrase: data.phrase,
      source: data.source,
      sourceItems: sources[data.source].totalItems,
      results: data.results,
      periods: [
        { y0: 0, y1: rtime, name: inmemory ? 'in-memory' : backend },
        { y0: rtime, y1: rtime + ptime, name: 'processing' }
      ]
    });

    if (this.chart === undefined) this.init();
    // this.scales.x.domain([0, this.dataSet.length]);
    this.redraw();

  },

  redraw: function () {
    var self = this;
    var padding = self.padding.slice(0);
    var height = self.height;
    var width = self.width;

    var title = document.getElementById('d3-chart-title').value;
    var upperBound = document.getElementById('d3-upper-bound').value.replace(/[^\d]/, '');
    var custWidth = document.getElementById('d3-width').value.replace(/[^\d]/, '');

    if (upperBound.length) {
      upperBound = parseInt(upperBound, 10);
      this.scales.y.domain([0, upperBound]);
    } else {
      this.scales.y.domain([0, d3.max(this.dataSet, function(d) { return d.total })]);
    }

    if (custWidth.length) {
      width = parseInt(custWidth, 10);
    }

    // We'll do transitions and all that later. For now, start from scratch.
    this.chart.selectAll('*').remove();

    // Remove title too (if it exists)
    this.svg.selectAll('text, .legend').remove();

    if (title.length) {
      padding[0] += 24;
      height += 24;
      var title = this.svg.append('text')
        .attr('x', width / 2)
        .attr('y', '22')
        .attr('text-anchor', 'middle')
        .style('font-family', 'serif')
        .style('font-size', '20')
        .text(title)
    }

    this.chart.attr('transform', 'translate(6,' + padding[0] + ')');

    var phrase = this.chart.selectAll('g.phrase')
        .data(this.dataSet)
      .enter().append('g')
      .attr('class', 'phrase')
      .attr('transform', function (d, i) {
        return 'translate(' + (20 * i + padding[3] + (10 * i) + 4) + ',0)';
      });

    phrase.selectAll('rect.period')
        .data(function (d) { return d.periods })
      .enter().append('rect')
      .attr('class', 'period')
      .attr('width', 20)
      .attr('y', function (d) { return self.scales.y(d.y1) })
      .attr('height', function (d) {
        return self.scales.y(d.y0) - self.scales.y(d.y1);
      })
      .style('fill', function (d) { return self.scales.color(d.name) })

    phrase.selectAll('text')
        .data(function (d) { return [d.phrase + ' (' + d.results + ')'] })
      .enter().append('text')
      .attr('y', function () { return height - padding[2] - padding[0] })
      .attr('transform', function (d, i) {
        return 'rotate(45,0,' + (height - padding[2] - padding[0]) + ')';
      })
      .attr('dy', '1.5')
      .attr('dx', '9')
      .style('font-family', '"Helvetica", sans-serif')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text(String)

    var yAxis = d3.svg.axis()
      .scale(self.scales.y)
      .orient('left')
      .ticks(8);

    this.chart.append('g')
      .attr('class', 'axis')
      .attr('transform', 'translate(' + padding[3] + ',0)')
      .call(yAxis);

    this.chart.append('text')
      .attr('class', 'axis-label')
      .attr('x', '15')
      .attr('y', (height - padding[0] - padding[2])/2)
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90,15,' + (height - padding[0] - padding[2])/2 + ')')
      .text('Time (ms)')

    var xAxis = this.chart.append('line')
      .attr('class', 'axis')
      .attr('x1', padding[3])
      .attr('y1', height - padding[2] - padding[0])
      .attr('x2', width - padding[1])
      .attr('y2', height - padding[2] - padding[0])
      .attr('stroke', 'black');

    var legend = this.svg.append('g')
      .attr('class', 'legend')

    legend.selectAll('rect.legend-item')
        .data(['in-memory', 'IndexedDB', 'WebSQL', 'processing'])
      .enter().append('rect')
      .attr('class', 'legend-item')
      .attr('width', 10)
      .attr('height', 10)
      .attr('y', function (d, i) { return (18 * i) + padding[0] + 12 })
      .attr('x', width - padding[1] - 87)
      .style('fill', function (d) { return self.scales.color(d) })

    legend.selectAll('text')
        .data(['in-memory', 'IndexedDB', 'WebSQL', 'processing'])
      .enter().append('text')
      .attr('x', width - padding[1] - 73)
      .attr('y', function (d, i) { return (18 * i) + padding[0] + 12 })
      .attr('dy', '.8em')
      .style('font-family', '"Helvetica", sans-serif')
      .style('font-size', '12px')
      .style('letter-spacing', '0.1em')
      .text(String)

    this.svg.selectAll('.axis path, .axis line, line.axis')
      .style('fill', 'none')
      .style('stroke', 'black')
      .style('shape-rendering', 'crispEdges')

    this.svg.selectAll('.axis text')
      .style('font-size', '10px')
      .style('font-family', '"Helvetica", sans-serif')

    this.svg.selectAll('.barchart-rect')
      .style('shape-rendering', 'crispEdges');

  },

  updateLink: function () {
    var svg
      , b64

    this.redraw();

    svg = document.getElementById('d3').innerHTML.trim();
    svg = svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    b64 = 'data:image/svg+xml;base64,' + btoa(svg);

    window.open(b64);
  },

  openData: function () {
    var self = this
      , data = JSON.stringify(self.dataSet, null, '  ')

    window.open('data:application/json;base64,' + btoa(data));
  },

  saveData: function() {
    var self = this
      , req = new XMLHttpRequest()
      , file = self.SERVER_FILE_NAME
      , method = file ? 'put' : 'post'
      , url = file ? 'data/' + file : 'data'
      , browser = document.getElementById('d3-browser').value

    if (!browser) {
      alert('Enter a browser name');
      return;
    }

    req.onload = function () {
      data = JSON.parse(this.responseText);
      self.SERVER_FILE_NAME = data.id;
    }
    req.onerror = function (e) {
      console.log('error', e);
    }
    req.open(method, url);
    req.setRequestHeader('Content-Type', 'application/json');
    req.send(JSON.stringify({
      'data': self.dataSet,
      'browser': browser || 'undefined'
    }));

  }

}
