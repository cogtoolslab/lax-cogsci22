// the drawing app is concerned with rendering and getting input from the user
// the render is done by executing the action sequence using repl, rendering in konva
// the input is done by registering click events on the grid using konva
let canvas = null
let layer = null;
let selector_layer = null;
const transformer = new Konva.Transformer({
    rotateEnabled: true,
    resizeEnabled: true,
    rotateAnchorOffset: 60,
    enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right']
});


// point is made of i and j coordinates
class Point {
    constructor(i, j) {
        this.name = 'pt';
        this.i = i;
        this.j = j;
    }

    // render a point as a small square on the grid
    render(i, j) {
        var square_w = 12;
        var point = new Konva.Rect({
            x: i * canvas.GRID_WIDTH + canvas.GRID_WIDTH / 2 - square_w / 2,
            y: j * canvas.GRID_WIDTH + canvas.GRID_WIDTH / 2 - square_w / 2,
            width: square_w,
            height: square_w,
            stroke: '#333',
            strokeWidth: 2,
            draggable: true,
        });
        point.i = i;
        point.j = j;

        // bind the drag event to the point
        // on drag movement, update the action sequence
        point.on("dragend", (e) => {
            var orig_i = point.i;
            var orig_j = point.j;
            var dest_i = Math.round((point.x() + square_w / 2 - canvas.GRID_WIDTH / 2) / canvas.GRID_WIDTH);
            var dest_j = Math.round((point.y() + square_w / 2 - canvas.GRID_WIDTH / 2) / canvas.GRID_WIDTH);

            // if the drag destination is out of bound of canvas, delete the point
            if (dest_i < 0 || dest_i >= canvas.NUM_GRID || dest_j < 0 || dest_j >= canvas.NUM_GRID) {
                // issue remove command
                canvas.ACTIONS.push(['del_pt', orig_i, orig_j]);
            } else {
                // issue move command
                canvas.ACTIONS.push(['mv_pt', orig_i, orig_j, dest_i, dest_j]);
            }
            // rerender the action sequence
            canvas.render();
        });

        // bind the click event to the point, switching based on the mode
        return point;
    }
}

// line is made of two points
class Line {
    constructor(pt1, pt2) {
        this.name = "line";
        this.pt1 = pt1;
        this.pt2 = pt2;
    }

    render(i1, j1, i2, j2) {
        var line = new Konva.Line({
            points: [i1 * canvas.GRID_WIDTH + canvas.GRID_WIDTH / 2, j1 * canvas.GRID_WIDTH + canvas.GRID_WIDTH / 2, i2 * canvas.GRID_WIDTH + canvas.GRID_WIDTH / 2, j2 * canvas.GRID_WIDTH + canvas.GRID_WIDTH / 2],
            stroke: '#333',
            strokeWidth: 4,
            lineCap: 'round',
            lineJoin: 'round',
            draggable: true,
        });

        return line;
    }
}

// line is made of two points
class Hexagon {
    constructor(center, top_right) {
        this.name = "hexagon";
        this.pt1 = center;
        this.pt2 = top_right;
    }

    render(i1, j1, i2, j2) {
        var p1_x = i1 * canvas.GRID_WIDTH + canvas.GRID_WIDTH / 2
        var p1_y = j1 * canvas.GRID_WIDTH + canvas.GRID_WIDTH / 2

        var p2_x = i2 * canvas.GRID_WIDTH + canvas.GRID_WIDTH / 2
        var p2_y = j2 * canvas.GRID_WIDTH + canvas.GRID_WIDTH / 2

        var radius = Math.sqrt((p1_x - p2_x) ** 2 + (p1_y - p2_y) ** 2)

        var hexagon = new Konva.RegularPolygon({
            sides: 6,
            x: p1_x,
            y: p1_y,
            radius: radius,
            stroke: '#333',
            strokeWidth: 4,
            lineCap: 'round',
            lineJoin: 'round',
            draggable: true,
            rotation: 30,
        });
        return hexagon;
    }
}

class Octagon {
    constructor(center, top_right) {
        this.name = "octagon";
        this.pt1 = center;
        this.pt2 = top_right;
        this.n_sides = 8
    }

    render(i1, j1, i2, j2) {
        var p1_x = i1 * canvas.GRID_WIDTH + canvas.GRID_WIDTH / 2
        var p1_y = j1 * canvas.GRID_WIDTH + canvas.GRID_WIDTH / 2

        var p2_x = i2 * canvas.GRID_WIDTH + canvas.GRID_WIDTH / 2
        var p2_y = j2 * canvas.GRID_WIDTH + canvas.GRID_WIDTH / 2

        var radius = Math.sqrt((p1_x - p2_x) ** 2 + (p1_y - p2_y) ** 2)

        var konva_shape = new Konva.RegularPolygon({
            sides: this.n_sides,
            x: p1_x,
            y: p1_y,
            radius: radius,
            stroke: '#333',
            strokeWidth: 4,
            lineCap: 'round',
            lineJoin: 'round',
            draggable: true,

        });
        return konva_shape;
    }
}

class Circle {
    constructor(center, top_right) {
        this.name = "circle";
        this.pt1 = center;
        this.pt2 = top_right;
    }


    render(i1, j1, i2, j2) {
        var p1_x = i1 * canvas.GRID_WIDTH + canvas.GRID_WIDTH / 2
        var p1_y = j1 * canvas.GRID_WIDTH + canvas.GRID_WIDTH / 2

        var p2_x = i2 * canvas.GRID_WIDTH + canvas.GRID_WIDTH / 2
        var p2_y = j2 * canvas.GRID_WIDTH + canvas.GRID_WIDTH / 2

        var radius = Math.sqrt((p1_x - p2_x) ** 2 + (p1_y - p2_y) ** 2)

        var circle = new Konva.Circle({
            x: p1_x,
            y: p1_y,
            radius: radius,
            stroke: '#333',
            strokeWidth: 4,
        })

        circle.on('click', (e) => {
            transformer.nodes([circle])
            layer.add(transformer);
            canvas.ACTIONS.push(['del_circle', orig_i, orig_j]);
        })

        // bind the drag event to the point
        // on drag movement, update the action sequence
        circle.on("dragend", (e) => {
            var orig_i = circle.x;
            var orig_j = circle.y;
            var dest_i = Math.round((circle.x() + square_w / 2 - canvas.GRID_WIDTH / 2) / canvas.GRID_WIDTH);
            var dest_j = Math.round((circle.y() + square_w / 2 - canvas.GRID_WIDTH / 2) / canvas.GRID_WIDTH);

            // if the drag destination is out of bound of canvas, delete the point
            if (dest_i < 0 || dest_i >= canvas.NUM_GRID || dest_j < 0 || dest_j >= canvas.NUM_GRID) {
                // issue remove command
                canvas.ACTIONS.push(['del_circle', orig_i, orig_j]);
            } else {
                // issue move command
                canvas.ACTIONS.push(['mv_circle', orig_i, orig_j, dest_i, dest_j]);
            }
            // rerender the action sequence
            canvas.render();
        });

        return circle;
    }
}

class Square {
    constructor(center, top_right) {
        this.name = "square";
        this.pt1 = center;
        this.pt2 = top_right;
    }

    render(i1, j1, i2, j2) {
        var p1_x = i1 * canvas.GRID_WIDTH + canvas.GRID_WIDTH / 2
        var p1_y = j1 * canvas.GRID_WIDTH + canvas.GRID_WIDTH / 2
        var p2_x = i2 * canvas.GRID_WIDTH + canvas.GRID_WIDTH / 2
        var p2_y = j2 * canvas.GRID_WIDTH + canvas.GRID_WIDTH / 2

        var w = Math.abs(p2_x - p1_x) * 2
        var h = Math.abs(p2_y - p1_y) * 2

        var square = new Konva.Rect({
            x: p2_x - w, // Top-left
            y: p2_y, // Top-left corner
            width: w,
            height: h,
            stroke: '#333',
            strokeWidth: 4,
            lineCap: 'round',
            lineJoin: 'round',
            draggable: true,
        });
        return square;
    }
}

function getShape(type, pt1, pt2) {
    if (type == 'line') {
        return new Line(new Point(pt1[0], pt1[1]), new Point(pt2[0], pt2[1]));
    } else if (type == 'circle') {
        return new Circle(new Point(pt1[0], pt1[1]), new Point(pt2[0], pt2[1]));
    } else if (type == 'hexagon') {
        return new Hexagon(new Point(pt1[0], pt1[1]), new Point(pt2[0], pt2[1]));
    } else if (type == 'square') {
        return new Square(new Point(pt1[0], pt1[1]), new Point(pt2[0], pt2[1]));
    } else if (type == 'octagon') {
        return new Octagon(new Point(pt1[0], pt1[1]), new Point(pt2[0], pt2[1]));
    }
}

class Canvas {
    constructor() {
        // Instantiate a grid on the canvas
        this.width = 800;
        this.height = 800;
        this.NUM_GRID = 32;
        this.GRID_WIDTH = this.width / this.NUM_GRID;

        // Keep track of all the rendered goemetries, these are mutable
        // geometries are kept as points and curves
        this.rendered_points = [];
        this.rendered_curves = [];
        this.preview_curves = [];

        // keep track of the drawing mode
        this.mode = 'select';

        // keep track of last clicked point
        this.selected_points_queue = [];
        this.shapes = [];
    }

    clear_preview_curves() {
        this.preview_curves.forEach(function (curve) {
            curve.remove();
        });
        this.preview_curves = [];
        console.log("Clear preview curves");
    }

    render_preview_curves() {
        // Preview the curves in preview curves. 
        this.preview_curves.forEach(function (preview_curve) {
            layer.add(preview_curve);
            preview_curve.draw();
        });
    }

    // ====================== VIEW : REPL STATE TO RENDER ======================
    update_selected_points_queue(coord_event_originator) {
        var i = coord_event_originator.coord_i;
        var j = coord_event_originator.coord_j;
        this.selected_points_queue.push([i, j]);
    }

    render() {
        // rerender all the shapes resulting from the action sequence

        // go through rendered_curves using remove()
        this.rendered_curves.forEach(function (curve) {
            curve.remove();
        });
        this.rendered_curves = [];
        var that = this
        this.shapes.forEach(function (shape) {
            console.log(shape)
            let rendered_graphics = shape.render(shape.pt1.i, shape.pt1.j, shape.pt2.i, shape.pt2.j)
            rendered_graphics.get_cur_state = () => {
                return [shape.name, [shape.pt1.i, shape.pt1.j], [shape.pt2.i, shape.pt2.j]];
            };
            that.rendered_curves.push(rendered_graphics);
            layer.add(rendered_graphics);
            rendered_graphics.draw();
            // rendered_graphics.on('dragend', function () {
            //     const mouse_loc = layer.getStage().getPointerPosition();
            //     // if it is out of bound w.r.t. width and height
            //     // if (mouse_loc.x < 0 || mouse_loc.x > canvas.width || mouse_loc.y < 0 || mouse_loc.y > canvas.height) {
            //     //     that.ACTIONS.push(['rm_curve', rendered_graphics.get_cur_state()]);
            //     // }
            //     canvas.render();
            // });
        })
    }

    commit() {
        if (this.selected_points_queue.length == 2) {
            pt2 = this.selected_points_queue.pop();
            pt1 = this.selected_points_queue.pop();
            this.shapes.push(getShape(this.mode, pt1, pt2))

            console.log("Drawing " + this.mode + " from " + pt1 + " to " + pt2);
            console.log(this.shapes)

            // rerender the action sequence
            this.render();
        }
    }
}

function get_hovered_point(coord_event_originator) {
    var i = coord_event_originator.coord_i;
    var j = coord_event_originator.coord_j;
    return [i, j];
}

// click event dispatcher on the gui grid dots
function hover_event_handler(listener) {
    if (canvas.mode == "select") {
        // TODO: If in select mode, should display control points for the shape?
        return
    } else {
        // TODO: If in another mode, should place the thing here
        canvas.clear_preview_curves();
        hovered_point = get_hovered_point(listener);
        if (canvas.selected_points_queue.length == 1 && hovered_point != null) {
            pt1 = canvas.selected_points_queue[0];
            pt2 = hovered_point;
            let tmp_shape;
            if (canvas.mode == 'line')
                tmp_shape = new Line(new Point(pt1[0], pt1[1]), new Point(pt2[0], pt2[1]));
            else if (canvas.mode == 'square')
                tmp_shape = new Square(new Point(pt1[0], pt1[1]), new Point(pt2[0], pt2[1]))
            else if (canvas.mode == 'circle')
                tmp_shape = new Circle(new Point(pt1[0], pt1[1]), new Point(pt2[0], pt2[1]))
            else if (canvas.mode == 'hexagon')
                tmp_shape = new Hexagon(new Point(pt1[0], pt1[1]), new Point(pt2[0], pt2[1]))
            else if (canvas.mode == 'octagon')
                tmp_shape = new Octagon(new Point(pt1[0], pt1[1]), new Point(pt2[0], pt2[1]))
            canvas.preview_curves.push(
                tmp_shape.render(tmp_shape.pt1.i, tmp_shape.pt1.j, tmp_shape.pt2.i, tmp_shape.pt2.j, hovered = true)
            )
        }
        canvas.render_preview_curves()
        return
    }
}

function click_event_handler(listener) {
    if (canvas.mode == 'select') {

        return
    } else {
        // TODO: If in another mode, should place the thing here
        canvas.update_selected_points_queue(listener);
        canvas.commit();
        return
    }
}

// draw a grid of circles, and also return these circle objects in a dictionary
// this grid is permanent, and used for UI purpose, and is not updated based on the action sequence
function draw_grid(grid_layer) {
    var grid_UI_dict = {};
    for (var i = 0; i < canvas.NUM_GRID; i++) {
        for (var j = 0; j < canvas.NUM_GRID; j++) {
            // draw a circle using Konva
            var circle = new Konva.Circle({
                x: i * canvas.GRID_WIDTH + canvas.GRID_WIDTH / 2,
                y: j * canvas.GRID_WIDTH + canvas.GRID_WIDTH / 2,
                radius: 4,
                fill: '#ccc',
                listening: false,
            });
            grid_layer.add(circle);
            // use the (i,j) tuple as the key to the dictionary
            grid_UI_dict[i + ',' + j] = circle;
        }
    }
    return grid_UI_dict;
}
// Draws a second grid to handle selector events in a disparate layer.
function draw_selector_grid(grid_layer, ui_grid) {
    var grid_UI_dict = {};
    for (var i = 0; i < canvas.NUM_GRID; i++) {
        for (var j = 0; j < canvas.NUM_GRID; j++) {
            // draw an invisible circle on top of the UI one to actually handle the events
            var invisible_circle = new Konva.Circle({
                x: i * canvas.GRID_WIDTH + canvas.GRID_WIDTH / 2,
                y: j * canvas.GRID_WIDTH + canvas.GRID_WIDTH / 2,
                radius: 16,
                fill: '#ccc',
                opacity: 0,
            });
            invisible_circle.mirror_circle = ui_grid[i + ',' + j];
            invisible_circle.coord_i = i;
            invisible_circle.coord_j = j;

            // make the circle pop on hover over the invisible circle
            invisible_circle.on('mouseover', function () {
                this.mirror_circle.setAttr('radius', 6);
                this.mirror_circle.setAttr('fill', '#9c9');
                this.mirror_circle.draw();
                hover_event_handler(this);
            });
            invisible_circle.on('mouseout', function () {
                this.mirror_circle.setAttr('radius', 4);
                this.mirror_circle.setAttr('fill', '#ccc');
                this.mirror_circle.draw();
            });

            // add the click event to the invisible circle
            invisible_circle.on('click', function () {
                // TODO: place currently selected element
                click_event_handler(this);
            });
            grid_layer.add(invisible_circle);
            // use the (i,j) tuple as the key to the dictionary
            grid_UI_dict[i + ',' + j] = invisible_circle;
        }
    }
    return grid_UI_dict;
}

// on document ready
$(document).ready(function () {
    canvas = new Canvas()

    // add the mode logic on the mode-select radio buttons
    $('input[name=mode]').change(function () {
        console.log("mode switch, clearing selected points queue");
        canvas.selected_points_queue = [];
        canvas.mode = $(this).val();
    });

    // make a new konva stage
    var stage = new Konva.Stage({
        container: 'konva-holder',
        width: canvas.width,
        height: canvas.height,
    });

    // add a layer and add to stage
    layer = new Konva.Layer();
    stage.add(layer);
    // draw the grid for UI purpose
    var grid_circles = draw_grid(layer);

    // draw the invisible grid that handles UI elements.
    selector_layer = new Konva.Layer();
    stage.add(selector_layer);
    ui_layer = draw_selector_grid(selector_layer, grid_circles);
    canvas.render();
});
