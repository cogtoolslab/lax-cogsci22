/*
 * Sketchpad display.
 *
 * Requirements:
 *  Sketchpad Display widget (i.e. import raphael-min.js, raphael.sketchpad.js, and json2.js above this plugin in html)
 */

jsPsych.plugins["jspsych-category-familiarization"] = (function () {
  var plugin = {};

  // jsPsych.pluginAPI.registerPreload('tower-display', 'stimulus');

  plugin.info = {
    name: "jspsych-category-familiarization",
    parameters: {
      stimURL: {
        type: jsPsych.plugins.parameterType.STRING, // BOOL, STRING, INT, FLOAT, FUNCTION, KEYCODE, SELECT, HTML_STRING, IMAGE, AUDIO, VIDEO, OBJECT, COMPLEX
        default: "",
      },
      stimId: {
        type: jsPsych.plugins.parameterType.STRING,
        default: "None",
      },
      stimBatch: {
        type: jsPsych.plugins.parameterType.OBJECT,
        defaults: [],
        description: "Array of all the image IDs being shown to the participant"
      },
      stimURLs: {
        type: jsPsych.plugins.parameterType.OBJECT,
        defaults: [],
        description: "Dict containing the URLs of the all the images being shown to the participant"
      },
      label_prompt: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: "Label Prompt",
        default: "Here are some examples of the images you will be labeling.",
        description:
          "HTML formatted string to display at the top of the page above all the questions.",
      },    
      requireClickThrough: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: "Require Click Through",
        default: true,
        description: "Whether or not to require participant to click through all the examples before continuing."
      },
      maxRows: {
        type: jsPsych.plugins.parameterType.INT,
        default: 8,
      },
      preamble: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: "Preamble",
        default: null,
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

  function initInterface(display_element, trial) {

    const nrows = parseInt(Math.sqrt(trial.stimBatch.length))
    const ncols = nrows;
    // console.log(nrows, trial.stimBatch.length);
    const IMAGE_GRID_SIZE = 128; // -20 compensates for padding, so that the grid is the same size as the image being labelled
    
    var html = `
    <div class="container" id="jspsych-category-labels-container" css="display: none; position: relative">
      <div class="row">
        <div class="col">
        
          <div id="headers" style="position: relative">
          <p id="prompt" style="text-align: center;">${trial.label_prompt} </p>
          </div>
        </div
      </div>
      <table class="row" id="jspsych-category-labels-table" 
      style="border-collapse: collapse; margin-bottom: 1em; position: relative; margin: auto; width: 50%">
    `;

    function clickHandler(idx) {
      var image = document.getElementById(`img-${idx}`);
      image.style.display = "block";
    }
    
    var idx = 0;
    var display = trial.requireClickThrough == true ? "none" : "block";
    for (var row = 0; row < nrows; row++) {
      html += `
        <tr id="jspsych-category-labels-table-row-${row}" style="height:${IMAGE_GRID_SIZE}px">`

      for (var col = 0; col < ncols; col++) {
        var imgId = trial.stimBatch[idx];
        var imgPath = trial.stimURLs[imgId];

        html +=
          `<td id="table-grid-img-id-${idx}" style="padding: 10px 10px; border: none;">
            <div id="${imgPath}" style="width: ${IMAGE_GRID_SIZE}px; height: ${IMAGE_GRID_SIZE}px;">
              <img src=${imgPath} id="img-${idx}" class="familiarization-img" style="width: ${IMAGE_GRID_SIZE}px; height: ${IMAGE_GRID_SIZE}px; display: ${display}"> </img>
            </div>
          </td>
          `
        idx += 1;
      }
      html += "</tr>";
    }
    html += `
        </table>  
              
        <div style="margin: 20px 0px;">
          <input type="submit" id="jspsych-next" class="jspsych-btn jspsych-next" value="${trial.button_label}"></input>
        <div>
        
      </div>

      <div class="modal" id="modal" tabindex="-1" role="dialog">
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Are you sure you want to continue?</h5>
              <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <p>Once you click the <strong>Continue</strong> button you won't be able to return to this screen. 
              If you would like to continue familiarizing yourself with the images you will be labelling, press the <strong>Cancel</strong> button.</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-primary" id="finish-button">Continue</button>
              <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    `

    return html;

  }

  plugin.trial = function (display_element, trial) {
    var imageGridIndex = -1; // -1 for initialization
    display_element.innerHTML = initInterface(display_element, trial);
        
    // Update canvas and highlight grid image
    if (trial.requireClickThrough) {
      var currentImg = document.getElementById(`table-grid-img-id-0`);
      currentImg.style.backgroundColor = "#64e664";
    }

    var nextButtonTimeout = function() {
      if (imageGridIndex == -1 || imageGridIndex >= trial.stimBatch.length) {
        return;
      }

      var button = display_element.querySelector("#jspsych-next");
      var image = document.getElementById(`img-${imageGridIndex}`);

      if (image) {
       image.style.setProperty("display", "block");
      }

      if (button) {
        button.disabled = true;
        setTimeout(function() {
          button.disabled = false;
        }, 250);
      }
    }

    var finish = function() {
      // measure response time
      var endTime = performance.now();
      var response_time = endTime - startTime;

      // save data
      var trialdata = {
        rt: response_time,
        stimulus: JSON.stringify(trial.stimulus),
        stimBatch: trial.stimBatch
      };
      display_element.innerHTML = "";
      document.removeEventListener("keydown", keyboard_listener);
      jsPsych.finishTrial(trialdata);
    }

    var next = function() {      
      if (!(trial.requireClickThrough)) {
        console.log(imageGridIndex)
        if (imageGridIndex < 0) {
         imageGridIndex += 1;
         return;
        }
        else {
          var modal = $("#modal");
          modal.modal("show")
          return;
        }
      }

      // If the next button is disabled do nothing, otherwise update state
      var button = display_element.querySelector("#jspsych-next");
      if ((button) && (button.disabled == true)) {
        return;
      }

      nextButtonTimeout();

      imageGridIndex += 1;

      if (imageGridIndex < trial.stimBatch.length) {
        // console.log(imageGridIndex)
        if (imageGridIndex > 0) {
            var prevImg = document.getElementById(`table-grid-img-id-${imageGridIndex - 1}`);
            if (prevImg){
              prevImg.style.backgroundColor = "#f0f0f0";
            };
            
            var currImg = document.getElementById(`table-grid-img-id-${imageGridIndex}`);
            if (currImg) {
              currImg.style.backgroundColor = "#64e664";
            };
          }
        return;
      } else if(imageGridIndex == trial.stimBatch.length) {
        var prevImg = document.getElementById(`table-grid-img-id-${imageGridIndex-1}`);
        if (prevImg) {
          prevImg.style.backgroundColor = "#f0f0f0";
        };
      } else {
        finish();
      }
    };

    display_element
      .querySelector("#jspsych-next")
      .addEventListener("click", function (e) {
        e.preventDefault();
        next();
      });
    
    var keyboard_listener = function(e) { 
      if (e.key == "ArrowRight") {
        next();
      }
    }
    document.addEventListener("keydown", keyboard_listener);

    display_element
    .querySelector("#finish-button")
    .addEventListener("click", function(e) {
      e.preventDefault();
      $("#modal").modal("hide")
      finish();
      return;
    })

    var startTime = performance.now();
  };

  return plugin;
})();
