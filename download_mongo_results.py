"""
download_mongo_results.py | Author: Catherine Wong.
Utility script to download results from the MongoDB for this experiment using configs. Writes out CSV files to {results_export_dir}/{mongo_colname}.csv

Writes out data in the form:
    WORKER_ID, TIMESTAMP, TRIAL_TYPE, TRIAL_INDEX, CONDITION, STIMULI_URL, RESPONSE

Usage:
    python download_mongo_results.py
        --results_export_dir results/csv
        --mongo_credentials experiments/read_auth.json
        --use_local_mongo : if included, uses MIT mongo cloud DB.
        --experiment_configs : names of config files to download. Don't include JSON file extension. Specify as {experiment_dir}/{config_name} (no 'configs')
        --excluded_workers_file: if included, a file containing IDs to explicitly exclude.
        --include_test_ids: if included, also writes out test IDs
        --deanonymize_ids: if included, writes out a file with the true worker IDs.
        --display_subject_approval_check: if included, writes out the worker IDs along with their last two responses, which can be used to determine approval at a glance.

Sample usage:
    python download_mongo_results.py 
        --experiment_configs prior_elicitation/lax-drawing-s14-s15-union-all-unconstrained
"""
import csv, os, json, argparse
from datetime import datetime
from collections import defaultdict

from utils import mongo_db_utils

DEFAULT_RESULTS_EXPORT_DIR = "results/csv"
DEFAULT_EXCLUDED_WORKERS = "results/excluded_workers.txt"
DEFAULT_EXPERIMENTS_DIR = "experiments"
DEFAULT_CONFIGS_DIR = "configs"
DEFAULT_MONGO_CREDENTIALS = "auth.json"
CONFIG_DB_NAME = "dbname"
CONFIG_COLNAME = "colname"

DEFAULT_DB_TABLE = "lax"

STIMULI_LANGUAGE_PRODUCTION = "stimuli-language-production"
STIMULI_DRAWING_PRODUCTION = "jspsych-sketchpad-display"
VALID_TRIAL_TYPES = [STIMULI_LANGUAGE_PRODUCTION, STIMULI_DRAWING_PRODUCTION]

CHECKABLE_TRIAL_TYPES = [
    STIMULI_LANGUAGE_PRODUCTION
]  # Trial types to check if running an approval check.

TIMESTAMP = "timestamp"
STIMULI_URL = "stimURL"
RESPONSE = "responses"
TRIAL_TYPE = "trial_type"
TRIAL_INDEX = "trial_index"
WORKER_ID = "workerID"
STROKES = "strokes"
CONDITION = "condition"

RECORD_DATA_FIELDNAMES = [
    WORKER_ID,
    TIMESTAMP,
    TRIAL_TYPE,
    TRIAL_INDEX,
    CONDITION,
    STIMULI_URL,
    RESPONSE,
]

DEFAULT_MONGO_CLOUD_URL = "mongodb+srv://%s:%s@cluster0.iyh6o.mongodb.net/%s"
DEFAULT_MONGO_LOCAL_URL = (
    "mongodb//%s:%s@localhost:27017/%s?retryWrites=true&w=majority"
)

parser = argparse.ArgumentParser()
parser.add_argument(
    "--results_export_dir",
    default=DEFAULT_RESULTS_EXPORT_DIR,
    help="Top level directory to export results data.",
)
parser.add_argument(
    "--mongo_credentials",
    default=os.path.join(DEFAULT_EXPERIMENTS_DIR, DEFAULT_MONGO_CREDENTIALS),
    help="File containing mongo user credentials.",
)
parser.add_argument(
    "--experiment_configs",
    nargs="+",
    required=True,
    help="Name of the config files. Must be in the experiments export dir.",
)
parser.add_argument(
    "--use_local_mongo",
    action="store_true",
    help="Whether to use a local MongoDB (instead of the MIT Cloud DB).",
)
parser.add_argument(
    "--excluded_workers_file",
    default=DEFAULT_EXCLUDED_WORKERS,
    help="File containing worker IDs to exclude.",
)
parser.add_argument(
    "--include_test_ids",
    action="store_true",
    help="Whether to include test IDs when downloading.",
)
parser.add_argument(
    "--deanonymize_ids",
    action="store_true",
    help="Whether to include true test IDs in the output data.",
)
parser.add_argument(
    "--display_subject_approval_check",
    action="store_true",
    help="Whether to print an approval check along with the true IDs to the console for determining subject payment.",
)


def get_mongo_db_connection(args):
    mongo_url = (
        DEFAULT_MONGO_LOCAL_URL if args.use_local_mongo else DEFAULT_MONGO_CLOUD_URL
    )
    db_connection = mongo_db_utils.open_db_connection(
        args.mongo_credentials, DEFAULT_DB_TABLE, mongo_url
    )
    return db_connection


def get_mongo_db_name_colname_from_config(experiment_type, config_name):
    full_config_file = os.path.join(
        DEFAULT_EXPERIMENTS_DIR,
        experiment_type,
        DEFAULT_CONFIGS_DIR,
        config_name + ".json",
    )
    with open(full_config_file, "r") as f:
        config_data = json.load(f)
        db_name, colname = config_data[CONFIG_DB_NAME], config_data[CONFIG_COLNAME]
    return db_name, colname


def get_mongo_collection_names_to_output_files(args, db_connection=None):
    mongo_collection_names_to_files = defaultdict()
    if args.experiment_configs[0] == "all":
        # Get collection names directly from mogno
        db_name = "lax"
        collections = db_connection.list_collection_names()
        for collection in collections:
            output_file = os.path.join(args.results_export_dir, collection + ".csv")
            mongo_collection_names_to_files[(db_name, collection)] = output_file

        return mongo_collection_names_to_files

    for experiment_config in args.experiment_configs:
        experiment_type, config_name = experiment_config.split("/")
        db_name, colname = get_mongo_db_name_colname_from_config(
            experiment_type, config_name
        )
        output_file = os.path.join(args.results_export_dir, colname + ".csv")
        mongo_collection_names_to_files[(db_name, colname)] = output_file
    return mongo_collection_names_to_files


def get_excluded_workers(args):
    if args.excluded_workers_file:
        with open(args.excluded_workers_file) as f:
            excluded_workers = list(set([l.strip() for l in f.readlines()]))
        print(
            f"Excluding {len(excluded_workers)} workers from file {args.excluded_workers_file}."
        )
        return excluded_workers
    else:
        return []


def experiment_trials_iterator(args, mongo_db_connection, mongo_colname):
    collection = mongo_db_connection[mongo_colname]
    excluded_workers = get_excluded_workers(args)
    for record in collection.find({}):
        if is_valid_trial_record(args, record, excluded_workers):
            yield record


def is_valid_trial_record(args, record, excluded_workers):
    if record[TRIAL_TYPE] not in VALID_TRIAL_TYPES:
        return False
    if not args.include_test_ids and WORKER_ID not in record:
        return False
    if record[WORKER_ID] in excluded_workers:
        return False
    if not args.include_test_ids and not record[WORKER_ID][0].isnumeric():
        return False
    return True


def get_cleaned_lax_trial_record(record, current_timestamp):
    cleaned_lax_trial_record = {
        k: record.get(k, "NONE")
        for k in [WORKER_ID, TRIAL_INDEX, TRIAL_TYPE, CONDITION, STIMULI_URL]
    }
    cleaned_lax_trial_record[TIMESTAMP] = current_timestamp
    if record[TRIAL_TYPE] == STIMULI_LANGUAGE_PRODUCTION:
        cleaned_lax_trial_record[RESPONSE] = json.loads(record[RESPONSE])["Q0"]
    elif record[TRIAL_TYPE] == STIMULI_DRAWING_PRODUCTION:
        cleaned_lax_trial_record[RESPONSE] = record[STROKES]
    else:
        print(f"Error: unknown trial type for cleaned record: {record[TRIAL_TYPE]}")
        assert False
    return cleaned_lax_trial_record


def anonymize_worker_ids(args, trial_records, unique_worker_ids):
    if args.deanonymize_ids:
        input("Writing DEANONYMIZED WORKER IDS. Hit enter to acknowledge....")
        return trial_records
    anonymized_ids = {
        original: idx for (idx, original) in enumerate(sorted(unique_worker_ids))
    }
    for trial_record in trial_records:
        trial_record[WORKER_ID] = anonymized_ids[trial_record[WORKER_ID]]


def display_subject_approval_check(args, cleaned_records, worker_ids_to_records):
    for worker_id in worker_ids_to_records:
        worker_records = worker_ids_to_records[worker_id]
        checkable_responses = [
            record[RESPONSE]
            for record in worker_records
            if record[TRIAL_TYPE] in CHECKABLE_TRIAL_TYPES
        ]
        checked_responses = [
            "\t" + response + "\n" for response in checkable_responses[-5:-1]
        ]
        print(worker_id)
        print("".join(checked_responses))
        print("\n")


def iteratively_write_mongo_data(
    args, mongo_db_connection, mongo_collection_names_to_files, current_timestamp
):
    for (db_name, colname) in mongo_collection_names_to_files:
        output_results_file = mongo_collection_names_to_files[(db_name, colname)]

        worker_ids_to_records = defaultdict(list)
        cleaned_records = []
        for trial_record in experiment_trials_iterator(
            args, mongo_db_connection, colname
        ):
            cleaned_lax_trial_record = get_cleaned_lax_trial_record(
                trial_record, current_timestamp
            )
            worker_ids_to_records[trial_record[WORKER_ID]].append(
                cleaned_lax_trial_record
            )
            cleaned_records.append(cleaned_lax_trial_record)

        if args.display_subject_approval_check:
            display_subject_approval_check(args, cleaned_records, worker_ids_to_records)

        unique_worker_ids = set(worker_ids_to_records.keys())
        anonymize_worker_ids(args, cleaned_records, unique_worker_ids)
        print(
            f"Writing {len(cleaned_records)} records to: {output_results_file} for {len(unique_worker_ids)} unique workers."
        )
        with open(output_results_file, "w", newline="") as f:
            writer = csv.DictWriter(f, RECORD_DATA_FIELDNAMES)
            writer.writeheader()
            for cleaned_record in cleaned_records:
                writer.writerow(cleaned_record)


def get_timestamp():
    timestamp = datetime.now().isoformat()
    # Escape the timestamp.
    timestamp = timestamp.replace(":", "-")
    timestamp = timestamp.replace(".", "-")
    return timestamp


def main(args):
    current_timestamp = get_timestamp()
    mongo_db_connection = get_mongo_db_connection(args)
    mongo_collection_names_to_files = get_mongo_collection_names_to_output_files(
        args, mongo_db_connection
    )
    iteratively_write_mongo_data(
        args, mongo_db_connection, mongo_collection_names_to_files, current_timestamp
    )


if __name__ == "__main__":
    args = parser.parse_args()
    main(args)
