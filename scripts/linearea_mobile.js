/*
 Copyright (c) 2016, BrightPoint Consulting, Inc.

 This source code is covered under the following license: http://vizuly.io/commercial-license/

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
 THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
 OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// @version 1.0.46



// This is our base chart used in the mobile app
// It is a modified version of the vizuly.viz.linearea chart
vizuly.viz.linearea_mobile = function (parent) {

    // This is the object that provides pseudo "protected" properties that the vizuly.viz function helps create
    var scope={};

    var properties = {
        "data" : null,                          // Expects array of data - assumes identical length and xScale values;
        "layout" :                              // Sets a STACKED or OVERLAPlayout
            vizuly.viz.layout.OVERLAP,
        "margin" : {                            // Our margin object
            "top": "10%",                       // Top margin
            "bottom" : "7%",                    // Bottom margin
            "left" : "9%",                      // Left margin
            "right" : "7%"                      // Right margin
        },
        "duration" : 500,                       // This the time in ms used for any component generated transitions
        "width" : 300,                          // Overall width of component
        "height" : 300,                         // Height of component
        "x":null,                               // Function that returns xScale data value
        "y":null,                               // Function that returns yScale data value
        "xScale" : "undefined",                 // xScale needs to be explicitly defined or we will define it later automatically
        "yScale" : d3.scale.linear,              // Default yScale (can be overridden after 'validate' event via callback)
        "xAxis" : d3.svg.axis(),                // Default xAxis (can be overridden after 'validate' event via callback)
        "yAxis" : d3.svg.axis(),                // Default yAxis (can be overridden after 'validate' event via callback)
        "dataLabel" :                           // Default function to display pointer label
            function (d) { return scope.y(d)},
        "dataField" :                           // Heather's experimental function
            function (d) { return d},
        "index" : 0,                            // The selected series point index
        "interpolate" : "linear"                // interpolate determines how sharp or curved each line vertex is
    };


    //Create our viz and type it
    var viz=vizuly.component.create(parent,scope,properties,["pointerdrag"]);

    //Used to know bounding indexes when zoomed and scrolled.
    var minViewIndex, maxViewIndex;

    viz.type="viz.viz.linearea_mobile";

    var size;       // Holds the 'size' variable as defined in viz.util.size()
    var tipRadius;  // each series data point has an invisible over it circle that captures mouse events - this is that radius
    var stack;      // used for the stacked layout options

    var dataIsDirty=true; // Flag used when data has changed.

    // Our d3.svg path generators
    var line = d3.svg.line(), area = d3.svg.area();

    // These are all d3.selection objects we use to insert and update svg elements into
    var svg,g,bottomAxis,leftAxis, plot, background, plotBackground, series, defs, pointHitArea, indexLine, pointerLayer;

    initialize();

    // Here we set up all of our svg layout elements using a 'vz-XX' class namespace.  This routine is only called once
    // These are all place holder groups for the invidual data driven display elements.   We use these to do general
    // sizing and margin layout.  The all are referenced as D3 selections.
    function initialize() {

        svg = scope.selection.append("svg").attr("id", scope.id).style("overflow","visible").attr("class","vizuly");
        background = svg.append("rect").attr("class","vz-background");
        defs = vizuly.util.getDefs(viz);
        plotClipPath = defs.append("clipPath").attr("id", scope.id + "_plotClipPath").append("rect");
        xClipPath = defs.append("clipPath").attr("id", scope.id + "_xClipPath").append("rect");
        g = svg.append("g").attr("class","vz-linearea-viz");
        bottomAxis = g.append("g").attr("class","vz-bottom-axis").attr("clip-path","url(#" + scope.id + "_xClipPath)").append("g");
        plot = g.append("g").attr("class","vz-plot").attr("clip-path","url(#" + scope.id + "_plotClipPath)");
        leftAxis = g.append("g").attr("class","vz-left-axis");
        plotBackground = plot.append("rect").attr("class","vz-plot-background");
        series = plot.append("g").attr("class","vz-series");
        pointHitArea = g.append("g").attr("class","vz-point-areas");
        indexLine = g.append("line").attr("class","vz-index-line");
        pointerLayer = g.append("g").attr("class","vz-pointer");

        viz.on("index_change.internal",updateIndexLine);
        viz.on("data_change.internal",function () { dataIsDirty = true;});

        scope.dispatch.initialize();
    }

    // The measure function performs any measurement or layout calcuations prior to making any updates to the SVG elements
    function measure() {

        // Call our validate routine and make sure all component properties have been set
        viz.validate();

        if (!minViewIndex) {
            minViewIndex = 0;
            maxViewIndex = scope.data[0].length;
        }

        // Get our size based on height, width, and margin
        size = vizuly.util.size(scope.margin, scope.width, scope.height);

        // If we don't have a defined x-scale then determine one
        if (scope.xScale == "undefined") {
            scope.xScale=vizuly.util.getTypedScale(viz.x()(scope.data[0][0]));
        }

        // The offset is used for the stack layout
        var offset = (scope.layout == vizuly.viz.layout.STACKED) ? "reverse" : (scope.layout == vizuly.viz.layout.STREAM) ? "wiggle" : "none";

        // The d3 stack handles all of the d.x and d.y measurements for various stack layouts - we will let it do its magic here
        stack = d3.layout.stack()
            .values(function(d) {
                return d; })
            .x(function(d) { return scope.x(d); })
            .y(function(d) { return scope.y(d); })
            .out(function(d, y0, y) {d.y0 = (offset == "none" ) ? 0 : y0; d.y=y; })
            .order("reverse")
            .offset(offset);

        // Apply the stack magic to our data - note this is a destructive operation and assumes certain properties can be mutated (x, x0, y, y0)
        stack(scope.data);

        // Set our yScale domain values
       scope.yScale.domain([
                0,
                
              d3.max(scope.data, function (data) {
                    return d3.max(data, function (d) {
                        return Number(scope.y(d) + d.y0); })})
                        
                        
           
                      
        ]
        );

        if (dataIsDirty==true) {
            //See if scale is ordinal, else assume min and max is good enough
            if (typeof viz.x()(scope.data[0][0]) == "string") {
                scope.xScale.domain(scope.data[0].map(function (d) { return scope.x(d); }));
            }
            else {
                scope.xScale.domain([d3.min(scope.data[0], function (d) { return scope.x(d); }), d3.max(scope.data[0], function (d) { return scope.x(d); })]);
            }
            dataIsDirty=false;
        }

        // Set our scale ranges
        vizuly.util.setRange(scope.yScale,size.height,0);
       
        vizuly.util.setRange(scope.xScale,0,size.width);

        // Set our accessors so the d3 area can generate our area path data
        area.interpolate(scope.interpolate)
            .x(function(d) { return scope.xScale(scope.x(d)); })
            .y0(function(d,i) { return scope.yScale(d.y0); }) 
            .y1(function(d,i) { return scope.yScale(scope.y(d) +  d.y0); });

        // Set our accessors so the d3 line can generate our line path data
        line.interpolate(scope.interpolate)
            .x(function(d) { return scope.xScale(scope.x(d)); })
            .y(function(d,i) { return scope.yScale(scope.y(d) + d.y0); });

        // Set our axis for each scale - although this is something that could be handled in a theme.
        scope.xAxis.scale(scope.xScale).orient("bottom");
        scope.yAxis.scale(scope.yScale).orient("left");

        // Take an educated guess about how big to make our hit area radius based on height/width of viz.
        // This is what will pick up any mouse or touch events from the user for a given data point.
        tipRadius = Math.min(size.width/50,size.height/50);

        // Initialize our zoom operations (this is optional)
        initializeZoom();

        scope.dispatch.measure();
        //Can override all settings here;

    }

    // The update function is the primary function that is called when we want to render the visualiation based on
    // all of its set properties.  A developer can change propertys of the components and it will not show on the screen
    // until the update function is called
    function update() {

        // Call measure each time before we update to make sure all our our layout properties are set correctly
        measure();

        // Layout all of our primary SVG d3 elements.
        svg.attr("width", scope.width).attr("height", scope.height);
        background.transition().duration(scope.duration).attr("width", scope.width).attr("height", scope.height);
        plotClipPath.transition().duration(scope.duration).attr("width",size.width).attr("height",size.height);
        xClipPath.attr("width",size.width).attr("height", (scope.height-size.height)).attr("transform","translate(" + size.left + "," + size.height + ")");
        plot.attr("width",size.width).attr("height",size.height).attr("transform","translate(" + size.left + "," + size.top +  ")");
        pointHitArea.style("width",size.width).style("height",size.height).attr("transform","translate(" + size.left + "," + size.top +  ")");
        bottomAxis.attr("transform","translate(" + size.left  + "," + (size.height + size.top + 3) + ")");
        leftAxis.attr("transform","translate(" + size.left + "," + size.top + ")");
        plotBackground.attr("width",size.width).attr("height",size.height);
        indexLine.attr("y1",0).attr("y2",scope.height);

        // Select, create, and destroy our series plots as needed
        // Each series is a group which contains its own set of plots
        var seriesPlots = series.selectAll(".vz-series-plots").data(scope.data);
        seriesPlots.enter().append("g").attr("class", "vz-series-plots");
        seriesPlots.exit().remove();

        // For each series create our line paths and our area paths
        seriesPlots.each(function (d,j) {
            var series = d3.select(this);

            // Line paths
            var linePath = series.selectAll(".vz-line").data([d]);
            linePath.enter().append("path").attr("class", "vz-line");
            linePath.exit().remove();
            linePath.transition().duration(scope.duration).attr("d", function (d,j) {
                return line(d);
            });

            // Area paths
            var areaPath = series.selectAll(".vz-area").data([d]);
            areaPath.enter().append("path").attr("class", "vz-area");
            areaPath.exit().remove();
            areaPath.transition().duration(scope.duration).attr("d", function (d,j) {
                return area(d);
            });

            var pointerLabel = pointerLayer.selectAll(".vz-pointer-label").data([d]);
            var pointerEnter = pointerLabel.enter().append("g")
                .attr("class","vz-pointer-label")
                .on("touchstart",function () { d3.event.stopPropagation() })
                .on("mousedown",function () { d3.event.stopPropagation() });

            pointerEnter.append("rect").style("pointer-events","auto").style("cursor","pointer");
            pointerEnter.append("text").style("pointer-events","none").style("cursor","pointer");
            pointerEnter.append("circle").attr("class","tip-point-outer");
            pointerEnter.append("circle").attr("class","tip-point-center");

            pointerLabel.exit().remove();

        });

        // Each time we are going to remove all point-tip areas (versus trying to use the select.enter/remove method
        pointHitArea.selectAll(".vz-tip").remove();

        // For EVERY data point across all series we are going to create a svg.g group and put a circle in it
        // The circle in it will have a very small (.001) opacity and be used to capture mouse events for
        // each data point
        // If you need to optimize this chart for performance you should consider removing these elements, it will
        // greatly speed up the rendering time and responsiveness of the chart

        scope.data.forEach(function (series,j) {


            // Here are our svg.g elements
            var points = pointHitArea.selectAll("vz-tip").data(series).enter()
                .append("g").attr("class", "vz-tip");

        });

        positionTips();

        d3.selectAll(".vz-tip").attr("transform", function (d,i) { return "translate(" + d._tx + "," + d._ty  + ")" });

        updateIndexLine();

        // Update our axis
        bottomAxis.call(scope.xAxis);
        leftAxis.call(scope.yAxis);

        pointHitArea.style("display","none");

        // Initialize our drag operation - we wait until here to make sure we have drag labels
        initializeDrag();

        // Let everyone know we are done with our update.
        scope.dispatch.update();

    }

    // We use this routine to position the data tips AND calculate the min/max index bounds that is used
    // to position the index line.
    function positionTips() {

        var points = pointHitArea.selectAll(".vz-tip");

        minViewIndex=null;
        maxViewIndex=null;
        var cx = -Infinity;
        points.each(function (d,i) {
            var tx = scope.xScale(scope.x(d));

            //Determine what index are in viewpoints
            if (minViewIndex == null || maxViewIndex == null) {
                if (cx < 0 && tx >= 0) {
                    minViewIndex = i;
                }
                else if (cx < size.width && tx >= size.width) {
                    maxViewIndex = i;
                }
                cx = tx
            }
            d._tx=tx;
            d._ty = scope.yScale(scope.y(d) + d.y0);
        })

    }

    // This function renders the line index and related data labels.
    function updateIndexLine() {
        var indexLineX=scope.xScale(scope.x(scope.data[0][scope.index]));
        var labelY = size.top + scope.yScale(scope.y(scope.data[0][scope.index]));
        indexLine.attr("x1",indexLineX).attr("x2",indexLineX);
        pointerLayer.selectAll(".vz-pointer-label")
            .attr("transform","translate(" + indexLineX + "," + labelY + ")");

        pointerLayer.selectAll(".vz-pointer-label text")
            .text(scope.dataLabel(scope.data[0][scope.index]));
    }

    // This is our public update call that all viz components implement
    viz.update = function () {
        update();
        return viz;
    };


    // These are our zoom functions that can be removed if you want by not calling the 'initializeZoom' function
    scope.zoom=null;
    viz.zoom = function (_) {
        if (!arguments.length) {
            return scope.zoom;
        }
        scope.zoom=_;
        onZoom();
    }

    // This drag behavior is used to manage the index line drag.
    scope.drag = null;
    viz.drag = function (_) {
        if (!arguments.length) {
            return scope.drag
        }
        scope.drag=_;
        onDrag();
    }

    // Returns the minimum and maximum viewable indexes based on the zoom and length of series data.
    viz.getIndexBounds = function () {
        return [minViewIndex,maxViewIndex];
    }


    function initializeDrag() {
        if (!scope.drag) {
            scope.drag = d3.behavior.drag()
                .on("drag",onDrag);
            pointerLayer.selectAll(".vz-pointer-label").call(scope.drag);
        }
    }

    // When the index line is dragged we need to cacluate the new index.
    // If a zoom operation is going on we will use the relative zoom index (keeps the index line in
    // the same relative viewport space)
    function onDrag(isZoom) {

        if (isZoom != true) isZoom=false;

        var x = (d3.event) ? d3.event.x : size.width/2;

        x = Math.min(Math.max(0,x),size.width);

        var p = x/size.width;

        if (isZoom) p = zoomIndex;

        // Get current index bounds of chart (min/max)
        var indexBounds = [minViewIndex,maxViewIndex];

        // Calculate a new index for chart based on percentage of range input and index bounds.
        var i = indexBounds[0] + Math.round((indexBounds[1]-indexBounds[0])*p);

        viz.index(i);

        if (isZoom == false) scope.dispatch.pointerdrag();
    }

    // We need a clip path so when zoomed the relevant SVG elements don't overflow
    var plotClipPath, xClipPath;
    function initializeZoom() {

        // Create our zoom if we don't have one and set our callback to the zoom event
        if (!scope.zoom) {

            scope.zoom = d3.behavior.zoom()
                .x(scope.xScale)
                .scaleExtent([1, 10])
                .on("zoomstart", onZoomStart)
                .on("zoomend",onZoomEnd)
                .on("zoom", onZoom);

            // For this implementation we are using an external zoom surface so we don't make this call.
            // plot.call(scope.zoom);

        }
        else {
            return;
        }

        // initialize our zoom settings and set clip paths
        scope.zoom.scale(1).translate([0,0]);
        xClipPath.attr("width",size.width).attr("height", (scope.height-size.height))
            .attr("transform","translate(" + size.left + "," + size.height + ")");
    }


    /* Needed to support touch events */
    var hit_circle = null;

    var zoomIndex;

    // This is where all the zoom magic happens.   There are several ways you can implement d3.behavior.zoom (https://github.com/mbostock/d3/wiki/Zoom-Behavior)
    // d3 does a lot of 'magic' behind the scenes with the scales and the axis, so you need to be careful
    function onZoom() {

        // Keep track of our current index so index line stays in viewport.
        zoomIndex = (scope.index - minViewIndex) / (maxViewIndex - minViewIndex);

      //We don't want touch events on the hit circles to trigger a zoom event so we escape them here;
        if (hit_circle) {
            //This means a touch event triggered this.
            return;
        }

        // See if we have zoomed out of bounds, if so constrain the panning
       var t = scope.zoom.translate(),
            tx = t[0],
            ty = t[1];

        tx = Math.min(tx, 0);
        tx = Math.max(tx, size. width - size.width * scope.zoom.scale());

        scope.zoom.translate([tx, ty]);

        // Update our paths based on the zoom scale and translate
        plot.selectAll(".vz-series-plots").each(function (d,i) {
            var series = d3.select(this);
            series.selectAll(".vz-line").attr("d", function () { return line(d);});
            series.selectAll(".vz-area").attr("d", function () { return area(d); });
        });

        // Layout our new data tips
        positionTips();

        // Update drag related items
        onDrag(true);

        // Reindex bottom axis
        bottomAxis.call(scope.xAxis);

        scope.dispatch.zoom.apply(this,[viz,scope.zoom]);

    }


    // We need to capture the zoom start event so we can handle interactions with the
    // hit_circle so they don't interfere with the zoom operation.
    // We do this by hiding the hit-circles from the DOM display when the zoom starts and adding them back at the zoom end
    // This prevents the user from accidentally interacting with them
    function onZoomStart() {
        var t = d3.event.sourceEvent.target;

        //Get our hit circle if we have one and set the flag
        if (d3.select(t).attr("class") == "vz-hit-circle") {
            hit_circle = t;
        } else {
            hit_circle=null;
            // Hide our hit circle
            pointHitArea.style("display","none");
        }

        // Adjust our clip paths
        plotClipPath.attr("width",size.width);
        xClipPath.attr("width",size.width).attr("height", (scope.height-size.height))
            .attr("transform","translate(" + size.left + "," + size.height + ")");

        //Emit our zoom start event;
        scope.dispatch.zoomstart();
    }

    // At zoom end we add the hit-circles back to the DOM display
    function onZoomEnd() {

        //Update our tips and add hit-circle back to the display
        positionTips();

        d3.selectAll(".vz-tip").attr("transform", function (d,i) { return "translate(" + d._tx + "," + d._ty  + ")" });

       // pointHitArea.style("display","block");

        //Clear the flag
        hit_circle = null;

        //Emit our zoomend event.
        scope.dispatch.zoomend();
    }

    // Returns our glorious viz component :)
    return viz;

};