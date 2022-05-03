"""
program_language_plots.py | Catherine Wong.

Utility script to run plotted analyses over tasks and output metrics.

Usage:
    python analysis/program_language_plots.py
        --task_summaries nuts_bolts_programs_all_libraries 
        --language_column lemmatized_whats
        --program_column dreamcoder_program_dsl_0_tokens dreamcoder_program_dsl_1_tokens dreamcoder_program_dsl_2_tokens dreamcoder_program_dsl_3_tokens dreamcoder_program_dsl_4_tokens dreamcoder_program_dsl_5_tokens
"""
from collections import defaultdict
import csv, os, json, argparse
from email.policy import default
import itertools
from re import L
from cycler import cycler

import pandas as pd
import numpy as np
from PIL import Image, ImageOps, ImageDraw, ImageFont, ImageColor

from io import BytesIO
import base64

import random
import matplotlib
from matplotlib import pylab, mlab, pyplot
from matplotlib.colors import LinearSegmentedColormap, ListedColormap

plt = pyplot
import matplotlib as mpl

mpl.rcParams["pdf.fonttype"] = 42

import seaborn as sns

sns.set_context("talk")
sns.set_style("whitegrid")
import matplotlib.ticker as ticker
import copy

LIBRARY = "library"

DEFAULT_DATA_DIR = "data"
DEFAULT_ANALYSES_DIR = f"{DEFAULT_DATA_DIR}/analyses"
DEFAULT_LIBRARIES_DIR = f"{DEFAULT_DATA_DIR}/libraries"

DEFAULT_TRANSLATIONS_DIR = f"{DEFAULT_DATA_DIR}/translations"
DEFAULT_LANGUAGE_DIR = f"{DEFAULT_DATA_DIR}/language"
DEFAULT_SUMMARIES_DIR = f"{DEFAULT_DATA_DIR}/summaries"
DEFAULT_PROGRAM_COLUMN = "dreamcoder_program_dsl_0_tokens"

LEMMATIZED_WHATS = "lemmatized_whats"
LEMMATIZED_WHATS_WHERES = "lemmatized_whats_wheres"
RAW_WHATS_WHERES = "raw_whats_wheres"
DEFAULT_LANGUAGE_COLUMN = LEMMATIZED_WHATS
DEFAULT_TASK_SUMMARIES_TASK_COLUMN = "s3_stimuli"

PROGRAM_TOKENS, LANGUAGE_TOKENS = "program_tokens", "language_tokens"
TRANSLATION_MARGINAL_LOG_LIKELIHOODS = "translation_log_likelihoods"
TRANSLATION_BEST_LOG_LIKELIHOODS = "translation_best_log_likelihoods"
RANDOM_TRANSLATION_MARGINAL_LOG_LIKELIHOODS = "random_translation_log_likelihoods"
RANDOM_TRANSLATION_BEST_LOG_LIKELIHOODS = "random_translation_best_log_likelihoods"

# styling for paper_figures following @Will McCarthy
subdomains = {
    "structures": ["bridge", "city", "house", "castle"],
    "drawing": ["nuts-bolts", "wheels", "dials", "furniture"],
}

domains = list(subdomains.keys())

sns.set_style("white", {"axes.linewidth": 0.5})
plt.rcParams["xtick.major.size"] = 6
plt.rcParams["ytick.major.size"] = 6
plt.rcParams["xtick.major.width"] = 2
plt.rcParams["ytick.major.width"] = 2
plt.rcParams["xtick.bottom"] = True
plt.rcParams["ytick.left"] = True
matplotlib.rc("ytick", labelsize=25)
matplotlib.rc("xtick", labelsize=42)


LIGHT_BLUE = "#56B0CD"
LIGHT_ORANGE = "#FFCE78"
LIGHT_GREEN = "#95C793"
LIGHT_RED = "#CC867A"

BLUE = "#009BCD"
ORANGE = "#FFA300"
GREEN = "#688B67"
RED = "#CC5945"

DARK_BLUE = "#0E4478"
DARK_ORANGE = "#A46400"
DARK_GREEN = "#275C4A"
DARK_RED = "#9B3024"

domain_palettes_light = {
    domains[0]: {
        subdomains[domains[0]][0]: LIGHT_BLUE,
        subdomains[domains[0]][1]: LIGHT_ORANGE,
        subdomains[domains[0]][2]: LIGHT_GREEN,
        subdomains[domains[0]][3]: LIGHT_RED,
    },
    domains[1]: {
        subdomains[domains[1]][0]: LIGHT_BLUE,
        subdomains[domains[1]][1]: LIGHT_ORANGE,
        subdomains[domains[1]][2]: LIGHT_GREEN,
        subdomains[domains[1]][3]: LIGHT_RED,
    },
}

domain_palettes = {
    domains[0]: {
        subdomains[domains[0]][0]: BLUE,
        subdomains[domains[0]][1]: ORANGE,
        subdomains[domains[0]][2]: GREEN,
        subdomains[domains[0]][3]: RED,
    },
    domains[1]: {
        subdomains[domains[1]][0]: BLUE,
        subdomains[domains[1]][1]: ORANGE,
        subdomains[domains[1]][2]: GREEN,
        subdomains[domains[1]][3]: RED,
    },
}

domain_palettes_dark = {
    domains[0]: {
        subdomains[domains[0]][0]: DARK_BLUE,
        subdomains[domains[0]][1]: DARK_ORANGE,
        subdomains[domains[0]][2]: DARK_GREEN,
        subdomains[domains[0]][3]: DARK_RED,
    },
    domains[1]: {
        subdomains[domains[1]][0]: DARK_BLUE,
        subdomains[domains[1]][1]: DARK_ORANGE,
        subdomains[domains[1]][2]: DARK_GREEN,
        subdomains[domains[1]][3]: DARK_RED,
    },
}

N = 256
gradients = []

for light, mid, dark in zip(
    [LIGHT_BLUE, LIGHT_ORANGE, LIGHT_GREEN, LIGHT_RED],
    [BLUE, ORANGE, GREEN, RED],
    [DARK_BLUE, DARK_ORANGE, DARK_GREEN, DARK_RED],
):
    light_rgb = list(ImageColor.getcolor(light, "RGB"))
    mid_rgb = list(ImageColor.getcolor(mid, "RGB"))
    dark_rgb = list(ImageColor.getcolor(dark, "RGB"))
    vals = np.ones((N, 4))
    vals[:, 0] = np.append(
        np.linspace(light_rgb[0] / 255, mid_rgb[0] / 255, int(N / 2)),
        np.linspace(mid_rgb[0] / 255, dark_rgb[0] / 255, int(N / 2)),
    )  # R
    vals[:, 1] = np.append(
        np.linspace(light_rgb[1] / 255, mid_rgb[1] / 255, int(N / 2)),
        np.linspace(mid_rgb[1] / 255, dark_rgb[1] / 255, int(N / 2)),
    )  # G
    vals[:, 2] = np.append(
        np.linspace(light_rgb[2] / 255, mid_rgb[2] / 255, int(N / 2)),
        np.linspace(mid_rgb[2] / 255, dark_rgb[2] / 255, int(N / 2)),
    )  # B
    newcmp = ListedColormap(vals)

    gradients.append(newcmp)

domain_gradients = {
    domains[0]: {
        subdomains[domains[0]][0]: gradients[0],
        subdomains[domains[0]][1]: gradients[1],
        subdomains[domains[0]][2]: gradients[2],
        subdomains[domains[0]][3]: gradients[3],
    },
    domains[1]: {
        subdomains[domains[1]][0]: gradients[0],
        subdomains[domains[1]][1]: gradients[1],
        subdomains[domains[1]][2]: gradients[2],
        subdomains[domains[1]][3]: gradients[3],
    },
}

all_library_names = {"dsl_0": "Base", "low": "L1", "mid": "L2", "high": "L3"}

TOKENS_SUFFIX = "_tokens"

parser = argparse.ArgumentParser()
parser.add_argument(
    "--export_dir",
    default=DEFAULT_ANALYSES_DIR,
    help="If provided, alternate directory to export the translation results.",
)
parser.add_argument(
    "--translations_dir",
    default=DEFAULT_TRANSLATIONS_DIR,
    help="If provided, alternate directory to export the library results.",
)
parser.add_argument(
    "--libraries_dir",
    default=DEFAULT_LIBRARIES_DIR,
    help="If provided, alternate directory to export the library results.",
)
parser.add_argument(
    "--task_summaries_dir",
    default=DEFAULT_SUMMARIES_DIR,
    help="If provided, alternate directory to read in summaries of tasks.",
)
parser.add_argument(
    "--task_summaries",
    required=True,
    help="Original CSV containing task summaries data.",
)
parser.add_argument(
    "--task_summaries_task_column",
    default=DEFAULT_TASK_SUMMARIES_TASK_COLUMN,
    help="Column in the task summaries CSV containing the task name to join on.",
)
parser.add_argument(
    "--program_column",
    nargs="+",
    default=[DEFAULT_PROGRAM_COLUMN],
    help="Column in the task summaries CSV containing the program.",
)
parser.add_argument(
    "--language_dir",
    default=DEFAULT_LANGUAGE_DIR,
    help="If provided, alternate directory to read in language data.",
)
parser.add_argument(
    "--language_column",
    default=DEFAULT_LANGUAGE_COLUMN,
    help="Column in the language CSV containing which language to use.",
)
parser.add_argument(
    "--use_base_dsl_bitext",
    action="store_true",
    help="If included, uses a bitext for the base DSL.",
)


def get_domain_color(palette, args):
    domain = args.task_summaries.split("_")[0]
    for k in palette:
        for d in palette[k]:
            if domain in d:
                return palette[k][d]


def get_summaries_dict(args):
    task_csv = os.path.join(args.task_summaries_dir, args.task_summaries + ".csv")
    summaries_dict = {}
    with open(task_csv) as csvfile:
        csv_reader = csv.DictReader(csvfile)
        for row in csv_reader:
            task = row[args.task_summaries_task_column]
            summaries_dict[task] = dict(row)
    print(f"...read summary rows from {len(summaries_dict)} tasks.")
    fieldnames = csv_reader.fieldnames
    return summaries_dict, fieldnames


def get_bitext_unique_program_tokens(bitext):
    return set(
        itertools.chain.from_iterable(
            [bitext[task]["program_tokens"] for task in bitext]
        )
    )


def get_bitexts_dict(args):
    bitexts_dict = {}
    for program_column in args.program_column:
        summaries_name = args.task_summaries.replace("_libraries", "")
        bitext_json = f"{summaries_name}_{program_column}_{args.language_column}"
        try:
            with open(os.path.join(args.language_dir, bitext_json)) as f:
                bitext = json.load(f)
            bitexts_dict[program_column] = get_bitext_unique_program_tokens(bitext)
        except:
            print(f"Not found: bitext for: {program_column}")
    print(f"...read bitexts for {len(bitexts_dict)} bitexts.")
    return bitexts_dict


def get_libraries_dict(args, bitexts_dict):
    libraries_dict = {}
    for program_column in args.program_column:
        summaries_name = args.task_summaries.replace("_libraries", "")
        col_name = program_column.replace(TOKENS_SUFFIX, "")
        library_json = f"{summaries_name}_{col_name}.json"
        try:
            with open(os.path.join(args.libraries_dir, library_json)) as f:
                library_dict = json.load(f)
            libraries_dict[program_column] = library_dict
        except:
            print(f"Not found: library for: {col_name}")
    print(f"...read libraries for {len(libraries_dict)} libraries.")

    # If this is structures, use the base DSL as as as library.
    if args.use_base_dsl_bitext:
        libraries_dict[DEFAULT_PROGRAM_COLUMN] = {
            "library": {"productions": bitexts_dict[DEFAULT_PROGRAM_COLUMN]}
        }

    return libraries_dict


def get_translations(args):
    translations_dict = {}
    for program_column in args.program_column:
        task_translations_file_base = (
            f"ibm_1_{args.task_summaries}_{program_column}_{args.language_column}"
        )
        task_translations_file = os.path.join(
            args.translations_dir, task_translations_file_base + ".json"
        )
        try:
            with open(task_translations_file) as f:
                translation_dict = json.load(f)
        except:
            print("Error reading: " + task_translations_file)
        translations_dict[program_column] = translation_dict
    print(f"...read translations info for {len(translations_dict)} libraries.")
    return translations_dict


def generate_program_length_plots(args, summaries_dict, libraries_dict, bitexts_dict):
    # X is: size of program library.
    # Y is: length of program.
    library_sizes, program_sizes, program_and_library_sizes = [], [], []
    for program_column in args.program_column:
        # Get the library size.
        if program_column in libraries_dict:
            library_size = len(libraries_dict[program_column][LIBRARY]["productions"])
        else:

            bitexts_dict[program_column].update(
                libraries_dict[DEFAULT_PROGRAM_COLUMN][LIBRARY]["productions"]
            )
            library_size = len(bitexts_dict[program_column])
        print(program_column, library_size)
        for task_name in summaries_dict:
            program_size = len(eval(summaries_dict[task_name][program_column]))
            library_sizes.append(np.log(library_size))
            program_sizes.append(np.log(program_size))
            program_and_library_size = library_size + program_size
            program_and_library_sizes.append(np.log(program_and_library_size))

    plt.figure(figsize=(3, 2))
    ax = sns.lineplot(
        x=library_sizes,
        y=library_sizes,
        ci=95,
        color="orange",
        err_style="bars",
        markers=True,
        dashes=True,
        marker="o",
        alpha=0.5,
    )
    ax = sns.lineplot(
        x=library_sizes,
        y=program_sizes,
        ci=95,
        color="red",
        err_style="bars",
        markers=True,
        dashes=True,
        marker="o",
        alpha=0.5,
    )

    ax = sns.lineplot(
        x=library_sizes,
        y=program_and_library_sizes,
        ci=95,
        color="blue",
        err_style="bars",
        markers=True,
        dashes=True,
        marker="o",
        alpha=0.5,
    )
    fig = ax.get_figure()

    ax.xaxis.set_major_formatter(
        ticker.FuncFormatter(lambda x, pos: "{:,.1f}".format(x))
    )
    ax.yaxis.set_major_formatter(
        ticker.FuncFormatter(lambda x, pos: "{:,.1f}".format(x))
    )

    output_plot = f"{args.task_summaries}_{args.program_column[-1]}_{args.language_column}_lengths.png"
    output = os.path.join(args.export_dir, output_plot)
    # plt.title(f"{get_subdomain_name(args.task_summaries)}")
    # plt.xlabel("log(|DSL|)")
    # plt.ylabel("log(|Program|)")

    fig.savefig(output)
    print(f"...saved lengths plot to {output}.")


def get_library_name(library_names, program_column):

    for k in library_names:
        if k in program_column:
            return library_names[k]


def generate_combined_likelihood_plots(
    args, summaries_dict, libraries_dict, translations_dict, bitexts_dict
):
    library_sizes, library_names, translation_probabilities, random_probabilities = (
        [],
        [],
        [],
        [],
    )
    library_name_to_translation_probabilities = defaultdict(list)
    library_to_translation_probabilities = defaultdict(list)
    for idx, program_column in enumerate(args.program_column):
        # Get the library size.
        if program_column in libraries_dict:
            library_size = len(libraries_dict[program_column][LIBRARY]["productions"])
        else:
            # Calculate the libraries cumulatively:

            # Add the base DSL
            cumulative_dsl = copy.deepcopy(bitexts_dict[program_column])
            cumulative_dsl.update(
                set(libraries_dict[DEFAULT_PROGRAM_COLUMN][LIBRARY]["productions"])
            )
            for prev_dsls in args.program_column[1:idx]:
                cumulative_dsl.update(prev_dsls)

            # Add all previous DSLs.

            library_size = len(cumulative_dsl)
            print(program_column, library_size)

        for task_name in translations_dict[program_column]:
            for likelihood in translations_dict[program_column][task_name][
                TRANSLATION_BEST_LOG_LIKELIHOODS
            ]:
                library_name = get_library_name(all_library_names, program_column)
                library_names.append(library_name)
                library_sizes.append(np.log(library_size))
                translation_probabilities.append(likelihood)
                library_to_translation_probabilities[np.log(library_size)].append(
                    likelihood
                )
                library_name_to_translation_probabilities[library_name].append(
                    likelihood
                )
            for likelihood in translations_dict[program_column][task_name][
                RANDOM_TRANSLATION_BEST_LOG_LIKELIHOODS
            ]:
                random_probabilities.append(likelihood)

    library_sizes_2, library_names_2, program_sizes, program_and_library_sizes = (
        [],
        [],
        [],
        [],
    )
    library_name_to_library_size = defaultdict(float)
    library_name_to_program_size = defaultdict(list)
    library_name_to_cost = defaultdict(list)
    for idx, program_column in enumerate(args.program_column):
        # Get the library size.
        if program_column in libraries_dict:
            library_size = len(libraries_dict[program_column][LIBRARY]["productions"])
        else:
            # Calculate the libraries cumulatively:

            # Add the base DSL
            cumulative_dsl = copy.deepcopy(bitexts_dict[program_column])
            cumulative_dsl.update(
                set(libraries_dict[DEFAULT_PROGRAM_COLUMN][LIBRARY]["productions"])
            )
            for prev_dsls in args.program_column[1:idx]:
                cumulative_dsl.update(prev_dsls)

            # Add all previous DSLs.

            library_size = len(cumulative_dsl)

        for task_name in summaries_dict:
            library_name = get_library_name(all_library_names, program_column)
            library_names_2.append(library_name)
            program_size = len(eval(summaries_dict[task_name][program_column]))
            library_sizes_2.append(np.log(library_size))
            program_sizes.append(program_size)
            program_and_library_size = library_size + program_size
            program_and_library_sizes.append(program_and_library_size)
            library_name_to_cost[library_name].append(
                program_and_library_size
            )  # TODO: consider changing.
            library_name_to_library_size[library_name] = library_size
            library_name_to_program_size[library_name].append(program_size)

    # Solid line for translation probabilities.
    plt.clf()
    plt.figure(figsize=(8, 8))
    library_order = ["Base", "L1", "L2", "L3"]

    data = {
        "library_names": library_names_2,
        "costs": program_and_library_sizes,
    }
    data = pd.DataFrame.from_dict(data)
    # # TODO: set color on domain axes.
    color = get_domain_color(domain_palettes_dark, args)

    # Dashed line for translation probabilities.
    ax = sns.lineplot(
        x="library_names",
        y="costs",
        data=data,
        ci=95,
        color=get_domain_color(domain_palettes_light, args),
        err_style="bars",
        markers=True,
        linestyle="dashed",
        marker="o",
        alpha=0.9,
        legend=False,
        markersize=15,
    )
    ax.set(xlabel=None)
    ax.set(ylabel=None)
    ax.yaxis.set_major_formatter(ticker.FuncFormatter(lambda x, pos: "{:,g}".format(x)))

    for axis in ["top", "bottom", "left", "right"]:
        ax.spines[axis].set_linewidth(4)

    data = {
        "library_names": library_names,
        "translation_probabilities": translation_probabilities,
    }
    data = pd.DataFrame.from_dict(data)
    ax2 = ax.twinx()
    ax2 = sns.lineplot(
        x="library_names",
        y="translation_probabilities",
        data=data,
        err_style="bars",
        # x_estimator=np.mean,
        # label="Translation",
        color=get_domain_color(domain_palettes_dark, args),
        # order=library_order,
        # ci=95,
        # markers=True,
        marker="o",
        # # dashes=True,
        alpha=0.9,
        legend=False,
        markersize=15,
    )

    ax2.set(xlabel=None)
    ax2.set(ylabel=None)
    ax2.set(xticklabels=library_order)
    # # TODO: set color on domain axes.
    ax2.yaxis.set_major_formatter(
        ticker.FuncFormatter(lambda x, pos: "{:,.1f}".format(x))
    )

    output_plot = f"library_vocab_alignment_pdf/{args.task_summaries}_{args.program_column[-1]}_{args.language_column}_combined.pdf"
    output = os.path.join(args.export_dir, output_plot)
    # plt.title(f"{get_subdomain_name(args.task_summaries)}")
    # plt.xlabel("log(|DSL|)")
    # plt.ylabel("log(|Program|)")
    fig = ax.get_figure()
    fig.savefig(output)
    print(f"...saved lengths plot to {output}.")

    ## While we're here, compute statistics of relevance:
    # First, compute that there is a meaningful difference in the mean COSTs
    # First, normalize against the baseline.
    conduct_f_one_way_baseline(library_name_to_cost, "Cumulative length cost")

    # Now, run an ANOVA to determine that there is a meaningful difference in the mean log likelihoods
    conduct_f_one_way_baseline(
        library_name_to_translation_probabilities, "Model mean log likelihoods"
    )


def conduct_f_one_way_baseline(dataset, name):
    from scipy.stats import f_oneway

    samples = [dataset[library_name] for library_name in dataset]
    F, p = f_oneway(*samples)
    print(f"F one way results for {name}: F: {F}; {p}")


def generate_program_likelihood_plots(
    args, summaries_dict, libraries_dict, translations_dict, bitexts_dict
):
    library_sizes, translation_probabilities, random_probabilities = [], [], []
    library_to_translation_probabilities = defaultdict(list)
    for program_column in args.program_column:
        # Get the library size.
        if program_column in libraries_dict:
            library_size = len(libraries_dict[program_column][LIBRARY]["productions"])
        else:
            library_size = len(bitexts_dict[program_column]) + len(
                libraries_dict[DEFAULT_PROGRAM_COLUMN][LIBRARY]["productions"]
            )
        for task_name in translations_dict[program_column]:
            for likelihood in translations_dict[program_column][task_name][
                TRANSLATION_BEST_LOG_LIKELIHOODS
            ]:
                library_sizes.append(np.log(library_size))
                translation_probabilities.append(likelihood)
                library_to_translation_probabilities[np.log(library_size)].append(
                    likelihood
                )
            for likelihood in translations_dict[program_column][task_name][
                RANDOM_TRANSLATION_BEST_LOG_LIKELIHOODS
            ]:
                random_probabilities.append(likelihood)
    plt.clf()
    plt.figure(figsize=(3, 2))
    ax = sns.lineplot(
        x=library_sizes,
        y=translation_probabilities,
        err_style="bars",
        # x_estimator=np.mean,
        # label="Translation",
        color="green",
        ci=95,
        markers=True,
        dashes=True,
        marker="o",
    )
    ax.xaxis.set_major_formatter(
        ticker.FuncFormatter(lambda x, pos: "{:,.1f}".format(x))
    )
    ax.yaxis.set_major_formatter(
        ticker.FuncFormatter(lambda x, pos: "{:,.1f}".format(x))
    )
    # ax = sns.regplot(
    #     x=library_sizes,
    #     y=random_probabilities,
    #     x_estimator=np.mean,
    #     label="Random",
    #     order=2,
    # )
    # ax.legend()
    fig = ax.get_figure()

    output_plot = f"{args.task_summaries}_{args.program_column[-1]}_{args.language_column}_ibm.png"
    output = os.path.join(args.export_dir, output_plot)

    # plt.title(f"{get_subdomain_name(args.task_summaries)}")
    # plt.ylabel("P(language | program, T, DSL)")
    # plt.xlabel("log(|DSL|)")

    fig.savefig(output)
    print(f"...saved lengths plot to {output}.")

    # Now, run a nested linear model to determine that there is a non-linear mean in each.
    from sklearn.linear_model import LinearRegression
    import statsmodels.api as sm
    import scipy

    # Compare full model w. polynomial term.
    y = np.array([translation_probabilities]).T
    x_linear = np.array([library_sizes]).T  # Linear
    x_polynomial = np.hstack((x_linear, np.square(x_linear)))

    poly_model = sm.OLS(y, x_polynomial).fit()
    linear_model = sm.OLS(y, x_linear).fit()

    LR_statistic = -2 * (linear_model.llf - poly_model.llf)
    p_val = scipy.stats.chi2.sf(LR_statistic, 2)
    print(f"LR statistic x^2 model vs. linear: {LR_statistic}; p_val: {p_val}")


def get_subdomain_name(task_summaries_name):
    subdomain_name = task_summaries_name.split("_")[:-2]
    subdomain_name = "&".join([t.capitalize() for t in subdomain_name])
    return subdomain_name


def main(args):
    summaries_dict, fieldnames = get_summaries_dict(args)
    bitexts_dict = get_bitexts_dict(args)
    libraries_dict = get_libraries_dict(args, bitexts_dict)
    translations_dict = get_translations(args)

    generate_program_length_plots(args, summaries_dict, libraries_dict, bitexts_dict)
    generate_program_likelihood_plots(
        args, summaries_dict, libraries_dict, translations_dict, bitexts_dict
    )
    generate_combined_likelihood_plots(
        args, summaries_dict, libraries_dict, translations_dict, bitexts_dict
    )


if __name__ == "__main__":
    args = parser.parse_args()
    main(args)
