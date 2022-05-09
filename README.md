## Identifying concept libraries from language about object structure, CogSci 2022
This repository contains experimental code, analysis scripts, and data for the Language and Abstraction Experiments presented at CogSci 2022.

<img width="904" alt="CleanShot 2022-05-03 at 17 19 13@2x" src="https://user-images.githubusercontent.com/5262024/166568205-ed44a9fd-f867-41b2-ada2-f49b99f6a058.png">

******

It contains the following key subdirectories:
- `analysis`: This contains Jupyter notebooks containing analysis of the human experiments. These are annotated with visualizer links for viewing the notebook HTMLs directly from the browser.
- `experiments`: This contains the human experiment code. See below (human experiments) for details on developing and running experiments.
- `model`: This will contain the model.
- `results`: This contains CSV results with the raw, cleaned, deanonymized data from human experiments. These are generated automatically by running `download_mongo_result.py`.
- `stimuli`: This contains generation scripts for our stimuli. The drawing stimuli are generated at a separate repo, [here](https://github.com/CatherineWong/drawingtasks).
- `utils`: This contains helper functions for loading from the databases.

******
