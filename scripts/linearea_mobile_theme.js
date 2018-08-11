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
// Vizuly themes are responsible for creating the look and feel of each component.   They do this by using d3 to select
// a subset of DOM display elements that the viz has created and applying styles and altering properties directly on
// those elements.   Themes can also respond to user interactions to alter the look and feel of various display elements.
//
// At run-time, a theme requires a viz in its constructor, as it is designed to operate on one viz at a time.  The theme
// operates directly on the DOM (usually SVG) elements outputted from the viz.   If a developer changes
// the viz output they will most likely need to alter the theme.   A viz has no dependency on a theme, but a theme has a
// direct dependency on a viz.
//
// Every theme implements one or more skins (see the skin objects at the end of this file.)  Each skin is collection of
// common properties and functions that are applied at run time to the viz output.  This allows the developer to quickly
// create new skins, that can change the look and feel without having to worry about the specifics of the implementation.
// A skin may also have a css class name associated with it, so static styles can be applied via an associated component
// stylesheet.
//
// If the developer wants a significantly different look and feel, or response to user input, they can either create a
// whole new theme (and related skins) or modify the stock one.
//
// All themes implement the same object life-cycle as described below:
//
// instantiation - requires a viz so it can implement look and feel changes
// applyCallBacks - binds callbacks to the viz events so it can apply style and property changes as the viz output changes
// applyTheme - takes properties from the selected skin and applies it to the viz output
// onMyEvent - a set of callbacks that change output depending on the event emitted by the component.
// release - unbind any callbacks, undo any display element changes, and release the viz.
// For a more thorough explanation, read here:
//
// http://vizuly.io/docs-themes-and-skins/
//
// Please note:  Themes are optimized for readability customization, NOT performance. For instance, you may want to create
// a mobile version of a theme that is optimized for performance and doesn't use gradients and filters,
// which can slow down rendering.  Or you may want to create a theme purely in a css style sheet and doesn't repeatedly
// select DOM elements on every event from the viz.
//

vizuly.theme.linearea_mobile = function (viz) {


    // This is the viz we will be styling
    var viz = viz;

    // This is the holder for the active skin
    var skin = null;

    // Some meta information for the skins to use in styling
    var backgroundGradient = vizuly.svg.gradient.blend(viz, "#000", "#000");

    // We put the callbacks in an array so we can keep track of them when we need to release the viz
    var callbacks = [
        {on: "measure.theme",callback: onMeasure},
        {on: "update.theme",callback: applyTheme},
        {on: "index_change.theme",callback: onIndexChange}
    ];

    // Create our function chained theme object
    theme();

    function theme() {
        // Bind our callbacks
        applyCallbacks();
    }


    function applyTheme() {

        // If we don't have a skin we want to exit - as there is nothing we can do.
        if (!skin || skin==null) return;

        // The width and height of the viz
        var w = viz.width();
        var h = viz.height();

        // Grab the d3 selection from the viz so we can operate on it.
        var selection = viz.selection();

        // Set our skin class
        selection.attr("class",skin.class);

        selection.selectAll(".vz-background").attr("fill",function () { return skin.background_color; });

        // Hide the plot background
        selection.selectAll(".vz-plot-background").style("opacity", 0);

        selection.selectAll(".vz-index-line")
            .style("stroke-width",(w * 0.004)+"px")
            .style("stroke-dasharray",[w *.01,w *.007])
            .style("stroke","#FFF")
            .style("stroke-opacity",.5);

        // Style the area paths
        selection.selectAll(".vz-area")
            .style("fill", function (d, i) { return skin.area_fill(d, i); })
            .style("opacity",1)
            .style("fill-opacity",1)

        // Hide all data points
        selection.selectAll(".vz-data-point").style("opacity", 0);

        // Update the bottom axis (dynamically adjust font size)
        selection.selectAll(".vz-bottom-axis")
            .style("display","none");

        // Update the left axis
        selection.selectAll(".vz-left-axis")
            .style("opacity",0);

        selection.selectAll(".vz-left-axis g.tick:first-child")
            .style("display","none");

        selection.selectAll(".vz-left-axis text")
            .attr("x",w *.01)
            .attr("y",-Math.round(w *.035)/2)
            .style("font-size",Math.round(w *.035) + "px")
            .style("text-anchor","start");

        selection.selectAll(".vz-pointer-label text")
            .style("font-size",Math.round(w *.035) + "px")
            .style("text-anchor","middle");

        selection.selectAll(".tip-point-outer")
            .attr("r",viz.width() * .02)
            .style("fill",function (d,i) { return skin.gradient_color; });

        selection.selectAll(".tip-point-center")
            .attr("r",viz.width() * .008)

        onIndexChange();

    }

    // Each time the chart index changes we want to update the position of the data tip label
    function onIndexChange() {

        var labels = viz.selection().selectAll(".vz-pointer-label");

        labels.each(function (d) {

            var label = d3.select(this).selectAll("text");
            var rect  = d3.select(this).selectAll("rect");
            var bounds = label[0][0].getBoundingClientRect();

            var yOffset = 0;
            var xOffset = 0;

            // See if we are close to the top of the viewport, if so translate down
            var t = d3.transform(d3.select(this).attr("transform")).translate;

            // See if we are too far left or too far right and adjust;
            if (t[1] < bounds.height * 2.5) {
                yOffset = bounds.height * 3.1;
            }

            if (t[0] < (bounds.width/2 * 1.2)) {
                xOffset = bounds.width/2 * 1.2;
            }
            else if (t[0] > viz.width()-(bounds.width/2 * 1.2)) {
                xOffset = - bounds.width/2 * 1.2;
            }

            label.attr("y",(-bounds.height * 1.2) + yOffset)
                .attr("x",xOffset);

            rect.attr("width",bounds.width * 1.4)
                .attr("height",bounds.height * 1.7)
                .attr("x",-(bounds.width*1.4)/2 + xOffset)
                .attr("y",-(bounds.height * 2.325) + yOffset)
                .attr("rx", bounds.height *.25)
                .attr("ry", bounds.height *.25)

        })

    }

    // Update all axis for correct width/height on each measure event
    function onMeasure() {
        var size = vizuly.util.size(viz.margin(), viz.width(), viz.height());
        viz.yAxis().tickSize(-size.width).ticks(5).orient("left");
        viz.xAxis().tickSize(-size.width);
    }

    // Our primary external function that fires the "apply" function.
    theme.apply = function (skin) {
        if (arguments.length > 0)
            theme.skin(skin);
        applyTheme();
        return theme;
    }

    // Binds all of our theme callbacks to the viz.
    function applyCallbacks() {
        callbacks.forEach(function (d) {
            viz.on(d.on, d.callback);
        });
    }

    // Removes viz from skin
    theme.release = function () {
        if (!viz) return;
        viz.selection().attr("class",null);
        callbacks.forEach(function (d) {
            viz.on(d.on, null);
        })
        viz=null;
    };

    // Returns the selected viz or sets one and applies the callbacks
    theme.viz = function (_) {
        if (!arguments.length) {
            return viz;
        }
        viz = _;
        applyCallbacks();
    }

    // Sets the skin for the theme
    theme.skin = function (_) {
        if (arguments.length == 0) {
            return skin;
        }
        if (skins[_])
            skin = skins[_];
        else
            throw new Error("theme/linearea.js - skin " + _ + " does not exist.");

        return theme;
    }

    // Returns all of the skins
    theme.skins = function () {
        return skins;
    }

    var colors=["#F48FB1","#FFAF49","#7986CB","#2DA4A9","#E57373"];
    var gradients=["#C01B3E","#FF653A","#2D4FAC","#3F5874","#C62828"];

    var skins = {
        MaterialPink : {
            name: "Material Pink",
            label_color: "#FFF",
            background_color: colors[0],
            gradient_color: gradients[0],
            color: "#02C3FF",
            area_fill: function (d, i) {
                return "url(#" + vizuly.svg.gradient.fade(viz, this.gradient_color, "vertical", [.5,1]).attr("id") + ")";
            },
            class: "vz-skin-default"
        },
        MaterialOrange : {
            name: "Material Orange",
            label_color: "#FFF",
            background_color: colors[1],
            gradient_color: gradients[1],
            color: "#02C3FF",
            area_fill: function (d, i) {
                return "url(#" + vizuly.svg.gradient.fade(viz, this.gradient_color, "vertical", [.5,1]).attr("id") + ")";
            },
            class: "vz-skin-default"
        },
        MaterialBlue : {
            name: "Material Blue",
            label_color: "#FFF",
            background_color: colors[2],
            gradient_color: gradients[2],
            color: "#02C3FF",
            area_fill: function (d, i) {
                return "url(#" + vizuly.svg.gradient.fade(viz, this.gradient_color, "vertical", [.5,1]).attr("id") + ")";
            },
            class: "vz-skin-default"
        },
        MaterialGreen : {
            name: "Material Green",
            label_color: "#FFF",
            background_color: colors[3],
            gradient_color: gradients[3],
            color: "#02C3FF",
            area_fill: function (d, i) {
                return "url(#" + vizuly.svg.gradient.fade(viz, this.gradient_color, "vertical", [.5,1]).attr("id") + ")";
            },
            class: "vz-skin-default"
        }
    }

    return theme;



}
