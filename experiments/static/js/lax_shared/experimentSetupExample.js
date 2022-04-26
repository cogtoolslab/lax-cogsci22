/*
experimentSetupExample.js  | Credit: JSPsych.

Reference file containing common functionality from the JSPsych example.
*/

//WPM: just saved these here for reference- feel free to remove if not helpful

var instructions = {
  type: "html-button-response",
  stimulus:
    "<p>In this experiment, you will see one picture on the screen at a time.</p>\
  <p>Please describe this object as best as you can in <strong>one or two words</strong>.</p>",
  choices: ["Start"],
  data: { test_part: "setup" },
  post_trial_gap: 1000,
};
timeline.push(instructions);

var iso_item_block = {
  type: "html-button-response",
  stimulus:
    "<p>In this experiment, you will see one picture on the screen at a time.</p>\
<p>Please describe this object as best as you can in <strong>one or two words</strong>.</p><p>",
  choices: ["Continue"],
  data: { test_part: "block-setup" },
  post_trial_gap: 500,
};

//load stimuli
var stimuli = [];

// for (var i = 0, j = 1; i < j; i++){ //don't hardcode stim count...
//     stimuli.push({target: "prior-stimuli/tower_"+i+".png"});
//     // stimuli.push({target: "../../stimuli/tower_stim_silhouettes/tower_"+i+".png"});
//     // stimuli.push({target: "../stimuli/tower_stim_unique_silhouettes/tower_"+i+".png"});
// }

var iso_trial = {
  type: "survey-text",
  preamble: function () {
    var target =
      "<img style='border: 10px solid blue; margin: 50px' src='" +
      jsPsych.timelineVariable("target", true) +
      "' height='200px'>";
    return target;
  },
  questions: [
    {
      prompt: "Describe the object in <strong>one or two words</strong>",
      required: true,
      columns: 20,
    },
  ],
  post_trial_gap: 500,
};

var prior_iso_trial = {
  timeline: [iso_trial],
  timeline_variables: stimuli,
  randomize_order: true,
  repetitions: 1,
  data: { test_part: "trial" },
};

// var alltrials = jsPsych.randomization.sampleWithoutReplacement([tangram_close_trial, tangram_far_trial, tangram_iso_trial,familiar_close_trial, familiar_far_trial, familiar_iso_trial], 6);
//var alltrials = jsPsych.randomization.sampleWithoutReplacement([prior_iso_trial], 1);
var alltrials = jsPsych.randomization.repeat([prior_iso_trial], 1);
// var exitSurveyChoice = {
//   type: 'survey-multi-choice',
//   preamble: "<strong><u>Survey</u></strong>",
//   questions: [{
//     prompt: "What is your sex?",
//     name: "participantSex",
//     horizontal: true,
//     options: ["Male", "Female", "Neither/Other/Do Not Wish To Say"],
//     required: true
//   },
//   {
//     prompt: "Did you encounter any technical difficulties while completing this study? \
//         This could include: images were glitchy (e.g., did not load), ability to click \
//         was glitchy, or sections of the study did \
//         not load properly.",
//     name: "technicalDifficultiesBinary",
//     horizontal: true,
//     options: ["Yes", "No"],
//     required: true
//   }
//   ],
//   on_finish: main_on_finish
// };
// var multi_choice_block = {
//     type: 'survey-text-exit',
//   questions: [
//     { prompt: "Please enter your age:" },
//     { prompt: "What strategies did you use to describe the shapes?", rows: 5, columns: 40 },
//     { prompt: "Any final thoughts?", rows: 5, columns: 40 }
//   ],
//   on_finish: main_on_finish
// };

var goodbye = {
  type: "instructions",
  pages: [
    "Congrats! You are all done. Thanks for participating in our experiment! \
  Click NEXT to submit this study.",
  ],
  show_clickable_nav: true,
  allow_backward: false,
  delay: false,
  on_finish: function () {
    // $(".confetti").remove();
    document.body.innerHTML =
      "<p> Please wait. You will be redirected back to Prolific in a few moments.</p>";
    setTimeout(function () {
      location.href =
        "https://app.prolific.co/submissions/complete?cc=1580086C";
    }, 500);
    sendData();
  },
  //change the link below to your prolific-provided URL
  // window.open("https://app.prolific.co/submissions/complete?cc=7A827F20","_self");
};

for (i = 0; i < alltrials.length; i++) {
  console.log(alltrials[i].data);
  //   if(alltrials[i].data.competitor_type != "isolated")
  //         timeline.push(paired_item_block)
  //   else
  timeline.push(iso_item_block);
  timeline.push(alltrials[i]);
}
