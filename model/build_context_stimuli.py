"""
build_context_stimuli.py | Selects stimuli that will be used for the context experiment.
"""
from collections import defaultdict
import collections
import csv
from errno import EDOM
import os
import random
import pathlib
import urllib.request
import editdistance
import json
import boto3

from numpy import save

random.seed(1)


DEFAULT_DATA_DIR = "data"
DEFAULT_LANGUAGE_DIR = f"{DEFAULT_DATA_DIR}/language"
DEFAULT_SUMMARIES_DIR = f"{DEFAULT_DATA_DIR}/summaries"
DEFAULT_CONTEXT_STIMULI_DIR = f"{DEFAULT_DATA_DIR}/context_stimuli"
DRAWING_SUBDOMAINS = [
    "dials",
    "furniture",
    "wheels",
    "nuts_bolts",
]
CONTEXT_STIMULI_JSON = {
    "experiment_name": "lax-drawing-context",
    "metadata": {
        "human_readable": "Context manipulation experiment. This contains the PNG names which need to be preprocessed to map them to URLs on S3, since we have a different numbering scheme."
    },
    "stimuli": [],
}
S3_STIMULI = "s3_stimuli"
HIGH_LEVEL_PART_TYPES_WITH_PARAMS = "high_level_part_types"
LOW_LEVEL_PART_TYPES_WITH_PARAMS = "low_level_part_types"
MID_LEVEL_PART_TYPES_WITH_PARAMS = "mid_level_part_types"
PROGRAM = "dreamcoder_program_dsl_0"
OVERLAP = "overlap"
EDITDISTANCE = "editdistance"
OVERLAP_LOW = "overlap_low"
OVERLAP_HIGH = "overlap_high"
OVERLAP_LOW_NOT_HIGH = "overlap_low_not_high"
OVERLAP_LOW_AND_HIGH = "overlap_low_and_high"
OVERLAP_HIGH_NOT_LOW = "overlap_high_not_low"

NUM_TARGET_STIMULI_PER_SUBDOMAIN = 8
NUM_DISTRACTORS = 4
NUM_DISTRACTORS_TO_CONSIDER = 10


def get_overlap_remainder(a, b):
    a_multiset = collections.Counter(a)
    b_multiset = collections.Counter(b)

    overlap = list((a_multiset & b_multiset).elements())
    a_remainder = list((a_multiset - b_multiset).elements())
    b_remainder = list((b_multiset - a_multiset).elements())
    return overlap, a_remainder, b_remainder


def not_valid(other_task, subdomain):
    # Silly. Remove the not full stimuli.
    task_id = int(other_task.split("-")[-1].split(".png")[0])
    if subdomain == "nuts_bolts":
        return False
    if subdomain == "dials":
        return task_id < 120
    elif subdomain == "furniture":
        return task_id in range(4) or task_id in range(50, 64)
    elif subdomain == "wheels":
        return task_id < 80


def load_subdomain_summaries(subdomains=DRAWING_SUBDOMAINS):
    subdomain_summaries = dict()
    for subdomain in subdomains:
        subdomain_summary = dict()
        task_csv = os.path.join(DEFAULT_SUMMARIES_DIR, f"{subdomain}_programs_all.csv")
        with open(task_csv) as csvfile:
            csv_reader = csv.DictReader(csvfile)
            for row in csv_reader:
                s3_key = row[S3_STIMULI]
                if not_valid(s3_key, subdomain):

                    continue
                task_parts = {
                    k: eval(row[k])
                    for k in [
                        LOW_LEVEL_PART_TYPES_WITH_PARAMS,
                        MID_LEVEL_PART_TYPES_WITH_PARAMS,
                        HIGH_LEVEL_PART_TYPES_WITH_PARAMS,
                    ]
                }
                task_parts[PROGRAM] = row[PROGRAM]

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

                if task == other_task or not_valid(other_task, subdomain):
                    continue
                else:
                    # Low-level overlap.
                    low_level_overlap, _, _ = get_overlap_remainder(
                        task_parts[LOW_LEVEL_PART_TYPES_WITH_PARAMS],
                        other_task_parts[LOW_LEVEL_PART_TYPES_WITH_PARAMS],
                    )

                    # Higher-level overlap.
                    high_level_overlap, _, _ = get_overlap_remainder(
                        task_parts[MID_LEVEL_PART_TYPES_WITH_PARAMS],
                        other_task_parts[MID_LEVEL_PART_TYPES_WITH_PARAMS],
                    )

                    # How many different low-level parts are involved.
                    size_low_level_set = set(
                        task_parts[LOW_LEVEL_PART_TYPES_WITH_PARAMS]
                        + other_task_parts[LOW_LEVEL_PART_TYPES_WITH_PARAMS]
                    )

                    # How many different high-level parts are involved.
                    size_high_level_parts = set(
                        task_parts[MID_LEVEL_PART_TYPES_WITH_PARAMS]
                        + other_task_parts[MID_LEVEL_PART_TYPES_WITH_PARAMS]
                    )

                    edit_distance = editdistance.eval(
                        task_parts[PROGRAM], other_task_parts[PROGRAM]
                    )

                    task_overlaps.append(
                        [
                            other_task,
                            edit_distance,
                            len(low_level_overlap),
                            len(size_low_level_set),
                            len(high_level_overlap),
                            len(size_high_level_parts),
                        ]
                    )

            # Sort them.
            subdomain_summary[task][OVERLAP] = task_overlaps
            subdomain_summary[task][EDITDISTANCE] = sorted(
                task_overlaps, key=lambda t: t[1]
            )
            # Get closest low-level distractors. Closest is MORE overlap.
            subdomain_summary[task][OVERLAP_LOW] = sorted(
                task_overlaps, key=lambda t: t[2], reverse=True
            )
            subdomain_summary[task][OVERLAP_HIGH] = sorted(
                task_overlaps, key=lambda t: t[4], reverse=True
            )


def construct_near_distractors(task, subdomain_summary):
    # First, get the ones that are close in sheer edit distance.
    closest_edit = subdomain_summary[task][EDITDISTANCE][:8]
    # Then, select so they have as much low-level variation as we can.
    most_low_level_variation = sorted(closest_edit, key=lambda t: t[3], reverse=True)

    return [s[0] for s in most_low_level_variation][:NUM_DISTRACTORS]


def construct_medium_distractors(task, subdomain_summary):
    # Pick ones that have as little high level variation.
    closest_edit = subdomain_summary[task][OVERLAP_LOW][:8]
    # But then pick for the ones that also have as little high-level variation as we can.
    least_high_level_variation = sorted(closest_edit, key=lambda t: t[5])[:2]
    large_high_overlap_edit = subdomain_summary[task][OVERLAP_LOW][:2]
    # Make it wide: randomly pick ones that don't share any high level parts.
    low_high_overlap_edit = random.sample(
        subdomain_summary[task][EDITDISTANCE][-10:], 2
    )
    return [s[0] for s in least_high_level_variation + low_high_overlap_edit]


def construct_wide_distractors(task, subdomain_summary, subdomain, subdomain_summaries):
    closest_edit = subdomain_summary[task][OVERLAP_LOW][:8]
    # But then pick for the ones that also have as little high-level variation as we can.
    least_high_level_variation = sorted(closest_edit, key=lambda t: t[5])[0]
    close_within_domain = least_high_level_variation[0]

    other_domain_distractors = []
    for other_subdomain in DRAWING_SUBDOMAINS + [
        random.choice([s for s in DRAWING_SUBDOMAINS if s != subdomain])
    ]:
        if other_subdomain == subdomain:
            continue
        else:
            # Randomly select a distractor.
            other_domain_distractors.append(
                random.choice(list(subdomain_summaries[other_subdomain].keys()))
            )
    return (
        [close_within_domain] + other_domain_distractors[:-1],
        other_domain_distractors,
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


def connect_to_s3_and_create_bucket(bucket_name="lax-context-stimuli"):
    # Establish connection to S3
    s3 = boto3.resource("s3")
    try:
        b = s3.create_bucket(Bucket=bucket_name)
    except:
        print(f"Found existing S3 bucket: {bucket_name}")
        b = s3.Bucket(Bucket=bucket_name)
    b.Acl().put(ACL="public-read")
    return s3, b


def upload_to_s3(json_object, json_name, bucket_name="lax-context-stimuli"):
    s3, b = connect_to_s3_and_create_bucket(bucket_name)
    s3.Object(bucket_name, json_name).put(
        Body=str(json.dumps(json_object))
    )  # Upload stimuli
    s3.Object(bucket_name, json_name).Acl().put(ACL="public-read")


def main():
    subdomain_summaries = load_subdomain_summaries()
    build_edit_distance_stimuli(subdomain_summaries)

    context_stimuli = CONTEXT_STIMULI_JSON
    for idx in range(NUM_TARGET_STIMULI_PER_SUBDOMAIN):
        for subdomain in ["furniture"]:
            subdomain_summary = subdomain_summaries[subdomain]
            # Select candidate targets: find one that has the highest close low-level distractors.
            candidates = sorted(
                subdomain_summary,
                key=lambda task: sum(
                    [
                        o[2]
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
            context_stimuli["stimuli"].append(stimuli)

            # Write out the stimuli so we can look at them.
            save_context_stimuli(stimuli)

    # Write out the stimulus file.
    with open(
        os.path.join(DEFAULT_CONTEXT_STIMULI_DIR, "lax-drawing-context-stimuli.json"),
        "w",
    ) as f:
        json.dump(context_stimuli, f)

    upload_to_s3(
        json_object=context_stimuli,
        json_name="lax-drawing-context-stimuli.json",
        bucket_name="lax-context-stimuli",
    )


if __name__ == "__main__":
    main()

