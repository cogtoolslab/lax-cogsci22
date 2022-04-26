/*
 * Block tower display.
 *
 * Requirements:
 *  block Display widget (i.e. import blockConfig.js and blockDisplay.js above this plugin in html)
 */

jsPsych.plugins["jspsych-build-interface-familiarization"] = (function () {
  var plugin = {};

  plugin.info = {
    name: "jspsych-build-interface-familiarization",
    parameters: {
      stimId: {
        type: jsPsych.plugins.parameterType.STRING,
        default: "None",
      },
      stimURL: {
        type: jsPsych.plugins.parameterType.STRING, // BOOL, STRING, INT, FLOAT, FUNCTION, KEYCODE, SELECT, HTML_STRING, IMAGE, AUDIO, VIDEO, OBJECT, COMPLEX
        default: "",
      },
      stimulus: {
        type: jsPsych.plugins.parameterType.OBJECT,
        default: [{ "x": 0, "y": 0, "width": 2, "height": 1 },
        { "x": 0, "y": 1, "width": 1, "height": 2 },
        { "x": 0, "y": 3, "width": 1, "height": 2 },
        { "x": 0, "y": 5, "width": 2, "height": 1 }],
      },
      endCondition: {
        type: jsPsych.plugins.parameterType.OBJECT,
        default:'external',
      },
      description: {
        type: jsPsych.plugins.parameterType.OBJECT,
        default: "default instructions",
      },
      label_prompt: {
        type: jsPsych.plugins.parameterType.STRING,
        default: `
        <p>Rebuild the structure from the left in the window on the right.</br> When you've rebuilt the structure perfectly you'll automatically be moved on to the next part of the experiment.</p>
        `,
      },
      dataSender: {
        type: jsPsych.plugins.parameterType.OBJECT,
        default: {},
      },
      nBlocksPlaced: {
        type: jsPsych.plugins.parameterType.INT,
        default: 0,
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
      offset: {
        type: jsPsych.plugins.parameterType.INT,
        default: 0,
      },
      endCondition: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: "triggers end of trial",
        default: "perfect-reconstruction-translation",
        description: "look at block_widget for info.",
      },
      // trialNum: {
      //   type: jsPsych.plugins.parameterType.INT,
      //   pretty_name: "Trial number provided from experiment setup",
      //   default: -1,
      // },
    },
  };

  plugin.trial = function (display_element, trial) {
    console.log(trial);

    buildTrialHTML(display_element, trial);

    // const sanityChecker = new SanityChecker(instructionWidget);
    const undoredoManager = new UndoRedoManager();

    // extra controls
    function controlHandler(event) {
      switch (event.keyCode) {
        case 68: // d: switch selected block
          switchSelectedBlock();
          break;
        case 32: // space: switch selected block
          event.preventDefault(); //stop spacebar scrolling 
          switchSelectedBlock();
          break;
        case 27: // escape: stop placing block
          stopPlacingBlock();
          break;
        case 90: // z: undo
          if (event.ctrlKey) {
            if (event.shiftKey){
              undoredoManager.redo();
            } else {
            undoredoManager.undo();
            }
          } else if (event.metaKey){
            if (event.shiftKey){
              undoredoManager.redo();
            } else {
            undoredoManager.undo();
            }
          }
          break;
        case 89: // y: redo
          if (event.ctrlKey) {
            undoredoManager.redo();
          } else if (event.metaKey){
            event.preventDefault();
            undoredoManager.redo();
          }
          break;
        default:
          break;
      }
    }

    $(document).on("keydown", controlHandler);

    $("#environment-canvas").contextmenu(function(event) {
      switchSelectedBlock();
      console.log(event);
      event.preventDefault();
    });

    // data io
    var nBlocksPlacedInStep = 0;


    trial.blockSender = function(block_data) { // called by block_widget when a block is placed
      undoredoManager.redostack = [];
      trial.nBlocksPlaced += 1;
      nBlocksPlacedInStep += 1;
      trial.dataSender(
        _.extend(
          block_data,
          {
            datatype: 'block_placement',
            trial: "build-interface-familizarization",
            rt: performance.now() - startTime
          })
      );
    };

    undoredoManager.addEventListener("undo", (blockData) => {
      trial.nBlocksPlaced -= 1;
      nBlocksPlacedInStep -= 1;
      trial.dataSender(
        _.extend(
          blockData,
          {
            datatype: 'block_undo_placement',
            trial: "build-interface-familizarization",
            rt: performance.now() - startTime
          })
      );
    });

    undoredoManager.addEventListener("redo", (blockData) => {
      trial.nBlocksPlaced += 1;
      nBlocksPlacedInStep += 1;
      trial.dataSender(
        _.extend(
          blockData,
          {
            datatype: 'block_redo_placement',
            trial: "build-interface-familizarization",
            rt: performance.now() - startTime
          })
      );
    });

    // trial sequence
    setTimeout(() => {
      $("button.next-trial-button").click(() => {
        if (sanityChecker.check() || sanityChecker.confirm()) {
          $(document).off("keydown", controlHandler); // remove keydown events
          window.blockUniverse.endBuilding();
        }
      });
    }, 200);

    resetBuilding = function () {
      trial.nResets += 1;
      trial.nBlocksPlaced = 0;
 
      if (_.has(window.blockUniverse, 'p5env') ||
        _.has(window.blockUniverse, 'p5stim')) {
          window.blockUniverse.removeEnv();
        // blockUniverse.removeStimWindow();
      };
    };

    trial.endBuildingTrial = function (buildingData) {

      var endTime = performance.now();
      var response_time = endTime - startTime;

      var trialData = _.extend(buildingData, {
        rt: response_time,
        stimulus: JSON.stringify(trial.stimulus),
        stimId: trial.stimId,
        stimURL: trial.stimURL,
        description: trial.description,
        nBlocksPlaced: trial.nBlocksPlaced,
        // trialNum: trial.trialNum
      });

      display_element.innerHTML = "";
      resetBuilding();

      $(document).off("keydown", controlHandler); // remove keydown events

      // next trial
      jsPsych.finishTrial(trialData);
      
    }
  };


let buildTrialHTML = function(display_element, trial) {
  display_element.innerHTML = "";

  const promptElem = document.createElement("div");
  promptElem.innerHTML = trial.label_prompt;
  display_element.append(promptElem);
  const container = document.createElement("div");
  display_element.append(container)
  container.style.setProperty("display", "flex");
  container.style.setProperty("margin-bottom", "25px");

  const templateElem = document.createElement("div");
  templateElem.id = "template"
  container.append(templateElem);

  const canvasContainer = document.createElement("div");
  canvasContainer.classList.add("any-canvas");
  canvasContainer.id = "environment-canvas";

  // const envBtns = document.createElement("div");
  // const nextTrialBtn = document.createElement("button");
  // nextTrialBtn.innerText = "Finished Building";
  // nextTrialBtn.classList.add("btn","next-trial-button");
  // envBtns.append(nextTrialBtn);

  const templateCanvasContainer = document.createElement("div");
  templateCanvasContainer.classList.add("any-canvas");
  templateCanvasContainer.id = "stimulus-canvas";
  container.append(templateCanvasContainer);

  container.append(canvasContainer);

  const controlInstructions = document.createElement("div");
  controlInstructions.classList.add("alert", "alert-info", "controls");
  controlInstructions.innerHTML = `
  <h2>Controls</h2>
  <h3>Switch Block Type</h3>
  <ul>
    <li>left click on a block in the tray</li>
    <li>or right click</li>
    <li>or press <kbd>space</kdb></li>
  </ul>
  <h3>Undo/Redo</h3>
  <ul>
    <li>Undo: <kbd>ctrl</kbd>/<kbd>cmd</kbd>+<kbd>z</kbd></li>
    <li>Redo: <kbd>ctrl</kbd>/<kbd>cmd</kbd>+<kbd>y</kbd></li>
  </ul>
  `;
  container.append(controlInstructions)

  setTimeout(() => {
    var showStimulus = true;
    var showBuilding = true;
    console.log(trial);
    window.blockSetup(trial, showStimulus, showBuilding);
    // canvasContainer.append(envBtns);
  }, 200);
}



  var startTime = performance.now();

  return plugin;
})();

// class SanityChecker {
//   constructor(instructionWidget) {
//     this.viewed = instructionWidget.instructions.map(() => false);

//     this.viewed[instructionWidget.highlightedIndex] = true;
//     instructionWidget.addEventListener("instructionNavigation", widget => {
//       this.viewed[instructionWidget.highlightedIndex] = true;
//     });

//   }

//   viewedEveryInstructions() {
//     return this.viewed.every((x) => x);
//   }

//   check() {
//     return this.viewedEveryInstructions();
//   }

//   confirm() {
//     let message = "";
//     if (!this.viewedEveryInstructions()) {
//       message += "you haven't viewed every instruction.\n";
//     }
//     message += "click OK to finish or CANCEL to continue working"
//     return window.confirm(message);
//   }

// }

// class UndoRedoManager {
//   constructor() {
//     // undo stack is implicitly stored in window.blockUniverse
//     this.redostack = [];
    
//     this.events = {
//       "redo": [],
//       "undo": []
//     };
//   }

//   redo() {
//     if (this.redostack.length > 0) {
//       const block = this.redostack.pop();
//       window.blockUniverse.blocks.push(block);
//       var blockTop = block.y_index + block.blockKind.h;
//       var blockRight = block.x_index + block.blockKind.w;
//       for (let y = block.y_index; y < blockTop; y++) {
//         for (let x = block.x_index; x < blockRight; x++) {
//           window.blockUniverse.discreteWorld[x][y] = false;
//         }
//       }
//       this.events["redo"].forEach(f => f(this.getBlockData(block)));
//     }
//   }

//   undo() {
//     if (window.blockUniverse.blocks.length == 0) return;
//     const block = window.blockUniverse.blocks.pop();
//     var blockTop = block.y_index + block.blockKind.h;
//     var blockRight = block.x_index + block.blockKind.w;
//     for (let y = block.y_index; y < blockTop; y++) {
//       for (let x = block.x_index; x < blockRight; x++) {
//         window.blockUniverse.discreteWorld[x][y] = true;
//       }
//     }
//     this.redostack.push(block);
//     this.events["undo"].forEach(f => f(this.getBlockData(block)));
//   }

//   getBlockData(block) {
//     return _.extend({},
//       window.blockUniverse.getCommonData(),
//       {
//         block: block.getDiscreteBlock()
//       });
//   }

//   addEventListener(name, handler) {
//     this.events[name].push(handler);
//   }

//   removeEventListener(name, handler) {
//     if (!this.events.hasOwnProperty(name)) return;
//     const index = this.events[name].indexOf(handler);
//     if (index != -1) {
//       this.events[name].splice(index, 1)
//     }
//   }
// }

function switchSelectedBlock() {
  if (window.blockUniverse.selectedBlockKind === null) {
    window.blockUniverse.selectedBlockKind = window.blockUniverse.blockMenu.blockKinds[0];
    window.blockUniverse.isPlacingObject = true;
    return;
  }
  const currentBlockKind = window.blockUniverse.selectedBlockKind;
  const indexOfCurrentBlockKind = window.blockUniverse.blockMenu.blockKinds.indexOf(currentBlockKind);
  const newIndex = (indexOfCurrentBlockKind + 1) % window.blockUniverse.blockMenu.blockKinds.length;
  window.blockUniverse.selectedBlockKind = window.blockUniverse.blockMenu.blockKinds[newIndex];
}

function stopPlacingBlock() {
  window.blockUniverse.isPlacingObject = false;
  window.blockUniverse.selectedBlockKind = null;
}
