Directory to contain analysis notebooks/scripts for this project.

### Part I
Start here: https://github.com/cogtoolslab/lax-cogsci22/blob/master/analysis/notebooks/lax-corpus-analysis.ipynb


### Part II
To generate the figures that appear in the paper, you will need to first follow the instructions at https://github.com/cogtoolslab/lax-cogsci22/blob/master/model to run the library-vocabulary alignment model for each domain. 

You can then generate the plots with: `python analysis/program_language_plots.py --task_summaries dials_programs_all --language_column lemmatized_whats --program_column dreamcoder_program_dsl_0_tokens low_level_part_types mid_level_part_types high_level_part_types low_level_part_types_with_params mid_level_part_types_with_params high_level_part_types_with_params`
