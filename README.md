## LAX (Language and Abstraction Experiments)
This repository is the official implementation for the Language and Abstraction Experiments. 

It contains the following key subdirectories:
- `analysis`: This contains Jupyter notebooks containing analysis of the human experiments. These are annotated with visualizer links for viewing the notebook HTMLs directly from the browser.
- `experiments`: This contains the human experiment code. See below (human experiments) for details on developing and running experiments.
- `model`: This will contain the model.
- `results`: This contains CSV results with the raw, cleaned, deanonymized data from human experiments. These are generated automatically by running `download_mongo_result.py`.
- `stimuli`: This does not contain our stimuli. The drawing stimuli are generated at a separate repo, [here](https://github.com/CatherineWong/drawingtasks).
- `utils`: This contains helper functions for loading from the databases.

******

### Human experiments

The `experiments` subdirectory contains the full implementation for our human experiments.
The human experiments setup has been tested on Node version: v10.16.3 and npm version: 6.14.5

### Developing a new human experiment.
The LAX repository uses a modular, config-based setup to quickly set up and reproduce individual human experiments. 
This section describes how to develop a new human experiment. 

1. *Write an experiment config.* Experiment configs contain the full information to launch an experiment, and determine the live URL for a running experiment. Experiment configs are housed at `experiments/{experiment_Group}/configs/{configId}` (e.g `experiments/prior_elicitation/configs` contains all of the configs for prior elicitation experiments in both domains; `experiments/prepost_language_production/configs` contains configs for pre-post language experiments. An experiment config generally contains the following parameters (aside from the obvious name and metadata:):
```
{
  "config_name": "CONFIG_NAME",
  "metadata": {
    "human_readable": "HUMAN READABLE EXPERIMENT DESCRIPTION."
  },
  "dbname": "lax",  // MongoDB collection name.
  "colname": "prepost-language-production_lax-drawing-s14-s15-union-all-categorization", // MongoDB table name.
  "domain": "drawing", // ['towers' or 'drawing']
  "experiment_type": "prepost_language_production",
  "experiment_parameters": {
    "conditions": ["condition_s14", "condition_s15"], // Subjects will be randomly assigned a condition. Use ["all"] for one condition.
    "stimuli_batch_size": "all", // Batch size of stimuli to sample at each trial block, or 'all' to use all in that block.
    "stimuli_shuffle_seed": 0, // Random seed for shuffling the stimuli ordering.
    "s3_bucket": "lax-drawing-s14-s15-union-all", // S3 bucket containing stimuli.
    "s3_stimuli_path_format": "lax-drawing-s14-s15-union-all-000.png", // Sample path format.
    "s3_bucket_total_stimuli": 296 // Total stimuli in bucket if we load ALL.
  },
  
  // List of experiment trial parameters that configure JSPsych timeline. The trial`type` must correspond to a valid type defined in experimentUtils.js. All other parameters are defined and handled within experimentUtils.js, specific to that trila type.
  // Experiment trial types are handled differently in experimentUtils.js depending on the config `domain` parameter.
 // We currently support the following: [instructions, stimuli-language-production, and stimuli-production]
  "experiment_trial_parameters": [
    {
      "type": "instructions", \\ Currently supports 
      "pages": [
        "<p>Sample instructions."
      ]
    },
    {
      "type": "stimuli-language-production",
      "label_prompt": "This image looks like...",
      \\ Stimuli determines which stimuli to generate trials for in each condition. List of IDs into the S3 bucket or "all" to use all the stimuli in the S3 bucket (which can be optionally batched per subject.
      "stimuli": { 
        "condition_s14": [18, 20, 22, 69, 118, 120, 122],
        "condition_s15": [18, 20, 22, 69, 118, 120, 122]
      }
    },
    {
      "type": "stimuli-production",
      "label_prompt": "Please draw the image into the sketchpad with a blue border.",
      "stimuli": {
        "condition_s14": [0, 1, 2, 3],
        "condition_s15": [224, 225, 226]
      }
    },
  ],
  "development_flags": {}
}
```
3. *Modify experimentSetup.js and/or experimentUtils.js with trial-type plug-in specific logic.*: Most experiment-specific changes can be made simply by changing an experiment config. However, developing any actual new trial UI (such as a new stimuli production input for a new domain) requires modifying the actual experiment setup logic. The majority of this is handled by the utilities file in `lax/experiments/static/js/lax_shared/experimentUtils.js`. Specifically, the `constructExperimentTrialsForParameters` function contains trial-type-specific handlers for each possible trial in a config.
These files also automatically handle and prepend default experimental information (including a consent and exit survey.)


### Launching a human experiment.
1. If this is a new server, you'll need to clone the repo and install node packages with node and npm.
```
cd experiments 
npm install
```
2. Configure the database. We currently support writing to a local MongoDB and a cloud-based MongoDB (owned by the MIT group - ask Yoni Friedman for credentials.) You can toggle which one we write to in `experiments/store.js` by setting the `USEMONGOCLOUD` flag (currently this writes to the cloud DB by default.) Actually writing to this database requires a valid auth file in `experiments/auth.js`; credentials for the CloudDB can be obtained from the MIT team.

3. Launch the experiment server. The following instructions below can be used to launch a live server from the cogtools remote machine, but are generally applicable to running and testing locally as well.
- SSH into the remote machine: e.g. `ssh <user-name>@cogtoolslab.org`. You should already have the experiment repo and necessary auth files here.
- Start a tmux session to preserve the running server. 
```
tmux new -s lax_exps
tmux a -t lax_exps
```
- Kill any existing Node servers (useful if you want to tear down your previous experiments). You can run `ps -U <user_id> | grep node` to find running processes; then `kill -9 <PID>` to kill them
- Launch the Node server and the database.
```
node app.js -gameport 8887 & \\ Specify port if desired.
node store.js &
```
4. The live links should have the following URL parameters to work correctly with Prolific:
- `configId`: the name of the config file under <experiment_group>/configs to serve. No JSON extension.
- `experimentGroup`: the name of the directory under `experiments` that contains the configs.
- `batchIndex`: after we randomly shuffle the full stimuli, we will batch the stimuli using this index. 0 gives the first <BATCH_N> in the shuffled set, 1 gives the next, etc.
- `cc`: Prolific completion code. This allows the experiment to redirect properly on completion. You can get this by starting Prolific.

These lead to a URL like this:
https://cogtoolslab.org:8899/static/html/experiment.html?configId=<CONFIG_ID>&experimentGroup=<EXPERIMENT_GROUP>&batchIndex=<INDEX_TO_SERVE_BATCHED_DATA_FOR_SHUFFLED_SUBJECTS>&institution=<mit or ucsd to determine consent.)&cc=<PROLIFIC_COMPLETION_CODE>

Example: https://cogtoolslab.org:8899/static/html/experiment.html?configId=lax-drawing-s14-s15-union-all-categorization&experimentGroup=prepost_language_production&batchIndex=0&institution=mit&cc=XXXXXX

The Prolific site itself will append other critical information to this URL -- namely, the Prolific ID as a URL parameter. If you are testing without this, you will not be able to run or store data properly.

******

### Results and Experiments
We currently provide the following useful utilities for downloading data and viewing results of preliminary experiments:
1. `download_mongo_results.py`: a helper script for pulling data based on a config file from MongoDB and writing CSVs out to `results.csv`. This contains further documentation for usage in the script. It will require slight editing to determine which trial results to record to a CSV if you add new trial types (e.g. other stimuli production plugins.)
2. `analysis` contains several viewable Jupyter notebooks. Since it's convenient to view them on GitHub (and some images don't display automatically), we exported each to an HTML file and the notebooks contain a link (generated with https://htmlpreview.github.io/) to view them in their entirety.


 https://cogtoolslab.org:8887/static/html/experiment.html?configId=lax-reconstruction-dev&experimentGroup=reconstruction
