 // plot path based on line method plotLine_
 var line = this.d3_
   .line()
   .curve(this.d3_.curveBasis)
   .x(function(d) {
     return x(d.date);
   })
   .y(function(d) {
     return y(d.value);
   });
 g.append('path')
   .datum(this.data_)
   .attr('class', 'line')
   .attr('d', line)
   .attr('fill', 'none')
   .attr('stroke', '#4285f4')
   .attr('stroke-width', '1');



 // plot dots based on data on the lines plotLine_
 g.selectAll('dot')
   .data(this.data_)
   .enter()
   .append('circle')
   .attr('fill', '#0067a0')
   .attr('r', 3.5)
   .attr(
     'cx',
     function(d) {
       d.xPosition = x(d.date);
       return x(d.date);
     })
   .attr('cy', function(d) {
     d.yPosition = x(d.value);
     return y(d.value);
   });



 //add the Y gridlines
 g.append('g')
   .attr('class', 'grid')
   .call(make_y_gridlines().tickSize(-width).tickFormat(''))
   .call(customGrid);

 function make_y_gridlines() {
   return d3_.axisLeft(y).ticks(5);
 }

 function customGrid(g) {
   g.selectAll('line').attr('stroke', '#d8d8d8');
   g.selectAll('line').attr('stroke-width', '0.5px');
   g.select('.domain').remove();
 }