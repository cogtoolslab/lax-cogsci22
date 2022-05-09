Stimulus generation and preprocessing.

All rendered stimuli and programs can be found on AWS at:
`https://lax-{DOMAIN}-{SUBDOMAIN}-all.s3.amazonaws.com/` where
- DOMAINS = {drawing, structures}
- SUBDOMAINS = {nuts-bolts, wheels, furniture, dials} and {bridge, house, castle, city}
- Images for each stimulus are indexed : as `lax-{DOMAIN}-{SUBDOMAIN}-all-{IDX}.png`
- A summary document containing all programs and stimuli is in the `*_tasks_summary.csv` file.


Tower stimuli are generated in towers/structure_generator.ipynb.

Drawings stimuli are generated using the external `drawingtasks` repo [here](https://github.com/CatherineWong/drawingtasks). Run the `quickstart_gen_dataset_cogsci_2022.sh` script at that repo to generate all stimuli.
