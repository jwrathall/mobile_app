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
// This is the base component for a vizuly pop menu
//
// The pop menu does not use any external themes and handles all styles/css internally.
//
vizuly.ui.pop_menu = function (parent) {

    // This is the object that provides pseudo "protected" properties that the vizuly.viz function helps create
    var scope={};

    var properties = {
        "data" : null,                          // Name/Value pair list for menu items in format {label:xxx, value: xxx}
        "width" : 300,                          // Overall width of component
        "height" : 300,                         // Height of component
        "index" : 0,                            // Selected Item Index
        "color" : "#FFF",                       // Main Color
        "selectedColor" : "#DDD",               // Selected Color
        "class" : "vizuly-pop_menu"          // Css Class
    };

    //Create our viz and type it
    var viz=vizuly.component.create(parent,scope,properties);
    viz.type="ui.pop_menu";

    //These are all d3.selection objects we use to insert and update svg elements into
    var size, main, menu, items, button;
    var itemHeight, itemWidth, borderRadius, fontSize, buttonRadius;

        initialize();

    function initialize() {

        main = scope.selection.append("div").attr("id", scope.id)
            .style("position","absolute")

        menu = main.append("div")
            .style("position","absolute")
            .style("height","0px")
            .style("overflow","hidden")
            .attr("class",scope.class);

        button = main.append("div")
            .attr("class","vz-pop_menu-button-div")
            .on("touchend",onButtonClick)
            .on("click", onButtonClick)
            .append("div").attr("class","vz-pop_menu-button")
            .style("position","absolute")
            .style("top",0)


        viz.on("index_change.internal",onIndexChange);

        // Tell everyone we are done initializing
        scope.dispatch.initialize();
    }

    // The measure function performs any measurement or layout calculations prior to making any updates to the SVG elements
    function measure() {

        // Call our validate routine and make sure all component properties have been set
        viz.validate();

        // Get our size based on height, width, and margin
        size = vizuly.util.size({top:0,left:0,bottom:0,right:0}, scope.width, scope.height);


        borderRadius = Math.min(size.width,size.height)*.05;
        itemHeight = (size.height-borderRadius)/scope.data.length;
        itemWidth = size.width;
        fontSize = itemHeight * 0.55;

        buttonRadius = itemHeight/11;

        // Tell everyone we are done making our measurements
        scope.dispatch.measure();

    }

    // The update function is the primary function that is called when we want to render the visualization based on
    // all of its set properties.  A developer can change properties of the components and it will not show on the screen
    // until the update function is called
    function update() {

        // Call measure each time before we update to make sure all our our layout properties are set correctly
        measure();

        scope.selection.selectAll(".vz-pop_menu-button-div")
            .style("width",size.width + "px")
            .style("height",itemHeight + "px");

        button.style("width",Math.round(buttonRadius*2) + "px").style("height",(Math.round(buttonRadius * 2) * 4)+"px")
            .style("right","0px");

        menu.style("-moz-box-shadow",borderRadius + "px " + borderRadius + "px " + borderRadius + "px " + "rgba(0,0,0.3")
            .style("-webkit-box-shadow",borderRadius + "px " + borderRadius + "px " + borderRadius + "px " + "rgba(0,0,0.3")
            .style("-mbox-shadow",borderRadius + "px " + borderRadius + "px " + borderRadius + "px " + "rgba(0,0,0.3")
            .style("border-radius", borderRadius + "px")
            .style("width",size.width + "px")
            .style("margin-top",borderRadius + "px")
            .style("border","0px solid rgba(0,0,0,.5)")
            .style("background",scope.color);

        items = menu.selectAll(".vz-pop_menu-item").data(scope.data);

        var item = items.enter()
            .append("div")
            .attr("class","vz-pop_menu-item")
            .style("display","none")
            .on("touchstart", function (d,i) { onClick(d,i)})
            .on("click", function (d,i) { onClick(d,i)});

        item.append("div")
            .attr("class","vz-pop_menu-item-ripple")
            .style("position","absolute")
            .style("left","0px");

        item.append("div")
            .attr("class","vz-pop_menu_item-label")
            .style("position","absolute")
            .style("left","0px");

        items.exit().remove();

        items.style("width", itemWidth + "px")
            .style("margin-left",borderRadius + "px")
             .style("height", itemHeight + "px");

        items.selectAll(".vz-pop_menu-item-ripple")
            .style("width", itemWidth + "px")
            .style("height", itemHeight + "px")
            .style("top",function(i,d,j) { return j * itemHeight + "px"})
            .style("transform","scaleX(1)")
            .style("-webkit-transform","scaleX(1)")
            .transition().duration(300)
            .style("opacity",1)
            .style("background-color",function (d,i,j){ return (j==scope.index) ? scope.selectedColor : scope.color});

        items.selectAll(".vz-pop_menu_item-label")
            .style("width", itemWidth + "px")
            .style("height", itemHeight + "px")
            .style("top",function(i,d,j) {
                return j * itemHeight + "px"})
            .style("font-size",fontSize + "px")
            .style("line-height", itemHeight + "px")
            .html(function (d, i) {
                return "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + d.label
            });


        // Let everyone know we are doing doing our update
        // Typically themes will attach a callback to this event so they can apply styles to the elements
        scope.dispatch.update();
    }

    function onClick(d,i) {
        viz.index(i);
        scope.dispatch.click.apply(this,[d,i]);
    }

    function onButtonClick() {
       showMenu();
    }

    function onIndexChange() {
        ripple(scope.index);
    }

    function ripple(i) {

        if (i==-1) return;

        items.selectAll(".vz-pop_menu-item-ripple")
            .style("background-color",scope.color);

        var item = d3.select(items[0][i]).selectAll(".vz-pop_menu-item-ripple");

        item.style("transform","scaleX(0)")
            .style("-webkit-transform","scaleX(0)")
            .style("opacity",0)
            .style("background-color",scope.selectedColor)
            .transition()
            .ease("in-out")
            .style("opacity",1)
            .style("transform","scaleX(1)")
            .style("-webkit-transform","scaleX(1)")
            .transition()
            .style("opacity",.5)
            .each("end",function () { console.log("ripple end")});
    }


    function hideMenu() {
        if (typeof event === "undefined") {
            //do nothing
        }
        else if (String(event) != "undefined" && event.target && event.target.className == ".vz-pop_menu-item-label") {
            return
        }

        window.removeEventListener("mousedown",hideMenu);
        window.removeEventListener("drag",hideMenu);
        window.removeEventListener("wheel",hideMenu);
        window.removeEventListener("touchstart",hideMenu);

        menu.transition().delay(500)
            .style("height","0px").each("end",function () {
                items.style("display","none")
                menu.style("border","0px"); button.style("opacity",1); });
    }

    function showMenu() {

        window.addEventListener("mousedown",hideMenu);
        window.addEventListener("drag",hideMenu);
        window.addEventListener("wheel",hideMenu);
        window.addEventListener("touchstart",hideMenu);

        items.style("display","block")
        button.style("opacity",0);
        menu.transition().style("border","1px");
        menu.transition().style("height",size.height + "px");

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