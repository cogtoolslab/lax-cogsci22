/*
 * Sketchpad display.
 *
 * Requirements:
 *  Sketchpad Display widget (i.e. import raphael-min.js, raphael.sketchpad.js, and json2.js above this plugin in html)
 */

CANVAS_SIZE = 250;

jsPsych.plugins["jspsych-sketchpad-display"] = (function () {
  var plugin = {};

  // jsPsych.pluginAPI.registerPreload('tower-display', 'stimulus');

  plugin.info = {
    name: "jspsych-sketchpad-display",
    parameters: {
      stimURL: {
        type: jsPsych.plugins.parameterType.STRING, // BOOL, STRING, INT, FLOAT, FUNCTION, KEYCODE, SELECT, HTML_STRING, IMAGE, AUDIO, VIDEO, OBJECT, COMPLEX
        default: "",
      },
      stimId: {
        type: jsPsych.plugins.parameterType.STRING,
        default: "None",
      },
      label_prompt: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: "Label Prompt",
        default: "Please draw the image in the sketchpad below.",
        description:
          "HTML formatted string to display at the top of the page above all the questions.",
      },
      button_label: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: "Button label",
        default: "Continue",
        description: "The text that appears on the button to finish the trial.",
      },
    },
  };

  plugin.trial = function (display_element, trial) {
    display_element.innerHTML = "";

    var html_content = "";

    // show preamble text
    // '<div id="jspsych-survey-text-preamble" class="jspsych-survey-text-preamble">' +
    // trial.preamble +
    // "</div>";
    html_content = `
        <h3 style="align:center"> ${trial.label_prompt} </h3>
        <div class="any-canvas" style="display:inline-block;vertical-align:center;margin:10px;" id="stimulus-canvas">
            <img width=${CANVAS_SIZE}, height=${CANVAS_SIZE}, src="${trial.stimURL}"/>
        </div>

        <div class="any-canvas" style="display:inline-block;vertical-align:center;margin:10px;" id="sketchpad-canvas">
            <div id="editor" width=${CANVAS_SIZE}, height=${CANVAS_SIZE}, style="border:solid 1px blue; background:white;"></div>
        </div>

        <div style="margin-top:10px;">
            <input type="submit" id="jspsych-sketchpad-next" class="jspsych-btn jspsych-sketchpad-next" value="${trial.button_label}"></input>
        <div>
        `;

    display_element.innerHTML = html_content;

    var sketchpad = Raphael.sketchpad("editor", {
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      border: "solid",
      editing: true,
    });

    var pen = sketchpad.pen();
    pen.width(4);

    display_element
      .querySelector("#jspsych-sketchpad-next")
      .addEventListener("click", function (e) {
        e.preventDefault();
        // measure response time
        console.log(sketchpad.strokes());
        if (sketchpad.strokes().length < 2) {
          alert(
            "Please make sure you have accurately placed all your strokes on the sketchpad."
          );
          return;
        }

        var endTime = performance.now();
        var response_time = endTime - startTime;

        // save data
        var trialdata = {
          rt: response_time,
          strokes: sketchpad.json(),
          stimulus: JSON.stringify(trial.stimulus),
          stimId: trial.stimId,
          stimURL: trial.stimURL,
        };

        display_element.innerHTML = "";

        // next trial
        jsPsych.finishTrial(trialdata);
      });

    var startTime = performance.now();
  };

  return plugin;
})();
