/*
 * Block tower display.
 *
 * Requirements:
 *  block Display widget (i.e. import blockConfig.js and blockDisplay.js above this plugin in html)
 */

jsPsych.plugins["jspsych-tower-part-highlighting"] = (function () {
  var plugin = {};

  plugin.info = {
    name: "jspsych-tower-part-highlighting",
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
        ype: jsPsych.plugins.parameterType.OBJECT,
        default:[],
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
        <p>Follow your supervisor's instructions to build the structure</p>
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

    window.blockUniverse.blocks = [];

    // build instruction widget
    const instructions = structureInstructions(trial.description);
    const instructionWidget = new InstructionWidget(
      $("#instructions"),
      instructions,
      opts = { method: "select" }
    );

    const sanityChecker = new SanityChecker(instructionWidget);
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

    trial.instructionStepSender = function(instruction_data) {
      trial.dataSender(
        _.extend(
          {},
          instruction_data,
          {
            datatype: 'instruction_step',
            rt: performance.now() - startTime.blockUniverse,
            nBlocksPlacedInStep: nBlocksPlacedInStep,
          })
      );
      nBlocksPlacedInStep = 0;
    };

    instructionWidget.addEventListener("instructionNavigation", widget => {
      trial.instructionStepSender({
        "currentStep": widget.highlightedIndex,
      });
    });

    trial.blockSender = function(block_data) { // called by block_widget when a block is placed
      undoredoManager.redostack = [];
      trial.nBlocksPlaced += 1;
      nBlocksPlacedInStep += 1;
      trial.dataSender(
        _.extend(
          block_data,
          {
            datatype: 'block_placement',
            rt: performance.now() - startTime,
            currentStep: instructionWidget.highlightedIndex
          })
      );
    };

    undoredoManager.addEventListener("undo", (blockData) => {
      trial.nBlocksPlaced -= 1;
      nBlocksPlacedInStep -= 1;
      trial.dataSender(
        _.extend(
          {},
          blockData,
          {
            datatype: 'block_undo_placement',
            rt: performance.now() - startTime,
            currentStep: instructionWidget.highlightedIndex
          })
      );
    });

    undoredoManager.addEventListener("redo", (blockData) => {
      trial.nBlocksPlaced += 1;
      nBlocksPlacedInStep += 1;
      trial.dataSender(
        _.extend(
          {},
          blockData,
          {
            datatype: 'block_redo_placement',
            rt: performance.now() - startTime,
            currentStep: instructionWidget.highlightedIndex
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

      var trialData = _.extend({}, buildingData, {
        rt: response_time,
        stimId: trial.stimId,
        stimURL: trial.stimURL,
        description: trial.description,
        nBlocksPlaced: trial.nBlocksPlaced,
        // trialNum: trial.trialNum
      });

      display_element.innerHTML = "";
      resetBuilding();

      // next trial
      jsPsych.finishTrial(trialData);
      
    }
  };

  var startTime = performance.now();

  return plugin;
})();


function buildTrialHTML(display_element, trial) {
  display_element.innerHTML = "";

  const promptElem = document.createElement("div");
  promptElem.innerHTML = trial.label_prompt;
  display_element.append(promptElem);
  const container = document.createElement("div");
  display_element.append(container)
  container.style.setProperty("display", "flex");
  container.style.setProperty("margin-bottom", "25px");

  const instructionElem = document.createElement("div");
  instructionElem.id = "instructions"
  container.append(instructionElem);

  const canvasContainer = document.createElement("div");
  canvasContainer.classList.add("any-canvas");
  canvasContainer.id = "environment-canvas";

  const envBtns = document.createElement("div");
  const nextTrialBtn = document.createElement("button");
  nextTrialBtn.innerText = "Finished Building";
  nextTrialBtn.classList.add("btn","next-trial-button");
  envBtns.append(nextTrialBtn);

  container.append(canvasContainer);

  const controlInstructions = document.createElement("div");
  controlInstructions.classList.add("alert", "alert-info", "controls");
  controlInstructions.innerHTML = `
  <h2>Controls</h2>
  <h3>Step Selection</h3>
  <ul>
    <li>click on an instruction step</li>
    <li>or click the up/down buttons</li>
  </ul>
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
    var showStimulus = false;
    var showBuilding = true;
    window.blockSetup(trial, showStimulus, showBuilding);
    canvasContainer.append(envBtns);
  }, 200);
}

function structureInstructions(description) {
  let instructions = [];
  for (let i = 0; i < description.whats.length; i++) {
    instructions.push({
      "index": i + 1,
      "what": description.whats[i],
      "where": description.wheres[i],
    });
  }
  return instructions
}

class InstructionWidget {
  constructor(elem, instructions, opts = { method: "above" }) {
    this.elem = elem;
    this.instructions = instructions;
    this.instructionElems = [];
    this.opts = opts;
    this.highlightedIndex = 0;

    this.events = {
      "instructionNavigation": []
    };

    this.setup();
  }

  setup() {
    const instructionsContainer = document.createElement("div");
    instructionsContainer.classList.add("instruction-container");
    this.elem.append(instructionsContainer);
    this.instructions.forEach((instruction, idx) => {
      /*
       * <$container>
       *   <div class="instruction-container">
       *     <div class="instruction-wrapper">
       *       <div class="instruction-step"></div>
       *       <div class="instruction">
       *         <div class="instruction-inner">
       *           ::before <--! this handles the step numbering -->
       *           <div class="instruction-text">
       *             <div>...</div>
       *             <div>...</div>
       *           </div>
       *         <div/>
       *       </div>
       *     </div>
       *     ...
       *   <div/>
       *   <div class="instruction-controller">
       *   <div/>
       * <$container/>
       */
      const instructionWrapperElem = document.createElement("div");
      instructionWrapperElem.classList.add("instruction-wrapper");
      const instructionStepElem = document.createElement("div");
      instructionStepElem.classList.add("instruction-step");
      instructionWrapperElem.append(instructionStepElem);

      const instructionElem = document.createElement("div");
      instructionElem.classList.add("instruction");
      if (idx == this.highlightedIndex) {
        instructionElem.classList.add("selected");
      }
      $(instructionElem).click(() => {
        this.select(idx);
      });
      this.instructionElems.push(instructionElem);
      instructionWrapperElem.append(instructionElem);

      const instructionInner = document.createElement("div");
      instructionInner.classList.add("instruction-inner");
      const instructionText = document.createElement("div");
      instructionText.classList.add("instruction-text")

      const instructionWhat = document.createElement("div");
      instructionWhat.innerHTML = `<p class="what-text"><span class="instruction-part">what</span> ${instruction["what"]}`;

      const instructionWhere = document.createElement("div");
      instructionWhere.innerHTML = `<p class="where-text"><span class="instruction-part">where</span> ${instruction["where"]}`;

      instructionText.append(instructionWhat);
      instructionText.append(instructionWhere);
      instructionInner.append(instructionText);
      instructionElem.append(instructionInner);
      instructionsContainer.append(instructionWrapperElem);
    });
    const instructionsController = document.createElement("div");
    instructionsController.classList.add("instruction-controller");
    this.elem.append(instructionsController);

    const prev = document.createElement("button");
    prev.innerText = "up ";
    //const uparrow = document.createElement("kbd");
    //uparrow.innerText = "w";
    //prev.append(uparrow);
    prev.classList.add("btn","prev-button");
    instructionsController.append(prev);

    const next = document.createElement("button");
    next.innerText = "down ";
    //const downarrow = document.createElement("kbd");
    //downarrow.innerText = "s";
    //next.append(downarrow)
    next.classList.add("btn","next-button");
    instructionsController.append(next);

    $(next).click(() => this.down());
    $(prev).click(() => this.up());

  }

  addEventListener(name, handler) {
    this.events[name].push(handler);
  }

  removeEventListener(name, handler) {
    if (!this.events.hasOwnProperty(name)) return;
    const index = this.events[name].indexOf(handler);
    if (index != -1) {
      this.events[name].splice(index, 1)
    }
  }

  down() {
    const newHighlightedIndex = this.highlightedIndex + 1;
    if (newHighlightedIndex >= this.instructions.length) {
      return;
    }
    switch (this.opts.method) {
      case "all":
        break;
      case "above":
        break;
      default:
        this.instructionElems[this.highlightedIndex].classList.remove("selected");
        break;
    }
    this.highlightedIndex = newHighlightedIndex;
    this.instructionElems[this.highlightedIndex].classList.add("selected");
    this.events["instructionNavigation"].forEach(f => f(this));
    this.scrollTo(this.instructionElems[this.highlightedIndex]);
  }

  up() {
    const newHighlightedIndex = this.highlightedIndex - 1;
    if (newHighlightedIndex < 0) {
      return;
    }
    switch (this.opts.method) {
      case "all":
        break;
      default:
        this.instructionElems[this.highlightedIndex].classList.remove("selected");
        break;
    }
    this.highlightedIndex = newHighlightedIndex;
    this.instructionElems[this.highlightedIndex].classList.add("selected");
    this.events["instructionNavigation"].forEach(f => f(this));
    this.scrollTo(this.instructionElems[this.highlightedIndex]);
  }

  select(idx) {
    if (idx < 0 || this.instructions.length <= idx) {
      return;
    }
    switch (this.opts.method) {
      case "all":
        break;
      case "above":
        this.instructionElems.forEach((elem, i) => {
          if (i < idx) {
            elem.classList.add("selected");
          }
          else if (i > idx) {
            elem.classList.remove("selected");
          }
        });
        break;
      default:
        this.instructionElems.forEach(elem => {
          elem.classList.remove("selected");
        });
        break;
    }
    this.highlightedIndex = idx;
    this.instructionElems[this.highlightedIndex].classList.add("selected");
    this.events["instructionNavigation"].forEach(f => f(this));
  }

  scrollTo(idx) {
    const target = $(this.instructionElems[this.highlightedIndex]);
    const container = $(".instruction-container");
    container.scrollTop(
      target.position().top + target.height() + container.scrollTop() - container.height()
    )
  }
}

class SanityChecker {
  constructor(instructionWidget) {
    this.viewed = instructionWidget.instructions.map(() => false);

    this.viewed[instructionWidget.highlightedIndex] = true;
    instructionWidget.addEventListener("instructionNavigation", widget => {
      this.viewed[instructionWidget.highlightedIndex] = true;
    });

  }

  viewedEveryInstructions() {
    return this.viewed.every((x) => x);
  }

  check() {
    return this.viewedEveryInstructions();
  }

  confirm() {
    let message = "";
    if (!this.viewedEveryInstructions()) {
      message += "you haven't viewed every instruction.\n";
    }
    message += "click OK to finish or CANCEL to continue working"
    return window.confirm(message);
  }

}

class UndoRedoManager {
  constructor() {
    // undo stack is implicitly stored in window.blockUniverse
    this.redostack = [];
    
    this.events = {
      "redo": [],
      "undo": []
    };
  }

  redo() {
    if (this.redostack.length > 0) {
      const block = this.redostack.pop();
      window.blockUniverse.blocks.push(block);
      var blockTop = block.y_index + block.blockKind.h;
      var blockRight = block.x_index + block.blockKind.w;
      for (let y = block.y_index; y < blockTop; y++) {
        for (let x = block.x_index; x < blockRight; x++) {
          window.blockUniverse.discreteWorld[x][y] = false;
        }
      }
      this.events["redo"].forEach(f => f(this.getBlockData(block)));
    }
  }

  undo() {
    if (window.blockUniverse.blocks.length == 0) return;
    const block = window.blockUniverse.blocks.pop();
    var blockTop = block.y_index + block.blockKind.h;
    var blockRight = block.x_index + block.blockKind.w;
    for (let y = block.y_index; y < blockTop; y++) {
      for (let x = block.x_index; x < blockRight; x++) {
        window.blockUniverse.discreteWorld[x][y] = true;
      }
    }
    this.redostack.push(block);
    this.events["undo"].forEach(f => f(this.getBlockData(block)));
  }

  getBlockData(block) {
    return _.extend({},
      window.blockUniverse.getCommonData(),
      {
        block: block.getDiscreteBlock()
      });
  }

  addEventListener(name, handler) {
    this.events[name].push(handler);
  }

  removeEventListener(name, handler) {
    if (!this.events.hasOwnProperty(name)) return;
    const index = this.events[name].indexOf(handler);
    if (index != -1) {
      this.events[name].splice(index, 1)
    }
  }
}

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
