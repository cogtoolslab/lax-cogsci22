/*
 * Sketchpad display.
 *
 * Requirements:
 *  Sketchpad Display widget (i.e. import raphael-min.js, raphael.sketchpad.js, and json2.js above this plugin in html)
 */

jsPsych.plugins["stimuli-contextual-language-production"] = (function () {
  var plugin = {};

  // jsPsych.pluginAPI.registerPreload('tower-display', 'stimulus');

  plugin.info = {
    name: "stimuli-contextual-language-production",
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
      context_label: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: "Label Prompt",
        default: "Please draw the image in the sketchpad below.",
        description:
          "HTML formatted string to display at the top of the page above all the questions.",
      },    
      firstRowPrompt: {
        type: jsPsych.plugins.parameterType.STRING,
        default: "first",
      },
      additionalRowPrompt: {
        type: jsPsych.plugins.parameterType.STRING,
        default: "then",
      },
      maxRows: {
        type: jsPsych.plugins.parameterType.INT,
        default: 8,
      },
      demo: {
        type: jsPsych.plugins.parameterType.BOOL,
        default: false,
      },
      questions: {
        type: jsPsych.plugins.parameterType.COMPLEX,
        array: true,
        pretty_name: "Questions",
        default: undefined,
        nested: {
          prompt: {
            type: jsPsych.plugins.parameterType.STRING,
            pretty_name: "Prompt",
            default: undefined,
            description: "Prompt for the subject to response",
          },
          placeholder: {
            type: jsPsych.plugins.parameterType.STRING,
            pretty_name: "Value",
            default: "",
            description: "Placeholder text in the textfield.",
          },
          rows: {
            type: jsPsych.plugins.parameterType.INT,
            pretty_name: "Rows",
            default: 1,
            description: "The number of rows for the response text box.",
          },
          columns: {
            type: jsPsych.plugins.parameterType.INT,
            pretty_name: "Columns",
            default: 50,
            description: "The number of columns for the response text box.",
          },
          required: {
            type: jsPsych.plugins.parameterType.BOOL,
            pretty_name: "Required",
            default: false,
            description: "Require a response",
          },
          name: {
            type: jsPsych.plugins.parameterType.STRING,
            pretty_name: "Question Name",
            default: "",
            description:
              "Controls the name of data values associated with this question",
          },
        },
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
        default: "SUBMIT INSTRUCTIONS",
        description: "The text that appears on the button to finish the trial.",
      },
    },
  };

  function initInterface(display_element, trial) {
    const IMAGE_CANVAS_SIZE = 512;
    const IMAGE_GRID_SIZE = 125; 

    var html = `
    <div class="container center-block">
      <div class="container">
        <p id="upcoming-image-header" style="float: left; margin: 0px;"> <strong> Upcoming images</strong> </p>
      </div>
      <div class="container pb-2">
        <table style="float: left; width: 50%; id="jspsych-category-labels-table" 
        style="border-collapse: collapse; margin-right: 1em;  margin-bottom: 1em;">
    `;

      var stimIdx = trial.stimBatch.indexOf(trial.stimId) + 1;
      var remainingImages = trial.stimBatch.length - stimIdx;
      var ncols = Math.min(7, remainingImages);
      html += `
        <tr id="jspsych-category-labels-table-row" style="height:64px">`

      for (var col = 0; col < ncols; col++) {
        var imgId = trial.stimBatch[stimIdx];
        // console.log('imageID:', imgId);
        if (!(imgId)) {
          html +=
          `<td id="table-grid-img-id-${col}" style="padding: 10px 10px; border: none;">
            <div id="${src}" style="margin: auto; width: ${IMAGE_GRID_SIZE}px; height: ${IMAGE_GRID_SIZE}px;">
              <img src="" style="width: ${IMAGE_GRID_SIZE}px; height: ${IMAGE_GRID_SIZE}px"> </img>
            </div>
          </td>`
        } else {
          var src= trial.stimURLs[imgId];
          html +=
            `<td id="table-grid-img-id-${imgId}" style="padding: 10px 10px; border: none;">
              <div id="${src}" style="width: ${IMAGE_GRID_SIZE}px; height: ${IMAGE_GRID_SIZE}px;">
                <img src=${src} class="upcoming-img" style="width: ${IMAGE_GRID_SIZE}px; height: ${IMAGE_GRID_SIZE}px"> </img>
              </div>
            </td>
            `
          }
        stimIdx += 1;
    }

    html += `
        </tr></table></div>

        <div class="row">
        
            <div class="col-lg-6" id="image-canvas-container">
              <div class="col-lg-12" id="headers">
                <h4 id="table-container" style="float: left"><strong>${trial.label_prompt}</strong></h4> 
              </div>
              <img src="" class="img-rounded" style="border: 3px solid #555; max-width: 500px;" id="image"></img>
            </div>

              <div class="col-lg-6"> 
                <div id="instruction-container" class="row">
                  <div id="label-rows"></div>
                  <button class="btn btn-primary btn-sm" type="button" id="add_response_row" class="jspsych-btn" value="add_response_row" style="display: block; margin: 1em 0em">add instruction step</button> 
                  <button class="btn btn-danger btn-sm" type="button" id="remove_response_row" class="jspsych-btn" value="remove_response_row" style="display: none; margin: 1em 0em">remove instruction step</button>
                  <div style="margin-top: 10px;">
                    <input type="submit" id="jspsych-next" class="jspsych-btn jspsych-next" value="${trial.button_label}"></input>
                  </div>
                  <br>
                  <div id="tooltip" data-toggle="tooltip" data-placement="top" title="You can press the Enter key to add a new line once the current line is full. You can also Tab key to jump to the next text-box, and if you press the Backspace key in an empty box, you will jump back to the previous text-box!">
                    <span><i class="fas fa-question-circle"></i>  </span>
                  </div>
                </div>
        </div>
      
    </div>
    `

    return html;

  }

  var add_row = function(trial, display_element, rows) {
    var labelRows = display_element.querySelector("#label-rows");
    n_rows = rows.length;

    if (n_rows < trial.maxRows){
      n_rows += 1;

      newRow = document.createElement("div");
      newRow.setAttribute("class","question-row row");
      // newRow.setAttribute("style", "margin: 1em 0em;")
      newRow.setAttribute("id","question-row-" + (n_rows).toString());
      labelRows.appendChild(newRow);
      rows.push(newRow);

      rowPrompt = document.createElement("p");
      rowPrompt.setAttribute("class", "row-prompt");
      newRow.appendChild(rowPrompt);

      var rowPromptText;
      if (n_rows == 1){
        rowPromptText = document.createTextNode(trial.firstRowPrompt);
      } else{
        rowPromptText = document.createTextNode(trial.additionalRowPrompt);
      }
      
      rowPrompt.appendChild(rowPromptText);

      for (var i = 0; i < trial.questions.length; i++) {
        var question = trial.questions[i];

        newInput = document.createElement("input");
        newInput.setAttribute("id", "input-" + question.name + "-row-" + (n_rows).toString());
        newInput.setAttribute("class", "col-sm-6 input-row")
        newInput.setAttribute("autocomplete","off");
        newInput.setAttribute("type", "text");
        // newInput.setAttribute("cols", question.columns); // change input to textarea and use these settings for multi-line input
        // newInput.setAttribute("rows", question.rows);
        newInput.setAttribute("size", question.columns);
        newInput.setAttribute("name", question.name);
        newInput.setAttribute("data-name", question.name);
        newInput.setAttribute("placeholder", question.placeholder);
        newInput.required = true; 
      
        newRow.appendChild(newInput);


      }

      display_element.querySelector("#input-" + trial.questions[0].name + "-row-" + (n_rows).toString()).focus();


      if (n_rows > 1){
        display_element.querySelector("#remove_response_row").setAttribute("style", "display: block; margin: 1em 0em")
      }

    };

    return rows;
  };

  var remove_row = function(display_element, rows) {
    n_rows = rows.length;
    n_rows -= 1;

    if (n_rows == 1){
      display_element.querySelector("#remove_response_row").setAttribute("style", "display: none")
    }

    //lastRow = rows[rows.length-1]
    lastRow = rows.pop();
    lastRow.remove();
    return rows;
  };

  var rows = [];
  plugin.trial = function (display_element, trial) {

    display_element.innerHTML = initInterface(display_element, trial);
    $('#tooltip').tooltip();

    add_row(trial, display_element, rows);
    // console.log("after adding a row: ", rows);

    // Update canvas and highlight grid image
    document.getElementById("image").src = trial.stimURL;
    // var currentImg = document.getElementById(`table-grid-img-id-${trial.stimId}`);
    // currentImg.style.backgroundColor = "#10ff00";

    // Update progress count and deselect previous image
    var imageGridIndex = trial.stimBatch.indexOf(trial.stimId);
    
    // if (imageGridIndex > 0) {
    //   var prevImg = document.getElementById(`table-grid-img-id-${trial.stimBatch[imageGridIndex - 1]}`);
    //   prevImg.style.backgroundColor = "#f0f0f0";
    // }

    if (trial.demo) {
      $('.demo-instruction').show();
      $('#upcoming-image-header').hide();
    }
    else {
      $('.demo-instruction').hide();
      $('#upcoming-image-header').show();
      
    };
      
    display_element.querySelector("#add_response_row")
    .addEventListener("click", function() { 
      rows = add_row(trial, display_element, rows) 
    });

    display_element.querySelector("#remove_response_row")
    .addEventListener("click", function() {
      rows = remove_row(display_element, rows);
    });

  
    display_element.addEventListener("keydown", function(e) {
      // console.log(e.key);
      if (e.key == "Enter") { // Tab Key
        // Check if there are any empty text boxes to fill in
        var answering_questions = false;

        var question_data = {};
        var n_rows = rows.length;
        for (var r = 1; r <= n_rows; r++ ){
          for (var i = 0; i < trial.questions.length; i++) {
            var question = trial.questions[i];

            var id = "input-" + question.name + "-row-" + (r).toString();
            if (document.activeElement.id == id) {
              answering_questions = true;
            }
            var q_element = document
              .querySelector('#' + id);

            var val = q_element.value;
            if (!(val)) {
              // Unfilled textboxes -- don't add a new row
              return; 
            }
            var name = question.name + "-" +  (r).toString();
          
            var response = {};
            response[name] = val;
            Object.assign(question_data, response);
          }
        }
        // All the textboxes are full -- add a new row
        if (answering_questions) {
          e.preventDefault();
          rows = add_row(trial, display_element, rows);
        }
      }

      if (e.key == "Backspace") {
        var n_rows = rows.length;
        for (var i = trial.questions.length - 1; i >= 0; i--) {
          var question = trial.questions[i];

          var id = "input-" + question.name + "-row-" + (n_rows).toString();
          if (document.activeElement.id == id) {
            var q_element = document
            .querySelector('#' + id);

            var val = q_element.value;
            if (!(val)) {
              // If there's no text, select the previous element and delete row if empty
              e.preventDefault();

              if (i > 0) { // answering the "where" question -- select the "what" element
                var prev_id = "#input-" + trial.questions[i - 1].name + "-row-" + (n_rows).toString()
                var prev_element = document.querySelector(prev_id);
                prev_element.focus();
                prev_element.click();
                return;
              } else {
                // Delete the row and select the previous row's "where" element, unless there's just one row
                if (n_rows < 2) {
                  return;
                } 
                rows = remove_row(display_element, rows);
                var prev_id = "#input-" + trial.questions[1].name + "-row-" + (n_rows - 1).toString()
                var prev_element = document.querySelector(prev_id);
                prev_element.focus();
                prev_element.click();
                return;
              }
            }
          }
        }
      }

      return;

      })

    display_element
      .querySelector("#jspsych-next")
      .addEventListener("click", function (e) {
        e.preventDefault();

        // measure response time
        var endTime = performance.now();
        var response_time = endTime - startTime;

        var question_data = {};
        var n_rows = rows.length;
        for (var r = 1; r <= n_rows; r++ ){
          for (var i = 0; i < trial.questions.length; i++) {
            var question = trial.questions[i];

            var id = "input-" + question.name + "-row-" + (r).toString();
            var q_element = document
              .querySelector('#' + id);

            var val = q_element.value;
            console.log("response: ", val);
            if (!(val)) {
              alert("Please make sure all the text boxes have some text in them.");
              return;
            }
            var name = question.name + "-" +  (r).toString();
          
            var response = {};
            response[name] = val;
            Object.assign(question_data, response);
          }
        }

        // save data
        var trialdata = {
          rt: response_time,
          responses: JSON.stringify(question_data),
          stimulus: JSON.stringify(trial.stimulus),
          stimId: trial.stimId,
          stimURL: trial.stimURL,
          trialDomain: trial.domain,
        };

        // next trial
        console.log(trialdata)
        jsPsych.finishTrial(trialdata);
        display_element.innerHTML = "";
        var n_rows = 0; // TODO: Index questions
        rows = [];
      });

    var startTime = performance.now();
  };

  return plugin;
})();
