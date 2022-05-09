Directory to contain analysis notebooks/scripts for this project.

### Part I
Start here: https://github.com/cogtoolslab/lax-cogsci22/blob/master/analysis/notebooks/lax-corpus-analysis.ipynb


### Part II
The default `data` directory comes preloaded with the library-alignment model outputs necessary to generate the plots in the paper, which you can view in `data/analyses`.

You can then generate the plots with: `python data/program_language_plots.py --task_summaries nuts_bolts_programs_all --language_column lemmatized_whats --program_column dreamcoder_program_dsl_0_tokens  low_level_part_types_with_params mid_level_part_types_with_params high_level_part_types_with_params --use_base_dsl_bitext`
