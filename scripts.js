

// ***************************************************************************
// ***************************************************************************
// 
//        CHART()
// 
// ***************************************************************************
// ***************************************************************************
function chart() {

  var margin = {top: 20, right: 20, bottom: 30, left: 20};
  var width = $('.chart-wrapper').width()/2 - margin.left - margin.right;
  var height = breakHeight(breakpoint) * 0.7 - margin.top - margin.bottom;
  var lineHeight = height;

  var chartTop = $('.chart').offset().top;
  var parseDate = d3.time.format("%Y").parse;

  var tooltip = d3.select("body")
      .append("div")
      .attr("class", "tip")
      .style("position", "absolute")
      .style("z-index", "20")
      .style("visibility", "hidden")
      .style("top", 40+chartTop+"px");

  var x = d3.time.scale().range([0, width]);

  var yStacked = d3.scale.linear().range([height-10, 0]);
  var yMultiple= d3.scale.linear().range([height-10, 0]);

  var colorrange = ['rgba(2,248,101,0.2)', 'rgba(255,234,38,0.5)', 'rgba(255,178,137,0.5)'];
  var z = d3.scale.ordinal().range(colorrange);
  var nest = d3.nest().key(function(d) { return d.key; });

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom")
      .ticks(d3.time.years, 1);

  var stack = d3.layout.stack()
      .offset("silhouette")
      .order("reverse")
      .values(function(d) { return d.values; })
      .x(function(d) { return d.date; })
      .y(function(d) { return d.value; });

  var areaStacked = d3.svg.area()
      .interpolate("basis")
      .x(function(d) { return x(d.date); })
      .y0(function(d) { return yStacked(d.y0)-.2; }) // -.2 to create a little space between the layers
      .y1(function(d) { return yStacked(d.y0 + d.y)+.2; }); // +.2, likewise


  var areaMultiples = d3.svg.area()
      .interpolate("basis")
      .x(function(d) { return x(d.date); })
      .y0(function(d) { return lineHeight; }) // -.2 to create a little space between the layers
      .y1(function(d) { return yMultiple(d.value); }); // +.2, likewise


  var svg = d3.select(".chart").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


// ***************************************************************************
// 
//        PARSE DATA
// 
// ***************************************************************************

  d3.csv("data.csv", function(data) {

    // parse the data (see parsing function, above)
    // data = parse(data);

    data.forEach(function(d) {
        d.key = d.tag;
        d.value = +d.sentences;
        d.date = parseDate(d.year);
        d.text = d.text;
    });

    data.sort(function(a, b) {
      return b.date - a.date;
    });

    // generate our layers
    var nested = nest.entries(data);
    var layers = stack(nested);
    lineHeight = height / nested.length;

    // set the domains
    x.domain(d3.extent(data, function(d) { return d.date; }));
    yStacked.domain([0, d3.max(data, function(d) { return d.y0 + d.y; })]);
    yMultiple.domain([0, d3.max(data, function(d) { return d.value; })]).range([lineHeight, 0]);

    svg.selectAll(".layer")
        .data(layers)
      .enter().append("path")
        .attr("class", "layer")
        .attr("d", function(d) { return areaStacked(d.values); })
        .style("fill", function(d, i) { return z(i); });

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);


// ***************************************************************************
// 
//        TRANSITIONS
// 
// ***************************************************************************

    d3.selectAll("input").on("change", change);

    function change() {
      if (this.value === "multiples") transitionMultiples();
      else transitionStacked();
    }

    function transitionMultiples() {
      console.log("multiples")
      var t = svg.transition().duration(750);
      var   g = t.selectAll(".layer").attr('transform', function(d, i){ return "translate(0," + (height - (i+1) * lineHeight) +")"; });
      g.attr("d", function(d) { return areaMultiples(d.values); });
      g.attr("y", function(d) { return lineHeight; });
    }

    function transitionStacked() {
      console.log("stacked")
      var t = svg.transition().duration(750);
      var    g = t.selectAll(".layer").attr('transform', function(){ return "translate(0,0)"; });
      g.attr("d", function(d) { return areaStacked(d.values); });
      g.attr("y", function(d) { return yStacked(d.values[0].y0); });
    }

// ***************************************************************************
// 
//        LEGEND
// 
// ***************************************************************************

    $('.chart').prepend('<div class="legend"><div class="title">Tag</div></div>');
    $('.legend').hide();
    var legend = []
    layers.forEach(function(d,i){
      var obj = {};
      if (i<7){
        obj.key = d.key;
        obj.color = colorrange[i];
        legend.push(obj);
      }
    });

    legend.forEach(function(d,i){
      $('.chart .legend').append('<div class="item"><div class="swatch" style="background: '+d.color+'"></div>'+d.key+'</div>');
    });

    $('.legend').fadeIn();


// ***************************************************************************
// 
//        MOUSEROVER HELPER FUNCTIONS
// 
// ***************************************************************************


    // user interaction with the layers
    svg.selectAll(".layer")
      .attr("opacity", 1)
      .on("mouseover", function(d, i) {
        svg.selectAll(".layer").transition()
          .duration(100)
          .attr("opacity", function(d, j) {
            return j != i ? 0.6 : 1;
      })})
      .on("mousemove", function(d, i) {

        var color = d3.select(this).style('fill'); // need to know the color in order to generate the swatch

        mouse = d3.mouse(this);
        mousex = mouse[0];
        var invertedx = x.invert(mousex);
        var xDate = century(invertedx.getYear());
        d.values.forEach(function(f){
          var year = (f.date.toString()).split(' ')[3];
          if (xDate == year){
              tooltip
                .style("left", tipX(mousex) +"px")
                .html( "<div class='year'>" + year + "</div><div class='key'><div style='background:" + color + "' class='swatch'>&nbsp;</div></div><div class='value'>" + f.value + "  " + f.text + "</div>" )
                .style("visibility", "visible");
          }
        });
      })
      .on("mouseout", function(d, i) {
        svg.selectAll(".layer").transition()
          .duration(100)
          .attr("opacity", '1');
        tooltip.style("visibility", "hidden");
    });

    // vertical line to help orient the user while exploring the streams
    var vertical = d3.select(".chart")
          .append("div")
          .attr("class", "remove")
          .style("position", "absolute")
          .style("z-index", "19")
          .style("width", "2px")
          .style("height", "460px")
          .style("top", "10px")
          .style("bottom", "30px")
          .style("left", "0px")
          .style("background", "#fcfcfc");

    d3.select(".chart")
        .on("mousemove", function(){
           mousex = d3.mouse(this);
           mousex = mousex[0] + 5;
           vertical.style("left", mousex + "px" )})
        .on("mouseover", function(){
           mousex = d3.mouse(this);
           mousex = mousex[0] + 5;
           vertical.style("left", mousex + "px")});

  });

}

// ***************************************************************************
// ***************************************************************************
// 
//        Call the chart
// 
// ***************************************************************************
// ***************************************************************************

chart();





// ***************************************************************************
// 
//        LEGEND HELPER FUNCTIONS
// 
// ***************************************************************************

function breakCalc(x){
  x <= 480 ? y = 'xs' : y = 'md';
  return y;
}

var breakpoint = breakCalc($(window).width());

$(window).resize(function(){
  var breakpoint = breakCalc($(window).width());
})

// change the height of the chart depending on the breakpoint
function breakHeight(bp){
  bp == 'xs' ? y = 250 : y = 500;
  return y;
}


// funciton to determine the century of the datapoint when displaying the tooltip
function century(x){
  x<100 ? y = '19'+x : y = '20'+(x.toString().substring(1));
  return y;
}

// function to ensure the tip doesn't hang off the side
function tipX(x){
  var winWidth = $(window).width();
  var tipWidth = $('.tip').width();
  x > winWidth - tipWidth - 30 ? y = x-45-tipWidth : y = x+10;
  return y;
}