var resultsGraph = { 

  chart: undefined,
  scales: undefined,

  dataSet: [],

  init: function (opts) {
    var options = opts || {}
      , width = this.width = options.width || 700
      , height = this.height = options.height || 400
      , padding = this.padding = options.padding || {
        t: 12, r: 16, b: 150, l: 54 
      }

    this.chart = d3.select('#d3')
      .append('svg:svg')
        .attr('width', width)
        .attr('height', height)
      .append('svg:g')
        .attr('class', 'barchart')
        .attr('transform', 'translate(0,' + padding.t + ')')

    this.scales = {
      // x: d3.scale.linear().range([0, width]),
      y: d3.scale.linear().range([height - padding.t - padding.b, 0]),
      color: d3.scale.ordinal().range(['red', 'blue', 'green', 'grey'])
    }
    this.scales.color.domain(['localStorage', 'IndexedDB', 'WebSQL', 'processing'])
  },

  addResultSet: function (data, rtime, ptime) {
    this.dataSet.unshift({
      total: rtime + ptime,
      phrase: data.phrase,
      source: data.source,
      results: data.results,
      periods: [
        { y0: 0, y1: rtime, name: data.backend.name.replace(/(^\w+).*/, '$1') },
        { y0: rtime, y1: rtime + ptime, name: 'processing' }
      ]
    });

    if (this.chart === undefined) this.init();
    // this.scales.x.domain([0, this.dataSet.length]);
    this.scales.y.domain([0, d3.max(this.dataSet, function(d) { return d.total })]);
    this.redraw();

  },

  redraw: function () {
    var self = this;

    // We'll do transitions and all that later. For now, start from scratch.
    this.chart.selectAll('*').remove();

    var yAxis = d3.svg.axis()
      .scale(self.scales.y)
      .orient('left')
      .ticks(8);

    this.chart.append('g')
      .attr('class', 'axis')
      .attr('transform', 'translate(' + self.padding.l + ',0)')
      .call(yAxis);

    this.chart.append('text')
      .attr('class', 'axis-label')
      .attr('x', '15')
      .attr('y', (self.height - self.padding.t - self.padding.b)/2)
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90,15,' + (self.height - self.padding.t - self.padding.b)/2 + ')')
      .text('Time (ms)')

    this.chart.append('line')
      .attr('class', 'axis')
      .attr('x1', self.padding.l)
      .attr('y1', self.height - self.padding.b - self.padding.t)
      .attr('x2', self.width - self.padding.r)
      .attr('y2', self.height - self.padding.b - self.padding.t)
      .attr('stroke', 'black');

    var phrase = this.chart.selectAll('g.phrase')
        .data(this.dataSet)
      .enter().append('g')
      .attr('class', 'phrase')
      .attr('transform', function (d, i) {
        return 'translate(' + (20 * i + self.padding.l + (10 * i) + 4) + ',0)';
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
      .attr('y', function () { return self.height - self.padding.b })
      .attr('transform', function (d, i) {
        return 'rotate(45,0,' + (self.height - self.padding.b) + ')';
      })
      .attr('dy', '-6')
      .attr('dx', '-1')
      .style('font-family', '"Helvetica", sans-serif')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text(String)


    var legend = this.chart.append('g')
      .attr('class', 'legend')

    legend.selectAll('rect.legend-item')
        .data(['WebSQL', 'IndexedDB', 'localStorage', 'processing'])
      .enter().append('rect')
      .attr('class', 'legend-item')
      .attr('width', 10)
      .attr('height', 10)
      .attr('y', function (d, i) { return (16 * i) + self.padding.t })
      .attr('x', self.width - self.padding.r - 85)
      .style('fill', function (d) { return self.scales.color(d) })

    legend.selectAll('text')
        .data(['WebSQL', 'IndexedDB', 'localStorage', 'processing'])
      .enter().append('text')
      .attr('x', self.width - self.padding.r - 72)
      .attr('y', function (d, i) { return (16 * i) + self.padding.t })
      .attr('dy', '.9em')
      .style('font-family', '"Helvetica", sans-serif')
      .style('font-size', '10px')
      .text(String)


  }
}
