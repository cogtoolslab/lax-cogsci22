### Running the language-program alignment model.
This reproduces the modeling code at the `drawingtasks` repo [here](https://github.com/CatherineWong/drawingtasks). This also requires the Python environment specified at that repo.

A script to these commands directly on both domains is at `quickstart_run_experiments_cogsci_2022.sh `.

The following is a step by step set of commands for running the experiment pipeline on a single demonstration domain, `nuts_bolts`.
We use the following DSLs, which correspond (respectively) to L0, L1, L2, L3 in the CogSci paper: `dreamcoder_program_dsl_0_tokens`,  `low_level_part_types_with_params`, `mid_level_part_types_with_params`, `high_level_part_types_with_params`

1. Generate language-program bitexts: `python data/build_bitext.py --task_summaries dials_programs_all --language_column lemmatized_whats --program_column dreamcoder_program_dsl_0_tokens low_level_part_types_with_params mid_level_part_types_with_params high_level_part_types_with_params`
2. Run the IBM model: `python data/ibm_model.py --task_summaries dials_programs_all --language_column lemmatized_whats --random_likelihood_baseline --program_column dreamcoder_program_dsl_0_tokens low_level_part_types mid_level_part_types high_level_part_types low_level_part_types_with_params mid_level_part_types_with_params high_level_part_types_with_params`
3. Generate the plots:  `python data/program_language_plots.py --task_summaries dials_programs_all --language_column lemmatized_whats --program_column dreamcoder_program_dsl_0_tokens low_level_part_types mid_level_part_types high_level_part_types low_level_part_types_with_params mid_level_part_types_with_params high_level_part_types_with_params`