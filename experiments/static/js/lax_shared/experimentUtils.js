/*
experimentUtils.js | Credit : WPM, YF. CW.

Utility functions for running experiments. Contains importable constants.
*/

DEBUG_MODE = false;
DEBUG_TRIALS_ONLY = false; // Hide exit survey and config.

CONST_ALL = "all";
CONST_DOWNLOADED = "downloaded"; // stim set should be obtained from mongo
DOMAIN_TOWERS = "structures";
DOMAIN_DRAWING = "drawing";
DOMAINS = [DOMAIN_TOWERS, DOMAIN_DRAWING];

EXPERIMENT_TRIAL_INSTRUCTIONS = "instructions";
EXPERIMENT_TRIAL_ATTENTION_CHECK_SURVEY_MULTIPLE_CHOICE = "attention-check-survey-multiple-choice";
EXPERIMENT_STIMULI_LANGUAGE_PRODUCTION = "stimuli-language-production";
EXPERIMENT_STIMULI_PROCEDURAL_LANGUAGE_PRODUCTION = "stimuli-procedural-language-production";
EXPERIMENT_STIMULI_CONTEXTUAL_LANGUAGE_PRODUCTION = "stimuli-contextual-language-production";
STIMULI_PRODUCTION = "stimuli-production";
BUILD_INTERFACE_FAMILIARIZATION = "build-interface-familiarization";
STIMULI_CATEGORY_FAMILIARIZATION = "category-familiarization";
TOWER_RECONSTRUCTION = "tower-reconstruction";
DRAWING_RECONSTRUCTION = "drawing-reconstruction";
TOWER_PART_HIGHLIGHTING = "tower-part-highlighting";
DRAWING_RECONSTRUCTION = "drawing-part-highlighting";

INSTITUTION_MIT = "mit";
INSTITUTION_USCD = "ucsd";
NO_CODE = "NOCODE"

var logIfDebug = function (text) {
  if (DEBUG_MODE) {
    console.log(text);
  }
};

var constructDefaultExperimentalTimelineFromTrials = function (
  trials,
  institution,
  completionCode,
  surveyQuestions
) {
  /** Constructs a default experimental timeline from a set of experiment-specific trials. Appends a consent form and an exit survey. **/
  var timeline = [];
  if (DEBUG_TRIALS_ONLY) {
    timeline = trials;
  } else {
    timeline.push(constructDefaultConsent(institution));
    timeline = timeline.concat(trials);
    timeline.push(constructDefaultExitSurvey(completionCode, surveyQuestions));
  }
  logIfDebug(timeline);
  return timeline;
};

var constructDefaultConsent = function (institution) {
  var consent_html;
  logIfDebug(institution);
  switch (institution) {
    case INSTITUTION_MIT:
      consent_html = "../html/consent-mit.html";
      break;
    case INSTITUTION_USCD:
      consent_html = "../html/consent-ucsd.html";
      break;
    default:
      consent_html = "../html/consent-ucsd.html";
      break;
  }
  var consent = {
    type: "external-html",
    url: consent_html,
    cont_btn: "start",
  };
  return consent;
};

// var constructDefaultExitSurvey = function (completionCode) {
//   var comments_block = {
//     type: "survey-text",
//     preamble:
//       '<p>Thank you for participating in our study.</p><p><strong>Click "Finish" to complete the experiment and receive compensation.</strong> If you have any comments, please let us know in the form below.</p>',
//     questions: [{ prompt: "Do you have any comments to share with us?" }],
//     button_label: "Finish",
//     on_finish: function () {
//       document.body.innerHTML =
//         "<p> Please wait. You will be redirected back to Prolific in a few moments.</p>";
//       setTimeout(function () {
//         location.href =
//           "https://app.prolific.co/submissions/complete?cc=" + completionCode; // add correct completion code
//       }, 500);
//       sendData();
//     },
//   };
//   return comments_block;
// };

var constructDefaultExitSurvey = function (completionCode, surveyQuestions) {
  var comments_block = {
    type: "survey-text",
    preamble:
      '<p>Thank you for participating in our study!</p><p>Please answer the following quetsions, then <strong>click "Finish" to complete the experiment and receive compensation.</strong></p>',
    questions: surveyQuestions ? surveyQuestions : [{ prompt: "Do you have any comments to share with us?" }],
    button_label: "Finish",
    columns: 80,
    on_finish: function () {
      window.experimentFinished = true;
      document.body.innerHTML =
        "<p> Please wait. You will be redirected back to Prolific in a few moments.</p>";
      setTimeout(function () {
        location.href =
          "https://app.prolific.co/submissions/complete?cc=" + completionCode; // add correct completion code
      }, 500);
    },
  };
  return comments_block;
};

var constructExperimentTrialsForParameters = function (
  config,
  domain,
  condition,
  batchIndex,
  experimentTrialParameters,
  stimuliIdsToPreloadedStimuli,
  stimMetadata, // essential to forward information from mongo to trial construction
  dataSender
) {
  /** Constructs experiment-specific trials from the trial parameters block in a config. **/
  switch (experimentTrialParameters.type) {
    case EXPERIMENT_TRIAL_INSTRUCTIONS:
      return constructInstructionTrialsForParameters(
        config,
        domain,
        experimentTrialParameters,
        stimuliIdsToPreloadedStimuli
      );
    case EXPERIMENT_TRIAL_ATTENTION_CHECK_SURVEY_MULTIPLE_CHOICE:
      return constructAttentionCheckSurveyMultipleChoiceTrialsForParameters(
        config,
        domain,
        experimentTrialParameters
      );
    case EXPERIMENT_STIMULI_LANGUAGE_PRODUCTION:
      return constructStimuliLanguageProductionTrialsForParameters(
        config,
        domain,
        condition,
        batchIndex,
        experimentTrialParameters,
        stimuliIdsToPreloadedStimuli
      );
    case EXPERIMENT_STIMULI_PROCEDURAL_LANGUAGE_PRODUCTION:
      return constructStimuliProceduralLanguageProductionTrialsForParameters(
        config,
        domain,
        condition,
        batchIndex,
        experimentTrialParameters,
        stimuliIdsToPreloadedStimuli
      );
    case STIMULI_PRODUCTION:
      return constructStimuliProductionTrialsForParameters(
        config,
        domain,
        condition,
        batchIndex,
        experimentTrialParameters,
        stimuliIdsToPreloadedStimuli
      );
    case EXPERIMENT_STIMULI_CONTEXTUAL_LANGUAGE_PRODUCTION:
      return constructStimuliContextualLanguageProductionTrials(
        config,
        domain,
        condition,
        batchIndex,
        experimentTrialParameters,
        stimuliIdsToPreloadedStimuli
      )
    case STIMULI_CATEGORY_FAMILIARIZATION:
      return constructCategoryFamiliarizationTrials(
        config,
        domain,
        condition,
        batchIndex,
        experimentTrialParameters,
        stimuliIdsToPreloadedStimuli,
        stimMetadata
      )
    case TOWER_RECONSTRUCTION:
      return constructReconstructionTrials(
        config,
        domain,
        condition,
        batchIndex,
        experimentTrialParameters,
        stimuliIdsToPreloadedStimuli,
        stimMetadata,
        dataSender
      )
    case BUILD_INTERFACE_FAMILIARIZATION:
      return constructBuildInterfaceFamiliarizationTrials(
        config,
        experimentTrialParameters,
        dataSender
      )
    case DRAWING_RECONSTRUCTION:
      return constructReconstructionTrials(
        config,
        domain,
        condition,
        batchIndex,
        experimentTrialParameters,
        stimuliIdsToPreloadedStimuli,
        stimMetadata,
        dataSender
      )
    case TOWER_PART_HIGHLIGHTING:
      return constructPartHighlightingTrials(
        config,
        domain,
        condition,
        batchIndex,
        experimentTrialParameters,
        stimuliIdsToPreloadedStimuli,
        stimMetadata,
        dataSender
      )
    default:
      return [];
  }
};

var constructPartHighlightingTrials = function (
  config,
  domain,
  condition,
  batchIndex,
  experimentTrialParameters,
  stimuliIdsToPreloadedStimuli,
  stimMetadata,
  dataSender
){
  console.log('stimMetadata', stimMetadata);
  reconstructionTrials = [];
  if (domain == DOMAIN_TOWERS){
    trialNum = 0;
    stimMetadata.trials.forEach(trialData => {
      trialNum += 1;
      trial = {
        type: "jspsych-tower-part-highlighting",
        stimURL: trialData.stimURL,
        stimId: trialData.stimId,
        description: trialData.description,
        dataSender: () => dataSender,
        data: { trialNum: trialNum }
      }
      reconstructionTrials.push(trial);
      let instructionQualityTrial = {
        type: "html-slider-response",
        stimulus: `
        <div style="width: 500px">
          <p>How informative were these instructions?</p>
        </div>
        `,
        require_movement: true,
        labels: ["Highly uninformative", "Highly informative"],
        data: { trialNum: trialNum, 
                stimId: trialData.stimId,
                stimURL: trialData.stimURL,
                description: trialData.description,
                eventType: 'instruction_rating'
              },
      };
      reconstructionTrials.push(instructionQualityTrial);
    });
  } else if (domain == DOMAIN_DRAWING) {
    stimMetadata.trials.forEach(trialData => {
      trial = {
        type: "jspsych-drawing-reconstruction",
        stimURL: trialData.stimURL,
        stimId: trialData.stimId,
        description: trialData.description,
        dataSender: () => dataSender
      }
      reconstructionTrials.push(trial);
    });
  }

  return reconstructionTrials;
};


var constructReconstructionTrials = function (
  config,
  domain,
  condition,
  batchIndex,
  experimentTrialParameters,
  stimuliIdsToPreloadedStimuli,
  stimMetadata,
  dataSender
){
  console.log('stimMetadata', stimMetadata);
  reconstructionTrials = [];
  if (domain == DOMAIN_TOWERS){
    trialNum = 0;
    stimMetadata.trials.forEach(trialData => {
      trialNum += 1;
      trial = {
        type: "jspsych-tower-reconstruction",
        stimURL: trialData.stimURL,
        stimId: trialData.stimId,
        description: trialData.description,
        dataSender: () => dataSender,
        data: { trialNum: trialNum }
      }
      reconstructionTrials.push(trial);
      let instructionQualityTrial = {
        type: "html-slider-response",
        stimulus: `
        <div style="width: 500px">
          <p>How informative were these instructions?</p>
        </div>
        `,
        require_movement: true,
        labels: ["Highly uninformative", "Highly informative"],
        data: { trialNum: trialNum, 
                stimId: trialData.stimId,
                stimURL: trialData.stimURL,
                description: trialData.description,
                eventType: 'instruction_rating'
              },
      };
      reconstructionTrials.push(instructionQualityTrial);
      // let reconstructionQualityTrial = {
      //   type: "html-slider-response",
      //   stimulus: `
      //   <div style="width: 500px">
      //     <p>How accurately do you think your structure reflects the architect's underlying blueprints.</p>
      //   </div>
      //   `,
      //   require_movement: false,
      //   labels: ["Completely Inaccurate", "Some Innaccuracies", "Perfectly Accurate"]
      // };
      // reconstructionTrials.push(reconstructionQualityTrial);
    });
  } else if (domain == DOMAIN_DRAWING) {
    stimMetadata.trials.forEach(trialData => {
      trial = {
        type: "jspsych-drawing-reconstruction",
        stimURL: trialData.stimURL,
        stimId: trialData.stimId,
        description: trialData.description,
        dataSender: () => dataSender
      }
      reconstructionTrials.push(trial);
    });
  }

  return reconstructionTrials;
};

var constructBuildInterfaceFamiliarizationTrials = function (
  config,
  experimentTrialParameters,
  dataSender
){
  console.log('constructing build-interface-familiarization trial');
  let trial = {
    type: "jspsych-build-interface-familiarization",
    offset: experimentTrialParameters.offset,
    endCondition: experimentTrialParameters.endCondition,
    stimulus: experimentTrialParameters.stimulus,
    dataSender: () => dataSender
  };
  return [trial];
}

var constructInstructionTrialsForParameters = function (
  config,
  domain,
  experimentTrialParameters,
  stimuliIdsToPreloadedStimuli
) {
  logIfDebug("Constructing instruction trials.");
  return [
    {
      type: EXPERIMENT_TRIAL_INSTRUCTIONS,
      pages: experimentTrialParameters.pages,
      show_clickable_nav: true,
    },
  ];
};

var constructAttentionCheckSurveyMultipleChoiceTrialsForParameters = function (
  config,
  domain,
  experimentTrialParameters
) {
  // Runs a multiple choice attention check until you run out of valid tries or get it correct.

  logIfDebug("Constructing attention check.");
  // Construct the basic attention check.
  valid_tries = experimentTrialParameters["valid_tries"]
  base_attention_check = {
    type: "survey-multi-choice",
    preamble: experimentTrialParameters["preamble"],
    data: {},
    questions: experimentTrialParameters['questions'].map(function (question) {
      return {
        prompt: question['prompt'],
        options: question['options'],
        required: true
      }
    }),
    on_finish: function (data) {
      // JSPsych stores responses in the form Q0, Q1...
      data.familiarization_check_correct = true;
      var responses = JSON.parse(data.responses);
      for (let q_index = 0; q_index < experimentTrialParameters['questions'].length; q_index++) {
        correctAnswer = experimentTrialParameters['questions'][q_index]['answer'];
        userAnswer = responses['Q' + q_index];
        logIfDebug(correctAnswer);
        logIfDebug(userAnswer);
        if (!(userAnswer == correctAnswer)) {
          data.familiarization_check_correct = false;
        }
      }
    }
  }
  var loop_node = {
    timeline: [base_attention_check],
    loop_function: function (data) {
      data = jsPsych.data.get().last(1).values()[0];
      num_tries = parseInt(data.internal_node_id.split(".").slice(-1)[0]) + 1;
      is_tries_left = num_tries < valid_tries;
      is_incorrect = !data.familiarization_check_correct;
      should_loop = is_incorrect && is_tries_left;

      if (!should_loop && !data.familiarization_check_correct) {
        document.body.innerHTML =
          "<p> Sorry, you have not succeeded in passing the qualification check for this study. Please wait. You will be redirected back to Prolific in a few moments. You will receive a NOCODE, but will be compensated for the time you have taken for this qualification check.</p>";
        setTimeout(function () {
          location.href =
            "https://app.prolific.co/submissions/complete?cc=" + NO_CODE;
        }, 500);
        sendData();
      }
      return should_loop;
    }
  }
  return [loop_node];
}

var constructStimuliProductionTrialsForParameters = function (
  config,
  domain,
  condition,
  batchIndex,
  experimentTrialParameters,
  stimuliIdsToPreloadedStimuli
) {
  logIfDebug("Constructing stimuli production trials.");

  stimuliBatch = getStimuliBatchForTrialBlockByCondition(
    config,
    domain,
    condition,
    batchIndex,
    experimentTrialParameters.stimuli,
    stimuliIdsToPreloadedStimuli
  );

  var productionTrials = [];
  if (domain == DOMAIN_DRAWING) {
    stimuliBatch.forEach(function (stimuliId) {
      let trial = {
        type: "jspsych-sketchpad-display",
        domain: domain,
        label_prompt: experimentTrialParameters.label_prompt,
        stimulus: stimuliIdsToPreloadedStimuli[stimuliId],
        stimURL: stimuliIdsToPreloadedStimuli[stimuliId],
        stimId: stimuliId,
        post_trial_gap: 500,
      };
      productionTrials.push(trial);
    });
  } else if (domain == DOMAIN_TOWERS) {
    stimuliBatch.forEach(function (stimuliId) {
      let trial = {
        type: "jspsych-tower-building",
        domain: domain,
        stimulus: stimuliIdsToPreloadedStimuli[stimuliId],
        stimURL: stimuliIdsToPreloadedStimuli[stimuliId],
        stimId: stimuliId,
        preamble: experimentTrialParameters.label_prompt
      }
      productionTrials.push(trial);
    });
  } else {
    logIfDebug("ERROR: unknown domain.");
  }

  return productionTrials;
};

var constructStimuliLanguageProductionTrialsForParameters = function (
  config,
  domain,
  condition,
  batchIndex,
  experimentTrialParameters,
  stimuliIdsToPreloadedStimuli
) {
  logIfDebug("Constructing stimuli language production trials.");

  stimuliBatch = getStimuliBatchForTrialBlockByCondition(
    config,
    domain,
    condition,
    batchIndex,
    experimentTrialParameters.stimuli,
    stimuliIdsToPreloadedStimuli
  );

  var languageProductionTrials = [];
  if (domain == DOMAIN_DRAWING || domain == DOMAIN_TOWERS) {
    stimuliBatch.forEach(function (stimuliId) {
      let trial = {
        type: EXPERIMENT_STIMULI_LANGUAGE_PRODUCTION,
        domain: domain,
        stimulus: stimuliIdsToPreloadedStimuli[stimuliId],
        stimURL: stimuliIdsToPreloadedStimuli[stimuliId],
        stimId: stimuliId,
        questions: [
          // can add more questions for each stimulus here if wanted
          {
            prompt: experimentTrialParameters.label_prompt,
            required: true,
            columns: 50,
            rows: 5,
          },
        ],
        post_trial_gap: 500,
      };
      languageProductionTrials.push(trial);
    });
  } else {
    logIfDebug("ERROR: unknown domain.");
  }

  return languageProductionTrials;
};

// For collection of step by step procedures.
var constructStimuliProceduralLanguageProductionTrialsForParameters = function (
  config,
  domain,
  condition,
  batchIndex,
  experimentTrialParameters,
  stimuliIdsToPreloadedStimuli
) {
  logIfDebug("Constructing stimuli language production trials.");

  stimuliBatch = getStimuliBatchForTrialBlockByCondition(
    config,
    domain,
    condition,
    batchIndex,
    experimentTrialParameters.stimuli,
    stimuliIdsToPreloadedStimuli
  );

  var languageProductionTrials = [];
  if (domain == DOMAIN_DRAWING || domain == DOMAIN_TOWERS) {
    stimuliBatch.forEach(function (stimuliId) {
      let trial = {
        type: EXPERIMENT_STIMULI_PROCEDURAL_LANGUAGE_PRODUCTION,
        domain: domain,
        stimulus: stimuliIdsToPreloadedStimuli[stimuliId],
        stimURL: stimuliIdsToPreloadedStimuli[stimuliId],
        firstRowPrompt: experimentTrialParameters.firstRowPrompt,
        additionalRowPrompt: experimentTrialParameters.additionalRowPrompt,
        stimId: stimuliId,
        questions: [
          // can add more questions for each stimulus here if wanted
          {
            prompt: experimentTrialParameters.labelPrompts[0],
            placeholder: experimentTrialParameters.labelPrompts[0],
            name: experimentTrialParameters.labelPrompts[0],
            required: true,
            columns: 40,
            rows: 1,
          },
          {
            prompt: experimentTrialParameters.labelPrompts[1],
            placeholder: experimentTrialParameters.labelPrompts[1],
            name: experimentTrialParameters.labelPrompts[1],
            required: true,
            columns: 40,
            rows: 1,
          },
        ],
        post_trial_gap: 500,
      };
      languageProductionTrials.push(trial);
    });
  } else {
    logIfDebug("ERROR: unknown domain.");
  }

  return languageProductionTrials;
};

var constructStimuliContextualLanguageProductionTrials = function (
  config,
  domain,
  condition,
  batchIndex,
  experimentTrialParameters,
  stimuliIdsToPreloadedStimuli
) {
  logIfDebug("Constructing stimuli language production trials.");

  stimuliBatch = getStimuliBatchForTrialBlockByCondition(
    config,
    domain,
    condition,
    batchIndex,
    experimentTrialParameters.stimuli,
    stimuliIdsToPreloadedStimuli
  );

  var currStimBatch = experimentTrialParameters.demo ? ['demo_stim'] : stimuliBatch;

  var languageProductionTrials = [];
  if (domain == DOMAIN_DRAWING || domain == DOMAIN_TOWERS) {
    currStimBatch.forEach(function (stimId, trial_num) { //added trial_num
      let trial = {
        type: "stimuli-contextual-language-production",
        domain: domain,
        batch_trial_num: trial_num, // added trial_num
        label_prompt: experimentTrialParameters.label_prompt,
        stimulus: experimentTrialParameters.demo ? 'demo_stim' : stimuliIdsToPreloadedStimuli[stimId],
        stimURL: experimentTrialParameters.demo ? '../../static/img/' + domain + '_' + 'demo_stim' + '.png' : stimuliIdsToPreloadedStimuli[stimId],
        stimId: experimentTrialParameters.demo ? 'demo_stim' : stimId,
        stimBatch: currStimBatch,
        stimURLs: experimentTrialParameters.demo ? { stimId: '../../static/img/' + domain + '_' + 'demo_stim' + '.png' } : stimuliIdsToPreloadedStimuli,
        post_trial_gap: 500,
        demo: experimentTrialParameters.demo,
        maxRows: experimentTrialParameters.maxRows,
        firstRowPrompt: experimentTrialParameters.firstRowPrompt,
        additionalRowPrompt: experimentTrialParameters.additionalRowPrompt,
        questions: [
          // can add more questions for each stimulus here if wanted
          {
            prompt: experimentTrialParameters.labelPrompts[0],
            placeholder: experimentTrialParameters.labelPrompts[0],
            name: experimentTrialParameters.labelPrompts[0],
            required: true,
            columns: 40,
            rows: 1,
          },
          {
            prompt: experimentTrialParameters.labelPrompts[1],
            placeholder: experimentTrialParameters.labelPrompts[1],
            name: experimentTrialParameters.labelPrompts[1],
            required: true,
            columns: 40,
            rows: 1,
          },
        ]
      };
      languageProductionTrials.push(trial);

    });

  } else {
    logIfDebug("ERROR: unknown domain.");
  }

  return languageProductionTrials;
}

var constructCategoryFamiliarizationTrials = function (
  config,
  domain,
  condition,
  batchIndex,
  experimentTrialParameters,
  stimuliIdsToPreloadedStimuli,
  stimMetadata
) {

  stimuliBatch = getStimuliBatchForTrialBlockByCondition(
    config,
    domain,
    condition,
    batchIndex,
    experimentTrialParameters.stimuli,
    stimuliIdsToPreloadedStimuli,
  );

  if (experimentTrialParameters.useRandomStimuli) { 
    if (!experimentTrialParameters.leaveOutStims){
      // totally random stims
      logIfDebug('totally random familiarization set');
      var nStimuli = experimentTrialParameters.nStimuli;
      var randomStimValues = getRandomStimuli(config, domain, nStimuli, []);
      stimuliBatch = randomStimValues[0];
      stimuliIdsToPreloadedStimuli = randomStimValues[1];
    } else {
      let leaveOutSet = _.map(stimMetadata.trials, (trial) => {return trial.stimID});
      logIfDebug('random familiarization set minus: ', leaveOutSet);
      // random stims minus main set
      var nStimuli = experimentTrialParameters.nStimuli;
      var randomStimValues = getRandomStimuli(config, domain, nStimuli, leaveOutSet);
      stimuliBatch = randomStimValues[0];
      stimuliIdsToPreloadedStimuli = randomStimValues[1];
    }
  }

  let trial = {
    type: "jspsych-category-familiarization",
    domain: domain,
    label_prompt: experimentTrialParameters.label_prompt,
    stimBatch: stimuliBatch,
    stimURLs: stimuliIdsToPreloadedStimuli,
    requireClickThrough: experimentTrialParameters.requireClickThrough,
  }

  console.log(trial);

  return [trial];
}

var getStimuliBatchForTrialBlockByCondition = function (
  config,
  domain,
  condition,
  batchIndex,
  trialBlockStimuli,
  stimuliIdsToPreloadedStimuli
) {
  /** Gets a batch of stimuli from a selected possible set. Performs randomized shuffling within the trial block if need be. **/
  var trialBlockStimuliIdsForCondition = trialBlockStimuli[condition];
  if (trialBlockStimuli[condition] == CONST_ALL) {
    trialBlockStimuliIdsForCondition = Object.keys(
      stimuliIdsToPreloadedStimuli
    );
  }
  stimuliBatchForTrials = shuffleStimuliAndGetBatch(
    config,
    batchIndex,
    trialBlockStimuliIdsForCondition
  );

  return stimuliBatchForTrials;
};

var shuffleStimuliAndGetBatch = function (config, batchIndex, stimuliArray) {
  /** Shuffles the stimuli in array according to stimuliShuffleSeed and gets a batch at the index. **/
  stimuliShuffleSeed = config.experiment_parameters.stimuli_shuffle_seed;
  shuffledStimuliArray = shuffle(stimuliArray, stimuliShuffleSeed);
  var batchSize = shuffledStimuliArray.length;
  if (config.experiment_parameters.stimuli_batch_size !== CONST_ALL) {
    batchSize = config.experiment_parameters.stimuli_batch_size;
  }
  batchedStimuli = _.chunk(shuffledStimuliArray, batchSize);
  stimuliBatch = batchedStimuli[batchIndex];
  return stimuliBatch;
};

var shuffle = function (array, seed) {
  /** Seeded random shuffling. 
    Credit: https://github.com/yixizhang/seed-shuffle **/
  let currentIndex = array.length,
    temporaryValue,
    randomIndex;
  seed = seed || 1;
  let random = function () {
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };
  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(random() * currentIndex);
    currentIndex -= 1;
    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }
  return array;
};

var serveFile = function (req, res) {
  var fileName = req.params[0];
  //console.log('\t :: Express :: file requested: ' + fileName);
  return res.sendFile(fileName, { root: __base });
};

var handleDuplicate = function (req, res) {
  console.log("duplicate id: blocking request");
  return res.redirect("/static/html/duplicate.html");
};

var handleInvalidID = function (req, res) {
  console.log("invalid id: blocking request");
  return res.redirect("/static/html/invalid.html");
};

var checkPreviousParticipant = function (workerId, callback) {
  var p = { workerId: workerId };
  console.log("checking participant for duplicates: ", workerId.toString());
  var postData = {
    dbname: "compositional-abstractions",
    query: p,
    projection: { _id: 1 },
  };
  sendPostRequest(
    "http://localhost:5000/db/exists",
    { json: postData },
    (error, res, body) => {
      try {
        if (!error && res.statusCode === 200) {
          //console.log("success! Received data " + JSON.stringify(body));
          callback(body);
        } else {
          throw `${error}`;
        }
      } catch (err) {
        console.log(err);
        console.log("no database; allowing participant to continue");
        return callback(false);
      }
    }
  );
};

const k_combinations = (set, k) => {
  if (k > set.length || k <= 0) {
    return [];
  }

  if (k == set.length) {
    return [set];
  }

  if (k == 1) {
    return set.reduce((acc, cur) => [...acc, [cur]], []);
  }

  let combs = [],
    tail_combs = [];

  for (let i = 0; i <= set.length - k + 1; i++) {
    tail_combs = k_combinations(set.slice(i + 1), k - 1);
    for (let j = 0; j < tail_combs.length; j++) {
      combs.push([set[i], ...tail_combs[j]]);
    }
  }

  return combs;
};

const combinations = (set) => {
  return set.reduce(
    (acc, cur, idx) => [...acc, ...k_combinations(set, idx + 1)],
    []
  );
};

var writeDataToCSV = function (game, _dataPoint) {
  var dataPoint = _.clone(_dataPoint);
  var eventType = dataPoint.eventType;

  // Omit sensitive data
  if (game.anonymizeCSV)
    dataPoint = _.omit(dataPoint, ["workerId", "assignmentId"]);

  // Establish stream to file if it doesn't already exist
  if (!_.has(game.streams, eventType)) establishStream(game, dataPoint);

  var line = _.values(dataPoint).join("\t") + "\n";
  game.streams[eventType].write(line, (err) => {
    if (err) throw err;
  });
};

// var writeDataToMongo = function (game, line) {
//   var postData = _.extend(
//     {
//       dbname: game.projectName,
//       colname: game.experimentName,
//     },
//     line
//   );
//   sendPostRequest(
//     "http://localhost:6021/db/insert",
//     { json: postData },
//     (error, res, body) => {
//       if (!error && res.statusCode === 200) {
//         console.log(`sent data to store`);
//       } else {
//         console.log(`error sending data to store: ${error} ${body}`);
//       }
//     }
//   );
// };


var addPptToMongo = function (postData) {
  sendPostRequest(
    "http://localhost:6021/db/insert",
    { json: postData },
    (error, res, body) => {
      if (!error && res.statusCode === 200) {
        console.log(`sent data to store`);
      } else {
        console.log(`error sending data to store: ${error} ${body}`);
      }
    }
  );
};

var UUID = function () {
  var baseName =
    Math.floor(Math.random() * 10) +
    "" +
    Math.floor(Math.random() * 10) +
    "" +
    Math.floor(Math.random() * 10) +
    "" +
    Math.floor(Math.random() * 10);
  var template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
  var id =
    baseName +
    "-" +
    template.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0,
        v = c == "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  return id;
};

var getURLParams = function () {
  var match,
    pl = /\+/g, // Regex for replacing addition symbol with a space
    search = /([^&=]+)=?([^&]*)/g,
    decode = function (s) {
      return decodeURIComponent(s.replace(pl, " "));
    },
    query = location.search.substring(1);

  var urlParams = {};
  while ((match = search.exec(query))) {
    urlParams[decode(match[1])] = decode(match[2]);
  }
  return urlParams;
};


var getRandomStimuli = function (config, domain, nStimuli, leaveOutSet) {
  var totalStimuli = config.experiment_parameters.s3_bucket_total_stimuli;
  logIfDebug(`Sampling ${nStimuli} random images from a total of ${totalStimuli}.`)

  if(!leaveOutSet){
    leaveOutSet = [];
  }

  var idOptions = [];
  for (var i = 0; i < totalStimuli; i++) {
    if(!leaveOutSet.includes(i)){
      idOptions.push(i)
    }
  }

  function getRandomFromBucket(bucket) {
    var randIndex = Math.floor(Math.random() * bucket.length);
    return bucket.splice(randIndex, 1)[0];
  }

  var stimuliBatch = [];
  for (var i = 0; i < nStimuli; i++) {
    var randomId = getRandomFromBucket(idOptions);
    stimuliBatch.push(randomId);
  }

  stimuliUrls = getStimuliIdsToStimuliURLs(config, domain, stimuliBatch);
  return [stimuliBatch, stimuliUrls]
}

var getStimuliIdsToStimuliURLs = function (config, domain, stimuliIds) {
  /** :ret: {stimuliId : URL path corresponding to stimuli IDs.}  */

  s3BucketName = config.experiment_parameters.s3_bucket;
  stimuliIdsToStrings = getStimuliIdsToPaddedStrings(
    stimuliIds,
    config.experiment_parameters.s3_bucket_total_stimuli
  );
  if (domain === DOMAIN_DRAWING) {
    Object.keys(stimuliIdsToStrings).map(function (stimuliId, _) {
      stimuliIdsToStrings[stimuliId] = getS3DrawingStimuliUrl(
        s3BucketName,
        stimuliIdsToStrings[stimuliId]
      );
    });
    return stimuliIdsToStrings;
  } else if (domain === DOMAIN_TOWERS) {
    stimuliVersionPrefix = config.experiment_parameters.s3_stimuli_path_format;
    Object.keys(stimuliIdsToStrings).map(function (stimuliId, _) {
      stimuliIdsToStrings[stimuliId] = getS3TowersStimuliUrl(
        s3BucketName,
        stimuliVersionPrefix,
        stimuliIdsToStrings[stimuliId],
        config.experiment_parameters.s3_stimuli_path_suffix,
        config.experiment_parameters.stimFileExt
      );
    });
    return stimuliIdsToStrings;
    
  } else {
    logIfDebug("ERROR: unknown domain.");
  }
};

var getStimuliIdsToPaddedStrings = function (stimuliIds, totalStimuli) {
  /** : ret: {stimuliId to 0-padded ID strings corresponding to ID numbers}. Constructs  [0 - total-stimuli] IDs if stimuliIds is ALL **/
  if (stimuliIds === CONST_ALL) {
    stimuliIds = [...Array(totalStimuli).keys()];
  }
  let stimuliIdsToStrings = Object.fromEntries(
    stimuliIds.map((stimuliId) => [
      stimuliId,
      String(stimuliId).padStart(3, "0"),
    ])
  );

  return stimuliIdsToStrings;
};

var getS3DrawingStimuliUrl = function (s3BucketName, stimuliIdString) {
  return (
    "https://" +
    s3BucketName +
    ".s3.amazonaws.com/" +
    s3BucketName +
    "-" +
    stimuliIdString +
    ".png"
  );
};

var getS3TowersStimuliUrl = function (
  /**
   * Edited since 4-block prior_elicitation. File names may not be consistent.
   * In particular, you now need to specify file extension in config.
   * Stims now require '-' rather than '_'. 
   */

  s3BucketName,
  stimuliVersionPrefix,
  stimuliIdString,
  suffix,
  stimFileExt
) {
  return (
    "https://" +
    s3BucketName +
    ".s3.amazonaws.com/" +
    stimuliVersionPrefix +
    "-" +
    stimuliIdString +
    (suffix ? "-" + suffix : "") +
    "." + (stimFileExt ? stimFileExt : "json")
  );
};

var getS3TowersURL = function (stimInfo, stimId) {
  url =
    "https://" +
    stimInfo.s3Bucket +
    ".s3.amazonaws.com/" +
    stimInfo.stimVersion +
    "_" +
    stimId +
    ".json"; //watch out for correct number of digits

  return url;
};

var getStimuliIdsToPreloadedStimuli = function (
  domain,
  stimuliIdsToUrls,
  fileExt,
  callback
) {
  /** :ret: {stimuliID to preloaded stimuli, then calls callback} */

  if (fileExt === "json") {
    getTowerStimuliJSONsFromUrls(stimuliIdsToUrls, (stimuliIdsToJSONs) => {
      callback(stimuliIdsToJSONs);
    })
  } else {
    callback(stimuliIdsToUrls);
  }
  // } else {
  //   logIfDebug("ERROR: unknown domain.");
  // }
};

var getTowerStimuliJSONsFromUrls = function (stimuliIdsToUrls, callback) {
  let stimuliIdsToJSONs = {};
  var stimJSONPromise = new Promise((resolve, reject) => {
    Object.keys(stimuliIdsToUrls).forEach((stimuliId, index, array) => {
      getJSON(stimuliIdsToUrls[stimuliId], function (err, data) {
        if (err !== null) {
          logIfDebug("Unable to load: " + stimuliIdsToUrls[stimuliId]);
        } else {
          stimuliIdsToJSONs[stimuliId] = data;
          // if (index === array.length - 1) resolve();
          if (Object.keys(stimuliIdsToJSONs).length === array.length) { resolve() }
        }
      });
    });
  });

  stimJSONPromise.then(() => {
    // const stims = stimJSONs;
    callback(stimuliIdsToJSONs);
  });
};

var getJSON = function (url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.responseType = "json";
  xhr.onload = function () {
    var status = xhr.status;
    if (status === 200) {
      callback(null, xhr.response);
    } else {
      callback(status, xhr.response);
    }
  };
  xhr.send();
};
