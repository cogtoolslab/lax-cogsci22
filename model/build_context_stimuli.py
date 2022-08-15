"""
build_context_stimuli.py | Selects stimuli that will be used for the context experiment.
"""
from collections import defaultdict
import collections
import csv
import os
import random
import pathlib
import urllib.request

from numpy import save

random.seed(1)


DEFAULT_DATA_DIR = "data"
DEFAULT_LANGUAGE_DIR = f"{DEFAULT_DATA_DIR}/language"
DEFAULT_SUMMARIES_DIR = f"{DEFAULT_DATA_DIR}/summaries"
DEFAULT_CONTEXT_STIMULI_DIR = f"{DEFAULT_DATA_DIR}/context_stimuli"
DRAWING_SUBDOMAINS = ["nuts_bolts", "furniture", "wheels", "dials"]
CONTEXT_STIMULI_JSON = {
    "experiment_name": "lax-drawing-context",
    "metadata": {
        "human_readable": "Context manipulation experiment. This contains the PNG names which need to be preprocessed to map them to URLs on S3, since we have a different numbering scheme."
    },
    "stimuli": [],
}
S3_STIMULI = "s3_stimuli"
HIGH_LEVEL_PART_TYPES_WITH_PARAMS = "high_level_part_types_with_params"
LOW_LEVEL_PART_TYPES_WITH_PARAMS = "low_level_part_types_with_params"
MID_LEVEL_PART_TYPES_WITH_PARAMS = "mid_level_part_types_with_params"
PROGRAM = "dreamcoder_program_dsl_0"
OVERLAP = "overlap"
OVERLAP_LOW = "overlap_low"
OVERLAP_HIGH = "overlap_high"
OVERLAP_LOW_NOT_HIGH = "overlap_low_not_high"
OVERLAP_LOW_AND_HIGH = "overlap_low_and_high"

NUM_TARGET_STIMULI_PER_SUBDOMAIN = 1
NUM_DISTRACTORS = 4
NUM_DISTRACTORS_TO_CONSIDER = 10


def get_overlap_remainder(a, b):
    a_multiset = collections.Counter(a)
    b_multiset = collections.Counter(b)

    overlap = list((a_multiset & b_multiset).elements())
    a_remainder = list((a_multiset - b_multiset).elements())
    b_remainder = list((b_multiset - a_multiset).elements())
    return overlap, a_remainder, b_remainder


def load_subdomain_summaries(subdomains=DRAWING_SUBDOMAINS):
    subdomain_summaries = dict()
    for subdomain in subdomains:
        subdomain_summary = dict()
        task_csv = os.path.join(DEFAULT_SUMMARIES_DIR, f"{subdomain}_programs_all.csv")
        with open(task_csv) as csvfile:
            csv_reader = csv.DictReader(csvfile)
            for row in csv_reader:
                s3_key = row[S3_STIMULI]
                task_parts = {
                    k: eval(row[k])
                    for k in [
                        LOW_LEVEL_PART_TYPES_WITH_PARAMS,
                        MID_LEVEL_PART_TYPES_WITH_PARAMS,
                        HIGH_LEVEL_PART_TYPES_WITH_PARAMS,
                    ]
                }
                subdomain_summary[s3_key] = task_parts
        subdomain_summaries[subdomain] = subdomain_summary
    return subdomain_summaries


def build_edit_distance_stimuli(subdomain_summaries):
    for subdomain in subdomain_summaries:
        subdomain_summary = subdomain_summaries[subdomain]
        for task in subdomain_summary:
            task_parts = subdomain_summary[task]
            task_overlaps = []
            for other_task in subdomain_summary:
                other_task_parts = subdomain_summary[other_task]
                if task == other_task:
                    continue
                else:
                    low_level_overlap, _, _ = get_overlap_remainder(
                        task_parts[LOW_LEVEL_PART_TYPES_WITH_PARAMS],
                        other_task_parts[LOW_LEVEL_PART_TYPES_WITH_PARAMS],
                    )
                    high_level_overlap, _, _ = get_overlap_remainder(
                        task_parts[MID_LEVEL_PART_TYPES_WITH_PARAMS],
                        task_parts[MID_LEVEL_PART_TYPES_WITH_PARAMS],
                    )
                    task_overlaps.append(
                        (other_task, len(low_level_overlap), len(high_level_overlap))
                    )
            # Sort them.
            subdomain_summary[task][OVERLAP] = task_overlaps
            # Get closest low-level distractors. Closest is MORE overlap.
            subdomain_summary[task][OVERLAP_LOW] = sorted(
                task_overlaps, key=lambda t: t[1], reverse=True
            )
            subdomain_summary[task][OVERLAP_HIGH] = sorted(
                task_overlaps, key=lambda t: t[-1], reverse=True
            )
            subdomain_summary[task][OVERLAP_LOW_AND_HIGH] = sorted(
                task_overlaps, key=lambda t: t[1] + t[-1], reverse=True
            )
            subdomain_summary[task][OVERLAP_LOW_NOT_HIGH] = sorted(
                task_overlaps, key=lambda t: t[1] - t[-1], reverse=True
            )


def construct_near_distractors(task, subdomain_summary):
    # Just get the closest N distractors in low-overlap.
    return [s[0] for s in subdomain_summary[task][OVERLAP_LOW][:NUM_DISTRACTORS]]


def construct_medium_distractors(task, subdomain_summary):
    # Pick two distractors that have high overlap, and two distractors that are as far as possible in high overlap.
    return [
        s[0]
        for s in subdomain_summary[task][OVERLAP_LOW_AND_HIGH][
            : int(NUM_DISTRACTORS / 2)
        ]
        + subdomain_summary[task][OVERLAP_LOW_AND_HIGH][-(int(NUM_DISTRACTORS / 2)) :]
    ]


def construct_wide_distractors(task, subdomain_summary, subdomain, subdomain_summaries):
    close_within_domain = subdomain_summary[task][OVERLAP_LOW_AND_HIGH][1][0]
    far_within_domain = subdomain_summary[task][OVERLAP_LOW_AND_HIGH][-1][0]
    other_domain_distractors = []
    for other_subdomain in DRAWING_SUBDOMAINS:
        if other_subdomain == subdomain:
            continue
        else:
            # Randomly select a distractor.
            other_domain_distractors.append(
                random.choice(list(subdomain_summaries[other_subdomain].keys()))
            )
    return (
        [close_within_domain] + other_domain_distractors,
        [far_within_domain] + other_domain_distractors,
    )


def clean_file(s3_url):
    clean_file = s3_url.split("/")[-1].split(".png")[0]
    return clean_file


def save_context_stimuli(stimuli):
    stimuli_target = stimuli["target"]
    import pathlib

    pathlib.Path(
        os.path.join(DEFAULT_CONTEXT_STIMULI_DIR, clean_file(stimuli_target))
    ).mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(
        stimuli_target,
        os.path.join(
            DEFAULT_CONTEXT_STIMULI_DIR,
            clean_file(stimuli_target),
            clean_file(stimuli_target) + ".png",
        ),
    )
    for context in ["context_0", "context_1", "context_2", "context_3"]:
        pathlib.Path(
            os.path.join(
                DEFAULT_CONTEXT_STIMULI_DIR, clean_file(stimuli_target), context
            )
        ).mkdir(parents=True, exist_ok=True)
        for context_file in stimuli[context]:
            urllib.request.urlretrieve(
                context_file,
                os.path.join(
                    DEFAULT_CONTEXT_STIMULI_DIR,
                    clean_file(stimuli_target),
                    context,
                    clean_file(context_file) + ".png",
                ),
            )


def main():
    subdomain_summaries = load_subdomain_summaries()
    build_edit_distance_stimuli(subdomain_summaries)

    context_stimuli = CONTEXT_STIMULI_JSON
    for idx in range(NUM_TARGET_STIMULI_PER_SUBDOMAIN):
        for subdomain in DRAWING_SUBDOMAINS:
            subdomain_summary = subdomain_summaries[subdomain]
            # Select candidate targets: find one that has the highest close low-level distractors.
            candidates = sorted(
                subdomain_summary,
                key=lambda task: sum(
                    [
                        o[1]
                        for o in subdomain_summary[task][OVERLAP_LOW][:NUM_DISTRACTORS]
                    ]
                ),
                reverse=True,
            )
            candidate = candidates[idx]
            # Construct the near distractors.
            context_0_distractors = construct_near_distractors(
                candidate, subdomain_summary
            )
            context_1_distractors = construct_medium_distractors(
                candidate, subdomain_summary
            )
            # Construct the wide distractors.
            context_2_distractors, context_3_distractors = construct_wide_distractors(
                candidate, subdomain_summary, subdomain, subdomain_summaries
            )

            stimuli = {
                "target": candidate,
                "subdomain": subdomain,
                "context_0": context_0_distractors,
                "context_1": context_1_distractors,
                "context_2": context_2_distractors,
                "context_3": context_3_distractors,
            }

            # Write out the stimuli so we can look at them.
            save_context_stimuli(stimuli)

    # Write out the stimulus file.


if __name__ == "__main__":
    main()

