var data = [{
  label: "Category 1",
  value: 19
}, {
  label: "Category 2",
  value: 5
}, {
  label: "Category 3",
  value: 13
}, {
  label: "Category 4",
  value: 17
}, {
  label: "Category 5",
  value: 19
}, {
  label: "Category 6",
  value: 27
}];

var width = 360,
  height = 360,
  radius = Math.min(width, height) / 2;

var color = d3.scaleOrdinal(d3.schemeCategory20);

var svg = d3.select("body")
  .append("svg")
  .attr('width', width)
  .attr('height', height)
  .append("g")
  .attr('transform', 'translate(' + (width / 2) +
    ',' + (height / 2) + ')');

svg.append("g")
  .attr("class", "lines");
svg.append("g")
  .attr("class", "labelName");

var donutWidth = 75;

var arc = d3.arc()
  .innerRadius(radius - donutWidth)
  .outerRadius(radius);

var outerArc = d3.arc()
  .innerRadius(150)
  .outerRadius(150);


var pie = d3.pie()
  .value(function(d) {
    return d.value;
  })
  .sort(null);

var legendRectSize = 18;
var legendSpacing = 4;

var path = svg.selectAll('path')
  .data(pie(data))
  .enter()
  .append('path')
  .attr('d', arc)
  .attr('fill', function(d, i) {
    return color(d.data.label);
  });

function midAngle(d) {
  return d.startAngle + (d.endAngle - d.startAngle) / 2;
}

//lines
var polyline = svg.select(".lines").selectAll("polyline")
  .data(pie(data), function(d) {
    return d.data.label
  });

polyline.enter()
  .append("polyline")
  .merge(polyline)
  .transition().duration(1000)
  .attrTween("points", function(d) {
    var _current = _current || d;
    var interpolate = d3.interpolate(_current, d);
    _current = interpolate(0);
    return function(t) {
      var d2 = interpolate(t);
      var pos = outerArc.centroid(d2);
      pos[0] = radius * 0.95 * (midAngle(d2) < Math.PI ? 1 : -1);
      return [arc.centroid(d2), outerArc.centroid(d2), pos];
    };
  });

polyline.exit()
  .remove();

/* ------- TEXT LABELS -------*/

var text = svg.select(".labelName").selectAll("text")
  .data(pie(data), function(d) {
    return d.data.label
  });

text.enter()
  .append("text")
  .attr("dy", ".35em")
  .text(function(d) {
    return (d.data.label + ": " + d.value + "%");
  })
  .merge(text)
  .transition().duration(1000)
  .attrTween("transform", function(d) {
    var _current = _current || d;
    var interpolate = d3.interpolate(_current, d);
    _current = interpolate(0);
    return function(t) {
      var d2 = interpolate(t);
      var pos = outerArc.centroid(d2);
      pos[0] = radius * (midAngle(d2) < Math.PI ? 1 : -1);
      return "translate(" + pos + ")";
    };
  })
  .styleTween("text-anchor", function(d) {
    var _current = _current || d;
    var interpolate = d3.interpolate(_current, d);
    _current = interpolate(0);
    return function(t) {
      var d2 = interpolate(t);
      return midAngle(d2) < Math.PI ? "start" : "end";
    };
  });

text.exit()
  .remove();