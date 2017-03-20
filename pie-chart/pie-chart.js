//Width and height
var w = 300,
  h = 300,
  dataset = [5, 10, 20, 45, 6, 25],
  outerRadius = w / 2,
  innerRadius = 0;

var arc = d3.arc()
  .innerRadius(innerRadius)
  .outerRadius(outerRadius);

var pie = d3.pie();

// Easy colors accessible via a 10-step ordinal scale
var color = d3.scaleOrdinal(d3.schemeCategory10);

// Create SVG element
var svg = d3.select("body")
  .append("svg")
  .attr("width", w)
  .attr("height", h);

// Set up groups
var arcs = svg.selectAll("g.arc")
  .data(pie(dataset))
  .enter()
  .append("g")
  .attr("class", "arc")
  .attr("transform", "translate(" + outerRadius + "," + outerRadius + ")")
  .on("mouseover", function(d) {
    d3.select("#tooltip")
      .style("left", d3.event.pageX + "px")
      .style("top", d3.event.pageY + "px")
      .style("opacity", 1)
      .select("#value")
      .text(d.value);
  })
  .on("mouseout", function() {
    // Hide the tooltip
    d3.select("#tooltip")
      .style("opacity", 0);;
  });

// Draw arc paths
arcs.append("path")
  .attr("fill", function(d, i) {
    return color(i);
  })
  .attr("d", arc);

// Labels
arcs.append("text")
  .attr("transform", function(d) {
    return "translate(" + arc.centroid(d) + ")";
  })
  .attr("text-anchor", "middle")
  .text(function(d) {
    return d.value;
  });