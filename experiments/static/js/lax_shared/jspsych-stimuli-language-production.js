/*
 * Displays a domain stimuli and prompts subject for language production.
 *
 * Requirements for towers domain.
 *  block Display widget (i.e. import blockConfig.js and blockDisplay.js above this plugin in html)
 */

var DEFAULT_IMAGE_SIZE = 200;

jsPsych.plugins["stimuli-language-production"] = (function () {
  var plugin = {};

  // jsPsych.pluginAPI.registerPreload('tower-display', 'stimulus');

  plugin.info = {
    name: "stimuli-language-production",
    parameters: {
      domain: {
        type: jsPsych.plugins.parameterType.STRING, // Domain to display.
        default: "",
      },
      stimURL: {
        type: jsPsych.plugins.parameterType.STRING, // BOOL, STRING, INT, FLOAT, FUNCTION, KEYCODE, SELECT, HTML_STRING, IMAGE, AUDIO, VIDEO, OBJECT, COMPLEX
        default: "",
      },
      stimulus: {
        type: jsPsych.plugins.parameterType.OBJECT,
        default: {},
      },
      stimId: {
        type: jsPsych.plugins.parameterType.STRING,
        default: "None",
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
            default: 40,
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
        default: "Continue",
        description: "The text that appears on the button to finish the trial.",
      },
    },
  };

  plugin.trial = function (display_element, trial) {
    for (var i = 0; i < trial.questions.length; i++) {
      if (typeof trial.questions[i].rows == "undefined") {
        trial.questions[i].rows = 20;
      }
    }
    for (var i = 0; i < trial.questions.length; i++) {
      if (typeof trial.questions[i].columns == "undefined") {
        trial.questions[i].columns = 50;
      }
    }
    for (var i = 0; i < trial.questions.length; i++) {
      if (typeof trial.questions[i].value == "undefined") {
        trial.questions[i].value = "";
      }
    }

    display_element.innerHTML = "";

    var html_content = "";

    // show preamble text

    /** Create domain canvas **/
    if (trial.domain == DOMAIN_TOWERS) {
      html_content += '<div class="any-canvas" id="stimulus-canvas"></div>';
    } else if (trial.domain == DOMAIN_DRAWING) {
      logIfDebug("Displaying drawing image: " + trial.stimURL);
      html_content +=
        '<div class="any-canvas" id="stimulus-canvas">' +
        '<img style="width: ' +
        DEFAULT_IMAGE_SIZE +
        'px" src=' +
        trial.stimURL +
        ">" +
        "</div>";
    } else {
      logIfDebug("Unknown domain for display.");
    }

    html_content += '<div class="any-canvas" id="environment-canvas"></div>';
    // '<div id="jspsych-survey-text-preamble" class="jspsych-survey-text-preamble">' +
    // trial.preamble +
    // "</div>";

    // start form
    html_content += '<form id="jspsych-survey-text-form" autocomplete="off">';

    // display_element.innerHTML = html_content;

    // generate question order
    var question_order = [];
    for (var i = 0; i < trial.questions.length; i++) {
      question_order.push(i);
    }
    if (trial.randomize_question_order) {
      question_order = jsPsych.randomization.shuffle(question_order);
    }

    // add questions
    for (var i = 0; i < trial.questions.length; i++) {
      var question = trial.questions[question_order[i]];
      var question_index = question_order[i];
      html_content +=
        '<div id="jspsych-survey-text-' +
        question_index +
        '" class="jspsych-survey-text-question" style="margin: 2em 0em;">';
      html_content +=
        '<p class="jspsych-survey-text"> <span style="display: block; margin: 15px;">' +
        question.prompt +
        "</span>";
      var autofocus = i == 0 ? "autofocus" : "";
      var req = question.required ? "required" : "";
      if (question.rows == 1) {
        html_content +=
          '<input type="text" id="input-' +
          question_index +
          '"  name="#jspsych-survey-text-response-' +
          question_index +
          '" data-name="' +
          question.name +
          '" size="' +
          question.columns +
          '" ' +
          autofocus +
          " " +
          req +
          ' placeholder="' +
          question.placeholder +
          '"></input>';
      } else {
        html_content +=
          '<textarea id="input-' +
          question_index +
          '" name="#jspsych-survey-text-response-' +
          question_index +
          '" data-name="' +
          question.name +
          '" cols="' +
          question.columns +
          '" rows="' +
          question.rows +
          '" ' +
          autofocus +
          " " +
          req +
          ' placeholder="' +
          question.placeholder +
          '"></textarea>';
      }
      html_content += "</div>";
    }

    // add submit button
    html_content +=
      '<input type="submit" id="jspsych-survey-text-next" class="jspsych-btn jspsych-survey-text" value="' +
      trial.button_label +
      '"></input>';

    html_content += "</form>";
    display_element.innerHTML = html_content;

    if (trial.domain == DOMAIN_TOWERS) {
      if (trial.stimulus !== null) {
        let targetObject = {
          targetBlocks: trial.stimulus.blocks,
        };
        var showStimulus = true;
        var showBuilding = false;
        window.blockSetup(targetObject,showStimulus,showBuilding);
      }
    }

    // backup in case autofocus doesn't work
    display_element.querySelector("#input-" + question_order[0]).focus();

    display_element
      .querySelector("#jspsych-survey-text-form")
      .addEventListener("submit", function (e) {
        e.preventDefault();
        // measure response time
        var endTime = performance.now();
        var response_time = endTime - startTime;

        // create object to hold responses
        var question_data = {};

        for (var index = 0; index < trial.questions.length; index++) {
          var id = "Q" + index;
          var q_element = document
            .querySelector("#jspsych-survey-text-" + index)
            .querySelector("textarea, input");
          var val = q_element.value;
          var name = q_element.attributes["data-name"].value;
          if (name == "") {
            name = id;
          }
          var obje = {};
          obje[name] = val;
          Object.assign(question_data, obje);
        }
        // save data
        var trialdata = {
          rt: response_time,
          label: question_data["Q0"],
          stimId: trial.stimId,
          stimURL: trial.stimURL,
          trialDomain: trial.domain,
          // target: jsPsych
          //   .timelineVariable("target", true)
          //   .replace("images/", ""),
          // 'foil' :jsPsych.timelineVariable('foil', true).replace('images/', ''),
          responses: JSON.stringify(question_data),
        };

        display_element.innerHTML = "";

        // next trial
        jsPsych.finishTrial(trialdata);
      });

    var startTime = performance.now();
  };

  return plugin;
})();