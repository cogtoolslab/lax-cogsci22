Directory to contain analysis notebooks/scripts for this project.

### Part I
Start here: https://github.com/cogtoolslab/lax-cogsci22/blob/master/analysis/notebooks/lax-corpus-analysis.ipynb


### Part II
The default `data` directory comes preloaded with the library-alignment model outputs necessary to generate the plots in the paper, which you can view in `data/analyses`.

To regenerate the library-alignment model outputs, you can follow the instructions at https://github.com/cogtoolslab/lax-cogsci22/blob/master/model to run the library-vocabulary alignment model for each domain. 

To regenerate the plots, you can run the `python analysis/program_language_plots.py` script for all domains by 


You can then generate the plots with: 
# Technical drawings
python analysis/program_language_plots.py --task_summaries nuts_bolts_programs_all --language_column lemmatized_whats --program_column dreamcoder_program_dsl_0_tokens  low_level_part_types_with_params mid_level_part_types_with_params high_level_part_types_with_params --use_base_dsl_bitext ; python analysis/program_language_plots.py --task_summaries dials_programs_all --language_column lemmatized_whats --program_column dreamcoder_program_dsl_0_tokens low_level_part_types_with_params mid_level_part_types_with_params high_level_part_types_with_params --use_base_dsl_bitext; python analysis/program_language_plots.py --task_summaries wheels_programs_all --language_column lemmatized_whats --program_column dreamcoder_program_dsl_0_tokens low_level_part_types_with_params mid_level_part_types_with_params high_level_part_types_with_params --use_base_dsl_bitext; python analysis/program_language_plots.py --task_summaries furniture_programs_all --language_column lemmatized_whats --program_column dreamcoder_program_dsl_0_tokens  low_level_part_types_with_params mid_level_part_types_with_params high_level_part_types_with_params --use_base_dsl_bitext
# Structures
python analysis/program_language_plots.py --task_summaries house_programs_all --language_column lemmatized_whats --program_column dreamcoder_program_dsl_0_tokens  low_level_part_types_with_params mid_level_part_types_with_params high_level_part_types_with_params --use_base_dsl_bitext ;python analysis/program_language_plots.py --task_summaries bridge_programs_all --language_column lemmatized_whats --program_column dreamcoder_program_dsl_0_tokens  low_level_part_types_with_params mid_level_part_types_with_params high_level_part_types_with_params --use_base_dsl_bitext ;python analysis/program_language_plots.py --task_summaries castle_programs_all --language_column lemmatized_whats --program_column dreamcoder_program_dsl_0_tokens  low_level_part_types_with_params mid_level_part_types_with_params high_level_part_types_with_params --use_base_dsl_bitext ;python analysis/program_language_plots.py --task_summaries city_programs_all --language_column lemmatized_whats  --program_column dreamcoder_program_dsl_0_tokens low_level_part_types_with_params mid_level_part_types_with_params high_level_part_types_with_params  --use_base_dsl_bitext
