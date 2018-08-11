/*
 Copyright (c) 2016, BrightPoint Consulting, Inc.

 This source code is covered under the following license: http://vizuly.io/commercial-license/

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
 THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
 OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */


// @version 1.0.46

//
// This is the base component for a vizuly scroller
//
// The scroller is for display purposes only and does not respond to user interaction
//
vizuly.ui.scroller = function (parent) {

    // This is the object that provides pseudo "protected" properties that the vizuly.viz function helps create
    var scope={};

    var properties = {
        "margin" : {                            // Our margin object
            "top": "0",                       // Top margin
            "bottom" : "0",                    // Bottom margin
            "left" : "0",                      // Left margin
            "right" : "0"                      // Right margin
        },
        "width" : 300,                      // Overall width of component
        "height" : 300,                     // Height of component
        "zoom" : null,                        // A vizuly component that emits a zoom event.
        "color" : "#FFF"
    };

    //Create our viz and type it
    var viz=vizuly.component.create(parent,scope,properties);
    viz.type="ui.scroller";

    //These are all d3.selection objects we use to insert and update svg elements into
    var size, svg, g, scroll, defs, thumbWidth, thumbX;
    var zoom;

    initialize();


    // Here we set up all of our svg layout elements using a 'vz-XX' class namespace.  This routine is only called once
    // These are all place holder groups for the invidual data driven display elements.
    // They all are referenced as D3 selections.
    function initialize() {

        svg = scope.selection.append("svg").attr("id", scope.id).style("position","absolute").attr("class","vizuly");
        defs = vizuly.util.getDefs(viz);
        g = svg.append("g").attr("class","vz-scroller-ui");
        scroll = g.append("rect").attr("class","vz-scroller");

        viz.on("zoom_change",attachZoomHandler);

        // Tell everyone we are done initializing
        scope.dispatch.initialize();
    }

    function attachZoomHandler() {
        //Make sure we have a viz object and attach to its zoom event.
        scope.zoom.on("zoom.scroller",onZoom);
    }

    // The measure function performs any measurement or layout calcuations prior to making any updates to the SVG elements
    function measure() {

        // Call our validate routine and make sure all component properties have been set
        viz.validate();

        // Get our size based on height, width, and margin
        size = vizuly.util.size(scope.margin, scope.width, scope.height);

        var zs = scope.zoom.size();

        var maxItCanBeTranslated = zs[0] * scope.zoom.scale() - zs[0];
        var percentItIsTranslated = -scope.zoom.translate()[0]/maxItCanBeTranslated;

        if (isNaN(percentItIsTranslated)) percentItIsTranslated = 0;

        thumbWidth = size.width * 1/scope.zoom.scale();

        var maxItCanBeScrolled = size.width - thumbWidth;

        thumbX = maxItCanBeScrolled * percentItIsTranslated;

        // Tell everyone we are done making our measurements
        scope.dispatch.measure();

    }

    // The update function is the primary function that is called when we want to render the visualiation based on
    // all of its set properties.  A developer can change properties of the components and it will not show on the screen
    // until the update function is called
    function update() {

        // Call measure each time before we update to make sure all our our layout properties are set correctly
        measure();

        // Layout all of our primary SVG d3 elements.
        svg.attr("width", scope.width).attr("height", scope.height);
        g.style("transform","translate(" + size.left + "," + size.top + ")");

        scroll.attr("height",size.height)
            .attr("width",thumbWidth)
            .attr("rx",size.height/2)
            .attr("ry",size.height/2)
            .attr("transform","translate(" + thumbX + ",0)")
            .style("fill",scope.color);


        // Let everyone know we are doing doing our update
        // Typically themes will attach a callback to this event so they can apply styles to the elements
        scope.dispatch.update();
    }

    function onZoom() {
        update();
    }


    // This is our public update call that all viz components implement
    viz.update = function () {
        update();
        return viz;
    };


    // Returns our glorious viz component :)
    return viz;

};