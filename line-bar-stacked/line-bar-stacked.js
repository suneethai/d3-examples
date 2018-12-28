//http://codepen.io/coquin/pen/BNpQoO

var TRANSITION_SPEED = 300;
//
// TEMP data and helper functions
//
var DATES_RANGE = 90;
var date = moment().subtract(DATES_RANGE, 'days');

date.set('hour', 0);
date.set('minute', 0);
date.set('second', 0);

var data = [];

for (var i = 0; i < DATES_RANGE; i++) {
  data.push({
    date: date.valueOf(),
    lineValue: getRandomInt(110, 220) / 1000,
    columnValue: getRandomInt(20, 105) / 1000
  });
  date = date.add(1, 'days');
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getMaxValue(data, field) {
  return Math.max.apply(Math, _.pluck(data, field));
}

function getDateRange(from, to) {
  var fromIdx = _.findIndex(data, function(item) {
      return item.date >= from;
    }),
    toIdx = _.findIndex(data, function(item) {
      return item.date >= to;
    });

  return _.pluck(data.slice(fromIdx, toIdx), "date");
}
//
// END
//
var minDate = data[0].date,
  maxDate = data[data.length - 1].date;

var margin = {
    top: 20,
    right: 20,
    bottom: 30,
    left: 40
  },
  navigatorMarginTop = 30,
  navigatorHeight = 60,
  width = 960 - margin.left - margin.right,
  height = 500 - margin.top - margin.bottom - navigatorHeight - navigatorMarginTop;

var xScale = d3.time.scale()
  .domain([minDate, maxDate])
  .range([0, width]);

// This fake ordianal scale is used only because of its
// `rangeBands` method to automatially calculate the width
// of columns of column chart
var fakeOrdinalXScale = d3.scale.ordinal()
  .domain(_.pluck(data, 'date'))
  .rangeBands([0, width], 0.4, 0);

var yScale = d3.scale.linear()
  .domain([0, getMaxValue(data, "lineValue")])
  .range([height, 0]);

var xAxis = d3.svg.axis()
  .scale(xScale)
  .orient("bottom")
  .tickSize(-height)
  .tickFormat(function(d) {
    return moment(d).format("D MMM");
  });

var yAxis = d3.svg.axis()
  .scale(yScale)
  .orient("left")
  .ticks(6)
  .tickSize(-width);

var zoom = d3.behavior.zoom()
  .x(xScale);

var svg = d3.select("body").append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom + navigatorHeight + navigatorMarginTop);

var mainGroup = svg.append("g")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Clip-path
var chartsContainer = mainGroup.append('g')
  .attr('clip-path', 'url(#plotAreaClip)')
  .call(zoom);

chartsContainer.append('clipPath')
  .attr('id', 'plotAreaClip')
  .append('rect')
  .attr({
    width: width,
    height: height
  });

// Line chart
var line = d3.svg.line()
  .interpolate("basis")
  .x(function(d) {
    return xScale(d.date);
  })
  .y(function(d) {
    return yScale(d.lineValue);
  });

var lineGroup = chartsContainer
  .append("path")
  .attr("class", "line")
  .data(data)
  .attr("d", line(data));

// Column chart
var columnGroup = chartsContainer.selectAll(".column")
  .data(data);

columnGroup.enter()
  .append("rect")
  .attr("class", "column")
  .attr("width", function() {
    return fakeOrdinalXScale.rangeBand();
  })
  .attr("height", function(d) {
    return height - yScale(d.columnValue);
  })
  .attr("x", function(d) {
    return xScale(d.date);
  })
  .attr("y", function(d) {
    return yScale(d.columnValue);
  });

// Axis
mainGroup.append("g")
  .attr("class", "x axis")
  .attr("transform", "translate(0," + height + ")")
  .call(xAxis);

mainGroup.append("g")
  .attr("class", "y axis")
  .call(yAxis);

// Navigator
var navXScale = d3.time.scale()
  .domain([minDate, maxDate])
  .range([0, width]);

var navYScale = d3.scale.linear()
  .domain([0, getMaxValue(data, "lineValue") || 1])
  .range([navigatorHeight, 0]);

var navXAxis = d3.svg.axis()
  .scale(navXScale)
  .tickFormat(function(d) {
    return moment(d).format("MMM");
  })
  .orient("bottom");

var navData = d3.svg.area()
  .interpolate("basis")
  .x(function(d) {
    return navXScale(d.date);
  })
  .y0(navigatorHeight)
  .y1(function(d) {
    return navYScale(d.lineValue);
  });

var navigatorGroup = svg.append("g")
  .attr("class", "navigator")
  .attr("width", width + margin.left + margin.right)
  .attr("height", navigatorHeight + margin.top + margin.bottom)
  .attr("transform", "translate(" + margin.left + "," + (margin.top + height + navigatorMarginTop) + ")");

navigatorGroup.append("path")
  .attr("class", "data")
  .attr("d", navData(data));

svg.append("g")
  .attr("class", "x nav-axis")
  .attr("transform", "translate(" + margin.left + "," + (margin.top + height + navigatorHeight + navigatorMarginTop) + ")")
  .call(navXAxis);

// Navigator viewport
var navViewport = d3.svg.brush()
  .x(navXScale)
  .extent(xScale.domain())
  .on("brush", display);

navigatorGroup.append("g")
  .attr("class", "nav-viewport")
  .call(navViewport)
  .selectAll("rect")
  .attr("height", navigatorHeight);

function display() {
  var viewportExtent = navViewport.empty() ? navXScale.domain() : navViewport.extent();

  zoomToPeriod(viewportExtent[0], viewportExtent[1]);
}

d3.select("button.zoom-out").on("click", function() {
  zoomToPeriod(minDate, maxDate);
});

d3.select("button.zoom-month").on("click", function() {
  var to = maxDate,
    from = moment(to).subtract(30, 'days').valueOf();

  zoomToPeriod(from, to);
});

d3.select("button.zoom-week").on("click", function() {
  var to = maxDate,
    from = moment(to).subtract(7, 'days').valueOf();

  zoomToPeriod(from, to);
});

function zoomToPeriod(from, to) {
  chartsContainer.call(zoom.x(xScale.domain([from, to])));
  fakeOrdinalXScale.domain(getDateRange(from, to));
  updateAxis();
  updateCharts();
}

function updateCharts() {
  lineGroup
    .data([data])
    .attr("d", line);

  lineGroup
    .exit().remove();

  columnGroup
    .data(data)
    .attr("width", function() {
      return fakeOrdinalXScale.rangeBand();
    })
    .attr("x", function(d) {
      return xScale(d.date);
    })
    .attr("y", function(d) {
      return yScale(d.columnValue);
    });

  columnGroup.exit().remove();
}

function updateAxis() {
  mainGroup.select(".x.axis").call(xAxis);
  mainGroup.select(".y.axis").call(yAxis);

  navViewport.extent(xScale.domain());
  navigatorGroup.select('.nav-viewport').call(navViewport);
}