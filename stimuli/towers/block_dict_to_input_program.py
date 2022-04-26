from __future__ import division

import numpy as np
import os, sys
from PIL import Image
import pandas as pd
import json
import pickle

from matplotlib import pylab, mlab, pyplot
import matplotlib.pyplot as plt
import matplotlib.image as mpimg
from matplotlib.path import Path
import matplotlib.patches as patches

from IPython.core.pylabtools import figsize, getfigs

import seaborn as sns

import random

from scipy.stats import norm
from IPython.display import clear_output

import copy
import importlib


### Add Paths

## root paths
curr_dir = os.getcwd()
proj_dir = os.path.abspath(os.path.join(curr_dir,'..')) ## use relative paths

## add helpers to python path
import sys
if os.path.join(proj_dir, 'stimuli') not in sys.path:
    sys.path.append(os.path.join(proj_dir, 'stimuli'))

## import utils from git submodule
sys.path.append("./block_utils/")
import blockworld_utils as utils
import domino_settings as dominoes

# setup
block_dims = dominoes.block_dims
block_colors = dominoes.block_colors
# world_width = dominoes.world_width
# world_height = dominoes.world_height
# world_center = dominoes.world_center
# black = ['#000000','#000000'] # used to display silhouettes
# grey = ['#333333','#333333']


'''
Helper functions for converting tower jsons into programs

These allow two ways of making programs:

One ('whole_squares = True') preserves the setup of the block utils, where each square is a unit 
and the position of a block is it's bottom-left square.
The bottom-left square is position 0.

The other ('whole_squares = False') treats each square as 2 spaces, as in the original Dreamcoder building domain.
Block positions are their bottom-center.
This allows placements of vertical (1x2) blocks in square -1. 

Usage:

df_composite['dreamcoder_program'] = df_composite['block_dict'].apply(lambda x: parse(x, whole_squares=False))
df_composite['program_whole_squares'] = \
        df_composite['block_dict'].apply(lambda x: parse(x, whole_squares=True))

df_4_block['dreamcoder_program'] = df_4_block['block_dict'].apply(lambda x: parse(x, whole_squares=False))
df_4_block['program_whole_squares'] = \
            df_4_block['block_dict'].apply(lambda x: parse(x, whole_squares=True))

'''

def get_movement(old_x_location, new_x_location):

    diff = new_x_location - old_x_location

    if diff == 0:
        return ''
    elif diff > 0:
        return '(r ' + str(diff) + ') '
    elif diff < 0:
        return '(l ' + str(-diff) + ') '

    
def get_block_type(block):
    if (block['height'] == 2) & (block['width'] == 1):
        block_type = 't'
    elif (block['height'] == 1) & (block['width'] == 2):
        block_type = 'h'
    else:
        print('Incorrect block size')
    return block_type


def convert_to_dreamcoder_double_squares(block_dict):
    #NOTE: DOES NOT RETURN A VALID WORLD
    # This is for temporary use within these functions only
    new_block_dict = []
    
    for block in block_dict:
        block_type = get_block_type(block)
        new_block = {}
        
        new_block['width'] = block['width'] #these are broken now
        new_block['height'] = block['height'] #these are broken now

        if block_type == 'h':
            new_block['x'] = block['x'] * 2
        else:
            new_block['x'] = (block['x'] * 2) - 1
        
        new_block_dict.append(new_block)
        
    return new_block_dict


def convert(block_dict, whole_squares=False):
    
    '''
    Converts tower jsons into programs

    These allow two ways of making programs:

    One ('whole_squares = True') preserves the setup of the block utils, where each square is a unit 
    and the position of a block is it's bottom-left square.
    The bottom-left square is position 0.

    The other ('whole_squares = False') treats each square as 2 spaces, as in the original Dreamcoder building domain.
    Block positions are their bottom-center.
    This allows placements of vertical (1x2) blocks in square -1. 
    
    Usage:

    df_composite['dreamcoder_program'] = df_composite['block_dict'].apply(lambda x: convert(x, whole_squares=False))
    df_composite['program_whole_squares'] = \
            df_composite['block_dict'].apply(lambda x: convert(x, whole_squares=True))

    df_4_block['dreamcoder_program'] = df_4_block['block_dict'].apply(lambda x: convert(x, whole_squares=False))
    df_4_block['program_whole_squares'] = \
                df_4_block['block_dict'].apply(lambda x: convert(x, whole_squares=True))

    '''
    
    if (whole_squares==False):
        block_dict = convert_to_dreamcoder_double_squares(block_dict)

    program = '('
    old_x_location = 0

    for block in block_dict:
        
        block_type = get_block_type(block)
        
        movement = get_movement(old_x_location, block['x'])
        
        program += movement
        program += block_type + ' '
        
        old_x_location = block['x']
        
    program = program[:-1] #remove trailing space
    program += ')'
    return program


