d3.sankey = function() {
  var sankey = {},
      nodeWidth = 24,
      nodePadding = 8,
      size = [1, 1],
      nodes = [],
      links = [];

  sankey.nodeWidth = function(_) {
    if (!arguments.length) return nodeWidth;
    nodeWidth = +_;
    return sankey;
  };

  sankey.nodePadding = function(_) {
    if (!arguments.length) return nodePadding;
    nodePadding = +_;
    return sankey;
  };

  sankey.nodes = function(_) {
    if (!arguments.length) return nodes;
    nodes = _;
    return sankey;
  };

  sankey.links = function(_) {
    if (!arguments.length) return links;
    links = _;
    return sankey;
  };

  sankey.size = function(_) {
    if (!arguments.length) return size;
    size = _;
    return sankey;
  };

  sankey.layout = function(iterations) {
    computeNodeLinks();
    computeNodeValues();
    computeNodeBreadths();
    computeNodeDepths(iterations);
    computeLinkDepths();
    return sankey;
  };

  sankey.relayout = function() {
    computeLinkDepths();
    return sankey;
  };

  sankey.link = function() {
    var curvature = 0.8;

    function link(d,i) {
     var x0 = d.source.x + 115,
          x1 = d.target.x + d.target.speed/70,
          xi = d3.interpolateNumber(x0, x1),
          x2 = (d.value > 50 ? xi(curvature)- 60 : xi(curvature)),//xi(curvature),
          x3 = (d.value > 50 ? xi(1-curvature)- 60 : xi(1-curvature)) + 10,//xi(1 - curvature),
          y0 = d.source.y + d.sy + d.dy / 2 + 40,
          y1 = d.target.y + d.ty + d.dy / 2;
      /*var x0 = d.source.x + d.source.dx,
          x1 = d.target.x,
          xi = d3.interpolateNumber(x0, x1),
          x2 = xi(curvature),
          x3 = xi(1 - curvature),
          y0 = d.source.y + d.sy + d.dy / 2,
          y1 = d.target.y + d.ty + d.dy / 2;*/
      return "M" + x0 + "," + y0
           + "C" + x2 + "," + y0
           + " " + x3 + "," + y1
           + " " + x1 + "," + y1;
    }

    link.curvature = function(_) {
      if (!arguments.length) return curvature;
      curvature = +_;
      console.log(curvature);
      return link;
    };

    return link;
  };

  // Populate the sourceLinks and targetLinks for each node.
  // Also, if the source and target are not objects, assume they are indices.
  function computeNodeLinks() {
    nodes.forEach(function(node) {
      node.sourceLinks = [];
      node.targetLinks = [];
    });
    links.forEach(function(link) {
      var source = link.source,
          target = link.target;
      if (typeof source === "number") source = link.source = nodes[link.source];
      if (typeof target === "number") target = link.target = nodes[link.target];
      source.sourceLinks.push(link);
      target.targetLinks.push(link);
    });
  }

  // Compute the value (size) of each node by summing the associated links.
  function computeNodeValues() {
    nodes.forEach(function(node) {
      node.value = Math.max(
        d3.sum(node.sourceLinks, value),
        d3.sum(node.targetLinks, value)
      );
    });
  }

  // Iteratively assign the breadth (x-position) for each node.
  // Nodes are assigned the maximum breadth of incoming neighbors plus one;
  // nodes with no incoming links are assigned breadth zero, while
  // nodes with no outgoing links are assigned the maximum breadth.
  function computeNodeBreadths() {
    var remainingNodes = nodes,
        nextNodes,
        x = 0;

    while (remainingNodes.length) {
      nextNodes = [];
      remainingNodes.forEach(function(node) {
        node.x = x;
        node.dx = nodeWidth;
        node.sourceLinks.forEach(function(link) {
          if (nextNodes.indexOf(link.target) < 0) {
            nextNodes.push(link.target);
          }
        });
      });
      remainingNodes = nextNodes;
      ++x;
    }

    //
    moveSinksRight(x);
    scaleNodeBreadths((size[0] - nodeWidth) / (x - 1));
  }

  function moveSourcesRight() {
    nodes.forEach(function(node) {
      if (!node.targetLinks.length) {
        node.x = d3.min(node.sourceLinks, function(d) { return d.target.x; }) - 1;
      }
    });
  }

  function moveSinksRight(x) {
    nodes.forEach(function(node) {
      if (!node.sourceLinks.length) {
        node.x = x - 1;
      }
    });
  }

  function scaleNodeBreadths(kx) {
    nodes.forEach(function(node) {
      node.x *= kx;
    });
  }

  function computeNodeDepths(iterations) {
    var nodesByBreadth = d3.nest()
        .key(function(d) { return d.x; })
        //.sortKeys(d3.ascending)
        .entries(nodes)
        .map(function(d) { return d.values; });

    //
    initializeNodeDepth();
    resolveCollisions();
    for (var alpha = 1; iterations > 0; --iterations) {
      relaxRightToLeft(alpha *= .99);
      resolveCollisions();
      relaxLeftToRight(alpha);
      resolveCollisions();
    }

    function initializeNodeDepth() {
      var ky = d3.min(nodesByBreadth, function(nodes) {
        return (size[1] - (nodes.length - 1) * nodePadding) / d3.sum(nodes, value);
      });

      nodesByBreadth.forEach(function(nodes) {
        nodes.forEach(function(node, i) {
          node.y = i;
          node.dy = node.value * ky;
        });
      });

      links.forEach(function(link) {
        link.dy = link.value * ky;
      });
    }

    function relaxLeftToRight(alpha) {
      nodesByBreadth.forEach(function(nodes, breadth) {
        nodes.forEach(function(node) {
          if (node.targetLinks.length) {
            var y = d3.sum(node.targetLinks, weightedSource) / d3.sum(node.targetLinks, value);
            node.y += (y - center(node)) * alpha;
          }
        });
      });

      function weightedSource(link) {
        return center(link.source) * link.value;
      }
    }

    function relaxRightToLeft(alpha) {
      nodesByBreadth.slice().reverse().forEach(function(nodes) {
        nodes.forEach(function(node) {
          if (node.sourceLinks.length) {
            var y = d3.sum(node.sourceLinks, weightedTarget) / d3.sum(node.sourceLinks, value);
            node.y += (y - center(node)) * alpha;
          }
        });
      });

      function weightedTarget(link) {
        return center(link.target) * link.value;
      }
    }

    function resolveCollisions() {
      nodesByBreadth.forEach(function(nodes) {
        var node,
            dy,
            y0 = 0,
            n = nodes.length,
            i;

        // Push any overlapping nodes down.
        //nodes.sort(ascendingDepth);
        for (i = 0; i < n; ++i) {
          node = nodes[i];
          dy = y0 - node.y;
          if (dy > 0) node.y += dy;
          y0 = node.y + node.dy + nodePadding;
        }

        // If the bottommost node goes outside the bounds, push it back up.
        dy = y0 - nodePadding - size[1];
        if (dy > 0) {
          y0 = node.y -= dy;

          // Push any overlapping nodes back up.
          for (i = n - 2; i >= 0; --i) {
            node = nodes[i];
            dy = node.y + node.dy + nodePadding - y0;
            if (dy > 0) node.y -= dy;
            y0 = node.y;
          }
        }
      });
    }

    function ascendingDepth(a, b) {
      return a.y - b.y;
    }
  }

  function computeLinkDepths() {
    /*nodes.forEach(function(node) {
      node.sourceLinks.sort(ascendingTargetDepth);
      node.targetLinks.sort(ascendingSourceDepth);
    });*/
    nodes.forEach(function(node) {
      var sy = 0, ty = 0;
      node.sourceLinks.forEach(function(link) {
        link.sy = sy;
        sy += link.dy;
      });
      node.targetLinks.forEach(function(link) {
        link.ty = ty;
        ty += link.dy;
      });
    });

    function ascendingSourceDepth(a, b) {
      return a.source.y - b.source.y;
    }

    function ascendingTargetDepth(a, b) {
      return a.target.y - b.target.y;
    }
  }

  function center(node) {
    return node.y + node.dy / 2;
  }

  function value(link) {
    return link.value;
  }

  return sankey;
};


 var data = {
   "nodes":[{
     "node":0,"name":"node0"},{
     "node":1,"name":"node1", "speed":"2355", "key":"idc", "percentage":"15","included_countries":"0", "category":"Indirect connection"},{
     "node":2,"name":"node2", "speed":"10325", "key":"pop", "percentage":"66", "included_countries": "11", "category":"Direct connection","axis_text":"Point of presence(POP)"},{
     "node":3,"name":"node3", "speed":"2959", "key":"onc", "percentage":"19", "included_countries": "403", "category":"","axis_text":"Off-net cache"
   }],
   "links":[{
     "source":0,"target":1,"value":15},{
     "source":0,"target":2,"value":66},{
     "source":0,"target":3,"value":19}]
 };


    var margin = {top: 60, right: 50, bottom: 60, left: 60},
      width = 1200 - margin.left - margin.right,
      height = 260 - margin.top - margin.bottom;

    // set the ranges
    var x = d3.scaleLinear().domain([0,110]).range([0,width]);
    var y = d3.scaleLinear().domain([100,0]).range([0,height]);
    
    var xaxis = d3.axisBottom(x).tickSizeOuter([0]);
    var yaxis = d3.axisLeft(y);

    var svg = d3.select("svg")
          .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform","translate(" + margin.left + "," + margin.top + ")");

    svg.append('g')
       .attr("class","axis axis--x")
       .attr("transform", "translate(0,"+ (height)+")")
       .call(customXaxis);


    svg.append('g')
      .attr("class","axis axis--y")
      .call(customYaxis);
    
    /*** dashed axis line -- Start ****/
    svg.append("line")
        .data(data.nodes)
        .attr("x1", x(0))
        .attr("y1", y(0))
        .attr("x2", x(data.nodes[2].percentage) + 30)
        .attr("y2", y(0))
        .attr("stroke","#989898")
        .attr("stroke-dasharray","5,5")
        .attr("stroke-width",1.5);
    /*** dashed axis line -- End ****/

    /*** blue axis line -- Start ****/
    svg.append("line")
        .data(data.nodes)
        .attr("x1", x(data.nodes[2].percentage))
        .attr("y1", y(0))
        .attr("x2", x(100))
        .attr("y2", y(0))
        .attr("stroke","#0068D9")
        .attr("stroke-width",1.5);

    /*** dashed axis line -- End ****/

    var units = "Widgets";
    
    // format variables
    var format = d3.format(",");

    // Set the sankey diagram properties
    var sankey = d3.sankey()
    .nodeWidth(36)
    .nodePadding(10)
    .size([500, 100]);

    var path = sankey.link();

    
    // load the data
    sankey
      .nodes(data.nodes)
      .links(data.links)
      .layout(32);

    
    // Create the svg:defs element and the main gradient definition.
    var svgDefs = svg.append('defs');

    /*** Gradient 1 -- Start ****/
    var mainGradient1 = svgDefs.append('linearGradient')
        .attr('id', 'mainGradient1')
        .attr("x1", "40%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%");

    mainGradient1.append('stop')
        .attr('class', 'stop-left1')
        .attr('offset', '0');

    mainGradient1.append('stop')
        .attr('class', 'stop-right1')
        .attr('offset', '1');
    /*** Gradient 1 -- End ****/
    /*** Gradient 2 -- Start ****/
    var mainGradient2 = svgDefs.append('linearGradient')
        .attr('id', 'mainGradient2')
        .attr("x1", "60%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%");

    mainGradient2.append('stop')
        .attr('class', 'stop-left2')
        .attr('offset', '0');

    mainGradient2.append('stop')
        .attr('class', 'stop-right2')
        .attr('offset', '1');
    /*** Gradient 2 -- End ****/

    // add in the links
    var link = svg.append("g").selectAll(".link")
      .data(data.links)
      .enter().append("path")
      .attr("class","nodes")
      .attr("id", function(d,i){
          return "path_"+i;
      })
      .attr("d", path)
      .style("stroke-width", function(d) { return Math.max(1, d.dy); });


    // add in the nodes
    var node = svg.append("g").selectAll(".nodes")
      .data(data.nodes)
      .enter().append("g")
      .attr("class", "node")
      .attr("transform", function(d) { 
      return "translate(" + d.x + "," + d.y + ")"; });

   
    // add in the title for the nodes
    node.append("text")
      .text(function(d,i) {  if(i !== 0) return "("+format(d.speed)+" Gbps) "+d.percentage+"%"; })
      .attr("x", function(d,i){
          if(d.key == "onc")
            return d.speed/1000 - 5;
          else if(i !== 0)
            return sankey.nodeWidth() + d.speed/70 - 5;
      })
      .attr("y", function(d,i){ return (d.dy + 6)/2; })
      .attr("text-anchor", "End")
      .attr("font-size","11px")
      .attr("font-family","Arial");

    /*** Lines at the end of the nodes -- Start ****/
    node.append("line")
      .data(data.nodes)
      .attr("x1", function(d,i){
          if(d.key == "onc")
            return d.speed/1000;
          else if(i !== 0)
            return sankey.nodeWidth()+d.speed/70;
      })
      .attr("y1", function(d,i){ if(i !== 0) return d.dy; })
      .attr("x2", function(d,i){
          if(d.key == "onc")
            return d.speed/1000;
          else if(i !== 0)
            return sankey.nodeWidth()+d.speed/70;
      })
      .attr("y2", 0)
      .attr("stroke",function(d){ if(d.key == "idc" ) return "#666"; else return "#0068D9";})
      .attr("stroke-width",8);

    node.append("line")
      .data(data.nodes)
      .attr("x1", function(d,i){
          if(d.key == "pop")
            return sankey.nodeWidth()+d.speed/70;
      })
      .attr("y1", function(d,i){ if(d.key == "pop") return -10; })
      .attr("x2", function(d,i){
          if(d.key == "pop")
            return sankey.nodeWidth()+d.speed/70;
      })
      .attr("y2", function(d,i){ if(d.key == "pop")return - d.dy + 30; })
      .attr("stroke",function(d){ if(d.key == "pop" ) return "#0068D9";})
      .attr("stroke-width",8);
    
    /*** Lines at the end of the nodes -- End ****/
    
    /*** Text at the end of the nodes -- Start ****/
    node.append("text")
      .data(data.nodes)
      .attr("x", function(d,i){
          if(d.key == "pop")
            return sankey.nodeWidth()+d.speed/49;
          else if(d.key == "idc")
            return sankey.nodeWidth()+d.speed/11;
      })
      .attr("y", function(d,i){ if(i !== 0) return (d.dy+5)/2; })
      .text(function(d,i){ if(d.key == "pop" || d.key == "idc") return d.category; })
      .attr("text-anchor","Start")
      .attr("font-family","Arial")
      .attr("text-anchor","middle")
      .attr("font-size","12px")
      .attr("fill","#000");
    /*** Text at the end of the nodes -- End ****/
    
    /*** Lines from the nodes to the pointers on axis -- Start ****/
    node.append("line")
      .data(data.nodes)
      .attr("x1", function(d,i){
          if(d.key == "onc")
            return d.speed/1000;
          else if(i !== 0)
            return sankey.nodeWidth()+d.speed/70;
      })
      .attr("y1", function(d,i){ if(i !== 0 && d.key != "idc") return d.dy; })
      .attr("x2", function(d,i){
          if(d.key == "onc")
            return d.speed/1000;
          else if(i !== 0)
            return sankey.nodeWidth()+d.speed/70;
      })
      .attr("y2", function(d,i){ 
        if(d.key == "onc")
          return (d.dy * 2) +12;
        else if(d.key == "pop")
          return d.dy * 2;
      })
      .attr("id",function(d){ return "cl_"+d.key; })
      .attr("value",function(d){ return d.percentage; })
      .attr("stroke","#000")
      .attr("stroke-width",1);

    node.append("line")
      .data(data.nodes)
      .attr("x1", function(d,i){
          if(d.key == "pop")
            return sankey.nodeWidth()+d.speed/70;
      })
      .attr("y1", function(d,i){ if(d.key == "pop") return d.dy - 52; })
      .attr("x2", function(d,i){
          if(d.key == "pop")
            return sankey.nodeWidth()+d.speed/70;
      })
      .attr("y2", function(d,i){ 
        if(d.key == "pop")
          return -d.dy + 42;
      })
      .attr("id",function(d){ return "cl_"+d.key; })
      .attr("value",function(d){ return d.percentage; })
      .attr("stroke","#000")
      .attr("stroke-width",1);

    node.append("line")
      .data(data.nodes)
      .attr("x1", function(d,i){
        if(d.key == "pop")
            return sankey.nodeWidth()+d.speed/70;
      })
      .attr("y1", function(d,i){ if(d.key == "pop") return d.dy - 52; })
      .attr("x2", function(d,i){
          if(d.key == "pop")
            return sankey.nodeWidth()+d.speed/70;
      })
      .attr("y2", function(d,i){ 
        if(d.key == "pop")
          return -d.dy + 42;
      })
      .attr("id",function(d){ return "cl_"+d.key; })
      .attr("value",function(d){ return d.percentage; })
      .attr("stroke","#000")
      .attr("stroke-width",1);

    node.append("line")
      .data(data.nodes)
      .attr("x1", function(d,i){
        if(d.key == "pop")
            return sankey.nodeWidth() + 39;
      })
      .attr("y1", function(d,i){ if(d.key == "pop") return -d.dy + 36; })
      .attr("x2", function(d,i){
          if(d.key == "pop")
            return sankey.nodeWidth()+d.speed/72;
      })
      .attr("y2", function(d,i){ if(d.key == "pop") return -d.dy + 36; })
      .attr("id",function(d){ return "cl_"+d.key; })
      .attr("value",function(d){ return d.percentage; })
      .attr("stroke","#000")
      .attr("stroke-dasharray","5,5")
      .attr("stroke-width",1);

    /*** Lines from the nodes to the pointers on axis -- End ****/
    /*** Pointers on axis -- Start ****/
    node.append("circle")
      .attr("r",function(d,i){ 
          if(i !== 0 && d.key != "idc")
            return 8;
          else
            return 0;
      })
      .attr("cx",function(d,i){
        if(i !== 0){
          if(d.key == "onc")
            return d.speed/1000;
          else
            return sankey.nodeWidth() + d.speed/70;
        }
      })
      .attr("cy",function(d,i){
        console.log(d); 
        if(d.key == "onc")
          return (d.dy * 2) + 24;
        else if(d.key == "pop")
          return (d.dy * 2) + 12;
      })
      .attr("fill","#0068D9");
    /*** Pointers on axis -- End ****/

    /*** Text below axis -- Start ****/
    node.append("text")
        .attr("x",function(d,i){
          if(i !== 0){
            if(d.key == "onc")
              return d.speed/1000;
            else
              return sankey.nodeWidth() + d.speed/70;
          }
        })
        .attr("y",function(d,i){
          if(d.key == "onc")
            return (d.dy * 3) + 37;
          else if(d.key == "pop")
            return (d.dy * 3) - 12;
        })
        .text(function(d,i){
          if(d.key == "onc" || d.key == "pop")
              return d.axis_text;
        })
        .attr("font-family","Arial")
        .attr("font-size","13px")
        .attr("fill","#000")
        .attr("text-anchor","middle");

    node.append("text")
        .attr("x",function(d,i){
          if(i !== 0){
            if(d.key == "onc")
              return d.speed/1000;
            else
              return sankey.nodeWidth() + d.speed/70;
          }
        })
        .attr("y",function(d,i){
          if(d.key == "onc")
            return (d.dy * 3) + 50;
          else if(d.key == "pop")
            return (d.dy * 3);
        })
        .text(function(d,i){
          if(d.key == "onc" || d.key == "pop")
              return "including "+d.included_countries+" in country";
        })
        .attr("font-family","Arial")
        .attr("text-anchor","middle")
        .attr("font-size","12px")
        .attr("fill","#989898");
    /*** Text below axis -- End ****/

    /*** User --- Start ***/   
    svg.append("circle")
        .attr("r", 8)
        .attr("cx",x(0))
        .attr("cy",y(0))    
        .attr("fill","#989898");
        
    svg.append("line")
        .attr("x1",x(0))
        .attr("y1",y(7))
        .attr("x2",x(0))
        .attr("y2",y(20))
        .attr("stroke","#989898")
        .attr("stroke-width",1.5);

    svg.append("text")
        .text("User")
        .attr("x", x(-1))
        .attr("y", y(-20))
        .attr("font-family","Arial")
        .attr("font-size","13px")
        .attr("fill","#000");

    svg.append("image")
        .attr("x", x(-1.7))
        .attr("y", y(47))
        .attr("xlink:href","http://www.nodeclass.com/avatars/default.jpg")
        .attr("height",34)
        .attr("width",34);

    svg.append("text")
        .text("Traffic")
        .attr("x", x(4))
        .attr("y", y(33))
        .attr("font-family","Arial")
        .attr("font-size","13px")
        .attr("fill","#000");

    /*** User --- End ***/

    /***  Datacenter in country ---- Start ***/
    svg.append("circle")
                .attr("r", 8)
                .attr("cx",x(100))
                .attr("cy",y(0))    
                .attr("fill","#0068D9");
        
    svg.append("line")
          .attr("x1",x(100))
          .attr("y1",y(7))
          .attr("x2",x(100))
          .attr("y2",y(20))
          .attr("stroke","#989898")
          .attr("stroke-width",1.5);

    svg.append("text")
        .text("Datacenter in country")
        .attr("x", x(92))
        .attr("y", y(-20))
        .attr("font-family","Arial")
        .attr("font-size","13px")
        .attr("fill","#000");

    svg.append("circle")
        .attr("r",22)
        .attr("cx", x(100))
        .attr("cy", y(40))
        .attr("stroke-width", 1.5)
        .attr("stroke", "#0068D9")
        .attr("fill","#fff");

    /*svg.append("image")
        .attr("x", (x(100) - 14))
        .attr("y", y(50))
        .attr("xlink:href","images/google-g-logo.png")
        .attr("height",28)
        .attr("width",28);*/
      
    svg.append("text")
        .text("g")
        .attr("x", x(100) - 10)
        .attr("y", y(37))
        .attr("font-family","Roboto")
        .attr("font-size","41px")
        .attr("fill","#0068D9");

    function customXaxis(g){
      g.call(xaxis);
      g.select(".domain").remove();
      g.selectAll("line").remove();
      g.selectAll(".tick").remove();
    }

    function customYaxis(g){
      g.call(yaxis).select(".domain").remove();
      g.selectAll("line").remove();
      g.selectAll(".tick").remove();    
    }


