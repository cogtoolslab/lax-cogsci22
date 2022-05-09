### Generates the library-vocabulary alignment plots that appear in the CogSci 2022 paper.
# Technical drawings
python analysis/program_language_plots.py --task_summaries nuts_bolts_programs_all --language_column lemmatized_whats --program_column dreamcoder_program_dsl_0_tokens  low_level_part_types_with_params mid_level_part_types_with_params high_level_part_types_with_params --use_base_dsl_bitext ; python analysis/program_language_plots.py --task_summaries dials_programs_all --language_column lemmatized_whats --program_column dreamcoder_program_dsl_0_tokens low_level_part_types_with_params mid_level_part_types_with_params high_level_part_types_with_params --use_base_dsl_bitext; python analysis/program_language_plots.py --task_summaries wheels_programs_all --language_column lemmatized_whats --program_column dreamcoder_program_dsl_0_tokens low_level_part_types_with_params mid_level_part_types_with_params high_level_part_types_with_params --use_base_dsl_bitext; python analysis/program_language_plots.py --task_summaries furniture_programs_all --language_column lemmatized_whats --program_column dreamcoder_program_dsl_0_tokens  low_level_part_types_with_params mid_level_part_types_with_params high_level_part_types_with_params --use_base_dsl_bitext
# Structures
python analysis/program_language_plots.py --task_summaries house_programs_all --language_column lemmatized_whats --program_column dreamcoder_program_dsl_0_tokens  low_level_part_types_with_params mid_level_part_types_with_params high_level_part_types_with_params --use_base_dsl_bitext ;python analysis/program_language_plots.py --task_summaries bridge_programs_all --language_column lemmatized_whats --program_column dreamcoder_program_dsl_0_tokens  low_level_part_types_with_params mid_level_part_types_with_params high_level_part_types_with_params --use_base_dsl_bitext ;python analysis/program_language_plots.py --task_summaries castle_programs_all --language_column lemmatized_whats --program_column dreamcoder_program_dsl_0_tokens  low_level_part_types_with_params mid_level_part_types_with_params high_level_part_types_with_params --use_base_dsl_bitext ;python analysis/program_language_plots.py --task_summaries city_programs_all --language_column lemmatized_whats  --program_column dreamcoder_program_dsl_0_tokens low_level_part_types_with_params mid_level_part_types_with_params high_level_part_types_with_params  --use_base_dsl_bitext