/** experimentSetup.js | Credit : WPM, YF, CW.
 * Sets up experiments from a config. Serving tihs expects a config with the following URL parameters:
  - configId: the name of the config file for the experiment.
  - experimentGroup: the name of the subdirectory containing the configs.
  - batchIndex: which batch of data to use when shuffling any stimuli.
 */

function setupExperiment() {
  var urlParams = getURLParams();
  var socket = io.connect();

  var main_on_finish = function (data) {
    socket.emit("currentData", data);
    console.log("emitting data");
  };

  /** Global experimental variables **/
  var config;
  var domain; // [structures, drawing]
  var conditions = [];

  var condition; // Subject specific randomly selected condition.
  var batchIndex = urlParams.batchIndex;
  var institution = urlParams.institution;
  var completionCode;

  var workerID = urlParams.PROLIFIC_PID;
  var studyID = urlParams.STUDY_ID;
  var sessionID = urlParams.SESSION_ID;
  const gameID = UUID();
  var stimIds;
  var stimURLs;
  var stimuli;
  var stimMetadata;
  var trials = [];

  /** Fetch config from server to initialize experiment-specific  timeline. **/
  socket.emit(
    "getConfig",
    {
      configId: urlParams.configId,
      experimentGroup: urlParams.experimentGroup,
    },
    (res) => {
      if (res.config == null) {
        console.log(
          "Error loading config. Ensure you have correct experiment group and config name e.g. experiment.html?configId=config_name&experimentGroup=exp_group_name"
        );
      } else {
        config = JSON.parse(res.config);
        completionCode = config.completion_code;
        console.log(config);

        initializeGlobalExperimentVariablesFromConfig(config);

        initializeGlobalExperimentVariablesForSubject(config);

        /* #### Load stimuli, then setup trials with those stimuli #### */
        stimuli = preloadStimuliForExperiment(
          constructExperimentTrialsFromConfigAndStimuli
        );

      }
    }
  );

  function getMetadataFromMongo(config, callback) { 
    /** called in experiments where stimulus subsets are stored in mongo database
     * Currently returns just the list of stimulus ids, but additionally saves metadata to global variable stimMetadata.
     **/

    socket.emit('getStim',
      {
        gameID: gameID,
        stimColName: config.stimColName,
      });

    socket.on('stimsNotFound', res => {
      console.log('no stims found in: ' + config.stimColName);
      callback()
    });

    socket.on('stimulus', _trials => {
      console.log('received', _trials)

      stimMetadata = _trials; // save metadata to global variable

      // shuffle trials
      let shuffle = true; // TODO: make more flexible
      var stimList;

      if (shuffle) {
        stimList = _.shuffle(_trials.stimIDs);
      } else {
        stimList = _trials
      }

      delete stimMetadata["_id_"];
      delete stimMetadata["_id"];

      // send stim metadata to db
      const packet = _.extend({}, stimMetadata, {
        datatype: 'stim_metadata',
        // experimentName and experimentGroup are taken from metadata for this datatype.
        dbname: config.dbname,
        colname: config.colname,
        experimentName: config.config_name,
        experimentType: config.experiment_type,
        iterationName: config.iteration_name ? config.iteration_name : 'none_provided_in_config',
        configId: config.configId,
        condition: condition,
        config_name: config.config_name,
        workerID: workerID,
        studyID: studyID,
        sessionID: sessionID,
        gameID: gameID,
        shuffle: shuffle,
        trialOrder: stimList
      });

      socket.emit("currentData", packet); //save metadata to mongo

      // continue with the stim list
      callback(stimList);
    });
  }

  async function getAllStimuliToLoadForExperimentTrials(config, callback) {
    /**
      Gets all stimuli paths to preload across the experiment trials.
      :ret: [array of stimuli IDs] or CONST_ALL to load all stimuli.
    */
    allStimuliForTrials = [];
    for (const idx in config.experiment_trial_parameters) {
      let experimentTrialParameters = config.experiment_trial_parameters[idx];
      if (experimentTrialParameters.stimuli) {
        for (const condition in experimentTrialParameters.stimuli) {
          if (
            allStimuliForTrials === CONST_ALL ||
            experimentTrialParameters.stimuli[condition] === CONST_ALL
          ) {
            allStimuliForTrials = CONST_ALL;
          }
          else {
            allStimuliForTrials = allStimuliForTrials.concat(
              experimentTrialParameters.stimuli[condition]
            );
          }
        }
      }
    }
    callback(allStimuliForTrials);

  };


  function initializeGlobalExperimentVariablesFromConfig(config) {
    /** Initialize the experiment based on the config. Sets up global experimental variables based on the config.**/
    logIfDebug(
      "Initializing experimental variables from config " + config.config_name
    );
    domain = config.domain;
    console.log("Using domain: " + config.domain);
    conditions = config.experiment_parameters.conditions;
    logIfDebug("Using conditions: " + conditions);
  }

  function initializeGlobalExperimentVariablesForSubject(config) {
    /** Initialize subject-specific experimental variables. **/
    condition = _.sample(conditions);
    logIfDebug("Using subject condition: " + condition);
  }

  function preloadStimuliForExperiment(callback) {
    /** Preloads stimuli for an experiment based on the stimuli specified in the trial parameters.**/

    // Determine all stimuli IDs that should be preloaded for the experiment across the trials.
    // allStimuliIdsForTrials = getAllStimuliToLoadForExperimentTrials(config);

    // Loading stims from mongo sidesteps getAllStimuliToLoadForExperimentTrials, meaning we can't currently get stim groups from mongo AND iterate through the multiple trial types. This is fine for prior elicitation, but we might want a more flexible way of loading stims from mongo in the future.
    fetchingFunction = config.stimColName ? getMetadataFromMongo : getAllStimuliToLoadForExperimentTrials;

    // get list of ids from mongo, 
    fetchingFunction(config, (allStimuliIdsForTrials) => {

      if(allStimuliIdsForTrials) {
        logIfDebug("all stimuli for trials " + allStimuliIdsForTrials);

        // Get S3 URLs to preload stimuli.
        allStimuliURLsForTrials  = stimMetadata.stimURLs ? stimMetadata.stimURLs : getStimuliIdsToStimuliURLs(
          config,
          domain,
          allStimuliIdsForTrials
        );

        // Preload stimuli if necessary before constructing trials (i.e. if JSON)
        getStimuliIdsToPreloadedStimuli(
          domain,
          allStimuliURLsForTrials,
          config.experiment_parameters.stimFileExt,
          (stimuliIdsToPreloadedStimuli) => {
            callback(config, stimuliIdsToPreloadedStimuli);
          }
        );
      } else {
        console.log('handling empty stim list');
        callback(config, []);
      };
    });
  };

  var constructExperimentTrialsFromConfigAndStimuli = function (
    config,
    stimuliIdsToPreloadedStimuli,
  ) {
    /** Constructs the experiment trials from the preloaded stimuli based on the configuration structure. Modifies trials with the corresponding experiment blocks. **/
    const commonData = {
      experimentName: config.config_name,
      experimentType: config.experiment_type,
      dbname: config.dbname,
      colname: config.colname,
      iterationName: config.iteration_name ? config.iteration_name : 'none_provided_in_config',
      configId: config.configId,
      condition: condition,
      config_name: config.config_name,
      workerID: workerID,
      studyID: studyID,
      sessionID: sessionID,
      gameID: gameID
    };

    let dataSender = function (withinTrialData) {
      var postData = _.extend(
        {},
        commonData,
        withinTrialData
      );
      socket.emit("currentData", postData);
    };
    
    // Iterate over types of trial specified in config and add to jspsych trial list
    config.experiment_trial_parameters.forEach(function (
      experimentTrialParameters
    ) {
      experimentTrialsForParameters = constructExperimentTrialsForParameters(
        config,
        domain,
        condition,
        batchIndex,
        experimentTrialParameters,
        stimuliIdsToPreloadedStimuli,
        stimMetadata,
        dataSender
      );
      trials = trials.concat(experimentTrialsForParameters);
    });

    console.log(trials);

    logIfDebug("trials:", trials);

    /* #### Initialize jsPsych with complete experimental timeline #### */
    jsPsych.init({
      timeline: constructDefaultExperimentalTimelineFromTrials(
        trials,
        institution,
        completionCode,
        config.surveyQuestions
      ),
      show_progress_bar: true,
      on_trial_finish: function (trialData) {
        // Merge data from a single trial with
        // variables to be uploaded with all data

        var packet = _.extend({}, trialData, commonData, 
          {
          datatype: 'trial_end',
          eventType: trialData.eventType ? trialData.eventType : (trialData.data ? trialData.data.eventType : null)

        });

        // console.log(trialData);
        if (true) {// was workerID, but better to always emit data
          socket.emit("currentData", packet); //save data to mongo
        }
      },
      on_finish: function () {
        window.experimentFinished = true;
        console.log(jsPsych.data.get().values());
      },
      //   preload_images: all_imgs
      // preload_images: _.map(stimuli, "target"),
    });
  };
}
