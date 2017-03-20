/** @private {!Element} */
var lineChartContainerEl_ = document.getElementById('line_chart');

/** @private {!d3.selection} */
var d3Graph_ = d3.select(lineChartContainerEl_);

/** @private {Array<Object>}  */
var data_ = [{
  'year': '1990',
  'value': 0
}, {
  'year': '2000',
  'value': 34
}, {
  'year': '2010',
  'value': 70
}, {
  'year': '2020',
  'value': 88
}];

var margin = {
    top: 20,
    right: 20,
    bottom: 30,
    left: 40
  },
  width = 500 - margin.left - margin.right,
  height = 300 - margin.top - margin.bottom;

d3Graph_.append("text")
  .style("font-size", "16px")
  .attr("x", margin.left)
  .attr("y", (margin.top / 2))
  .text("User growth forecast");

d3Graph_.append("text")
  .style("font-size", "13px")
  .attr("x", margin.left)
  .attr("y", 30)
  .text("United States is in the mature market phase.");

d3Graph_.append("text")
  .style("font-size", "13px")
  .attr("x", margin.left)
  .attr("y", 45)
  .text("We expectminimal growth of internet users.");

var parseTime = d3.timeParse('%Y');
var bisectDate = d3
  .bisector(function(d) {
    return d.year;
  })
  .left;

var x = d3.scaleTime().range([0, width]);
var y = d3.scaleLinear().range([height, 0]);

var line = d3.line()
  .curve(d3.curveBasis)
  .x(function(d) {
    return x(d.year);
  })
  .y(function(d) {
    return y(d.value);
  });

var g = d3Graph_.append('g').attr(
  'transform', 'translate(' + 60 + ',' + 60 + ')');


data_.forEach(function(d) {
  d.year = parseTime(d.year);
  d.value = +d.value;
});

x.domain(d3.extent(data_, function(d) {
  return d.year;
}));
y.domain([
  d3.min(
    data_,
    function(d) {
      return d.value;
    }) /
  1.005,
  d3.max(
    data_,
    function(d) {
      return d.value;
    }) *
  1.005
]);
// add the Y gridlines
g.append('g')
  .attr('class', 'grid')
  .call(make_y_gridlines().tickSize(-width).tickFormat(''))
  .call(customGrid);

var xaxis = d3.axisBottom(x).ticks(4);
var yaxis = d3.axisLeft(y).ticks(3);

g.append('g')
  .attr('class', 'axis axis--x')
  .attr('transform', 'translate(0,' + height + ')')
  .call(customXAxis);

g.append('g')
  .attr('class', 'axis axis--y')
  .call(customYAxis)
  .append('text')
  .attr('class', 'axis-title')
  .attr('transform', 'rotate(-90)')
  .attr('y', 6)
  .attr('dy', '.71em')
  .style('text-anchor', 'end')
  .attr('fill', '#5D6971');

g.append('path')
  .datum(data_)
  .attr('class', 'line')
  .attr('d', line)
  .attr('fill', 'none')
  .attr('stroke', '#375ba9')
  .attr('stroke-width', '2');

// gridlines in y axis function
function make_y_gridlines() {
  return d3.axisLeft(y).ticks(3);
}

function customGrid(g) {
  g.selectAll('line').attr('stroke', '#d8d8d8');
  g.selectAll('line').attr('stroke-width', '0.5px');
  g.select('.domain').remove();
}

function customXAxis(g) {
  g.call(xaxis);
  g.select('.domain').remove();
  g.selectAll('.tick').selectAll('line').remove();
}

function customYAxis(g) {
  g.call(yaxis);
  g.select('.domain').remove();
  g.selectAll('.tick').selectAll('line').remove();
}

var focus = g.append('g').attr('class', 'focus').style('display', 'none');
focus.append('line')
  .attr('class', 'x-hover-line hover-line')
  .attr('y1', 0)
  .attr('y2', height)
  .attr('stroke', '#375ba9')
  .attr('stroke-width', '0.4px');

focus.append("line")
  .attr("class", "y-hover-line hover-line")
  .attr("x1", 0)
  .attr("x2", width - margin.left)
  .attr('stroke', '#375ba9')
  .attr('stroke-width', '0.4px');

focus.append('circle')
  .attr('r', 3)
  .attr('fill', '#375ba9')
  .attr('stroke', '#375ba9')
  .attr('stroke-width', '2');

focus.append('text').attr('x', 15).attr('dy', '.31em');

d3Graph_.append('rect')
  .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
  .attr('class', 'overlay')
  .attr('width', width)
  .attr('height', height)
  .attr('fill', 'none')
  .attr('pointer-events', 'all')
  .on('mouseover',
    function() {
      focus.style('display', null);
    })
  .on('mouseout',
    function() {
      focus.style('display', 'none');
    })
  .on('mousemove', () => {
    var ele = d3.select('.overlay').node();
    var x0 = x.invert(d3.mouse(ele)[0]);
    var i = bisectDate(data_, x0, 1);
    var d0 = data_[i - 1],
      d1 = data_[i];
    var d = x0 - d0.year > d1.year - x0 ? d1 : d0;
    focus.attr(
      'transform', 'translate(' + x(d.year) + ',' + y(d.value) + ')');
    focus.select('text').text(function() {
      return d.value;
    });
    focus.select('.x-hover-line').attr('y2', height - y(d.value));
    focus.select('.y-hover-line').attr('x2', -1 * x(d.year));
  });​