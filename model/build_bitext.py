"""
build_bitext.py | Author : Catherine Wong.

Utility script to output paired language and program bitexts.

Usage:
    python model/join_language_programs_s3.py
        --task_summaries dials_programs_all
        --language lax_corpus_1k_trial.csv
        --language_column lemmatized_whats
"""
import csv, os, json, argparse
from posixpath import split
import pandas as pd
import ast
import itertools
import editdistance

from collections import defaultdict

DEFAULT_DATA_DIR = "data"
DEFAULT_LANGUAGE_DIR = f"{DEFAULT_DATA_DIR}/language"
DEFAULT_SUMMARIES_DIR = f"{DEFAULT_DATA_DIR}/summaries"

DEFAULT_LANGUAGE_CSV = "lax_corpus_1k_trial.csv"  # Note that this must be in the format

DEFAULT_TASK_SUMMARIES_TASK_COLUMN = "s3_stimuli"
DEFAULT_LANGUAGE_TASK_COLUMN = "stimURL"

DEFAULT_PROGRAM_COLUMN = "dreamcoder_program_dsl_0_tokens"

LEMMATIZED_WHATS = "lemmatized_whats"
LEMMATIZED_WHATS_WHERES = "lemmatized_whats_wheres"
RAW_WHATS_WHERES = "raw_whats_wheres"
SYNTHETIC_LANGUAGE_WHATS = "synthetic_language_whats"
DEFAULT_LANGUAGE_COLUMN = LEMMATIZED_WHATS

PROGRAM_TOKENS, LANGUAGE_TOKENS = "program_tokens", "language_tokens"
EDIT_DISTANCES = "edit_distances"

parser = argparse.ArgumentParser()
parser.add_argument(
    "--export_dir",
    default=DEFAULT_LANGUAGE_DIR,
    help="If provided, alternate directory to read in summaries of tasks.",
)
parser.add_argument(
    "--task_summaries_dir",
    default=DEFAULT_SUMMARIES_DIR,
    help="If provided, alternate directory to read in summaries of tasks.",
)
parser.add_argument(
    "--task_summaries", required=True, help="CSV containing task summaries data.",
)
parser.add_argument(
    "--task_summaries_task_column",
    default=DEFAULT_TASK_SUMMARIES_TASK_COLUMN,
    help="Column in the task summaries CSV containing the task name to join on.",
)
parser.add_argument(
    "--language_task_column",
    default=DEFAULT_LANGUAGE_TASK_COLUMN,
    help="Column in the language CSV containing the task name to join on.",
)
parser.add_argument(
    "--program_column",
    nargs="+",
    default=[DEFAULT_PROGRAM_COLUMN],
    help="Columns in the task summaries CSV containing the program.",
)
parser.add_argument(
    "--language_dir",
    default=DEFAULT_LANGUAGE_DIR,
    help="If provided, alternate directory to read in language data.",
)
parser.add_argument(
    "--language",
    default=DEFAULT_LANGUAGE_CSV,
    help="If provided, alternate csv corpus containing language data.",
)
parser.add_argument(
    "--language_column",
    default=DEFAULT_LANGUAGE_COLUMN,
    help="Column in the language CSV containing which language to use.",
)
parser.add_argument("--no_tokenize", action="store_true")
parser.add_argument("--add_edit_distances", action="store_true")


def split_tokenize(sentences):
    return [s.split() for s in sentences]


def lowercase(sentences):
    return [[t.lower() for t in tokens] for tokens in sentences]


def get_cleaned_language_dataframe(language_csv):
    """
    Reference: https://github.com/cogtoolslab/lax/blob/master/analysis/corpus/lax-corpus-analysis.ipynb
    """
    df_trial = pd.read_csv(language_csv)

    if language_csv == DEFAULT_LANGUAGE_CSV:
        # Evaluate the dictionaries.
        df_trial.loc[:, "responses"] = df_trial.responses.apply(ast.literal_eval)
        df_trial.loc[:, "whats"] = df_trial.whats.apply(ast.literal_eval)
        df_trial.loc[:, "wheres"] = df_trial.wheres.apply(ast.literal_eval)
        df_trial.loc[:, "whats"] = df_trial.whats.apply(split_tokenize)
        df_trial.loc[:, "wheres"] = df_trial.wheres.apply(split_tokenize)
        df_trial.loc[:, "lemmatized_whats"] = df_trial.lemmatized_whats.apply(
            ast.literal_eval
        )
        df_trial.loc[:, "lemmatized_wheres"] = df_trial.lemmatized_wheres.apply(
            ast.literal_eval
        )
        # Remove outliers.
        df_trial.loc[:, "short_rt"] = df_trial.rt < 5000
        df_trial = df_trial.query('stimId != "demo_stim"').query("not short_rt")
    return df_trial


def get_task_to_language_dict(args, task_to_program_tokens_dict):
    """
    :ret: {task_name: [language, language, language]}
    """
    # Load CSV into dataframe.
    language_csv = os.path.join(args.language_dir, args.language)
    df_trial = get_cleaned_language_dataframe(language_csv)

    task_annotations_set = set()
    for index, row in df_trial.iterrows():
        if row[args.language_task_column] in task_to_program_tokens_dict:
            task = row[args.language_task_column]
            if args.language_column == LEMMATIZED_WHATS:
                language = list(
                    itertools.chain.from_iterable(lowercase(row["lemmatized_whats"]))
                )
            elif args.language_column == LEMMATIZED_WHATS_WHERES:
                zipped = [
                    x + y
                    for x, y in zip(
                        lowercase(row["lemmatized_whats"]),
                        lowercase(row["lemmatized_wheres"]),
                    )
                ]
                language = list(itertools.chain.from_iterable(zipped))
            elif args.language_column == RAW_WHATS_WHERES:
                zipped = [
                    x + y
                    for x, y in zip(lowercase(row["whats"]), lowercase(row["wheres"]))
                ]
                language = list(itertools.chain.from_iterable(zipped))
            elif args.language_column == SYNTHETIC_LANGUAGE_WHATS:
                language = ast.literal_eval(row[args.language_column])
            else:
                # Just add the language directly.
                language = row[args.language_column]

            if task not in task_to_program_tokens_dict:
                print(f"Error: unrecognized task in language: {task}")
                assert False
            else:
                task_annotations_set.add(task)
                task_to_program_tokens_dict[task][LANGUAGE_TOKENS].append(language)
    print(f"...read language tokens from {len(task_annotations_set)} tasks.")
    return task_to_program_tokens_dict


def get_task_to_program_tokens_dict(args, program_column_idx):
    task_csv = os.path.join(args.task_summaries_dir, args.task_summaries + ".csv")
    task_to_program_tokens = defaultdict(
        lambda: {PROGRAM_TOKENS: [], LANGUAGE_TOKENS: []}
    )
    with open(task_csv) as csvfile:
        csv_reader = csv.DictReader(csvfile)
        for row in csv_reader:
            if args.no_tokenize:
                task, program = (
                    row[args.task_summaries_task_column],
                    [row[args.program_column[program_column_idx]]],
                )
            else:
                task, program = (
                    row[args.task_summaries_task_column],
                    ast.literal_eval(row[args.program_column[program_column_idx]]),
                )
            task_to_program_tokens[task][PROGRAM_TOKENS] += program
    print(f"...read program tokens from {len(task_to_program_tokens)} tasks.")
    return task_to_program_tokens


def get_edit_distances(task, task_to_programs_dict):
    edit_distances = []
    for other_task in task_to_programs_dict:
        if task == other_task:
            continue
        lang1, lang2 = (
            " ".join(task_to_programs_dict[task][LANGUAGE_TOKENS][0]),
            " ".join(task_to_programs_dict[other_task][LANGUAGE_TOKENS][0]),
        )
        edit_distances.append((other_task, editdistance.eval(lang1, lang2)))
    edit_distances = sorted(edit_distances, key=lambda x: x[-1])
    return edit_distances


def add_edit_distances(args, task_to_programs_dict):
    if not args.add_edit_distances:
        return task_to_programs_dict
    else:
        # Naive implementation.
        for task in task_to_programs_dict:
            task_to_programs_dict[task][EDIT_DISTANCES] = get_edit_distances(
                task, task_to_programs_dict
            )
        return task_to_programs_dict


def output_task_language_bitext(args, task_to_program_tokens_dict, program_column_idx):
    output_file = f"{args.task_summaries}_{args.program_column[program_column_idx]}_{args.language_column}"
    output_file = os.path.join(args.export_dir, output_file)
    with open(output_file, "w") as f:
        json.dump(task_to_program_tokens_dict, f)


def main(args):
    for program_column_idx in range(len(args.program_column)):
        task_to_program_tokens_dict = get_task_to_program_tokens_dict(
            args, program_column_idx
        )
        task_to_program_tokens_dict = get_task_to_language_dict(
            args, task_to_program_tokens_dict
        )
        task_to_program_tokens_dict = add_edit_distances(
            args, task_to_program_tokens_dict
        )
        output_task_language_bitext(
            args, task_to_program_tokens_dict, program_column_idx
        )


if __name__ == "__main__":
    args = parser.parse_args()
    main(args)
