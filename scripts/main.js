/*
 Copyright (c) 2016, BrightPoint Consulting, Inc.

 This source code is covered under the following license: http://vizuly.io/commercial-license/

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
 THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
 OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// @version 1.1.25


/*

 This is the primary code file that orchestrates the various components of the mobile app.

 The mobile app is composed of the following display elements

    Header:  Top of Device Display

        -  Back Button
        -  Title Label
        -  Selected Date Label
        -  Info button
        -  Scroller
             -- Minimum Date Range Label
             -- Maximum Date Range Label

    Chart List
        -  List Item (4)
            --  Chart Symbol Label/Toggle
            --  Chart Pop Menu
            --  Mobile Chart

  Main app routines:


    1. window.onload()  (MobileApp.html)
        - loads data

    2. initialize()
        - sets up variables and application state
        - gets measurements for all relative display elements

    3. measure()
        - calculates layout for all display elements mobile and desktop

    4. update()
        - updates header elements
        - updates scroller
        - updates charts
        - updates labels

    5. chartMenu_onClick()
        - When a user chooses a new pop-up menu item this routine
          changes the data field being displayed within that individual chart.

    6. chartPointer_onDrag()
        - When a user drags one of the data labels in a given chart this routine
          updates the labels and index lines in the corresponding charts.

    7. expandChart(i)
        - When a user clicks on the chart title (GOOGL, AAPL, etc..) this routine
          animates the chart to fill the whole list area and minimizes the other charts.

    8. onZoom()
        - When a user pinches/zooms and/or scroll wheels anywhere in the chart list area
          this issues the zoom event to each chart.

    Other source code files

    linearea_mobile.js - vizuly linearea mobile chart
    linearea_mobile_theme.js - vizuly linearea mobile theme
    measure.js - used to take display layout measurements to mimic phone device and center on screen
    pop_menu.js - vizuly UI pop menu
    scroller.js - vizuly UI display scroller


 */

/****  GLOBAL VARIABLES ****/
// Collections
var chartItems=[];   // D3 selections for each chart container
var symbols=[];      // The unqiue stock symbols from our data

// Colors used for chart backgrounds
var chartColors=["#F48FB1","#FFAF49","#7986CB","#2DA4A9","#E57373"];
var labelColors=["#C01B3E","#FF653A","#2D4FAC","#3F5874","#C62828"];

// Data Fields
var dataFields = ["All","SEM","Social","Email","Print"];
var menuItems = [{label: "SEM", value: "SEM"},{label: "Social", value: "Social"},{label: "Email", value: "Email"},{label: "Print", value: "Print"},{label: "All", value: "All"}];
var skins = ["MaterialPink","MaterialOrange","MaterialBlue","MaterialGreen"];

// Formatters used to make labels pretty
var labelFormat = d3.time.format("%b 20%y"), titleDateFormat = d3.time.format("%b %_d 20%y");
var currFormat = function (d) { return d3.format('$.2f')(d);};
var volumeFormat = function (d) { return d3.format(',.0f')(d);};
var spendFormat = function (d) { return d3.format('$,.0f')(d);};
var percentFormat = function (d) { return d3.format(",%")(d);};


// Measurements for various display elements.
var chartHeight, chartWidth;
var titleFontHeight, subTitleFontHeight;
var chartHeightRatio;


// Device display elements and measurements.
var device, deviceWidth,dHeight,dTop,dLeft,deviceDisplayStyle;

// Header display elements and measurements
var header, headerWidth,headerHeight,headerTop,headerLeft,infoButton;

// sliderDiv display elements and measurements
var sliderDiv, sliderDivWidth,sliderDivHeight,sliderDivTop,sliderDivLeft;


// Scroll (div container)
var scroll, scrollWidth,  scrollLeft, scrollFontHeight, scrollRatio;

// Scroller (vizuly ui element)
var scroller, scrollerWidth, scrollerHeight;

// Charts
var charts=[], chartLabels=[], chartMores=[], chartList, listWidth, listHeight, listLeft, listTop;




// Event Holders
var touchClickEvent;

// Menus
var menus=[], menuWidth, menuHeight;


var mobile=false;







// Called once after data has been loaded
// Does initial set up of all display elements.
function initialize() {

    // Our primary DOM elements
    device = d3.select("#devicePhone");
    header = d3.select("#header");
    scroll = d3.select("#scrollDiv");
    chartList = d3.select("#chartsDiv");
    infoButton = d3.select("#infoButton");
  
    // The chartList holds all 4 charts top to bottom
    chartList.call(zoom);
  

    // Call our measurement routine.
    measure();

    // If we are on a mobile device disable the background android phone image.
    if (mobile==true) {
        device.style("background-image",null)
            .style("top",0)
            .style("left",0);
    }

    // Set up our intro dialog (gesture icons/descriptions)
    d3.selectAll("#introDialog")
        .style("width",listWidth + "px")
        .style("height",(listHeight + 1) + "px")
        .style("left",listLeft + "px")
        .style("top",listTop + "px");

    d3.selectAll(".introItem")
        .style("width",listWidth + "px")
        .style("top",function(d,i) { return (i==3) ? ((chartHeight* i *.92) + "px"):(chartHeight* i*.97) + "px"});


    d3.selectAll(".introItem img")
        .style("width",listWidth + "px");
        
   d3.selectAll("#slider")
    
        .on("input",function(){update(+this.value);});
        
  
       
       

    // These are the main containers we use for each of the four charts.
    // We have one for each symbol
    chartItems = chartList.selectAll(".mobile-list-item")
        .data(symbols)
        .enter()
        .append("div")
        .attr("class","mobile-list-item");

    // We loop through the 4 charts and set up the chart itself, corresponding symbol label, and pop up menu.
   
        
 chartItems[0].forEach(function (item,i){


 
      var chart=vizuly.viz.linearea_mobile(item)


            .data([symbols[i].values])
            .width(chartWidth)
            .duration(700)
            .margin({top: chartHeight * (1 - chartHeightRatio), left:0, bottom:0, right:0})
            .height(chartHeight)
           
      
            .x(function (d) { return d.date;})
            .y(function (d) { 
                
                return (symbols[i].key == "FORECAST" && d.name == "no") ? Number(d[dataFields[i]]*(1+(1*slider.value*1.12))) : (symbols[i].key == "SPEND" && d.name == "no") ? Number(d[dataFields[i]] *(1+(1*slider.value))) : (symbols[i].key == "CPL" && d.name == "no") ? Number(d[dataFields[i]] * (1-(slider.value*.12))) : Number(d[dataFields[i]]);
                
           
                
                })
                
            .dataLabel(function (d) {
                
              
                return (symbols[i].key == "FORECAST") ? volumeFormat(this.y(d)) : (symbols[i].key == "SPEND") ? spendFormat(this.y(d)) : currFormat(this.y(d));
            })
            
            
          
            .on("validate",function () {
                this.component.yScale(d3.scale.pow())
               
              

            })
            .on("measure",function () {
                if (symbols[i].key == "CPL") {
                    this.component.yScale().exponent(5);
                    this.component.yAxis().tickFormat(volumeFormat);
                }
                else {
                    this.component.yScale().exponent(2);
                    this.component.yAxis().tickFormat(currFormat);
                }
            })
            .on("pointerdrag.mobileapp",chartPointer_onDrag)
            .update()
            .index(Math.round(symbols[i].values.length/2));




        // We want to remove the internal chart zoom and use our own so on mobile the user can touch anywhere in the chart list to zoom.
        chart.selection().select(".vz-plot").on(".zoom",null);
        
      

        // This is our symbol label.
        var label = d3.select(item)
            .append("div")
            .attr("class","mobile-item-button")
            .on(touchClickEvent,function () { expandChart(i); });

        // This is where we attach our pop menu.
        var menuDiv = d3.select(item)
            .append("div")
            .attr("class","chart-menu")
            .style("position","absolute")
            .style("cursor","pointer")
            .style("margin-right","10px");


        // Our pop menu that is used to change data fields
        var menu=vizuly.ui.pop_menu(menuDiv[0][0])
            .on("click",function (d) { chartMenu_onClick(d,i); })
            .data(menuItems);

        // Add our chart elements to their appropriate arrays
        menus.push(menu);
        chartLabels.push(label);
        charts.push(chart);

        // Each chart gets its own theme to manage the skin of the chart.
        var theme = vizuly.theme.linearea_mobile(chart).skin(skins[i]);
        
    

    });


    
    // We create a display scroller (seen at top of the device) and attach it to our zoom behavior.
    scroller = vizuly.ui.scroller(document.getElementById("scrollDiv"));
    scroller.zoom(zoom);
    
    

    // Add our event handler to show intro dialog when user clicks info button
    infoButton.on(touchClickEvent,showIntro);

    // Display the intro dialog (gestures and directions)
    showIntro();

}

// Main update routine
function update() {

    zoom.size([listWidth,listHeight]);

    updateHeader();

    updateScroller();

    updateCharts();

    updateLabels();
    
    updateSlider();
   
    
   

}

function updateSlider(){
    

  d3.select("#sliderLabel")
  
  //.text("Spend Incr= "+ (roundedPercent*100) +"%");
  
  
  .text("Spend Incr= "+ percentFormat(slider.value));
  /*d3.select("#slider").property("value", slider);*/

// Update the device.
    device.style("width",deviceWidth + "px")
        .style("height",dHeight + "px")
        .style("left",dLeft + "px")
        .style("top",dTop + "px")
        .style("display",deviceDisplayStyle);

    // Update the slider div bar
    sliderDiv.style("width",sliderDivWidth + "px")
        .style("height",sliderDivHeight + "px")
        .style("left",sliderDivLeft + "px")
        .style("top",sliderDivTop + "px");
  
    
}

// Updates header elements
function updateHeader() {

    // Update the device.
    device.style("width",deviceWidth + "px")
        .style("height",dHeight + "px")
        .style("left",dLeft + "px")
        .style("top",dTop + "px")
        .style("display",deviceDisplayStyle);

    // Update the header
    header.style("width",headerWidth + "px")
        .style("height",headerHeight + "px")
        .style("left",headerLeft + "px")
        .style("top",headerTop + "px");

    // Update the title, date, and scroller labels
    d3.select("#leftScrollLabel").style("font-size", (scrollFontHeight) + "px");
    d3.select("#rightScrollLabel").style("font-size",(scrollFontHeight) + "px");
    d3.select("#date").style("font-size",(subTitleFontHeight) + "px");
    d3.select("#title").style("font-size",(titleFontHeight) + "px");

}



// Update Scroller
function updateScroller() {
    scroll.style("width",scrollWidth + "px")
        .style("left",scrollLeft + "px");

    scroller.width(scrollerWidth)
        .height(scrollerHeight)
        .update();
}



// Update label values
function updateLabels() {
    //  console.log("updateLabels");
    var indexBounds = charts[0].getIndexBounds();
    var leftDate = symbols[0].values[indexBounds[0]].date;
    var rightDate = symbols[0].values[indexBounds[1]].date;
    var titleDate = symbols[0].values[charts[0].index()].date;

    d3.select("#leftScrollLabel").text(labelFormat(leftDate).toUpperCase());
    d3.select("#rightScrollLabel").text(labelFormat(rightDate).toUpperCase());
    d3.select("#date").text(titleDateFormat(titleDate).toUpperCase());
}

// Update all charts
function updateCharts() {



    chartList.style("width",listWidth + "px")
        .style("height",listHeight + "px")
        .style("left",listLeft + "px")
        .style("top",listTop + "px");
    
    chartItems.style("height",chartHeight + "px")
        .style("width",chartWidth + "px")
        .style("top",function(d,i) { return (i * chartHeight) + "px"})
        .style("background-color",function (d,i) { return chartColors[i];});

    chartItems.selectAll(".chart-menu")
        .style("right",(menuWidth*1.1) + "px")
        .style("top",(chartHeight *.05) + "px");

    for (var i=0; i < charts.length; i ++) {
        charts[i]
            .width(chartWidth)
            .margin({top: chartHeight * (1 - chartHeightRatio), left:0, bottom:0, right:0})
            .height(chartHeight)
            .update();

        chartLabels[i]
            .style("font-weight",500)
            .style("border-radius",(chartHeight * 0.02) + "px")
            .style("margin-top",(chartHeight * 0.045) + "px")
            .style("left",(chartWidth * 0.024) + "px")
            .style("font-size",chartHeight * 0.13 + "px")
            .style("color",labelColors[i])
            .style("opacity",1)
            .style("cursor","pointer")
            .html("<span>" + symbols[i].key + ": </span><span style='color:#000000; opacity: 1; font-weight:300'>" + String(dataFields[i]).toUpperCase() + "</span>");

        menus[i].width(menuWidth)
            .height(menuHeight)
            .update();

    }
}

// Fired when user has selected an item from a chart pop menu.
function chartMenu_onClick(d,i) {
    dataFields[i] = d.value;
    chartLabels[i].html("<span>" + symbols[i].key + ": </span><span style='color:#000000; opacity: 1; font-weight:300'>" + d.label.toUpperCase() + "</span>");
    var zoom = charts[i].zoom();
    charts[i].update();
    if (expandedIndex == i) {
        charts[i].selection().selectAll(".vz-left-axis")
            .transition().duration(700)
            .style("opacity",1);
    }
}

// Fired when a user has dragged one of the chart index labels (data tip)
function chartPointer_onDrag() {
    var dragChart = this.component;
    charts.forEach(function (chart) {
        if (chart != dragChart) {
            chart.index(dragChart.index())
        }
    });
    updateLabels();
}

// This routine is used to expand/collapse a chart when a user clicks on the corresponding symbol label
var expandedIndex=null;
function expandChart(i) {

    var index = i;
    if (expandedIndex == null) {   //Nothing currently expanded
        //Move non selected indexes out of way
        for (var i=0; i < charts.length; i++) {
            if (i != index) {
                d3.select(chartItems[0][i]).transition().duration(700)
                    .style("top",function () {
                        //If we are above the chart move to the top, otherwise move below
                        if (i < index)
                            return -chartHeight + "px";
                        else
                            return listHeight + "px";
                    });
            }
        }

        d3.select(chartItems[0][index]).transition().duration(700)
            .style("top","0px")
            .style("height",(chartHeight*symbols.length) + "px");

        charts[index].duration(700).height(chartHeight*symbols.length)
            .update();

        charts[index].selection().selectAll(".vz-left-axis")
            .transition().duration(700)
            .style("opacity",1);

        chartLabels[index].transition()
            .style("left",function () { return (chartWidth - this.getBoundingClientRect().width)/2 + "px" });

        expandedIndex=index;
    }
    else {
        chartItems.transition().duration(700)
            .style("height",chartHeight + "px")
            .style("top",function(d,i) { return (i * chartHeight) + "px"});

        charts[index].duration(700).height(chartHeight)
            .update();

        chartLabels[index].transition()
            .style("left",(chartWidth * 0.025) + "px");

        expandedIndex=null;
    }
}

// This zoom behavior provides a common zoom surface that cooridinates the zoom functionality
// across all charts.
var zoom = d3.behavior.zoom().scaleExtent([1,10]).on("zoom",onZoom);

function onZoom () {
    // See if we have zoomed out of bounds, if so constrain the panning
    var t = zoom.translate(),
        tx = t[0],
        ty = t[1];

    tx = Math.min(tx, 0);
    tx = Math.max(tx, chartWidth - chartWidth * zoom.scale());

    zoom.translate([tx, ty]);

    charts.forEach(function (chart) {
        chart.zoom(chart.zoom().scale(zoom.scale()).translate([zoom.translate()[0], zoom.translate()[1]]));
    });

    updateLabels();
};

