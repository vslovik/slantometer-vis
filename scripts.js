

// ***************************************************************************
// ***************************************************************************
// 
//        CHART()
// 
// ***************************************************************************
// ***************************************************************************
function chart(chartName, dataFile, title) {

  var margin = {top: 20, right: 20, bottom: 20, left: 20};
  var width = $('.chart-wrapper').width() - margin.left - margin.right;
  var height = breakHeight(breakpoint) * 0.4 - margin.top - margin.bottom;
  var lineHeight = height;

  var parseDate = d3.time.format("%Y_%m_%d").parse;
  var tooltip = d3.select("body")
      .append("div")
      .attr("class", "tip")
      .style("position", "absolute")
      .style("z-index", "20")
      .style("visibility", "hidden");

  var x = d3.time.scale().range([0, width]);

  var yStacked = d3.scale.linear().range([height, 0]);
  var yMultiple= d3.scale.linear().range([height, 0]);

  var colorrange = ['rgba(2,248,101,0.2)', 'rgba(255,234,38,0.5)', 'rgba(255,178,137,0.5)'];
  var z = d3.scale.ordinal().range(colorrange);
  var nest = d3.nest().key(function(d) { return d.key; });

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom")
      .ticks(d3.time.days, 1);

  var stack = d3.layout.stack()
      .offset("silhouette")
      .order("reverse")
      .values(function(d) { return d.values; })
      .x(function(d) { return d.date; })
      .y(function(d) { return d.value; });

  var areaStacked = d3.svg.area()
      .interpolate("basis")
      .x(function(d) { return x(d.date); })
      .y0(function(d) { return yStacked(d.y0); }) // -.2 to create a little space between the layers
      .y1(function(d) { return yStacked(d.y0 + d.y); }); // +.2, likewise


  var areaMultiples = d3.svg.area()
      .interpolate("basis")
      .x(function(d) { return x(d.date); })
      .y0(function(d) { return lineHeight; }) // -.2 to create a little space between the layers
      .y1(function(d) { return yMultiple(d.value); }); // +.2, likewise


  var svg = d3.select(chartName).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


// ***************************************************************************
// 
//        PARSE DATA
// 
// ***************************************************************************

  d3.csv(dataFile, function(dataRaw) {

    var data = [];
    d3.nest()
      .key(function(d) { return d.channel; }).sortKeys(d3.ascending)
      .key(function(d) { return d.date; }).sortKeys(d3.ascending)
      .key(function(d) { return d.color; }).sortKeys(d3.ascending)
      .rollup(function(v) { return v.length; })
      .entries(dataRaw)
      .forEach(function(j) {
        j.values.forEach(function(k) { 
          k.values.forEach(function(i) {
            color = i.key;
            value = +i.values;
            // d.date = dateFormat(parseDate(d.date));
            date = parseDate(k.key);
            channel = j.key;

            data.push({
              channel: channel,
              date: date,
              key: color,
              value: value
            })
          })
        })
    });
    var filteredData = data.filter(function(d){return d.channel === title;});
    var nested = nest.entries(filteredData.filter(function(d){return d.key !== "Red";}));
    // var nested = nest.entries(filteredData);
    var layers = stack(nested);

    lineHeight = height / nested.length;
    x.domain(d3.extent(filteredData, function(d) { return d.date; }));
    yStacked.domain([0, d3.max(filteredData, function(d) { return d.y0 + d.y; })]);
    yMultiple.domain([0, d3.max(filteredData, function(d) { return d.value; })]).range([lineHeight, 0]);

    svg.selectAll(".layer")
        .data(layers)
      .enter().append("path")
        .attr("class", "layer")
        .attr("d", function(d) {return areaStacked(d.values); })
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

      var t = d3.selectAll("svg").transition().duration(750);
      var   g = t.selectAll(".layer").attr('transform', function(d, i){ return "translate(0," + (height - (i+1) * lineHeight) +")"; });
      g.attr("d", function(d) { return areaMultiples(d.values); });
      g.attr("y", function(d) { return lineHeight; });
    }

    function transitionStacked() {

      var t = d3.selectAll("svg").transition().duration(750);
      var    g = t.selectAll(".layer").attr('transform', function(d, i){ return "translate(0,0)"; });
      g.attr("d", function(d) { return areaStacked(d.values); });
      g.attr("y", function(d) { return yStacked(d.values[0].y0); });
    }

// ***************************************************************************
// 
//        LEGEND
// 
// ***************************************************************************
    
    $(chartName).prepend('<div class="legend"><div class="title">'+title+'</div></div>');
    
    $('.legend').hide();
    var legend = [];
    layers.forEach(function(d,i){
      var obj = {};
      if (i<7){
        obj.key = d.key;
        obj.color = colorrange[i];
        legend.push(obj);
      }
    });

    legend.forEach(function(d,i){
      $(chartName +' .legend').append( '<div class="item"><div class="swatch" style="background: '+d.color+'"></div>'+d.key+'</div>');
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

        var color = d3.select(this).style('fill');
          mouse = d3.mouse(this);
          mousex = mouse[0];
          var invertedx = x.invert(mousex);

        d.values.forEach(function(f){

          var hoveredDate = (f.date.toString()).split(' ')[0];
          var invertedxDate = (invertedx.toString()).split(' ')[0];
          if (invertedxDate === hoveredDate){
              var chartTop = $(chartName).offset().top;
              var chartLeft = $(chartName).offset().left;
              tooltip
                // .style("left", tipX(mousex) +"px")
                .style("left", mousex + chartLeft +"px")
                .style("top", chartTop +"px")
                .html( "<div class='key'><div style='background:" + color + "' class='swatch'>&nbsp;</div></div><div class='value'>" + f.value + " sentences </div>" )
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
    var vertical = d3.select(chartName)
          .append("div")
          .attr("class", "remove")
          .style("position", "absolute")
          .style("z-index", "19")
          .style("width", "8px")
          .style("height", height)
          .style("top", "0px")
          .style("bottom", "10px")
          .style("left", "0px")
          .style("background", "#fff");

    d3.select(chartName)
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



chart(".chart1", "data_clean/BostonRaw.csv", "ABC");
chart(".chart2", "data_clean/BostonRaw.csv", "FOX");
chart(".chart3", "data_clean/BostonRaw.csv", "NBC");

chart(".chart4", "data_clean/LasVegasRaw.csv", "ABC");
chart(".chart5", "data_clean/LasVegasRaw.csv", "FOX");
chart(".chart6", "data_clean/LasVegasRaw.csv", "NBC");

chart(".chart7", "data_clean/GhoutaRaw.csv", "ABC");
chart(".chart8", "data_clean/GhoutaRaw.csv", "FOX");
chart(".chart9", "data_clean/GhoutaRaw.csv", "NBC");

chart(".chart10", "data_clean/HurricaneRaw.csv", "ABC");
chart(".chart11", "data_clean/HurricaneRaw.csv", "FOX");
chart(".chart12", "data_clean/HurricaneRaw.csv", "NBC");

chart(".chart13", "data_clean/KhanRaw.csv", "ABC");
chart(".chart14", "data_clean/KhanRaw.csv", "FOX");
chart(".chart15", "data_clean/KhanRaw.csv", "NBC");

chart(".chart16", "data_clean/TornadoesRaw.csv", "ABC");
chart(".chart17", "data_clean/TornadoesRaw.csv", "FOX");
chart(".chart18", "data_clean/TornadoesRaw.csv", "NBC");

chart(".chart19", "data_clean/NSARaw.csv", "ABC");
chart(".chart20", "data_clean/NSARaw.csv", "FOX");
chart(".chart21", "data_clean/NSARaw.csv", "NBC");

chart(".chart22", "data_clean/RansomwareRaw.csv", "ABC");
chart(".chart23", "data_clean/RansomwareRaw.csv", "FOX");
chart(".chart24", "data_clean/RansomwareRaw.csv", "NBC");







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



// function to ensure the tip doesn't hang off the side
function tipX(x){
  var winWidth = $(window).width();
  var tipWidth = $('.tip').width();

  console.log( winWidth, tipWidth)
  x > winWidth - tipWidth - 30 ? y = x-45-tipWidth : y = x+10;

  return y;
}