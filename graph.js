var resultsGraph = { 

  chart: undefined,
  scales: undefined,

  dataSet: [],

  init: function (opts) {
    var options = opts || {}
      , width = this.width = options.width || 500
      , height = this.height = options.height || 300
      , padding = this.padding = options.padding || 50

    this.chart = d3.select('#d3')
      .append('svg:svg')
        .attr('width', width)
        .attr('height', height)
      .append('svg:g')
        .attr('class', 'barchart')
        .attr('transform', '(0,' + padding + ')')

    this.scales = {
      // x: d3.scale.linear().range([0, width]),
      y: d3.scale.linear().range([height - padding, 0]),
      color: d3.scale.ordinal().range(['red', 'blue'])
    }

  },

  addResultSet: function (data, rtime, ptime) {
    this.dataSet.unshift({
      total: rtime + ptime,
      periods: [
        { y0: 0, y1: rtime },
        { y0: rtime, y1: rtime + ptime }
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
    this.chart.selectAll('g').remove();

    var yAxis = d3.svg.axis()
      .scale(self.scales.y)
      .orient('left')
      .ticks(8);

    this.chart.append('g')
      .attr('class', 'axis')
      .attr('transform', 'translate(' + self.padding + ',0)')
      .call(yAxis);

    var phrase = this.chart.selectAll('g.phrase')
        .data(this.dataSet)
      .enter().append('g')
      .attr('class', 'phrase')
      .attr('transform', function(d, i) {
        return 'translate(' + (20 * i + self.padding + (2 * i) + 2) + ',0)';
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
      .style('fill', function (d, i) { return self.scales.color(i) })
      .style('stroke', 'white');

  }

}
